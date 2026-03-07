import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { Vibration, Alert } from 'react-native';
import { scheduleNotificationSafely } from './NotificationHelper';
import webSocketService from './WebSocketService';
import { getRiderByPhone } from './AuthApi';
import { getBookings } from './BookingApi';
import * as Location from 'expo-location';
import { API_CONFIG } from '../config/api';

class GlobalOrderManager {
  constructor() {
    this.navigation = null;
    this.isInitialized = false;
    this.isOnline = false;
    this.activeOrders = new Map(); // Track active orders
    this.shownOrderIds = new Map(); // Track shown orders with timestamps (bookingId -> timestamp)
    this.pendingOrders = []; // Queue for orders when popup is open
    this.isPopupOpen = false;
    this.onOrderCallback = null;
    this.ordersScreenCallback = null;
    this.wsInitialized = false;
    this.pollingInterval = null; // Add polling interval reference
    this.lastLocation = null; // Cache location
  }

  // Initialize the global order manager
  async initialize(navigationRef) {
    if (this.isInitialized) return;
    
    this.navigation = navigationRef;
    this.isInitialized = true;
    
    console.log('[GlobalOrderManager] 🚀 Initializing...');
    console.log('[GlobalOrderManager] 📡 Mode: WebSocket-Primary (polling only as fallback)');
    
    // WebSocket is PRIMARY - polling is BACKUP ONLY
    // Polling will auto-start only if WebSocket fails to connect
    await this.checkOnlineStatus();
    await this.initializeWebSocket();
    this.startStatusMonitoring();
    
    console.log('[GlobalOrderManager] ✅ Initialized - WebSocket active, polling on standby');
  }

  // Initialize WebSocket connection
  async initializeWebSocket() {
    if (this.wsInitialized) return;
    
    try {
      // First check if phone number exists in storage
      const phoneNumber = await AsyncStorage.getItem("number");
      if (!phoneNumber) {
        console.log('[GlobalOrderManager] ⚠️ No phone number in storage, skipping WebSocket initialization');
        return;
      }

      const riderResponse = await getRiderByPhone();
      
      // Extract riderId from the response structure: { success: true, data: { _id, ... } }
      const riderData = riderResponse?.data || riderResponse;
      const riderId = riderData?._id || riderData?.id || riderData?.rider?._id;
      
      if (!riderId) {
        console.log('[GlobalOrderManager] ⚠️ No riderId found in response:', riderResponse);
        console.log('[GlobalOrderManager] ⚠️ Rider data structure:', riderData);
        return;
      }

      console.log('[GlobalOrderManager] ✅ Found riderId:', riderId);
      const wsUrl = API_CONFIG.WS_URL;
      console.log('[GlobalOrderManager] 🔌 Initializing WebSocket...');
      
      await webSocketService.initialize(wsUrl, riderId);
      
      // Set up global message callback
      webSocketService.setMessageCallback((data) => {
        this.handleWebSocketMessage(data);
      });
      
      // Set up connection status callback
      webSocketService.setConnectionChangeCallback((connected) => {
        console.log('[GlobalOrderManager] WebSocket status:', connected);
        
        // Start fallback polling if WebSocket disconnects
        if (!connected && this.isOnline && !this.pollingInterval) {
          console.log('[GlobalOrderManager] ⚠️ WebSocket disconnected - activating fallback polling');
          this.startGlobalPolling();
        }
        
        // Stop polling if WebSocket reconnects
        if (connected && this.pollingInterval) {
          console.log('[GlobalOrderManager] ✅ WebSocket reconnected - stopping fallback polling');
          this.stopGlobalPolling();
        }
      });
      
      this.wsInitialized = true;
      console.log('[GlobalOrderManager] ✅ WebSocket initialized successfully');
    } catch (error) {
      console.error('[GlobalOrderManager] ❌ WebSocket init failed:', error);
      // Don't re-throw the error to prevent app crashes
      // Fallback polling will automatically activate if WebSocket fails
    }
  }

