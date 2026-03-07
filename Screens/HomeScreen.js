import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Easing,
  Alert,
  Image,
  Vibration,
  Dimensions,
  ScrollView,
  Platform,
  StatusBar,
  Modal,
  InteractionManager,
} from "react-native";
import {
  MaterialIcons,
  Ionicons,
  FontAwesome5,
  MaterialCommunityIcons,
  Feather,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useFocusEffect, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCurrentAddress } from "../utils/Location";
import { getBookings, getOngoingBookingForRider } from "../utils/BookingApi";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { Audio } from "expo-av";
import { updateOnlineStatus } from "../utils/AuthApi";
import { getCachedRiderData } from "../utils/RiderDataManager";
import { getRiderEarnings, calculateEarnings } from "../utils/EarningsApi";
import webSocketService from "../utils/WebSocketService";
import globalOrderManager from "../utils/GlobalOrderManager";
import pushNotificationManager from "../utils/PushNotificationManager";
import riderLocationManager from "../utils/RiderLocationManager";
import { API_CONFIG } from '../config/api';
import { log, normalizeRider, createSafeTimeout } from '../utils/homeHelpers';

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function HomeScreen() {
  // FIX: Use null initial state to indicate "not loaded yet" - prevents false state flicker
  const [isOnDuty, setIsOnDuty] = useState(null);
  const [notificationCount, setNotificationCount] = useState(35);
  const [greeting, setGreeting] = useState("");
  const toggleAnim = useRef(new Animated.Value(0)).current; // Better pattern with useRef
  const pulseAnim = useRef(new Animated.Value(1)).current; // For toggle circle only
  const bookingPulseAnim = useRef(new Animated.Value(1)).current; // For active booking indicator
  const searchingRotateAnim = useRef(new Animated.Value(0)).current; // For searching spinner
  const scaleAnim = useRef(new Animated.Value(1)).current; // For press scale effect
  const pulseAnimationRef = useRef(null); // Store animation reference for cleanup
  const searchingAnimationRef = useRef(null); // Store searching animation reference
  const navigation = useNavigation();
  const route = useRoute();
  const [currentAddress, setCurrentAddress] = useState("");
  const pollingRef = useRef(null);
  const [lastBookingId, setLastBookingId] = useState(null);
  const [hasOngoingOrder, setHasOngoingOrder] = useState(false);
  const [ongoingBooking, setOngoingBooking] = useState(null); // Store ongoing booking data
  const [isToggling, setIsToggling] = useState(false); // Loading state during toggle
  const shownBookingIds = useRef(new Set()); // Track bookings we've already alerted about
  const [wsConnected, setWsConnected] = useState(false); // WebSocket connection status
  const isLoadingRiderData = useRef(false); // Prevent duplicate loadRiderData calls
  const lastFocusTime = useRef(0); // Debounce focus events
  const lastRiderDataFetch = useRef(0); // Throttle rider data fetches
  const hasNavigatedToActiveOrder = useRef(false); // ONE-TIME navigation flag (prevents WebSocket flickering)
  
  // APK flickering prevention - stable state management
  const stableIsOnDuty = useRef(false); // Track stable duty state
  const lastStateChangeTime = useRef(0); // Prevent rapid state changes
  const riderDataLock = useRef(false); // Global lock to prevent ANY simultaneous API calls
  const isTogglingOperation = useRef(false); // Lock during toggle operation to prevent useFocusEffect interference
  const isDeferredOperationsInProgress = useRef(false); // Track if deferred operations (3s delay) are running
  const wsInitLock = useRef(false); // Prevent duplicate WebSocket initialization
  const safeTimeout = useRef(createSafeTimeout()).current; // Safe timeout manager to prevent memory leaks
  const isUserToggle = useRef(false); // Track if state change is from user toggle vs external
  const inFlightRequests = useRef(new Set()); // Track in-flight API requests to prevent duplicates
  const STATE_CHANGE_DEBOUNCE = 1000; // Min 1 second between state changes (increased for APK)
  const RIDER_DATA_THROTTLE = 5000; // Min 5 seconds between rider data fetches (matches polling)
  const FOCUS_DEBOUNCE = 3000; // Min 3 seconds between focus events (increased from 1s for APK stability)
  
  // Location cache to avoid repeated geocoding
  const locationCache = useRef({
    data: null,
    timestamp: null
  });
  
  // Listen to RiderLocationManager updates
  useEffect(() => {
    const unsubscribe = riderLocationManager.addListener((locationData) => {
      const address = riderLocationManager.getCurrentAddress();
      if (address && address !== currentAddress) {
        setCurrentAddress(address);
      }
    });
    
    // Load initial address if available
    const initialAddress = riderLocationManager.getCurrentAddress();
    if (initialAddress) {
      setCurrentAddress(initialAddress);
    }
    
    return unsubscribe;
  }, []);
  
  // REMOVED: Local rider data cache - now using global RiderDataManager singleton
  // REMOVED: Local rider cache - now using global RiderDataManager singleton
  
  // Helper function to check if location cache is valid
  const isLocationCacheValid = () => {
    return locationCache.current.timestamp && 
           (Date.now() - locationCache.current.timestamp) < 300000; // 5 minutes
  };
  
  // New state for attractive UI
  const [todayOrders, setTodayOrders] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [weeklyEarnings, setWeeklyEarnings] = useState(0);
  const [riderData, setRiderData] = useState(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  
  // Registration completion state
  const [showRegistrationPopup, setShowRegistrationPopup] = useState(false);
  const [registrationStep, setRegistrationStep] = useState('complete');
  
  // Wallet balance tracking
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletBlocked, setWalletBlocked] = useState(false);
  const [graceOrdersUsed, setGraceOrdersUsed] = useState(0);
  
  // Rider status tracking
  const [isRiderBlocked, setIsRiderBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [isWalletBlock, setIsWalletBlock] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const statsScaleAnim = useRef(new Animated.Value(0.9)).current;
  const floatingPopupAnim = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current; // For smooth content transitions

  useEffect(() => {
    updateGreeting();

    // Read duty status from AsyncStorage on mount
    const initializeDutyStatus = async () => {
      const value = await AsyncStorage.getItem("isOnline");
      const savedDutyStatus = value === "true";
      
      stableIsOnDuty.current = savedDutyStatus;
      lastStateChangeTime.current = Date.now();
      
      console.log("🎬 [TOGGLE STATE] Setting initial state from AsyncStorage:", savedDutyStatus);
      
      // Set animation position BEFORE state update
      toggleAnim.setValue(savedDutyStatus ? 1 : 0);
      console.log("🎨 [TOGGLE ANIMATION] Animation position set to:", savedDutyStatus ? "ON (1)" : "OFF (0)");
      
      // Now set state
      setIsOnDuty(savedDutyStatus);
      
      log("✅ [Initial Mount] Duty status loaded:", savedDutyStatus);
    };
    initializeDutyStatus();
    
    // Check registration status
    checkRegistrationStatus();
    
    // Check for ongoing booking on initial mount
    safeTimeout.set(() => {
      console.log("🔍 [Initial Mount] Checking for ongoing bookings...");
      checkOngoingBooking(false); // Check on mount
    }, 2000); // Wait 2 seconds for rider data to load
    
    // Check for active booking on app mount and auto-navigate (ONE-TIME)
    safeTimeout.set(() => {
      checkAndNavigateToActiveOrder();
    }, 3000); // Wait 3 seconds after mount for stability
    
    // SIMPLIFIED: No WebSocket, no bookings, no services - just status toggle
    
    // Periodic check for blocked status (only for already-blocked riders - every 10 seconds)
    const blockedStatusInterval = setInterval(async () => {
      // Only check if rider is currently blocked (to detect unblocking)
      if (!isRiderBlocked) {
        return; // Skip check if not blocked
      }
      
      try {
        log("🔄 [Periodic Check] Checking if blocked rider is now unblocked...");
        const freshRiderData = await getCachedRiderData(false); // false = force fresh fetch
        const rider = freshRiderData?.data || freshRiderData?.rider || freshRiderData;
        const currentlyBlocked = rider?.isBlocked === 'true' || rider?.isBlocked === true || rider?.status === 'blocked';
        
        // Check if it's a wallet block
        const isWalletRelatedBlock = rider?.negativeBalanceGrace?.isBlockedForNegativeBalance === true;
        const currentBlockReason = rider?.blockReason || '';
        
        // Only update if status changed (rider was unblocked)
        if (!currentlyBlocked && isRiderBlocked) {
          log("✅ [Periodic Check] Rider was unblocked!");
          setIsRiderBlocked(false);
          setBlockReason('');
          setIsWalletBlock(false);
        }
      } catch (error) {
        log("❌ [Periodic Check] Error checking blocked status:", error);
      }
    }, 10000); // Check every 10 seconds
    
    // Animate content on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(statsScaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();

    // Note: Ongoing booking polling is handled in the isOnDuty useEffect
    // No need for separate interval here

    return () => {
      // Stop all animations on unmount
      stopPulseAnimations();
      stopSearchingAnimation();
      
      // Clear blocked status check interval
      if (blockedStatusInterval) {
        clearInterval(blockedStatusInterval);
      }
      
      // Don't disconnect WebSocket - GlobalOrderManager manages it globally
      console.log('[HomeScreen] 🧹 Cleanup: keeping WebSocket connected (managed by GlobalOrderManager)');
      
      // Stop location tracking
      stopLocationTracking();
      
      // Clear all safe timeouts
      safeTimeout.clearAll();
      
      // Clear all intervals
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  // ============================================
  // REAL-TIME WALLET UNBLOCK LISTENER
  // ============================================
  useEffect(() => {
    const notificationListener = Notifications.addNotificationReceivedListener(async (notification) => {
      const data = notification.request.content.data;
      
      // Handle wallet unblock notification
      if (data?.type === 'WALLET_UNBLOCKED') {
        console.log('🎉 Received wallet unblock notification:', data);
        
        // Fetch fresh rider data immediately
        try {
          const freshRiderData = await getCachedRiderData(false); // Force fresh fetch
          const rider = freshRiderData?.data || freshRiderData?.rider || freshRiderData;
          
          // Update all states
          setIsRiderBlocked(false);
          setBlockReason('');
          setIsWalletBlock(false);
          setWalletBalance(rider?.walletBalance || 0);
          setWalletBlocked(false);
          
          console.log('✅ UI updated after wallet unblock - rider can now go online');
          
          // Show success alert
          Alert.alert(
            '✅ Account Activated',
            `Your wallet has been recharged to ₹${(rider?.walletBalance || 0).toFixed(2)}. You can now go online and accept orders!`,
            [{ text: 'OK' }]
          );
        } catch (error) {
          console.error('❌ Error refreshing rider data after unblock:', error);
        }
      }
      
      // Handle account blocked notification (from admin)
      if (data?.type === 'ACCOUNT_BLOCKED') {
        console.log('🚫 Received account blocked notification:', data);
        
        const isWalletRelatedBlock = data?.isWalletBlock === true;
        const blockReason = data?.blockReason || '';
        
        // Update all states
        setIsRiderBlocked(true);
        setBlockReason(blockReason);
        setIsWalletBlock(isWalletRelatedBlock);
        
        // Force rider offline if currently online
        if (isOnDuty) {
          console.log('🚫 Forcing rider OFF DUTY due to admin blocking');
          await AsyncStorage.setItem("isOnline", "false");
          stableIsOnDuty.current = false;
          setIsOnDuty(false);
          toggleAnim.setValue(0);
        }
        
        // Show blocking alert
        Alert.alert(
          isWalletRelatedBlock ? "Wallet Issue" : "Account Blocked",
          blockReason || (isWalletRelatedBlock 
            ? "Your wallet balance is less than ₹0. Please add minimum amount of ₹100 to activate your account."
            : "Your account has been blocked by admin. Please contact support for assistance."),
          [
            { 
              text: isWalletRelatedBlock ? "Recharge Now" : "Contact Support", 
              onPress: () => navigation.navigate(isWalletRelatedBlock ? 'Wallet' : 'Help And Sopport')
            },
            { text: "OK", style: "cancel" }
          ]
        );
      }
    });

    return () => {
      if (notificationListener) {
        notificationListener.remove();
      }
    };
  }, [isOnDuty]);

  // Listen for wallet recharge updates from WalletScreen
  useEffect(() => {
    if (route.params?.walletRecharged === true) {
      console.log('💰 Wallet recharged - refreshing rider data');
      
      // Fetch fresh rider data
      getCachedRiderData(false).then((freshRiderData) => {
        const rider = freshRiderData?.data || freshRiderData?.rider || freshRiderData;
        
        // Update all states
        setIsRiderBlocked(false);
        setBlockReason('');
        setIsWalletBlock(false);
        setWalletBalance(rider?.walletBalance || route.params?.newBalance || 0);
        setWalletBlocked(false);
        
        console.log('✅ UI updated after wallet recharge');
      }).catch((error) => {
        console.error('❌ Error refreshing rider data:', error);
      });
      
      // Clear the param
      navigation.setParams({ walletRecharged: undefined, newBalance: undefined });
    }
  }, [route.params?.walletRecharged]);

  // Listen for online status updates from other screens
  useEffect(() => {
    if (route.params?.onlineStatusUpdated && route.params?.isOnline !== undefined) {
      const updatedStatus = route.params.isOnline;
      const now = Date.now();
      
      log("📨 HomeScreen: Received online status update:", updatedStatus);
      
      // Skip if state is still loading (null)
      if (isOnDuty === null) {
        log("⏭️ Waiting for initial state to load from storage");
        return;
      }
      
      // APK Flickering Fix: Debounce rapid state changes
      if (now - lastStateChangeTime.current < STATE_CHANGE_DEBOUNCE) {
        log("⏭️ Debounced: Too soon since last state change");
        return;
      }
      
      // Only update if different from stable state
      if (updatedStatus !== stableIsOnDuty.current) {
        log("🔄 HomeScreen: Applying external status change");
        console.log("🎬 [TOGGLE STATE] Route params changing state from", stableIsOnDuty.current, "to", updatedStatus);
        stableIsOnDuty.current = updatedStatus;
        lastStateChangeTime.current = now;
        
        // Direct state update - no requestAnimationFrame to prevent visible flicker
        setIsOnDuty(updatedStatus);
        toggleAnim.setValue(updatedStatus ? 1 : 0);
        console.log("🎨 [TOGGLE ANIMATION] Animation position updated to:", updatedStatus ? "ON (1)" : "OFF (0)");
      } else {
        log("⏭️ Route params status same as current, ignoring");
      }
    }
  }, [route.params?.onlineStatusUpdated, route.params?.isOnline]);

  // ============================================
  // LOCATION TRACKING: Start when online, stop when offline
  // ============================================
  useEffect(() => {
    // Skip if state is still loading or during toggle operation
    if (isOnDuty === null || isTogglingOperation.current) {
      return;
    }

    const manageLocationTracking = async () => {
      if (isOnDuty) {
        // Start tracking if not already tracking
        if (!riderLocationManager.isCurrentlyTracking()) {
          log('📍 [Location Manager] Starting tracking (rider is online)');
          await startLocationTracking();
        }
      } else {
        // Stop tracking when offline
        if (riderLocationManager.isCurrentlyTracking()) {
          log('⏸️ [Location Manager] Stopping tracking (rider is offline)');
          stopLocationTracking();
        }
      }
    };

    manageLocationTracking();
  }, [isOnDuty]);

  // ❌ REMOVED useFocusEffect - Was causing UI flickering on app reload and focus events
  // All operations now triggered ONLY by user actions (toggle button) or one-time initialization
  // This prevents the loop: app reload → background/foreground → useFocusEffect → setIsOnDuty → flicker

  // Separate useFocusEffect for registration check ONLY
  useFocusEffect(
    useCallback(() => {
      checkRegistrationStatus();
      checkDocumentApprovalStatus(); // Check if documents are approved
      
      // Refresh rider data when screen comes into focus (e.g., after wallet recharge)
      const refreshRiderData = async () => {
        try {
          const freshRiderData = await getCachedRiderData(false);
          const rider = freshRiderData?.data || freshRiderData?.rider || freshRiderData;
          
          if (rider) {
            // Update blocked status
            const currentlyBlocked = rider?.isBlocked === 'true' || rider?.isBlocked === true || rider?.status === 'blocked';
            const isWalletRelatedBlock = rider?.negativeBalanceGrace?.isBlockedForNegativeBalance === true;
            
            setIsRiderBlocked(currentlyBlocked);
            setBlockReason(rider?.blockReason || '');
            setIsWalletBlock(isWalletRelatedBlock);
            setWalletBalance(rider?.walletBalance || 0);
            setWalletBlocked(rider?.negativeBalanceGrace?.isBlockedForNegativeBalance || false);
            
            console.log('✅ Rider data refreshed on focus:', {
              isBlocked: currentlyBlocked,
              walletBalance: rider?.walletBalance,
              isWalletBlock: isWalletRelatedBlock
            });
          }
        } catch (error) {
          console.error('❌ Error refreshing rider data on focus:', error);
        }
      };
      
      refreshRiderData();
      
      // Cleanup function to hide popup when screen loses focus
      return () => {
        setShowRegistrationPopup(false);
      };
    }, [])
  );

  // Control booking pulse animation based on hasOngoingOrder state
  useEffect(() => {
    if (hasOngoingOrder) {
      // Start pulse animation when there's an ongoing order
      if (!pulseAnimationRef.current) {
        animateFloatingPopup();
      }
    } else {
      // Stop pulse animation when no ongoing order
      stopPulseAnimations();
      // Also hide the floating popup
      Animated.timing(floatingPopupAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
    
    return () => {
      // Cleanup when component unmounts or hasOngoingOrder changes
      stopPulseAnimations();
    };
  }, [hasOngoingOrder]);

  useEffect(() => {
    console.log("🔄 [isOnDuty useEffect] Triggered. Current isOnDuty:", isOnDuty, "| isUserToggle:", isUserToggle.current);
    
    // Skip if state is still loading from AsyncStorage (null = initial state)
    if (isOnDuty === null) {
      log("⏭️ Skipping isOnDuty useEffect - state still loading from storage");
      return;
    }
    
    // SIMPLIFIED: Toggle button now ONLY updates backend status
    // All other operations (WebSocket, bookings, etc.) removed for simplicity
    log("✅ isOnDuty changed to:", isOnDuty ? "ON" : "OFF");
    
    // Reset user toggle flag
    isUserToggle.current = false;
    
    // No service initialization - just status update
  }, [isOnDuty]);

  const circleTranslateX = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCREEN_WIDTH * 0.36 - 44],
  });

  const updateGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning Captain 🌤");
    else if (hour < 17) setGreeting("Good Afternoon Captain 🌤");
    else setGreeting("Good Evening Captain 🌤");
  };

  // Animate floating popup entrance with controlled pulse
  const animateFloatingPopup = () => {
    // Stop any existing pulse animation
    stopPulseAnimations();
    
    // Reset animation values
    bookingPulseAnim.setValue(1);
    
    // First animate the popup entrance
    Animated.spring(floatingPopupAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    // Only animate on iOS or if explicitly enabled on Android
    // Platform check to prevent flickering on Android APK builds
    if (Platform.OS === 'ios') {
      // Start controlled pulse animation for booking indicator only
      pulseAnimationRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(bookingPulseAnim, {
            toValue: 1.08,
            duration: 1000,
            useNativeDriver: true,
            isInteraction: false, // Prevent blocking in production
          }),
          Animated.timing(bookingPulseAnim, {
            toValue: 0.92,
            duration: 1000,
            useNativeDriver: true,
            isInteraction: false,
          }),
        ])
      );
      pulseAnimationRef.current.start();
    } else {
      // On Android, use simple static scale to prevent flickering
      bookingPulseAnim.setValue(1);
    }
  };
  
  // Stop pulse animations with cleanup
  const stopPulseAnimations = () => {
    if (pulseAnimationRef.current) {
      pulseAnimationRef.current.stop();
      pulseAnimationRef.current = null;
    }
    bookingPulseAnim.setValue(1);
  };
  
  // Start searching animation (rotation only)
  const startSearchingAnimation = () => {
    if (searchingAnimationRef.current) return; // Already running
    
    searchingRotateAnim.setValue(0);
    
    // Only animate on iOS to prevent Android APK flickering
    if (Platform.OS === 'ios') {
      searchingAnimationRef.current = Animated.loop(
        Animated.timing(searchingRotateAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
          isInteraction: false, // Prevent blocking other interactions in production
        })
      );
      searchingAnimationRef.current.start();
    }
  };
  
  // Stop searching animation
  const stopSearchingAnimation = () => {
    if (searchingAnimationRef.current) {
      searchingAnimationRef.current.stop();
      searchingAnimationRef.current = null;
    }
    searchingRotateAnim.setValue(0);
  };

  const playNotification = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require("../assets/preview.mp3")
      );
      await sound.playAsync();
      Vibration.vibrate(1000);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.log("Error playing notification:", error);
    }
  };

  // Optimized: Separate address fetching (now using RiderLocationManager)
  const fetchCurrentAddress = async () => {
    try {
      // Get from RiderLocationManager if available and recent
      if (riderLocationManager.isLocationValid()) {
        const address = riderLocationManager.getCurrentAddress();
        if (address && currentAddress !== address) {
          console.log("🏠 Using RiderLocationManager address");
          setCurrentAddress(address);
        }
        return riderLocationManager.getLocationData();
      }

      // Fetch fresh location (RiderLocationManager will cache it)
      const locationData = await riderLocationManager.fetchLocation(true); // true = skip WebSocket (tracking handles that)
      
      if (locationData) {
        const address = riderLocationManager.getCurrentAddress();
        if (address && currentAddress !== address) {
          setCurrentAddress(address);
        }
        return { 
          address, 
          latitude: locationData.latitude, 
          longitude: locationData.longitude 
        };
      }
      
      // Fallback to old cache if exists
      if (isLocationCacheValid()) {
        if (currentAddress !== locationCache.current.data.address) {
          setCurrentAddress(locationCache.current.data.address);
        }
        return locationCache.current.data;
      }

      if (currentAddress !== "Location permission denied") {
        setCurrentAddress("Location permission denied");
      }
      return null;
    } catch (err) {
      console.log("❌ Error fetching address:", err.message);
      if (currentAddress !== "Unable to fetch address") {
        setCurrentAddress("Unable to fetch address");
      }
      return null;
    }
  };

  // Optimized: Fast booking fetch (similar to OrdersScreen)
  const fetchBookingsOnly = async (silent = true) => {
    // CRITICAL: Don't run during toggle or deferred operations
    if (isTogglingOperation.current || isDeferredOperationsInProgress.current) {
      log("⏭️ [fetchBookingsOnly] Skipped - toggle/deferred operation in progress");
      return;
    }
    
    // CRITICAL: Prevent duplicate simultaneous calls
    const requestKey = 'fetchBookingsOnly';
    if (inFlightRequests.current.has(requestKey)) {
      console.log('🚫 [fetchBookingsOnly] Already in progress, skipping duplicate call');
      return;
    }
    
    try {
      if (!isOnDuty) return;
      
      inFlightRequests.current.add(requestKey);
      console.log("🚀 [fetchBookingsOnly] Fast booking fetch...");
      
      // Get location (use cache or fresh)
      let locationData = isLocationCacheValid() ? locationCache.current.data : null;
      
      if (!locationData) {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        
        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        locationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        };
      }

      const phoneNumber = await AsyncStorage.getItem("number");
      if (!phoneNumber) return;

      // Fast API call
      const booking = await getBookings(locationData.latitude, locationData.longitude, phoneNumber);
      
      console.log("📦 [fetchBookingsOnly] API Response:", {
        success: booking.success,
        bookingsCount: booking.bookings?.length || 0,
        hasActiveBooking: booking.hasActiveBooking,
        silent: silent
      });
      
      if (booking.success && booking.bookings?.length > 0) {
        console.log("⚡ Fast fetch found", booking.bookings.length, "bookings - calling handleNewBookings");
        console.log("📋 Bookings data:", JSON.stringify(booking.bookings, null, 2));
        handleNewBookings(booking.bookings, silent);
      } else if (booking.hasActiveBooking) {
        console.log("ℹ️ Fast fetch: Driver has active booking, no new bookings available");
        // This is normal - driver has an ongoing booking, so no new requests
      } else if (!silent) {
        console.log("📭 No bookings from fast fetch");
      }
    } catch (err) {
      if (!silent) {
        console.error("❌ Fast booking fetch error:", err.message);
      }
    } finally {
      // Release request lock
      inFlightRequests.current.delete('fetchBookingsOnly');
    }
  };

  // Handle new bookings (extracted from complex logic)
  const handleNewBookings = async (bookings, silent = true) => {
    try {
      console.log("🔔 [handleNewBookings] Called with:", {
        bookingsCount: bookings.length,
        silent: silent,
        bookingIds: bookings.map(b => b.bookingId)
      });
      
      // Check for ongoing booking first
      const riderData = await getCachedRiderData();
      const riderId = riderData?._id || riderData?.id || riderData?.rider?._id;
      
      // Batch state updates to prevent multiple re-renders (production optimization)
      const updates = {};
      let hasUpdates = false;
      
      // Collect wallet balance update
      if (riderData?.walletBalance !== undefined && riderData.walletBalance !== walletBalance) {
        updates.walletBalance = riderData.walletBalance || 0;
        hasUpdates = true;
      }
      
      // Collect block reason and type
      const currentBlockReason = riderData?.blockReason || '';
      const isWalletRelatedBlock = riderData?.negativeBalanceGrace?.isBlockedForNegativeBalance === true;
      
      if (currentBlockReason !== blockReason) {
        updates.blockReason = currentBlockReason;
        hasUpdates = true;
      }
      
      if (isWalletRelatedBlock !== isWalletBlock) {
        updates.isWalletBlock = isWalletRelatedBlock;
        hasUpdates = true;
      }
      
      // Collect grace status updates
      if (riderData?.negativeBalanceGrace) {
        const newBlocked = riderData.negativeBalanceGrace.isBlockedForNegativeBalance || false;
        const newGraceUsed = riderData.negativeBalanceGrace.graceOrdersUsed || 0;
        
        if (newBlocked !== walletBlocked) {
          updates.walletBlocked = newBlocked;
          hasUpdates = true;
        }
        if (newGraceUsed !== graceOrdersUsed) {
          updates.graceOrdersUsed = newGraceUsed;
          hasUpdates = true;
        }
      }
      
      // Collect blocked status update
      const isBlocked = riderData?.isBlocked === 'true' || riderData?.isBlocked === true || riderData?.status === 'blocked';
      if (isBlocked !== isRiderBlocked) {
        updates.isRiderBlocked = isBlocked;
        hasUpdates = true;
      }
      
      // Apply all updates immediately without requestAnimationFrame (prevents flickering)
      if (hasUpdates) {
        // Batch updates to minimize re-renders
        if (updates.walletBalance !== undefined) setWalletBalance(updates.walletBalance);
        if (updates.walletBlocked !== undefined) setWalletBlocked(updates.walletBlocked);
        if (updates.graceOrdersUsed !== undefined) setGraceOrdersUsed(updates.graceOrdersUsed);
        if (updates.isRiderBlocked !== undefined) setIsRiderBlocked(updates.isRiderBlocked);
        if (updates.blockReason !== undefined) setBlockReason(updates.blockReason);
        if (updates.isWalletBlock !== undefined) setIsWalletBlock(updates.isWalletBlock);
      }
      
      let ongoingBooking = null;
      
      if (riderId) {
        ongoingBooking = await getOngoingBookingForRider({ riderId });
      }

      if (ongoingBooking && ongoingBooking._id) {
        console.log("ℹ️ Has ongoing booking, but still allowing new booking alerts");
        // Animation is now controlled by useEffect based on hasOngoingOrder state
        // Continue processing new bookings - removed the return statement
      }

      // Check if already on Order screens
      const navState = navigation.getState ? navigation.getState() : null;
      const activeRouteName = getActiveRouteName(navState);
      
      console.log("🔍 [handleNewBookings] Current route:", activeRouteName);
      
      if (activeRouteName === "Orders" || activeRouteName === "OrderPopup") {
        console.log("📍 Already on Order screen, skipping navigation");
        return;
      }

      // Find truly new bookings
      const newBookings = bookings.filter(b => !shownBookingIds.current.has(b.bookingId));
      
      console.log("🔍 [handleNewBookings] Filtering bookings:", {
        totalBookings: bookings.length,
        newBookings: newBookings.length,
        alreadyShown: Array.from(shownBookingIds.current)
      });
      
      // ALWAYS show new bookings, regardless of silent flag
      if (newBookings.length > 0) {
        console.log("🎉 NEW BOOKING DETECTED! Navigating to OrderPopup for", newBookings.length, "new bookings");
        
        // Mark as shown
        newBookings.forEach(b => shownBookingIds.current.add(b.bookingId));
        
        playNotification();
        
        // Format bookings for OrderPopup
        const formattedBookings = newBookings.map(booking => ({
          bookingId: booking.bookingId,
          from: booking.from,
          to: booking.to,
          driverToFromKm: booking.driverToFromKm,
          fromToDropKm: booking.fromToDropKm,
          price: booking.price || booking.totalFare || Number(booking.amountPay) || 0,
          totalFare: booking.totalFare || booking.price || Number(booking.amountPay) || 0,
          amountPay: booking.amountPay || booking.price?.toString() || '0',
          totalDriverEarnings: booking.totalDriverEarnings || 0,
          platformFee: booking.platformFee || 0,
          gst: booking.gst || 0,
          quickFee: booking.quickFee || 0,
          tipAmount: booking.quickFee || 0,
          status: booking.status,
          vehicleType: booking.vehicleType,
        }));
        
        // Navigate directly to OrderPopup
        navigation.navigate("OrderPopup", { 
          orders: formattedBookings
        });
      }
    } catch (err) {
      console.log("⚠️ Error handling new bookings:", err.message);
    }
  };

  // Check registration status
  const checkRegistrationStatus = async () => {
    try {
      const isComplete = await AsyncStorage.getItem("registrationComplete");
      const step = await AsyncStorage.getItem("registrationStep");
      
      console.log("🔍 Registration Status Check on HomeScreen:", { isComplete, step });
      
      // If registration is explicitly incomplete, redirect to appropriate step
      if (isComplete === "false" && step !== "complete" && step !== null) {
        console.log("⚠️ Registration incomplete detected - redirecting to:", step);
        setRegistrationStep(step);
        
        // Redirect to appropriate screen
        if (step === 'vehicle') {
          console.log("➡️ Redirecting to Vehicle Registration");
          navigation.replace('Vehicleregister');
        } else if (step === 'driver') {
          console.log("➡️ Redirecting to Driver Details");
          navigation.replace('Driver Details');
        } else if (step === 'personal') {
          console.log("➡️ Redirecting to Driver Registration");
          navigation.replace('DriverRegister');
        } else {
          // Unknown step but incomplete - show popup as fallback
          setShowRegistrationPopup(true);
        }
      } else if (isComplete === "true" || step === "complete") {
        // Registration is complete, hide popup
        console.log("✅ Registration is complete");
        setShowRegistrationPopup(false);
      } else {
        // No registration status found (legacy users or first time) - assume complete
        console.log("ℹ️ No registration status found - assuming complete (legacy user)");
        setShowRegistrationPopup(false);
      }
    } catch (error) {
      console.error("❌ Error checking registration status:", error);
    }
  };

  // Check if documents are approved, if not redirect to MyVehiclesScreen
  const checkDocumentApprovalStatus = async () => {
    try {
      const paymentCompleted = await AsyncStorage.getItem("paymentCompleted");
      
      // Only check if payment is completed
      if (paymentCompleted === "true") {
        console.log("💰 Payment completed - checking document approval status...");
        
        const freshRiderData = await getCachedRiderData(false); // Force fresh fetch
        const rider = freshRiderData?.data || freshRiderData?.rider || freshRiderData;
        const documentStatus = rider?.documentStatus || 'Pending';
        
        console.log("📋 Document Status:", documentStatus);
        
        if (documentStatus !== 'Approved') {
          console.log("⏳ Documents not yet approved - redirecting to My Vehicle screen");
          Alert.alert(
            "Document Verification Pending",
            `Your documents are ${documentStatus === 'Rejected' ? 'rejected' : 'pending verification'}. Please wait on the My Vehicle screen until they are approved.`,
            [
              {
                text: "Go to My Vehicle",
                onPress: () => navigation.replace('My Vehicle')
              }
            ]
          );
        } else {
          console.log("✅ Documents approved - can access Home screen");
        }
      }
    } catch (error) {
      console.error("❌ Error checking document approval status:", error);
    }
  };

  const toggleDuty = async () => {
    log("🔘 Simple toggle - current:", isOnDuty ? "ON" : "OFF");

    // CRITICAL: Fetch fresh rider status from backend before allowing toggle
    // This ensures we have the latest blocking status in case admin just unblocked
    try {
      log("🔄 Fetching fresh rider status before toggle...");
      const freshRiderData = await getCachedRiderData(false); // false = force fresh fetch
      const rider = freshRiderData?.data || freshRiderData?.rider || freshRiderData;
      const currentlyBlocked = rider?.isBlocked === 'true' || rider?.isBlocked === true || rider?.status === 'blocked';
      
      // Check if it's a wallet block
      const isWalletRelatedBlock = rider?.negativeBalanceGrace?.isBlockedForNegativeBalance === true;
      const currentBlockReason = rider?.blockReason || '';
      const currentWalletBalance = rider?.walletBalance || 0;
      
      // Update the blocked status with fresh data
      if (currentlyBlocked !== isRiderBlocked) {
        log("📊 Updating blocked status from backend:", currentlyBlocked);
        setIsRiderBlocked(currentlyBlocked);
        setBlockReason(currentBlockReason);
        setIsWalletBlock(isWalletRelatedBlock);
      }
      
      // Check if rider is blocked
      if (currentlyBlocked) {
        log("🚫 Rider is blocked (fresh check) - toggle disabled");
        
        // Show different messages based on block type
        if (isWalletRelatedBlock || currentBlockReason.toLowerCase().includes('wallet') || currentBlockReason.toLowerCase().includes('negative')) {
          Alert.alert(
            "Wallet Issue",
            `Your wallet balance is less than ₹0 (Current: ₹${currentWalletBalance.toFixed(2)}). Please add minimum amount of ₹100 to activate your account.`,
            [
              { text: "Recharge Now", onPress: () => navigation.navigate('Wallet') },
              { text: "Cancel", style: "cancel" }
            ]
          );
        } else {
          Alert.alert(
            "Account Blocked",
            "Your account has been blocked by the admin. Please contact support for assistance.",
            [
              { text: "Contact Support", onPress: () => navigation.navigate('Help And Sopport') },
              { text: "OK", style: "default" }
            ]
          );
        }
        return;
      }
      
      log("✅ Rider is not blocked - proceeding with toggle");
    } catch (error) {
      log("❌ Error fetching fresh rider status:", error);
      // If fetch fails, fall back to cached state check
      if (isRiderBlocked) {
        log("🚫 Rider is blocked (cached) - toggle disabled");
        Alert.alert(
          "Account Blocked",
          "Your account has been blocked by the admin. Please contact support for assistance.",
          [
            { text: "Contact Support", onPress: () => navigation.navigate('Help And Sopport') },
            { text: "OK", style: "default" }
          ]
        );
        return;
      }
    }

    // Prevent double clicks
    if (isToggling) return;

    const newDutyStatus = !isOnDuty;
    const now = Date.now();
    
    // Debounce rapid clicks
    if (now - lastStateChangeTime.current < 500) {
      log("⏭️ Too soon, ignoring");
      return;
    }
    
    // Update refs
    setIsToggling(true);
    isUserToggle.current = true;
    stableIsOnDuty.current = newDutyStatus;
    lastStateChangeTime.current = now;
    
    // Save to storage
    await AsyncStorage.setItem("isOnline", newDutyStatus ? "true" : "false");
    log("💾 Saved:", newDutyStatus);

    // ⚡ IMMEDIATE: Update GlobalOrderManager status (prevents race condition)
    try {
      globalOrderManager.setOnlineStatus(newDutyStatus);
      log("⚡ GlobalOrderManager updated immediately");
    } catch (error) {
      log("⚠️ Failed to update GlobalOrderManager:", error);
    }

    // Update state
    setIsOnDuty(newDutyStatus);
    
    // Animate
    const toValue = newDutyStatus ? 1 : 0;
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.92,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(toggleAnim, {
        toValue,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsToggling(false);
      log("✅ Done");
    });

    // ONLY update backend - no other operations
    setTimeout(async () => {
      try {
        const phoneNumber = await AsyncStorage.getItem("number");
        if (!phoneNumber) return;
        
        const response = await updateOnlineStatus(phoneNumber, newDutyStatus, null, null, null);
        
        // CRITICAL: Check if backend rejected due to blocking
        if (newDutyStatus && response && !response.success && response.isBlocked === true) {
          log("🚫 BACKEND BLOCKED RIDER - Reverting to OFF");
          
          // Determine if it's a wallet block - check both blockReason and the dedicated field
          const isWalletRelatedBlock = response.negativeBalanceGrace?.isBlockedForNegativeBalance === true ||
                                        response.blockReason === 'negative_wallet_balance' || 
                                        response.blockReason?.toLowerCase().includes('wallet') || 
                                        response.blockReason?.toLowerCase().includes('negative');
          
          // Revert everything
          await AsyncStorage.setItem("isOnline", "false");
          stableIsOnDuty.current = false;
          setIsOnDuty(false);
          setIsRiderBlocked(true);
          setBlockReason(response.blockReason || response.message || 'Account blocked');
          setIsWalletBlock(isWalletRelatedBlock);
          toggleAnim.setValue(0);
          
          // Show alert with appropriate message
          Alert.alert(
            isWalletRelatedBlock ? "Wallet Issue" : "Account Blocked",
            response.message || (isWalletRelatedBlock 
              ? "Your wallet balance is less than ₹0. Please add minimum amount of ₹100 to activate your account."
              : "Your account has been blocked. Contact support."),
            [
              { text: isWalletRelatedBlock ? "Recharge Now" : "Contact Support", 
                onPress: () => navigation.navigate(isWalletRelatedBlock ? 'Wallet' : 'Help And Sopport') 
              },
              { text: isWalletRelatedBlock ? "Cancel" : "OK", style: "cancel" }
            ]
          );
          return;
        }
        
        log("✅ Backend updated");
        
      } catch (error) {
        log("❌ Backend error:", error);
      }
    }, 500);
  };
  
  // Helper function to update backend status (extracted for clarity)
  const updateBackendStatus = async (newDutyStatus) => {
    try {
      const phoneNumber = await AsyncStorage.getItem("number");
      if (!phoneNumber) return;
      
      let latitude = null;
      let longitude = null;
      let expoPushToken = null;

      if (newDutyStatus) {
        // When going ON DUTY, register for push notifications and send location
        try {
          log('📲 Registering for push notifications...');
          expoPushToken = await pushNotificationManager.registerForPushNotifications();
          
          if (expoPushToken) {
            log('✅ Push token obtained:', expoPushToken);
          }
        } catch (pushErr) {
          log("⚠️ Could not register for push notifications:", pushErr.message);
        }

        // Get location
        try {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            let location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            });
            latitude = location.coords.latitude;
            longitude = location.coords.longitude;
            log("📍 Sending location with status update:", { latitude, longitude });
          }
        } catch (locErr) {
          log("⚠️ Could not get location:", locErr.message);
        }
      }

      // Update online status in backend (including push token)
      const response = await updateOnlineStatus(
        phoneNumber,
        newDutyStatus,
        latitude,
        longitude,
        expoPushToken
      );
      
      // Start/stop location tracking based on duty status
      if (newDutyStatus) {
        log('📍 Starting location tracking for order broadcasts');
        // Immediately fetch and send location, then start continuous tracking
        const immediateLocation = await riderLocationManager.fetchLocation(false); // false = send to WebSocket
        if (immediateLocation) {
          log('✅ Initial location sent:', immediateLocation.latitude, immediateLocation.longitude);
        }
        await startLocationTracking();
      } else {
        log('⏸️ Stopping location tracking');
        stopLocationTracking();
      }
      
      // Check if backend rejected the request (only when going online)
      if (newDutyStatus && response && !response.success) {
        log("⚠️ Backend validation failed:", response.message);
        
        // CRITICAL: If account is blocked, REVERT the toggle
        if (response.isBlocked === true) {
          log("🚫 Account is BLOCKED - reverting toggle to OFF");
          
          // Revert AsyncStorage
          await AsyncStorage.setItem("isOnline", "false");
          
          // Revert UI state
          stableIsOnDuty.current = false;
          setIsOnDuty(false);
          toggleAnim.setValue(0);
          
          // Determine if it's a wallet block - check both blockReason and the dedicated field
          const isWalletRelatedBlock = response.negativeBalanceGrace?.isBlockedForNegativeBalance === true ||
                                        response.blockReason === 'negative_wallet_balance' || 
                                        response.blockReason?.toLowerCase().includes('wallet') || 
                                        response.blockReason?.toLowerCase().includes('negative');
          
          // Update block states consistently
          setIsRiderBlocked(true);
          setBlockReason(response.blockReason || response.message || 'Account blocked');
          setIsWalletBlock(isWalletRelatedBlock);
          
          // Show appropriate blocking alert
          if (isWalletRelatedBlock) {
            Alert.alert(
              "Wallet Issue",
              response.message || `Your wallet balance is less than ₹0. Please add minimum amount of ₹100 to activate your account.`,
              [
                { text: "Recharge Now", onPress: () => navigation.navigate('Wallet') },
                { text: "Cancel", style: "cancel" }
              ]
            );
          } else {
            Alert.alert(
              "Account Blocked",
              response.message || "Your account has been blocked by the admin. Please contact support for assistance.",
              [
                { text: "Contact Support", onPress: () => navigation.navigate('Help And Sopport') },
                { text: "OK", style: "default" }
              ]
            );
          }
          
          return; // Stop here
        }
        
        // For other issues (wallet, documents), just log warnings
        let alertTitle = "Limited Functionality";
        let alertMessage = response.message || "Some features may be limited while you're online.";
        
        if (response.blockReason === 'negative_balance_grace_exceeded' || response.blockReason === 'negative_balance_after_grace') {
          alertTitle = "Wallet Issue";
          alertMessage = `Your wallet balance is ₹${response.walletBalance?.toFixed(2) || 0}. Please recharge to continue receiving bookings.`;
        } else if (response.documentStatus === 'Rejected') {
          alertTitle = "Documents Rejected";
          alertMessage = "Some documents were rejected. Please update them to receive bookings.";
        } else if (response.documentStatus === 'Pending') {
          alertTitle = "Documents Pending";
          alertMessage = "Your documents are still pending verification. You may not receive bookings yet.";
          
          if (response.pendingDocuments && response.pendingDocuments.length > 0) {
            alertMessage += `\n\nPending: ${response.pendingDocuments.length} documents`;
          }
        }
        
        console.warn("⚠️ [Toggle] " + alertTitle + ": " + alertMessage);
      }
      
      log("✅ Backend online status updated successfully");
    } catch (error) {
      console.error("❌ Error updating backend online status:", error);
      log("⚠️ Backend sync failed, but UI remains active");
    }
  };

  const onHeartPress = () => {
    navigation.navigate("GoToAreaScreen");
  };

  const onBellPress = () => {
    navigation.navigate("NotificationCenter");
  };

  const onLiveTrackingPress = () => {
    navigation.navigate("LiveTrackingScreen");
  };

  // Auto-navigate to active booking on app mount/reload (ONE-TIME ONLY)
  const checkAndNavigateToActiveOrder = async () => {
    // CRITICAL: Only navigate ONCE to prevent WebSocket flickering
    if (hasNavigatedToActiveOrder.current) {
      log('⏭️ [Auto-Navigate] Already navigated, skipping');
      return;
    }
    
    // Check AsyncStorage flag to prevent loop after OrderPopupScreen navigation
    try {
      const hasNavFlag = await AsyncStorage.getItem('hasNavigatedToActiveOrder');
      if (hasNavFlag === 'true') {
        log('⏭️ [Auto-Navigate] Navigation flag set, skipping');
        hasNavigatedToActiveOrder.current = true;
        return;
      }
    } catch (e) {
      log('⚠️ [Auto-Navigate] Could not check navigation flag:', e.message);
    }
    
    // Check if user is already on OrderDetailsScreen or MapProgress
    const currentRoute = navigation.getState()?.routes[navigation.getState()?.index];
    const currentRouteName = currentRoute?.name;
    if (currentRouteName === 'OrderDetailsScreen' || currentRouteName === 'mapProgress' || currentRouteName === 'PaymentScreen') {
      log('⏭️ [Auto-Navigate] Already on order screen:', currentRouteName);
      hasNavigatedToActiveOrder.current = true;
      return;
    }
    
    try {
      // Only auto-navigate if rider is ON DUTY
      const dutyStatus = await AsyncStorage.getItem('isOnline');
      if (dutyStatus !== 'true') {
        log('⏭️ [Auto-Navigate] Rider is OFF DUTY, skipping');
        return;
      }
      
      log('🔍 [Auto-Navigate] Checking for active booking...');
      const riderData = await getCachedRiderData();
      const rider = riderData?.data || riderData?.rider || riderData;
      const riderId = riderData?._id || 
                      riderData?.id || 
                      riderData?.rider?._id || 
                      riderData?.rider?.id ||
                      riderData?.data?._id ||
                      riderData?.data?.id;
      
      if (!riderId) {
        log('❌ [Auto-Navigate] No rider ID found');
        return;
      }
      
      const ongoingBooking = await getOngoingBookingForRider({ riderId });
      const validStatuses = ['accepted', 'in_progress', 'picked_up', 'on_way'];
      const isValidOngoing = ongoingBooking?.status && validStatuses.includes(ongoingBooking.status);
      
      if (ongoingBooking && (ongoingBooking._id || ongoingBooking.bookingId) && isValidOngoing) {
        log('✅ [Auto-Navigate] Active booking found! Navigating...');
        log('📋 Booking ID:', ongoingBooking._id || ongoingBooking.bookingId);
        log('📊 Status:', ongoingBooking.status);
        
        // Mark as navigated to prevent future redirects
        hasNavigatedToActiveOrder.current = true;
        
        // Set flag in AsyncStorage for cross-screen navigation lock
        try {
          await AsyncStorage.setItem('hasNavigatedToActiveOrder', 'true');
          log('🔒 [Auto-Navigate] Set navigation lock flag');
        } catch (e) {
          log('⚠️ [Auto-Navigate] Could not set navigation flag:', e.message);
        }
        
        // Update state for UI
        setHasOngoingOrder(true);
        setOngoingBooking(ongoingBooking);
        
        // Smart navigation based on trip progress
        const savedStep = ongoingBooking.currentStep ? parseInt(ongoingBooking.currentStep) : 0;
        const savedDropIndex = ongoingBooking.currentDropIndex || 0;
        
        log('🎯 [Auto-Navigate] Trip state:', {
          currentStep: savedStep,
          currentDropIndex: savedDropIndex,
          status: ongoingBooking.status
        });
        
        // Wait a moment for UI to settle, then navigate
        safeTimeout.set(() => {
          if (savedStep < 2) {
            log('➡️ [Auto-Navigate] Navigating to OrderDetailsScreen');
            navigation.replace('OrderDetailsScreen', { order: ongoingBooking });
          } else if (savedStep === 2) {
            const payFrom = (ongoingBooking.payFrom || "").toLowerCase().trim();
            const isPickupPayment = payFrom.includes("pickup");
            
            if (isPickupPayment && !ongoingBooking.cashCollected) {
              log('➡️ [Auto-Navigate] Navigating to PaymentScreen');
              navigation.replace('PaymentScreen', { order: ongoingBooking });
            } else {
              log('➡️ [Auto-Navigate] Navigating to MapProgress');
              navigation.replace('mapProgress', { order: ongoingBooking });
            }
          } else {
            log('➡️ [Auto-Navigate] Navigating to MapProgress (delivery in progress)');
            navigation.replace('mapProgress', { 
              order: ongoingBooking,
              resumeFromStep: savedStep,
              resumeFromDropIndex: savedDropIndex
            });
          }
        }, 500); // Small delay for smooth transition
      } else {
        log('📭 [Auto-Navigate] No active booking found');
      }
    } catch (err) {
      console.error('❌ [Auto-Navigate] Error:', err.message);
    }
  };
  
  // Handler for Active Booking button
  const handleActiveBookingPress = () => {
    if (ongoingBooking) {
      console.log("🎯 Navigating to active booking:", ongoingBooking._id);
      
      // ✅ SMART NAVIGATION: Resume at correct screen based on trip progress
      const savedStep = ongoingBooking.currentStep ? parseInt(ongoingBooking.currentStep) : 0;
      const savedDropIndex = ongoingBooking.currentDropIndex || 0;
      
      console.log("🎯 [Active Booking] Trip state:", {
        currentStep: savedStep,
        currentDropIndex: savedDropIndex,
        tripState: ongoingBooking.tripState
      });
      
      // Step numbering:
      // 0-1 = Order accepted, need to reach pickup (OrderDetailsScreen)
      // 2 = Reached pickup, payment handling (PaymentScreen or MapProgress)
      // 3+ = In delivery phase (MapProgress)
      
      // If step < 2, rider hasn't reached pickup yet - go to OrderDetailsScreen
      if (savedStep < 2) {
        console.log("📋 [Active Booking] Rider hasn't reached pickup - go to OrderDetailsScreen");
        console.log(`📊 Current step: ${savedStep} (< 2 means pickup not reached)`);
        navigation.navigate("OrderDetailsScreen", { order: ongoingBooking });
      } else if (savedStep === 2) {
        // Step 2 = Just reached pickup - check if payment was collected
        const payFrom = (ongoingBooking.payFrom || "").toLowerCase().trim();
        const isPickupPayment = payFrom.includes("pickup");
        
        if (isPickupPayment && !ongoingBooking.cashCollected) {
          console.log("💰 [Active Booking] At pickup, payment not collected - go to PaymentScreen");
          navigation.navigate("PaymentScreen", { order: ongoingBooking });
        } else {
          console.log("🚀 [Active Booking] At pickup, payment collected or at drop - go to MapProgress");
          navigation.navigate("mapProgress", { order: ongoingBooking });
        }
      } else {
        // Step 3+ = Already in delivery phase - go directly to MapProgress
        console.log("🚀 [Active Booking] Delivery in progress - resuming at MapProgress");
        console.log(`📍 Resuming at step ${savedStep}, drop index ${savedDropIndex}`);
        navigation.navigate("mapProgress", { 
          order: ongoingBooking,
          resumeFromStep: savedStep,
          resumeFromDropIndex: savedDropIndex
        });
      }
    } else {
      Alert.alert(
        "No Active Booking",
        "There is no active booking at the moment."
      );
    }
  };

  // Function to check for ongoing booking and navigate if found
  const checkOngoingBooking = async (forceRefresh = false) => {
    // CRITICAL: Don't run during toggle or deferred operations (UNLESS called from deferred block itself)
    if (!forceRefresh && (isTogglingOperation.current || isDeferredOperationsInProgress.current)) {
      console.log("⏭️ [checkOngoingBooking] Skipped - toggle/deferred operation in progress");
      return;
    }
    
    // CRITICAL: Prevent duplicate simultaneous calls
    const requestKey = 'checkOngoingBooking';
    if (!forceRefresh && inFlightRequests.current.has(requestKey)) {
      console.log('🚫 [checkOngoingBooking] Already in progress, skipping duplicate call');
      return;
    }
    
    inFlightRequests.current.add(requestKey);
    
    // Get the actual active route name, even if nested
    const navState = navigation.getState ? navigation.getState() : null;
    const activeRouteName = getActiveRouteName(navState);
    console.log("🔍 [checkOngoingBooking] Current route:", activeRouteName, "Force refresh:", forceRefresh);
    if (activeRouteName === "mapProgress") {
      console.log("⏭️ [checkOngoingBooking] Already on mapProgress, skipping check");
      inFlightRequests.current.delete(requestKey);
      return;
    }

    try {
      console.log("🔍 [checkOngoingBooking] Fetching rider data...");
      const riderData = await getCachedRiderData();
      
      // ============================================
      // CHECK IF RIDER IS BLOCKED OR INACTIVE
      // ============================================
      const rider = riderData?.data || riderData?.rider || riderData;
      const isBlocked = rider?.isBlocked === 'true' || rider?.isBlocked === true || rider?.status === 'blocked';
      const isInactive = rider?.status === 'inactive';
      
      // Only update blocked status if it changed to prevent unnecessary re-renders
      if (isBlocked !== isRiderBlocked) {
        setIsRiderBlocked(isBlocked);
      }
      
      // If rider is blocked or inactive while online, show warning but don't force off
      if ((isBlocked || isInactive) && isOnDuty) {
        console.log("⚠️ [checkOngoingBooking] Rider is blocked/inactive");
        console.log("⚠️ Status:", { 
          isBlocked, 
          isInactive, 
          status: rider?.status,
          isBlockedField: rider?.isBlocked 
        });
        
        // DON'T force OFF DUTY - just log warning
        // Backend will handle blocking bookings
        // UI should remain stable for user
        console.log("⚠️ Rider blocked/inactive but keeping UI stable");
        
        // Optionally show a one-time warning
        // But don't change toggle state
        
        // return; // Don't stop checks - continue monitoring
      }
      
      // Try multiple possible paths for rider ID
      const riderId = riderData?._id || 
                      riderData?.id || 
                      riderData?.rider?._id || 
                      riderData?.rider?.id ||
                      riderData?.data?._id ||
                      riderData?.data?.id;
      
      console.log("👤 [checkOngoingBooking] Extracted Rider ID:", riderId);
      console.log("👤 [checkOngoingBooking] Available keys in riderData:", Object.keys(riderData || {}));
      
      if (!riderId) {
        console.log("❌ [checkOngoingBooking] No rider ID found in response");
        setHasOngoingOrder(false);
        setOngoingBooking(null);
        return;
      }
      
      console.log("📞 [checkOngoingBooking] Calling getOngoingBookingForRider...");
      const ongoingBooking = await getOngoingBookingForRider({ riderId });

      console.log("📋 [checkOngoingBooking] Ongoing booking result:", {
        found: !!ongoingBooking,
        bookingId: ongoingBooking?._id || ongoingBooking?.bookingId,
        status: ongoingBooking?.status,
        hasCustomer: !!ongoingBooking?.customer,
        activeBookingsCount: ongoingBooking?.activeBookingsCount,
        forceRefresh,
      });

      // Log if multiple active bookings exist
      if (ongoingBooking?.activeBookingsCount > 1) {
        console.log("⚠️ [checkOngoingBooking] WARNING: Rider has", ongoingBooking.activeBookingsCount, "active bookings!");
      }

      // Check if the booking status is actually ongoing
      const validStatuses = ['accepted', 'in_progress', 'picked_up', 'on_way'];
      const isValidOngoing = ongoingBooking?.status && validStatuses.includes(ongoingBooking.status);
      console.log("✅ [checkOngoingBooking] Valid ongoing status check:", isValidOngoing, "Status:", ongoingBooking?.status);

      if (ongoingBooking && (ongoingBooking._id || ongoingBooking.bookingId) && isValidOngoing) {
        console.log("✅ [checkOngoingBooking] Active booking found! Setting state...");
        setHasOngoingOrder(true);
        setOngoingBooking(ongoingBooking); // Store the booking data
        console.log("✅ [checkOngoingBooking] State updated - hasOngoingOrder: true");
        
        // Animation is now controlled by useEffect based on hasOngoingOrder state
        // NO AUTOMATIC NAVIGATION - only update state to show floating popup
        // User will tap "Active Booking" button to navigate manually
        
        console.log("ℹ️ [checkOngoingBooking] State updated. No auto-navigation (prevents WebSocket flickering)");
      } else {
        console.log("📭 [checkOngoingBooking] No active booking found or invalid status");
        if (forceRefresh) {
          console.log("🔄 [checkOngoingBooking] Force clearing ongoing booking state");
        }
        setHasOngoingOrder(false);
        setOngoingBooking(null);
      }
    } catch (err) {
      console.error("❌ [checkOngoingBooking] Error:", err);
      console.error("❌ [checkOngoingBooking] Error details:", err.message);
      setHasOngoingOrder(false);
      setOngoingBooking(null);
    } finally {
      // Release request lock
      inFlightRequests.current.delete('checkOngoingBooking');
    }
  };
  
  // Calculate today's statistics from bookings data
  const calculateTodayStats = (bookings = []) => {
    const today = new Date();
    const todayString = today.toDateString();
    
    // Filter bookings for today
    const todayBookings = bookings.filter(booking => {
      if (!booking.createdAt) return false;
      const bookingDate = new Date(booking.createdAt);
      return bookingDate.toDateString() === todayString;
    });
    
    // Calculate today's completed orders
    const todayCompletedBookings = todayBookings.filter(booking => 
      booking.status === 'completed' || booking.bookingStatus === 'Completed'
    );
    
    // Calculate today's earnings from completed bookings
    const todayEarningsAmount = todayCompletedBookings.reduce((total, booking) => {
      const earnings = parseFloat(booking.totalDriverEarnings || booking.price || 0);
      return total + earnings;
    }, 0);
    
    console.log("📊 [calculateTodayStats] Today's stats:", {
      totalBookings: todayBookings.length,
      completedBookings: todayCompletedBookings.length,
      earnings: todayEarningsAmount
    });
    
    return {
      todayOrders: todayCompletedBookings.length,
      todayEarnings: Math.round(todayEarningsAmount)
    };
  };

  // Load rider data and statistics
  const loadRiderData = async () => {
    const requestKey = 'getRiderByPhone';
    
    // CRITICAL: Don't run if deferred operations in progress
    if (isDeferredOperationsInProgress.current) {
      console.log('⏭️ SKIPPED: loadRiderData - deferred operations in progress');
      return;
    }
    
    // CRITICAL: Global lock to prevent ANY simultaneous API calls
    if (riderDataLock.current) {
      console.log('🔒 LOCKED: Skipping loadRiderData - global lock active');
      return;
    }
    
    // Prevent duplicate calls
    if (isLoadingRiderData.current) {
      console.log("⏭️ [loadRiderData] Already loading, skipping...");
      return;
    }
    
    try {
      // Set BOTH locks (no need for inFlightRequests - singleton handles it)
      riderDataLock.current = true;
      isLoadingRiderData.current = true;
      setIsLoadingStats(true);
      console.log("📊 [loadRiderData] Fetching rider data via global singleton...");
      
      // Use global singleton - it handles deduplication automatically
      const rider = await getCachedRiderData(false); // false = use cache if valid
      
      console.log("📊 [loadRiderData] Rider response:", JSON.stringify(rider, null, 2));
      console.log("📊 [loadRiderData] Available keys:", Object.keys(rider || {}));
      
      // ============================================
      // CRITICAL: Toggle State Immunity
      // ============================================
      // The rider response may contain stale "isOnline" data due to database
      // replication lag. WE NEVER UPDATE THE TOGGLE STATE FROM API RESPONSES.
      // Toggle state is ONLY controlled by:
      // 1. User clicks (toggleDuty function)
      // 2. AsyncStorage on mount
      // 3. Route params from other screens
      //
      // This prevents flickering caused by stale data overwriting correct state.
      // ============================================
      
      // ============================================
      // BATCH STATE UPDATES TO PREVENT FOCUS INTERFERENCE
      // ============================================
      InteractionManager.runAfterInteractions(() => {
        setRiderData(rider);
        
        // CHECK IF RIDER IS BLOCKED OR INACTIVE
        const riderData = rider.data || rider.rider || rider;
        const isBlocked = riderData?.isBlocked === 'true' || riderData?.isBlocked === true || riderData?.status === 'blocked';
        const isInactive = riderData?.status === 'inactive';
        
        // Only update blocked status if it changed
        if (isBlocked !== isRiderBlocked) {
          setIsRiderBlocked(isBlocked);
        }
        
        // If rider is blocked or inactive, show warning but keep UI stable
        if ((isBlocked || isInactive) && isOnDuty) {
          console.log("⚠️ [loadRiderData] Rider is blocked/inactive");
          console.log("⚠️ Status:", { 
            isBlocked, 
            isInactive, 
            status: riderData?.status,
            isBlockedField: riderData?.isBlocked 
          });
          
          // Backend will prevent bookings, no need to change UI
          console.log("⚠️ Rider blocked/inactive but keeping toggle ON for UX");
        }
      });
      
      // Note: Blocked status already updated above
      
      // Fetch real earnings data
      try {
        console.log("💰 [loadRiderData] Fetching earnings data...");
        const earningsData = await getRiderEarnings();
        
        if (earningsData.success && earningsData.bookings) {
          console.log("✅ [loadRiderData] Earnings data received:", {
            totalBookings: earningsData.bookings.length
          });
          
          // Calculate today's statistics
          const todayStats = calculateTodayStats(earningsData.bookings);
          
          // Calculate weekly earnings (last 7 days)
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          
          const weeklyBookings = earningsData.bookings.filter(booking => {
            if (!booking.createdAt) return false;
            const bookingDate = new Date(booking.createdAt);
            return bookingDate >= weekAgo;
          });
          
          const weeklyEarningsAmount = weeklyBookings
            .filter(booking => booking.status === 'completed' || booking.bookingStatus === 'Completed')
            .reduce((total, booking) => {
              const earnings = parseFloat(booking.totalDriverEarnings || booking.price || 0);
              return total + earnings;
            }, 0);
          
          // Batch all earnings updates together
          InteractionManager.runAfterInteractions(() => {
            setTodayOrders(todayStats.todayOrders);
            setTodayEarnings(todayStats.todayEarnings);
            setWeeklyEarnings(Math.round(weeklyEarningsAmount));
          });
          
          console.log("✅ [loadRiderData] Statistics updated:", {
            todayOrders: todayStats.todayOrders,
            todayEarnings: todayStats.todayEarnings,
            weeklyEarnings: Math.round(weeklyEarningsAmount)
          });
        } else {
          console.log("⚠️ [loadRiderData] No earnings data available, using defaults");
          // Fallback to default values if no data
          setTodayOrders(0);
          setTodayEarnings(0);
          setWeeklyEarnings(0);
        }
      } catch (earningsError) {
        console.error("❌ [loadRiderData] Error loading earnings:", earningsError.message);
        // Use fallback values on error
        setTodayOrders(0);
        setTodayEarnings(0);
        setWeeklyEarnings(0);
      }
    } catch (error) {
      console.error("❌ [loadRiderData] Error loading rider data:", error);
      console.error("❌ [loadRiderData] Error message:", error.message);
      setIsLoadingStats(false);
    } finally {
      // Release locks (no inFlightRequests - singleton handles deduplication)
      isLoadingRiderData.current = false;
      riderDataLock.current = false;
      console.log('✅ [loadRiderData] Locks released, request completed');
    }
  };

  // WebSocket initialization - Now handled by GlobalOrderManager
  const initializeWebSocket = async () => {
    // Prevent duplicate initialization
    if (wsConnected || wsInitLock.current) {
      log('[HomeScreen] ⏭️ WebSocket already connected or initializing, skipping');
      return;
    }
    
    wsInitLock.current = true;
    
    try {
      log('[HomeScreen] 🔌 Initializing WebSocket connection...');
      
      const phoneNumber = await AsyncStorage.getItem('number');
      if (!phoneNumber) {
        log('[HomeScreen] ❌ No phone number found, cannot initialize WebSocket');
        return;
      }
      
      // Get rider data to extract riderId
      const rider = normalizeRider(await getCachedRiderData());
      if (!rider) {
        log('[HomeScreen] ❌ No rider data found, cannot initialize WebSocket');
        return;
      }
      
      const riderId = rider._id || rider.id;
      if (!riderId) {
        log('[HomeScreen] ❌ No rider ID found, cannot initialize WebSocket');
        return;
      }
      
      // Check if WebSocket is already connected (managed by GlobalOrderManager)
      const wsUrl = API_CONFIG.WS_URL || API_CONFIG.BASE_URL.replace('http', 'ws');
      
      if (!webSocketService.isConnected) {
        log('[HomeScreen] 📡 WebSocket not connected, initializing:', wsUrl);
        const connected = await webSocketService.initialize(wsUrl, riderId);
        if (connected) {
          log('[HomeScreen] ✅ WebSocket connected successfully');
        }
      } else {
        log('[HomeScreen] ✅ Using existing WebSocket connection (from GlobalOrderManager)');
      }
      
      if (webSocketService.isConnected) {
        log('[HomeScreen] ✅ WebSocket ready');
        setWsConnected(true);
        
        // Set up message callback for real-time booking notifications
        webSocketService.setMessageCallback((data) => {
          log('[HomeScreen] 📨 WebSocket message received:', data.type);
          
          if (data.type === 'new_booking') {
            log('[HomeScreen] 🎉 NEW BOOKING via WebSocket:', data.booking?.bookingId);
            // Handle new booking immediately
            if (isOnDuty && data.booking) {
              handleNewBookings([data.booking], false);
            }
          } else if (data.type === 'booking_cancelled') {
            log('[HomeScreen] ❌ Booking cancelled via WebSocket');
            handleBookingCancellation(data);
          } else if (data.type === 'booking_updated') {
            log('[HomeScreen] 🔄 Booking updated via WebSocket');
            handleBookingStatusUpdate(data);
          }
        });
        
        // Set up connection change callback
        webSocketService.setConnectionChangeCallback((connected) => {
          log('[HomeScreen] 🔌 WebSocket connection status changed:', connected);
          setWsConnected(connected);
        });
        
        log('[HomeScreen] 📡 WebSocket listeners configured');
      } else {
        log('[HomeScreen] ❌ Failed to connect WebSocket');
        setWsConnected(false);
      }
    } catch (error) {
      log('[HomeScreen] ❌ Error initializing WebSocket:', error);
      setWsConnected(false);
    } finally {
      // Release lock after initialization attempt
      wsInitLock.current = false;
    }
  };

  // Safe WebSocket initialization wrapper
  const safeInitWebSocket = async () => {
    // CRITICAL: Don't init during toggle or deferred operations
    if (isTogglingOperation.current || isDeferredOperationsInProgress.current) {
      log("[HomeScreen] ⏭️ Skipping WebSocket init - toggle/deferred operation in progress");
      return;
    }
    
    if (wsConnected || wsInitLock.current) {
      log('[HomeScreen] ⏭️ Skipping WebSocket init - already connected or initializing');
      return;
    }
    await initializeWebSocket();
  };

  // WebSocket booking handler - Now handled by GlobalOrderManager
  const handleWebSocketBooking = (booking) => {
    console.log('[HomeScreen] 🚀 Booking handled by GlobalOrderManager:', booking.bookingId);
    // GlobalOrderManager now handles all WebSocket bookings globally
  };

  // Handle booking cancellation from customer
  const handleBookingCancellation = async (booking) => {
    console.log('[WS] ❌ Booking cancelled by customer:', booking.bookingId || booking._id);
    
    const bookingId = booking.bookingId || booking._id;
    
    // Remove from shown bookings list
    shownBookingIds.current.delete(bookingId);
    
    // If we have an ongoing booking and it matches this cancellation, clear it
    if (ongoingBooking && (ongoingBooking._id === bookingId || ongoingBooking.bookingId === bookingId)) {
      console.log('[WS] 🔄 Clearing ongoing booking due to cancellation');
      
      // Clear navigation flag to allow future auto-navigation
      try {
        await AsyncStorage.removeItem('hasNavigatedToActiveOrder');
        console.log('🔓 [Cancellation] Cleared navigation lock flag');
      } catch (e) {
        console.log('⚠️ Could not clear navigation flag:', e.message);
      }
      hasNavigatedToActiveOrder.current = false;
      
      setHasOngoingOrder(false);
      setOngoingBooking(null);
      
      // Show cancellation alert
      Alert.alert(
        "❌ Booking Cancelled",
        "The customer has cancelled this booking.",
        [
          {
            text: "OK",
            onPress: () => {
              // Navigate back to home or refresh
              const navState = navigation.getState ? navigation.getState() : null;
              const activeRouteName = getActiveRouteName(navState);
              
              if (activeRouteName === "OrderDetailsScreen" || activeRouteName === "mapProgress") {
                navigation.navigate("Home");
              }
            }
          }
        ]
      );
    }
    
    // Force refresh booking data to get latest state
    if (isOnDuty) {
      safeTimeout.set(() => {
        fetchBookingsOnly(true);
        checkOngoingBooking(true);
      }, 1000);
    }
  };

  // Handle booking completion
  const handleBookingCompleted = async (booking) => {
    console.log('[WS] ✅ Booking completed:', booking.bookingId || booking._id);
    
    const bookingId = booking.bookingId || booking._id;
    
    // Remove from shown bookings
    shownBookingIds.current.delete(bookingId);
    
    // Clear ongoing booking if it matches
    if (ongoingBooking && (ongoingBooking._id === bookingId || ongoingBooking.bookingId === bookingId)) {
      console.log('[WS] 🎉 Clearing ongoing booking - completed');
      
      // Clear navigation flag to allow future auto-navigation
      try {
        await AsyncStorage.removeItem('hasNavigatedToActiveOrder');
        console.log('🔓 [Completion] Cleared navigation lock flag');
      } catch (e) {
        console.log('⚠️ Could not clear navigation flag:', e.message);
      }
      hasNavigatedToActiveOrder.current = false;
      
      setHasOngoingOrder(false);
      setOngoingBooking(null);
      
      // Show completion notification
      playNotification();
      
      Alert.alert(
        "🎉 Booking Completed!",
        "Great job! The booking has been completed successfully.",
        [{ text: "OK" }]
      );
    }
  };

  // Handle general booking status updates
  const handleBookingStatusUpdate = (booking) => {
    console.log('[WS] 🔄 Booking status update:', booking.bookingId || booking._id, 'Status:', booking.status);
    
    const bookingId = booking.bookingId || booking._id;
    
    // Handle status changes for ongoing booking
    if (ongoingBooking && (ongoingBooking._id === bookingId || ongoingBooking.bookingId === bookingId)) {
      
      // Update ongoing booking data with new status
      setOngoingBooking(prevBooking => ({
        ...prevBooking,
        ...booking,
        status: booking.status || booking.bookingStatus
      }));
      
      // Handle specific status changes
      const status = booking.status || booking.bookingStatus;
      
      if (status === 'cancelled' || status === 'Cancelled') {
        handleBookingCancellation(booking);
      } else if (status === 'completed' || status === 'Completed') {
        handleBookingCompleted(booking);
      }
    }
  };

  // Start location tracking via RiderLocationManager
  const startLocationTracking = async () => {
    console.log('[HomeScreen] 📍 Starting centralized location tracking...');
    await riderLocationManager.startTracking();
  };

  // Stop location tracking
  const stopLocationTracking = () => {
    console.log('[HomeScreen] ⏸️ Stopping centralized location tracking');
    riderLocationManager.stopTracking();
  };
  
  // Promotional banners data
  const banners = [
    {
      id: 1,
      title: "🎉 Bonus Alert!",
      subtitle: "Complete 20 rides today",
      reward: "Get ₹500 extra!",
      colors: ['#EC4D4A', '#C43D3A'],
    },
    {
      id: 2,
      title: "⭐ Weekend Boost",
      subtitle: "Extra earnings this weekend",
      reward: "Up to 30% more!",
      colors: ['#4CAF50', '#388E3C'],
    },
    {
      id: 3,
      title: "🏆 Top Performer",
      subtitle: "Keep up the great work",
      reward: "You're in top 10%!",
      colors: ['#FF9800', '#F57C00'],
    },
  ];
  
  // Auto-scroll banners with production optimization
  useEffect(() => {
    const bannerInterval = setInterval(() => {
      // Use functional update to prevent unnecessary dependencies
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(bannerInterval);
  }, []); // Empty deps - banners.length is constant

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="transparent" 
        translucent={true}
        networkActivityIndicatorVisible={false}
        showHideTransition="fade"
        hidden={false}
      />
      
      {/* Registration Completion Modal */}
      <Modal
        visible={showRegistrationPopup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRegistrationPopup(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Ionicons name="alert-circle" size={60} color="#EC4A4D" />
              <Text style={styles.modalTitle}>Complete Your Registration</Text>
            </View>
            
            <Text style={styles.modalMessage}>
              Please complete your registration to start accepting orders.
              {registrationStep === 'vehicle' && 
                "\n\nYou need to add your vehicle details."}
              {registrationStep === 'driver' && 
                "\n\nYou need to add your driver license."}
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.completeButton]}
                onPress={() => {
                  // Do not dismiss modal, just navigate
                  if (registrationStep === 'vehicle') {
                    navigation.navigate('Vehicleregister');
                  } else if (registrationStep === 'driver') {
                    navigation.navigate('Driver Details');
                  }
                }}
              >
                <Text style={styles.modalButtonText}>Complete Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
        {/* Left Side Icons */}
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.openDrawer()}
            style={styles.iconButton}
          >
            <Image
              source={require("../assets/menu.png")}
              style={styles.menuIcon}
            />
          </TouchableOpacity>
        </View>

        {/* Center Toggle Button */}
        <Animated.View 
          style={[
            styles.toggleContainer,
            { transform: [{ scale: scaleAnim }] }
          ]}
        >
          <TouchableOpacity
            onPress={toggleDuty}
            activeOpacity={isRiderBlocked ? 1 : 0.9}
            disabled={isRiderBlocked || (hasOngoingOrder && isOnDuty) || isToggling}
          >
            <LinearGradient
              colors={isRiderBlocked 
                ? ['#9CA3AF', '#6B7280', '#4B5563'] 
                : isOnDuty 
                  ? ['#059669', '#047857', '#065f46'] 
                  : ['#DC2626', '#B91C1C', '#991B1B']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.toggleTrack,
                (hasOngoingOrder && isOnDuty || isRiderBlocked) && { opacity: 0.6 },
              ]}
            >
              {/* Status Text - Positioned based on toggle state */}
              <View style={[
                styles.toggleTextContainer,
                isOnDuty ? styles.toggleTextContainerOn : styles.toggleTextContainerOff
              ]}>
                <Text
                  style={[
                    styles.toggleText,
                    isOnDuty ? styles.toggleTextOn : styles.toggleTextOff,
                  ]}
                >
                  {isOnDuty ? "ON DUTY" : "OFF DUTY"}
                </Text>
                <Text style={styles.toggleSubtext}>
                  {isOnDuty ? "Active" : "Inactive"}
                </Text>
              </View>

              {/* Animated Circle with Icon */}
              <Animated.View
                style={[
                  styles.toggleCircle,
                  {
                    transform: [
                      { translateX: circleTranslateX },
                      { scale: pulseAnim },
                    ],
                  },
                ]}
              >
                {isToggling ? (
                  <MaterialCommunityIcons name="loading" size={18} color={isOnDuty ? "#10B981" : "#EF4444"} />
                ) : (
                  <Ionicons 
                    name={isOnDuty ? "checkmark-circle" : "power"} 
                    size={18} 
                    color={isOnDuty ? "#10B981" : "#EF4444"} 
                  />
                )}
              </Animated.View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Right Side Icons - Only show location when on duty */}
        <View style={styles.headerRight}>
          {isOnDuty && (
            <TouchableOpacity onPress={onHeartPress} style={styles.modernIconButton}>
              <Ionicons name="location" size={32} color="#2d2d2d" />
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={onBellPress} style={styles.modernIconButton}>
            <View>
              <Ionicons name="notifications" size={32} color="#2d2d2d" />
              {notificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          {/* Rider Blocked Banner - Shows if rider is blocked */}
          {isRiderBlocked && (
            <View style={styles.blockedBanner}>
              <Ionicons name={isWalletBlock ? "wallet" : "ban"} size={24} color={isWalletBlock ? "#F59E0B" : "#DC2626"} />
              <View style={styles.blockedBannerContent}>
                <Text style={styles.blockedBannerTitle}>
                  {isWalletBlock ? "Wallet Issue" : "Account Blocked"}
                </Text>
                <Text style={styles.blockedBannerText}>
                  {isWalletBlock 
                    ? `Your wallet balance is less than ₹0. Please add minimum amount of ₹100 to activate your account.`
                    : "Your account has been blocked by admin. Please contact support."
                  }
                </Text>
                <TouchableOpacity 
                  style={styles.blockedContactButton}
                  onPress={() => navigation.navigate(isWalletBlock ? 'Wallet' : 'Help And Sopport')}
                >
                  <Text style={styles.blockedContactButtonText}>
                    {isWalletBlock ? "Recharge Now" : "Contact Support"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* OFF DUTY - Simplified Layout */}
          {!isOnDuty ? (
            <View style={styles.offDutyMainContainer}>
              {/* Greeting */}
              <View style={styles.offDutyGreeting}>
                <Text style={styles.offDutyTitle}>Hi there! 👋</Text>
                <Text style={styles.offDutySubtitle}>Ready to start earning?</Text>
              </View>

              {/* Central Illustration */}
              <View style={styles.offDutyIllustrationContainer}>
                <View style={styles.offDutyIconCircle}>
                  <Ionicons name="car" size={50} color="#4CAF50" />
                </View>
                <View style={styles.offDutyIconCircle2}>
                  <Ionicons name="location" size={24} color="#FF9800" />
                </View>
              </View>

              {/* Motivational Message */}
              <View style={styles.offDutyMessageContainer}>
                <Text style={styles.offDutyMainMessage}>Go online to start receiving ride requests</Text>
                <Text style={styles.offDutyDescription}>Connect with riders nearby and earn money</Text>
              </View>

              {/* Wallet Balance Warnings */}
              {walletBalance < 0 && !walletBlocked && (
                <View style={styles.walletWarningBanner}>
                  <Ionicons name="warning" size={20} color="#FF9800" />
                  <View style={styles.walletWarningContent}>
                    <Text style={styles.walletWarningTitle}>Low Wallet Balance</Text>
                    <Text style={styles.walletWarningText}>
                      Balance: ₹{walletBalance.toFixed(2)} • {graceOrdersUsed === 0 ? '1 more order allowed' : 'Add ₹100 to continue'}
                    </Text>
                  </View>
                </View>
              )}

              {walletBlocked && (
                <View style={styles.walletErrorBanner}>
                  <Ionicons name="close-circle" size={20} color="#F44336" />
                  <View style={styles.walletErrorContent}>
                    <Text style={styles.walletErrorTitle}>Wallet Blocked</Text>
                    <Text style={styles.walletErrorText}>
                      Balance: ₹{walletBalance.toFixed(2)} • Add minimum ₹100 to receive orders
                    </Text>
                    <TouchableOpacity 
                      style={styles.rechargeButton}
                      onPress={() => navigation.navigate('Wallet')}
                    >
                      <Text style={styles.rechargeButtonText}>Recharge Now</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Rider Blocked Status */}
              {isRiderBlocked && (
                <View style={styles.riderBlockedBanner}>
                  <Ionicons name={isWalletBlock ? "wallet" : "ban"} size={24} color={isWalletBlock ? "#F59E0B" : "#D32F2F"} />
                  <View style={styles.riderBlockedContent}>
                    <Text style={styles.riderBlockedTitle}>
                      {isWalletBlock ? "Wallet Issue" : "Account Blocked"}
                    </Text>
                    <Text style={styles.riderBlockedText}>
                      {isWalletBlock 
                        ? `Your wallet balance is less than ₹0. Please add minimum amount of ₹100 to activate your account.`
                        : "Your account has been blocked by admin. Please contact support for assistance."
                      }
                    </Text>
                    <TouchableOpacity 
                      style={styles.supportButton}
                      onPress={() => navigation.navigate(isWalletBlock ? 'Wallet' : 'Help And Support')}
                    >
                      <Text style={styles.supportButtonText}>
                        {isWalletBlock ? "Recharge Now" : "Contact Support"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Go Online Button */}
              <TouchableOpacity
                style={[
                  styles.goOnlineButton,
                  isRiderBlocked && styles.goOnlineButtonDisabled
                ]}
                onPress={isRiderBlocked ? null : toggleDuty}
                activeOpacity={isRiderBlocked ? 1 : 0.9}
                disabled={isRiderBlocked}
              >
                <LinearGradient
                  colors={isRiderBlocked 
                    ? ['#BDBDBD', '#9E9E9E'] 
                    : ['#4CAF50', '#45A049']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.goOnlineButtonGradient}
                >
                  <Ionicons 
                    name={isRiderBlocked ? (isWalletBlock ? "wallet" : "ban") : "power"} 
                    size={20} 
                    color="#fff" 
                    style={styles.goOnlineIcon} 
                  />
                  <Text style={styles.goOnlineButtonText}>
                    {isRiderBlocked ? (isWalletBlock ? "WALLET ISSUE - RECHARGE" : "ACCOUNT BLOCKED") : "GO ONLINE"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Bottom Stats Preview */}
              <View style={styles.offDutyStatsPreview}>
                <View style={styles.offDutyStatItem}>
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text style={styles.offDutyStatText}>4.8 Rating</Text>
                </View>
                <View style={styles.offDutyStatDivider} />
                <View style={styles.offDutyStatItem}>
                  <Ionicons name="time" size={16} color="#2196F3" />
                  <Text style={styles.offDutyStatText}>285 Trips</Text>
                </View>
                <View style={styles.offDutyStatDivider} />
                <View style={styles.offDutyStatItem}>
                  <Ionicons name="trophy" size={16} color="#FF9800" />
                  <Text style={styles.offDutyStatText}>Top Driver</Text>
                </View>
              </View>
            </View>
          ) : (
            /* ON DUTY SCREEN - Minimalistic Design */
            <View style={styles.onDutyMainContainer}>
              {/* Compact Status Section */}
              <View style={styles.onDutyStatusSection}>
                <Animated.View style={[
                  styles.onDutyIconWrapper,
                  {
                    opacity: fadeAnim,
                    transform: [{ scale: statsScaleAnim }]
                  }
                ]}>
                  <View style={styles.onDutyIconCircle}>
                    <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                  </View>
                </Animated.View>
                
                <View style={styles.onDutyLiveBadge}>
                  <View style={styles.onDutyPulseDot} />
                  <Text style={styles.onDutyLiveText}>LIVE</Text>
                </View>
                
                <Text style={styles.onDutyStatusTitle}>You're Online!</Text>
                <Text style={styles.onDutyStatusSubtitle}>Ready to accept requests</Text>

                {/* Searching Animation */}
                {!hasOngoingOrder && (
                  <View style={styles.onDutySearchingContainer}>
                    <Animated.View style={{
                      transform: [{
                        rotate: searchingRotateAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg']
                        })
                      }]
                    }}>
                      <Ionicons name="scan-circle-outline" size={18} color="#10B981" />
                    </Animated.View>
                    <Text style={styles.onDutySearchingText}>Searching...</Text>
                  </View>
                )}
              </View>

              {/* Compact Stats */}
              <View style={styles.onDutyStatsGrid}>
                <View style={styles.onDutyStatCard}>
                  <Ionicons name="cube" size={20} color="#4CAF50" />
                  <Text style={styles.onDutyStatValue}>
                    {isLoadingStats ? "..." : todayOrders}
                  </Text>
                  <Text style={styles.onDutyStatLabel}>Orders</Text>
                </View>

                <View style={styles.onDutyStatCard}>
                  <Ionicons name="wallet" size={20} color="#EC4D4A" />
                  <Text style={styles.onDutyStatValue}>
                    {isLoadingStats ? "..." : `₹${todayEarnings}`}
                  </Text>
                  <Text style={styles.onDutyStatLabel}>Earnings</Text>
                </View>
              </View>
            </View>
          )}

        </Animated.View>
      </ScrollView>

      {/* Floating Active Booking Popup - Above Footer Navigation */}
      {hasOngoingOrder && ongoingBooking && (
        <Animated.View style={[
          styles.floatingBookingPopup,
          {
            opacity: floatingPopupAnim,
            transform: [
              { 
                translateY: floatingPopupAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0]
                })
              },
              { 
                scale: floatingPopupAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1]
                })
              }
            ]
          }
        ]}>
          <TouchableOpacity
            style={styles.floatingBookingContainer}
            onPress={handleActiveBookingPress}
            activeOpacity={0.95}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F8F9FA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.floatingBookingGradient}
            >
              {/* Live Status Indicator */}
              <View style={styles.liveStatusContainer}>
                <Animated.View style={[
                  styles.pulseIndicator,
                  {
                    transform: [{ scale: bookingPulseAnim }]
                  }
                ]} />
                <Text style={styles.liveStatusText}>LIVE</Text>
              </View>
              
              <View style={styles.floatingBookingContent}>
                <View style={styles.floatingBookingLeft}>
                  <View style={styles.floatingBookingIcon}>
                    <Ionicons name="car-sport" size={20} color="#fff" />
                  </View>
                  <View style={styles.floatingBookingInfo}>
                    <Text style={styles.floatingBookingTitle}>
                      Active Trip {ongoingBooking.activeBookingsCount > 1 ? `(${ongoingBooking.activeBookingsCount})` : ''}
                    </Text>
                    <Text style={styles.floatingBookingSubtitle}>
                      #{ongoingBooking.bookingId?.slice(-6) || ongoingBooking._id?.slice(-6) || "N/A"}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.floatingBookingRight}>
                  <View style={styles.floatingBookingStatus}>
                    <Text style={styles.floatingBookingStatusText}>ONGOING</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#A0AEC0" />
                </View>
              </View>
              
              {/* Progress Bar */}
              <View style={styles.floatingBookingProgressContainer}>
                <Animated.View style={[
                  styles.floatingBookingProgressBar,
                  {
                    transform: [{
                      scaleX: bookingPulseAnim.interpolate({
                        inputRange: [0.92, 1.08],
                        outputRange: [0.6, 0.8]
                      })
                    }]
                  }
                ]} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}
      
      </SafeAreaView>
    </View>
  );
}