  // Handle WebSocket messages globally
  handleWebSocketMessage(message) {
    console.log('[GlobalOrderManager] 📨 Message received:', message.type);
    console.log('[GlobalOrderManager] 📊 Current isOnline state:', this.isOnline);
    
    // Handle heartbeat messages without checking online status
    if (message.type === 'ping' || message.type === 'pong') {
      console.log('[GlobalOrderManager] 🏓 Heartbeat message:', message.type);
      return;
    }
    
    if (!this.isOnline) {
      console.log('[GlobalOrderManager] 📵 Driver offline, ignoring message');
      console.log('[GlobalOrderManager] ⚠️ This usually means toggle state is out of sync!');
      return;
    }

    switch (message.type) {
      case 'connection_established':
        console.log('[GlobalOrderManager] ✅ WebSocket connection confirmed');
        console.log('[GlobalOrderManager] ✅ Rider ID:', message.riderId);
        console.log('[GlobalOrderManager] ✅ Ready to receive bookings');
        break;
      case 'new_booking':
        console.log('[GlobalOrderManager] 🆕 NEW BOOKING MESSAGE RECEIVED!');
        console.log('[GlobalOrderManager] 🆕 Has booking data:', !!message.booking);
        if (message.booking) {
          console.log('[GlobalOrderManager] 🆕 Booking ID:', message.booking.bookingId);
          this.handleNewOrder(message.booking);
        } else {
          console.log('[GlobalOrderManager] ⚠️ No booking data in message!');
        }
        break;
      case 'booking_cancelled':
      case 'booking_canceled':
        if (message.booking) {
          this.handleOrderCancellation(message.booking);
        }
        break;
      case 'booking_updated':
        if (message.bookingId && message.updates) {
          this.handleOrderUpdate(message);
        }
        break;
      case 'tip_added':
        if (message.bookingId && message.tipAmount !== undefined) {
          this.handleTipAdded(message);
        }
        break;
      default:
        console.log('[GlobalOrderManager] 🤷 Unknown message type:', message.type);
        console.log('[GlobalOrderManager] 🤷 Full message:', JSON.stringify(message, null, 2));
    }
  }

  // Handle new order - IMMEDIATE DELIVERY
  async handleNewOrder(booking) {
    console.log('[GlobalOrderManager] 🆕 IMMEDIATE ORDER:', booking.bookingId);
    
    // Prevent duplicates within 2 minutes (allow re-showing after that)
    const now = Date.now();
    const lastShownTime = this.shownOrderIds.get(booking.bookingId);
    
    if (lastShownTime && (now - lastShownTime) < 120000) { // 2 minutes = 120000ms
      const secondsSinceShown = Math.floor((now - lastShownTime) / 1000);
      console.log(`[GlobalOrderManager] 📭 Duplicate order, skipping (shown ${secondsSinceShown}s ago)`);
      return;
    }

    // Mark as shown with timestamp
    this.shownOrderIds.set(booking.bookingId, now);
    
    // Clean up old entries (remove orders shown more than 5 minutes ago)
    for (const [orderId, timestamp] of this.shownOrderIds.entries()) {
      if (now - timestamp > 300000) { // 5 minutes
        this.shownOrderIds.delete(orderId);
      }
    }

    // Format order data with complete fare breakdown
    const formattedOrder = {
      bookingId: booking.bookingId,
      from: booking.from,
      to: booking.to,
      driverToFromKm: booking.driverToFromKm,
      fromToDropKm: booking.fromToDropKm,
      // Total order fare (what customer pays)
      totalFare: booking.totalFare || booking.amountPay || booking.price,
      price: booking.price || booking.totalFare,
      amountPay: booking.amountPay || booking.totalFare,
      // Rider's earnings after deductions
      totalDriverEarnings: booking.totalDriverEarnings || booking.driverEarnings,
      // Breakdown fields
      platformFee: booking.platformFee || booking.commission || 0,
      gst: booking.gst || booking.tax || 0,
      baseFare: booking.baseFare || booking.totalFare,
      // Tip/Quick fee
      quickFee: booking.quickFee || 0,
      tipAmount: booking.quickFee || 0,
      status: booking.status,
      vehicleType: booking.vehicleType,
    };

    // Add to active orders
    this.activeOrders.set(booking.bookingId, formattedOrder);

    // Notify OrdersScreen if callback is set
    if (this.ordersScreenCallback) {
      this.ordersScreenCallback(this.getActiveOrders());
    }

    // Immediate feedback
    await this.playNotification();

    // Check current screen and navigate
    await this.navigateToOrderPopup([formattedOrder]);
  }