function getActiveRouteName(state) {
  if (!state || !state.routes || state.index == null) return null;
  const route = state.routes[state.index];
  // Dive into nested navigators
  if (route.state) {
    return getActiveRouteName(route.state);
  }
  return route.name;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  scrollContent: {
    paddingBottom: 20,
    backgroundColor: "#F5F7FA",
  },
  content: {
    padding: 16,
  },
  mainContent: {
    flex: 1,
    padding: 16,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 8 : 8,
    paddingBottom: 10,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    elevation: Platform.OS === 'android' ? 4 : 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    zIndex: 1000,
    minHeight: Platform.OS === 'android' ? 64 : 56,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
  },
  iconButton: {
    padding: 5,
    minHeight: 40,
    minWidth: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernIconButton: {
    marginLeft: 8,
    padding: 4,
    minHeight: 40,
    minWidth: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: "absolute",
    right: -4,
    top: -4,
    backgroundColor: "#EC4D4A",
    borderRadius: 11,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 10,
  },
  
  // Status Banner
  statusBanner: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusBannerOnline: {
    backgroundColor: '#E8F5E9',
  },
  statusBannerOffline: {
    backgroundColor: '#FFEBEE',
  },
  statusBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#192f6a',
  },
  
  // Driver Profile Card
  driverProfileCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  driverProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  driverStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverRating: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 4,
    fontWeight: '600',
  },
  driverTrips: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 4,
  },
  vehicleInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  vehicleIcon: {
    marginRight: 10,
  },
  vehicleNumberPlate: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  vehicleText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
  },
  
  // Statistics Cards
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 4,
    alignItems: 'center',
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  
  // Progress Card
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  progressAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#192f6a',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
  },
  
  // Promotional Banners
  bannersContainer: {
    marginBottom: 16,
  },
  promoBanner: {
    borderRadius: 16,
    padding: 24,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  promoTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  promoSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  promoReward: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  promoButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  promoButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  
  // Location Card
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  
  // Quick Actions
  quickActionsContainer: {
    marginBottom: 16,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#192f6a',
    marginBottom: 12,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  
  // Searching Status
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  searchingText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 8,
    fontWeight: '600',
  },
  
  // Off Duty Message
  offDutyMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  offDutyText: {
    fontSize: 14,
    color: '#FF9800',
    marginLeft: 12,
    flex: 1,
  },

  toggleContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: Platform.OS === 'android' ? 2 : 0,
  },
  toggleTrack: {
    width: SCREEN_WIDTH * 0.36,
    height: 44,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    justifyContent: "space-between",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: "hidden",
  },
  toggleCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    position: "absolute",
    left: 3,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 10,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  toggleTextContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleTextContainerOn: {
    left: 8,
  },
  toggleTextContainerOff: {
    right: 8,
  },
  toggleText: {
    fontSize: SCREEN_WIDTH * 0.032,
    fontWeight: "800",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  toggleTextOn: {
    color: "white",
  },
  toggleTextOff: {
    color: "white",
  },
  toggleSubtext: {
    fontSize: SCREEN_WIDTH * 0.026,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
    marginTop: 2,
    letterSpacing: 0.3,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  statusDotPulse: {
    backgroundColor: "#10B981",
  },
  badge: {
    position: "absolute",
    right: -6,
    top: -4,
    backgroundColor: "#EC4D4A",
    borderRadius: 8,
    minWidth: 16,
    paddingHorizontal: 4,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  startButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  startButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  // Floating Active Booking Popup Styles
  floatingBookingPopup: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 90 : 70, // Above footer navigation
    left: 16,
    right: 16,
    zIndex: 1000,
    elevation: 20,
  },
  floatingBookingContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 15,
  },
  floatingBookingGradient: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E3E8EF',
  },
  liveStatusContainer: {
    position: 'absolute',
    top: 12,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(236, 77, 74, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(236, 77, 74, 0.2)',
  },
  pulseIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EC4D4A',
    marginRight: 4,
  },
  liveStatusText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#EC4D4A',
    letterSpacing: 0.5,
  },
  floatingBookingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  floatingBookingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  floatingBookingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EC4D4A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 2,
    shadowColor: '#EC4D4A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  floatingBookingInfo: {
    flex: 1,
  },
  floatingBookingTitle: {
    color: '#2D3748',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  floatingBookingSubtitle: {
    color: '#718096',
    fontSize: 13,
    fontWeight: '500',
  },
  floatingBookingRight: {
    alignItems: 'flex-end',
  },
  floatingBookingStatus: {
    backgroundColor: '#EC4D4A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#EC4D4A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  floatingBookingStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  floatingBookingProgressContainer: {
    height: 3,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  floatingBookingProgressBar: {
    height: '100%',
    width: '100%',
    backgroundColor: '#EC4D4A',
    borderRadius: 2,
    transformOrigin: 'left',
  },
  menuIcon: {
    width: 28,
    height: 28,
    resizeMode: "contain",
  },

  // Blocked Banner Styles
  blockedBanner: {
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    elevation: 3,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  blockedBannerContent: {
    flex: 1,
    marginLeft: 12,
  },
  blockedBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#991B1B',
    marginBottom: 4,
  },
  blockedBannerText: {
    fontSize: 13,
    color: '#DC2626',
    lineHeight: 18,
    marginBottom: 12,
  },
  blockedContactButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  blockedContactButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  
  // OFF DUTY STYLES - Minimalistic Design
  offDutyMainContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 30,
    minHeight: 400,
    justifyContent: 'space-between',
  },
  offDutyGreeting: {
    alignItems: 'center',
    marginBottom: 30,
  },
  offDutyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#192f6a',
    marginBottom: 6,
    textAlign: 'center',
  },
  offDutySubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
  offDutyIllustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
    position: 'relative',
    width: 120,
    height: 120,
  },
  offDutyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    elevation: 2,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  offDutyIconCircle2: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -8,
    right: -8,
    elevation: 3,
    shadowColor: "#FF9800",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  offDutyMessageContainer: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 16,
  },
  offDutyMainMessage: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  offDutyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  goOnlineButton: {
    width: SCREEN_WIDTH * 0.75,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 25,
    elevation: 4,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 3 },
  },
  goOnlineButtonDisabled: {
    elevation: 2,
    shadowColor: "#9E9E9E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
  },
  // Registration Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 15,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 25,
  },
  modalButtons: {
    gap: 12,
  },
  modalButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: '#EC4A4D',
  },
  laterButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  laterButtonText: {
    color: '#6B7280',
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  goOnlineButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  goOnlineIcon: {
    marginRight: 8,
  },
  goOnlineButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  offDutyStatsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  offDutyStatItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  offDutyStatText: {
    fontSize: 11,
    color: '#666',
    marginTop: 3,
    fontWeight: '500',
  },
  offDutyStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
  },
  // Wallet Balance Warning/Error Banners
  walletWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#FF9800",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  walletWarningContent: {
    marginLeft: 12,
    flex: 1,
  },
  walletWarningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 2,
  },
  walletWarningText: {
    fontSize: 12,
    color: '#F57C00',
  },
  walletErrorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#F44336",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  walletErrorContent: {
    marginLeft: 12,
    flex: 1,
  },
  walletErrorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C62828',
    marginBottom: 2,
  },
  walletErrorText: {
    fontSize: 12,
    color: '#E53935',
    marginBottom: 8,
  },
  rechargeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  rechargeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  // Rider Blocked Banner Styles
  riderBlockedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#D32F2F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  riderBlockedContent: {
    marginLeft: 12,
    flex: 1,
  },
  riderBlockedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#B71C1C',
    marginBottom: 4,
  },
  riderBlockedText: {
    fontSize: 13,
    color: '#D32F2F',
    lineHeight: 18,
    marginBottom: 12,
  },
  supportButton: {
    backgroundColor: '#D32F2F',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  supportButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  // Test Buttons (Temporary for testing wallet banners)
  testButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  testButton: {
    flex: 1,
    backgroundColor: '#FF9800',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonDanger: {
    backgroundColor: '#F44336',
  },
  testButtonSuccess: {
    backgroundColor: '#4CAF50',
  },
  testButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  
  // OFF DUTY STYLES - Minimalistic Design
  offDutyMainContainer: {
    flex: 1,
  },
  offDutyStatusSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  offDutyIconWrapper: {
    marginBottom: 16,
  },
  offDutyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offDutyStatusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  offDutyStatusSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  offDutyStatsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  offDutyStatCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  offDutyStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 2,
  },
  offDutyStatLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  
  // ON DUTY STYLES - Minimalistic Design
  onDutyMainContainer: {
    flex: 1,
  },
  onDutyStatusSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  onDutyIconWrapper: {
    marginBottom: 12,
  },
  onDutyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onDutyLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  onDutyPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  onDutyLiveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  onDutyStatusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  onDutyStatusSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  onDutySearchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  onDutySearchingText: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 6,
    fontWeight: '500',
  },
  onDutyStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  onDutyStatCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  onDutyStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 2,
  },
  onDutyStatLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  onDutyLocationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  onDutyLocationText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
  },
});