  // Navigate to OrderPopup from any screen
  async navigateToOrderPopup(orders) {
    if (!this.navigation) {
      console.log('[GlobalOrderManager] ❌ Navigation not available');
      return;
    }

    try {
      const currentRoute = this.getCurrentRouteName();
      console.log('[GlobalOrderManager] 📍 Current screen:', currentRoute);
      console.log('[GlobalOrderManager] 🚀 Navigating to OrderPopup with', orders.length, 'order(s)');

      // If already on OrderPopup, add to existing orders
      if (currentRoute === 'OrderPopup') {
        console.log('[GlobalOrderManager] 📱 Adding to existing popup');
        if (this.onOrderCallback) {
          this.onOrderCallback(orders);
        }
        return;
      }

      // Navigate to OrderPopup from ANY screen (works globally)
      // This will work whether you're on Home, Profile, Orders, or any other screen
      console.log('[GlobalOrderManager] ✅ Allowing new orders while on active order');

      // Navigate to OrderPopup from any screen
      console.log('[GlobalOrderManager] 🚀 Navigating to OrderPopup');
      
      // Check if we can navigate safely
      if (this.navigation.navigate) {
        this.navigation.navigate('OrderPopup', { 
          orders: orders,
          fromGlobal: true 
        });
      } else {
        console.log('[GlobalOrderManager] ⚠️ Navigation.navigate not available');
      }
      
    } catch (error) {
      console.error('[GlobalOrderManager] ❌ Navigation error:', error);
      // If navigation fails, try to handle orders locally
      console.log('[GlobalOrderManager] 🔄 Attempting fallback navigation handling');
    }
  }

  // Get current route name
  getCurrentRouteName() {
    if (!this.navigation) return null;
    
    try {
      const state = this.navigation.getState ? this.navigation.getState() : null;
      return this.getActiveRouteName(state);
    } catch (error) {
      console.log('[GlobalOrderManager] ⚠️ Could not get route name:', error);
      return null;
    }
  }

  // Helper to get active route name
  getActiveRouteName(navigationState) {
    if (!navigationState) return null;
    
    const route = navigationState.routes[navigationState.index];
    if (route.state) {
      return this.getActiveRouteName(route.state);
    }
    return route.name;
  }

  // Handle order cancellation
  handleOrderCancellation(booking) {
    const bookingId = booking.bookingId || booking._id;
    console.log('[GlobalOrderManager] ❌ Order cancelled:', bookingId);
    
    // Remove from active orders
    this.activeOrders.delete(bookingId);
    
    // Remove from shown set to allow re-showing if needed
    this.shownOrderIds.delete(bookingId);
    
    // Notify OrdersScreen about the cancellation
    if (this.ordersScreenCallback) {
      this.ordersScreenCallback(this.getActiveOrders());
    }
    
    // Restart polling if rider is online (booking was cancelled, can accept new ones)
    if (this.isOnline && !this.pollingInterval) {
      console.log('[GlobalOrderManager] 🔄 Restarting polling after cancellation');
      this.startGlobalPolling();
    }
    
    // Show cancellation alert
    Alert.alert(
      "❌ Order Cancelled",
      "The customer has cancelled this booking.",
      [{ text: "OK" }]
    );
  }

  // Handle order updates (tips)
  handleOrderUpdate(data) {
    const bookingId = data.bookingId;
    const updates = data.updates || {};
    
    console.log('[GlobalOrderManager] 💰 Order update:', bookingId);
    
    // Update active order
    if (this.activeOrders.has(bookingId)) {
      const order = this.activeOrders.get(bookingId);
      const updatedOrder = {
        ...order,
        totalFare: updates.totalFare || updates.amountPay || updates.price || order.totalFare,
        price: updates.price || order.price,
        amountPay: updates.amountPay || order.amountPay,
        totalDriverEarnings: updates.totalDriverEarnings || order.totalDriverEarnings,
        platformFee: updates.platformFee || order.platformFee,
        gst: updates.gst || order.gst,
        quickFee: updates.quickFee || order.quickFee,
      };
      this.activeOrders.set(bookingId, updatedOrder);
    }
    
    Alert.alert(
      "💰 Tip Added!",
      `Customer added a tip! New earning: ₹${updates.totalDriverEarnings || updates.price}`,
      [{ text: "Great!" }]
    );
  }

  // Handle tip added
  handleTipAdded(message) {
    const bookingId = message.bookingId.toString();
    console.log('[GlobalOrderManager] 💸 Tip added:', bookingId);
    
    // Update active order
    if (this.activeOrders.has(bookingId)) {
      const order = this.activeOrders.get(bookingId);
      const updatedOrder = {
        ...order,
        totalFare: message.newTotalFare || message.newTotal || order.totalFare,
        totalDriverEarnings: message.newTotalEarnings || message.newTotal || order.totalDriverEarnings,
        price: message.newTotal || order.price,
        quickFee: message.tipAmount || order.quickFee || 0
      };
      this.activeOrders.set(bookingId, updatedOrder);
    }
    
    // Gentle vibration for tip
    Vibration.vibrate([0, 200, 100, 200]);
  }

  // Play notification sound and vibration
  async playNotification() {
    try {
      // Sound
      const { sound } = await Audio.Sound.createAsync(
        require("../assets/preview.mp3")
      );
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (e) {
      console.log('[GlobalOrderManager] Sound error:', e);
    }

    // Vibration
    Vibration.vibrate([0, 500, 200, 500]);

    // Push notification (safe for Expo Go)
    await scheduleNotificationSafely({
      content: {
        title: "New Ride Request! 🚗",
        body: "Tap to view order details",
        sound: true,
      },
      trigger: null,
    });
  }

  // IMMEDIATE: Set online status directly (called by toggle button)
  async setOnlineStatus(isOnline) {
    const wasOnline = this.isOnline;
    this.isOnline = isOnline;
    
    console.log('[GlobalOrderManager] ⚡ IMMEDIATE online status update:', isOnline);
    
    // Handle going online
    if (this.isOnline && !wasOnline) {
      console.log('[GlobalOrderManager] 🟢 Going ONLINE - starting services');
      
      // Update backend online status
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const phoneNumber = await AsyncStorage.getItem("number");
        if (phoneNumber) {
          const { updateOnlineStatus } = require('./AuthApi');
          console.log('[GlobalOrderManager] 📡 Updating backend online status...');
          await updateOnlineStatus(phoneNumber, true, null, null, null);
          console.log('[GlobalOrderManager] ✅ Backend online status updated');
        }
      } catch (error) {
        console.error('[GlobalOrderManager] ❌ Failed to update backend status:', error.message);
      }
      
      this.initializeWebSocket();
    }
    
    // Handle going offline
    if (!this.isOnline && wasOnline) {
      console.log('[GlobalOrderManager] 🔴 Going OFFLINE - stopping services');
      
      // Update backend online status
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const phoneNumber = await AsyncStorage.getItem("number");
        if (phoneNumber) {
          const { updateOnlineStatus } = require('./AuthApi');
          console.log('[GlobalOrderManager] 📡 Updating backend offline status...');
          await updateOnlineStatus(phoneNumber, false, null, null, null);
          console.log('[GlobalOrderManager] ✅ Backend offline status updated');
        }
      } catch (error) {
        console.error('[GlobalOrderManager] ❌ Failed to update backend status:', error.message);
      }
      
      this.stopGlobalPolling();
      this.clearAllOrders();
    }
  }

  // Check and update online status
  async checkOnlineStatus() {
    try {
      const onlineStatus = await AsyncStorage.getItem("isOnline");
      const wasOnline = this.isOnline;
      this.isOnline = onlineStatus === "true";
      
      // Only log when status actually changes to reduce log spam
      if (this.isOnline !== wasOnline) {
        console.log('[GlobalOrderManager] 🔄 Online status changed:', this.isOnline);
      }
      
      // Handle going online
      if (this.isOnline && !wasOnline) {
        console.log('[GlobalOrderManager] 🟢 Going ONLINE - starting services');
        
        // Update backend online status
        try {
          const phoneNumber = await AsyncStorage.getItem("number");
          if (phoneNumber) {
            const { updateOnlineStatus } = require('./AuthApi');
            console.log('[GlobalOrderManager] 📡 Syncing online status with backend...');
            await updateOnlineStatus(phoneNumber, true, null, null, null);
            console.log('[GlobalOrderManager] ✅ Backend sync complete');
          }
        } catch (error) {
          console.error('[GlobalOrderManager] ❌ Backend sync failed:', error.message);
        }
        
        await this.initializeWebSocket();
        // Only start polling if WebSocket fails to connect (automatic fallback)
        // WebSocket is primary - polling is backup only
      }
      
      // Handle going offline
      if (!this.isOnline && wasOnline) {
        console.log('[GlobalOrderManager] 🔴 Going OFFLINE - stopping services');
        
        // Update backend online status
        try {
          const phoneNumber = await AsyncStorage.getItem("number");
          if (phoneNumber) {
            const { updateOnlineStatus } = require('./AuthApi');
            console.log('[GlobalOrderManager] 📡 Syncing offline status with backend...');
            await updateOnlineStatus(phoneNumber, false, null, null, null);
            console.log('[GlobalOrderManager] ✅ Backend sync complete');
          }
        } catch (error) {
          console.error('[GlobalOrderManager] ❌ Backend sync failed:', error.message);
        }
        
        this.stopGlobalPolling();
        this.clearAllOrders();
      }
    } catch (error) {
      console.error('[GlobalOrderManager] Status check error:', error);
      this.isOnline = false;
    }
  }

  // Start monitoring online status changes
  startStatusMonitoring() {
    // Check status every 10 seconds (reduced from 5s since WebSocket handles real-time)
    setInterval(() => {
      this.checkOnlineStatus();
    }, 10000);
  }

  // Start global polling for bookings (BACKUP ONLY - WebSocket is primary)
  startGlobalPolling() {
    if (this.pollingInterval) {
      console.log('[GlobalOrderManager] ⚠️ Polling already running');
      return;
    }

    // ✅ CRITICAL FIX: Check WebSocket connection status more thoroughly
    const wsConnected = webSocketService.isConnected;
    if (this.wsInitialized && wsConnected) {
      console.log('[GlobalOrderManager] ✅ WebSocket active - polling disabled (WebSocket-primary mode)');
      return;
    }

    console.log('[GlobalOrderManager] 🔄 Starting FALLBACK polling (WebSocket disconnected) - every 20 seconds');
    
    // Initial fetch
    this.fetchBookings();
    
    // Poll every 20 seconds (ONLY when WebSocket is down) - increased interval to reduce duplicate requests
    this.pollingInterval = setInterval(() => {
      // ✅ CRITICAL FIX: Double-check WebSocket status before each poll
      const wsStillConnected = webSocketService.isConnected;
      if (this.wsInitialized && wsStillConnected) {
        console.log('[GlobalOrderManager] ✅ WebSocket reconnected - stopping fallback polling');
        this.stopGlobalPolling();
        return;
      }
      
      if (this.isOnline) {
        this.fetchBookings();
      }
    }, 20000); // Increased from 15s to 20s - less aggressive to prevent duplicates
  }

  // Stop global polling
  stopGlobalPolling() {
    if (this.pollingInterval) {
      console.log('[GlobalOrderManager] ⏹️ Stopping global polling');
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  // Fetch bookings from API
  async fetchBookings() {
    try {
      // Get phone number
      const phoneNumber = await AsyncStorage.getItem('number');
      if (!phoneNumber) return;

      // Get location
      let location = this.lastLocation;
      
      // Refresh location every minute or if not cached
      if (!location || (Date.now() - location.timestamp) > 60000) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') return;

          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          location = {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
            timestamp: Date.now(),
          };
          this.lastLocation = location;
        } catch (locError) {
          console.log('[GlobalOrderManager] ⚠️ Location error:', locError.message);
          return;
        }
      }

      // Fetch bookings
      const response = await getBookings(location.latitude, location.longitude, phoneNumber);
      
      // If rider has active booking, stop polling to reduce server load
      if (response.hasActiveBooking === true) {
        console.log('[GlobalOrderManager] ⏹️ Rider has active booking - stopping polling');
        this.stopGlobalPolling();
        return;
      }
      
      if (response.success && response.bookings && response.bookings.length > 0) {
        console.log('[GlobalOrderManager] 📦 Found', response.bookings.length, 'bookings');
        
        // Process each booking
        for (const booking of response.bookings) {
          // Only process truly new bookings
          if (!this.shownOrderIds.has(booking.bookingId)) {
            console.log('[GlobalOrderManager] 🆕 New booking detected:', booking.bookingId);
            await this.handleNewOrder(booking);
          }
        }
      }
    } catch (error) {
      console.log('[GlobalOrderManager] ⚠️ Fetch error:', error.message);
    }
  }

  // Set callback for order updates (used by OrderPopup)
  setOrderCallback(callback) {
    this.onOrderCallback = callback;
  }

  // Set callback for OrdersScreen to receive immediate updates
  setOrdersScreenCallback(callback) {
    this.ordersScreenCallback = callback;
  }

  // Remove order from active list
  removeOrder(bookingId) {
    this.activeOrders.delete(bookingId);
    console.log('[GlobalOrderManager] 🗑️ Removed order:', bookingId);
    
    // Notify OrdersScreen about the removal
    if (this.ordersScreenCallback) {
      this.ordersScreenCallback(this.getActiveOrders());
    }
    
    // Restart polling if rider is online (booking completed, can accept new ones)
    if (this.isOnline && !this.pollingInterval) {
      console.log('[GlobalOrderManager] 🔄 Restarting polling after order completion');
      this.startGlobalPolling();
    }
  }

  // Get all active orders
  getActiveOrders() {
    return Array.from(this.activeOrders.values());
  }

  // Clear all orders (when going offline)
  clearAllOrders() {
    this.activeOrders.clear();
    this.shownOrderIds.clear();
    this.pendingOrders = [];
    console.log('[GlobalOrderManager] 🧹 Cleared all orders');
  }

  // Set popup open/close status
  setPopupStatus(isOpen) {
    this.isPopupOpen = isOpen;
    
    // Process pending orders when popup closes
    if (!isOpen && this.pendingOrders.length > 0) {
      const pending = [...this.pendingOrders];
      this.pendingOrders = [];
      setTimeout(() => {
        this.navigateToOrderPopup(pending);
      }, 1000);
    }
  }

  // Force refresh orders (for manual polling backup)
  async forceRefreshOrders() {
    if (!this.isOnline) return;
    
    console.log('[GlobalOrderManager] 🔄 Force refresh orders');
    // This can be called by screens for backup polling
    // The WebSocket should handle most cases, but this provides fallback
  }

  // Retry WebSocket initialization (call after phone verification)
  async retryWebSocketInitialization() {
    console.log('[GlobalOrderManager] 🔄 Retrying WebSocket initialization...');
    this.wsInitialized = false; // Reset the flag
    await this.initializeWebSocket();
  }

  // Restart polling (call after booking completion) - ONLY if WebSocket is down
  restartPolling() {
    if (!this.isOnline) {
      console.log('[GlobalOrderManager] ⚠️ Cannot restart polling - rider is offline');
      return;
    }
    
    // Check if WebSocket is connected
    if (this.wsInitialized && webSocketService.isConnected) {
      console.log('[GlobalOrderManager] ✅ WebSocket active - no need to restart polling');
      return;
    }
    
    if (this.pollingInterval) {
      console.log('[GlobalOrderManager] ⚠️ Polling already running');
      return;
    }
    
    console.log('[GlobalOrderManager] 🔄 Manually restarting FALLBACK polling (WebSocket inactive)...');
    this.startGlobalPolling();
  }
}

// Create singleton instance
const globalOrderManager = new GlobalOrderManager();

export default globalOrderManager;