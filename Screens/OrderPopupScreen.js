import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Vibration,
  Alert,
  Animated,
  StatusBar,
  BackHandler,
  Platform,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import { assignOrder, declineBooking } from "../utils/BookingApi";
import { getRiderByPhone } from "../utils/AuthApi";
import * as Location from "expo-location";
import { Audio } from "expo-av";
import { scheduleNotificationSafely } from "../utils/NotificationHelper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import webSocketService from "../utils/WebSocketService";
import globalOrderManager from "../utils/GlobalOrderManager";

// Vibration patterns for different feedback types
const VIBRATION_PATTERNS = {
  light: [0, 50],
  medium: [0, 100],
  success: [0, 50, 50, 50],
  error: [0, 200, 100, 200],
  notification: [0, 100, 50, 100]
};

export default function OrderPopupScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [orders, setOrders] = useState([]);
  const [timers, setTimers] = useState({});
  const [acceptingOrders, setAcceptingOrders] = useState(new Set()); // Track which orders are being accepted
  const [connectionStatus, setConnectionStatus] = useState('connected'); // connected, disconnected, reconnecting
  const [rejectingOrders, setRejectingOrders] = useState(new Set()); // Track rejecting orders
  const [pulseAnimation] = useState(new Animated.Value(1)); // For pulsing new orders
  const [slideAnimation] = useState(new Animated.Value(0)); // For slide-in animations
  const timerRefs = useRef({});
  const progressAnimations = useRef({});
  const soundRef = useRef(null);
  const connectionCheckInterval = useRef(null);
  // Initialize orders from route params or WebSocket with animations
  useEffect(() => {
    if (route.params?.orders) {
      const ordersArray = Array.isArray(route.params.orders) 
        ? route.params.orders 
        : [route.params.orders];
      
      console.log("🎯 OrderPopupScreen: Received orders:", ordersArray);
      
      // Animate slide-in for new orders
      Animated.sequence([
        Animated.timing(slideAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1.05,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
      
      // Enhanced vibration feedback for new orders
      Vibration.vibrate(VIBRATION_PATTERNS.notification);
      
      setOrders(ordersArray);
      
      // Initialize timers
      const newTimers = {};
      ordersArray.forEach((order) => {
        newTimers[order.bookingId] = 15;
      });
      setTimers(newTimers);
    }
  }, [route.params?.orders]);

  // Handle hardware back button to prevent closing
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Prevent going back - user must accept or reject
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  // WebSocket message handling is now done by GlobalOrderManager

  // Set up GlobalOrderManager integration with connection monitoring
  useEffect(() => {
    // Set callback for receiving new orders from GlobalOrderManager
    globalOrderManager.setOrderCallback((newOrders) => {
      console.log('[OrderPopup] 📨 Received orders from GlobalOrderManager:', newOrders.length);
      
      // Enhanced vibration feedback for new incoming orders
      Vibration.vibrate(VIBRATION_PATTERNS.medium);
      
      setOrders(prevOrders => {
        // Merge new orders with existing ones, avoiding duplicates
        const existingIds = new Set(prevOrders.map(o => o.bookingId));
        const uniqueNewOrders = newOrders.filter(o => !existingIds.has(o.bookingId));
        
        if (uniqueNewOrders.length > 0) {
          // Initialize timers for new orders
          const newTimers = {};
          uniqueNewOrders.forEach(order => {
            newTimers[order.bookingId] = 15;
          });
          setTimers(prev => ({ ...prev, ...newTimers }));
          
          // Trigger pulse animation for new orders
          Animated.sequence([
            Animated.timing(pulseAnimation, {
              toValue: 1.1,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnimation, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            })
          ]).start();
          
          return [...prevOrders, ...uniqueNewOrders];
        }
        return prevOrders;
      });
    });
    
    // Monitor connection status
    const checkConnection = () => {
      try {
        // Check WebSocket connection status
        const wsConnected = webSocketService.isConnected;
        setConnectionStatus(wsConnected ? 'connected' : 'disconnected');
      } catch (error) {
        setConnectionStatus('disconnected');
      }
    };
    
    // Check connection every 5 seconds
    connectionCheckInterval.current = setInterval(checkConnection, 5000);
    checkConnection(); // Initial check
    
    // Notify GlobalOrderManager that popup is open
    globalOrderManager.setPopupStatus(true);
    
    return () => {
      // Clean up on unmount
      globalOrderManager.setOrderCallback(null);
      globalOrderManager.setPopupStatus(false);
      if (connectionCheckInterval.current) {
        clearInterval(connectionCheckInterval.current);
      }
    };
  }, []);

  // Handle new booking via WebSocket
  const handleNewBookingMessage = async (booking) => {
    console.log('[OrderPopup] 🆕 New booking received:', booking.bookingId);
    console.log('[OrderPopup] 💰 Fare data received:', {
      price: booking.price,
      totalFare: booking.totalFare,
      amountPay: booking.amountPay,
      totalDriverEarnings: booking.totalDriverEarnings,
      platformFee: booking.platformFee,
      quickFee: booking.quickFee
    });
    
    const newBooking = {
      bookingId: booking.bookingId,
      from: booking.from,
      to: booking.to,
      driverToFromKm: booking.driverToFromKm,
      fromToDropKm: booking.fromToDropKm,
      totalFare: booking.totalFare || booking.amountPay || booking.price,
      price: booking.price || booking.totalFare,
      totalDriverEarnings: booking.totalDriverEarnings || booking.driverEarnings,
      platformFee: booking.platformFee || booking.commission || 0,
      gst: booking.gst || booking.tax || 0,
      baseFare: booking.baseFare || booking.totalFare,
      amountPay: booking.amountPay || booking.totalFare,
      quickFee: booking.quickFee || 0,
      tipAmount: booking.quickFee || 0,
      status: booking.status,
      vehicleType: booking.vehicleType,
    };
    
    console.log('[OrderPopup] 📊 Processed booking to display:', {
      totalFare: newBooking.totalFare,
      price: newBooking.price,
      totalDriverEarnings: newBooking.totalDriverEarnings,
      platformFee: newBooking.platformFee
    });

    setOrders((prevOrders) => {
      const exists = prevOrders.some(order => order.bookingId === newBooking.bookingId);
      if (exists) {
        return prevOrders;
      }
      return [...prevOrders, newBooking];
    });

    // Initialize timer
    setTimers((prev) => ({
      ...prev,
      [newBooking.bookingId]: 15,
    }));

    // Play sound and vibrate
    try {
      const { sound } = await Audio.Sound.createAsync(
        require("../assets/preview.mp3")
      );
      soundRef.current = sound;
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (e) {
      console.log('Sound error:', e);
    }

    Vibration.vibrate([0, 500, 200, 500]);

    await scheduleNotificationSafely({
      content: {
        title: "New Ride Request! 🚗",
        body: `₹${newBooking.totalFare || newBooking.amountPay || newBooking.price} • ${newBooking.driverToFromKm} km away`,
        sound: true,
      },
      trigger: null,
    });
  };

  // Handle booking cancellation
  const handleBookingCancellationMessage = async (booking) => {
    const bookingId = booking.bookingId || booking._id;
    console.log('[OrderPopup] ❌ Booking cancelled:', bookingId);
    
    setOrders((prevOrders) => {
      const filteredOrders = prevOrders.filter(order => order.bookingId !== bookingId);
      
      // If no orders left, close the popup
      if (filteredOrders.length === 0) {
        setTimeout(() => navigation.goBack(), 1000);
      }
      
      return filteredOrders;
    });
    
    // Clear timer
    if (timerRefs.current[bookingId]) {
      clearInterval(timerRefs.current[bookingId]);
      delete timerRefs.current[bookingId];
    }
    
    Alert.alert(
      "❌ Booking Cancelled",
      "The customer has cancelled this booking.",
      [{ text: "OK" }]
    );
  };

  // Handle booking updates (tips)
  const handleBookingUpdateMessage = (data) => {
    const bookingId = data.bookingId;
    const updates = data.updates || {};
    
    setOrders(prevOrders => {
      return prevOrders.map(order => {
        if (order.bookingId === bookingId) {
          return {
            ...order,
            price: updates.totalDriverEarnings || updates.price || order.price,
            totalDriverEarnings: updates.totalDriverEarnings || order.totalDriverEarnings,
            quickFee: updates.quickFee || order.quickFee,
            amountPay: updates.amountPay || order.amountPay
          };
        }
        return order;
      });
    });
    
    Alert.alert(
      "💰 Tip Added!",
      `Customer added a tip! New earning: ₹${updates.totalDriverEarnings || updates.price}`,
      [{ text: "Great!" }]
    );
  };

  // Handle tip added
  const handleTipAddedMessage = (message) => {
    const bookingId = message.bookingId.toString();
    
    setOrders(prevOrders => {
      return prevOrders.map(order => {
        const orderBookingId = order.bookingId?.toString() || order._id?.toString();
        
        if (orderBookingId === bookingId) {
          return {
            ...order,
            totalDriverEarnings: message.newTotal || message.newTotalEarnings || order.totalDriverEarnings,
            price: message.newTotal || message.newTotalEarnings || order.price,
            quickFee: message.tipAmount || order.quickFee || 0
          };
        }
        return order;
      });
    });

    Vibration.vibrate([0, 200, 100, 200]);
  };

  // Countdown timer effect
  useEffect(() => {
    orders.forEach((booking) => {
      const bookingId = booking.bookingId;
      
      // Initialize progress animation
      if (!progressAnimations.current[bookingId]) {
        progressAnimations.current[bookingId] = new Animated.Value(1);
      }

      // Clear existing timer
      if (timerRefs.current[bookingId]) {
        clearInterval(timerRefs.current[bookingId]);
      }

      // Start new timer
      timerRefs.current[bookingId] = setInterval(() => {
        setTimers((prev) => {
          const currentTime = prev[bookingId];
          
          if (currentTime <= 1) {
            clearInterval(timerRefs.current[bookingId]);
            handleAutoCancel(bookingId);
            return { ...prev, [bookingId]: 0 };
          }

          // Update progress animation
          const progress = (currentTime - 1) / 15;
          Animated.timing(progressAnimations.current[bookingId], {
            toValue: progress,
            duration: 1000,
            useNativeDriver: false,
          }).start();

          return { ...prev, [bookingId]: currentTime - 1 };
        });
      }, 1000);
    });

    return () => {
      Object.values(timerRefs.current).forEach((timer) => clearInterval(timer));
    };
  }, [orders]);

  const handleAutoCancel = async (bookingId) => {
    console.log("⏰ Timer expired, auto-declining order:", bookingId);
    
    // Remove from GlobalOrderManager
    globalOrderManager.removeOrder(bookingId);
    
    setOrders((prev) => {
      const filteredOrders = prev.filter((order) => order.bookingId !== bookingId);
      
      // If no orders left, close popup
      if (filteredOrders.length === 0) {
        setTimeout(() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.replace('Home');
          }
        }, 1000);
      }
      
      return filteredOrders;
    });
    
    // Clear timer
    if (timerRefs.current[bookingId]) {
      clearInterval(timerRefs.current[bookingId]);
      delete timerRefs.current[bookingId];
    }
    
    // Clear progress animation
    if (progressAnimations.current[bookingId]) {
      delete progressAnimations.current[bookingId];
    }

    // Auto-decline on backend
    try {
      const riderData = await getRiderByPhone();
      const riderId = riderData?._id || riderData?.id || riderData?.rider?._id;
      
      if (riderId) {
        declineBooking(bookingId, riderId, "Timer expired - Auto declined")
          .then(() => console.log("✅ Auto-decline notified to backend"))
          .catch((err) => console.log("⚠️ Auto-decline notification failed:", err.message));
      }
    } catch (err) {
      console.log("⚠️ Could not auto-decline:", err.message);
    }
  };

  const handleAccept = async (bookingId) => {
    // Prevent multiple simultaneous accepts
    if (acceptingOrders.has(bookingId)) {
      console.log("⚠️ Order already being accepted:", bookingId);
      return;
    }

    try {
      console.log("🎯 Accepting order:", bookingId);
      
      // Set loading state with vibration feedback
      setAcceptingOrders(prev => new Set([...prev, bookingId]));
      Vibration.vibrate(VIBRATION_PATTERNS.light);

      // Clear timer
      if (timerRefs.current[bookingId]) {
        clearInterval(timerRefs.current[bookingId]);
        delete timerRefs.current[bookingId];
      }

      const riderData = await getRiderByPhone();
      const driverId = riderData?._id || riderData?.id || riderData?.rider?._id || riderData?.rider?.id || riderData?.data?._id || riderData?.data?.id;

      if (!driverId) {
        throw new Error("Rider ID not found. Please login again.");
      }

      // Get current location
      let latitude = null;
      let longitude = null;
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        latitude = location.coords.latitude;
        longitude = location.coords.longitude;
      } catch (locErr) {
        console.log("⚠️ Could not get location:", locErr.message);
      }

      // Assign order
      const assignResponse = await assignOrder(
        bookingId,
        driverId,
        "accepted",
        latitude,
        longitude
      );

      console.log("🎯 assignOrder API response:", {
        success: assignResponse?.success,
        hasBooking: !!assignResponse?.booking,
        bookingId: assignResponse?.booking?.bookingId || assignResponse?.booking?._id,
        message: assignResponse?.message,
        code: assignResponse?.code,
        fullResponse: JSON.stringify(assignResponse, null, 2).substring(0, 500)
      });

      // CRITICAL: Only proceed if assignment was successful
      if (!assignResponse || !assignResponse.success) {
        console.log("❌ Assign order failed:", {
          success: assignResponse?.success,
          message: assignResponse?.message,
          code: assignResponse?.code,
          error: assignResponse?.error
        });
        
        // Show specific error with vibration feedback and do NOT navigate
        const errorMsg = assignResponse?.message || assignResponse?.error || "Failed to assign order";
        Vibration.vibrate(VIBRATION_PATTERNS.error);
        
        Alert.alert(
          "❌ Order Assignment Failed",
          errorMsg,
          [
            { 
              text: "Retry", 
              onPress: () => {
                setTimeout(() => {
                  handleAccept(bookingId);
                }, 1000);
              }
            },
            { text: "Cancel", style: "cancel" }
          ]
        );
        return; // Exit early - do NOT navigate
      }

      console.log("✅ Order assigned successfully, response has booking:", !!assignResponse.booking);

      // Enhanced success feedback
      Vibration.vibrate(VIBRATION_PATTERNS.success);
      
      // Success animation
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();

      try {
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
        console.log("Sound error:", e);
      }

      await scheduleNotificationSafely({
        content: {
          title: "✅ Order Accepted Successfully!",
          body: "Preparing your ride details...",
          sound: 'default',
        },
        trigger: null,
      });

      // Get the accepted order data before removing it
      const acceptedOrder = orders.find(order => order.bookingId === bookingId);
      
      console.log("🔍 acceptedOrder from popup state:", {
        hasOrder: !!acceptedOrder,
        bookingId: acceptedOrder?.bookingId,
        hasFrom: !!acceptedOrder?.from,
        hasTo: !!acceptedOrder?.to
      });
      
      // DON'T remove order or update state yet - wait until after navigation
      // globalOrderManager.removeOrder(bookingId);
      // setOrders((prev) => prev.filter((order) => order.bookingId !== bookingId));

      // Navigate to OrderDetailsScreen immediately with proper order data
      // The API returns the full booking data in assignResponse.booking
      let orderToNavigate = null;
      
      // Try multiple sources for order data (prefer API response)
      if (assignResponse?.booking) {
        // Use the full booking data from API response (preferred)
        orderToNavigate = assignResponse.booking;
        console.log("🎯 Using API response booking data for navigation");
        console.log("📦 API booking data:", {
          _id: orderToNavigate._id,
          bookingId: orderToNavigate.bookingId,
          status: orderToNavigate.status,
          hasFrom: !!orderToNavigate.from,
          hasTo: !!orderToNavigate.to,
          hasFromAddress: !!orderToNavigate.fromAddress,
          hasDropLocation: !!orderToNavigate.dropLocation
        });
      } else if (assignResponse?.data?.booking) {
        // Check if booking data is nested in data property
        orderToNavigate = assignResponse.data.booking;
        console.log("🎯 Using nested API booking data for navigation");
      } else if (acceptedOrder) {
        // Fallback to the original order data from the popup
        orderToNavigate = {
          ...acceptedOrder,
          _id: acceptedOrder.bookingId || acceptedOrder._id,
          bookingId: acceptedOrder.bookingId,
          fromAddress: acceptedOrder.from,
          from: acceptedOrder.from,
          dropLocation: acceptedOrder.to ? [acceptedOrder.to] : [],
          to: acceptedOrder.to,
          status: 'accepted',
          rider: driverId
        };
        console.log("🎯 Using transformed popup order data for navigation");
      }
      
      console.log("🎯 Final order data for OrderDetailsScreen:", {
        hasOrderData: !!orderToNavigate,
        orderId: orderToNavigate?.bookingId || orderToNavigate?._id,
        fromAPI: !!(assignResponse?.booking || assignResponse?.data?.booking),
        dataSource: (assignResponse?.booking || assignResponse?.data?.booking) ? 'API' : 'Popup',
        hasFromCoords: !!(orderToNavigate?.from?.latitude || orderToNavigate?.fromAddress?.latitude),
        hasToCoords: !!(orderToNavigate?.to?.latitude || orderToNavigate?.dropLocation?.[0]?.latitude)
      });
      
      // Navigate to OrderDetailsScreen - DO THIS BEFORE cleaning up state
      if (orderToNavigate) {
        console.log("✅ Order data available, navigating to OrderDetailsScreen");
        console.log("🎯 Navigating to OrderDetailsScreen now with data");
        
        // Set flag in AsyncStorage to prevent HomeScreen auto-navigation loop
        try {
          await AsyncStorage.setItem('hasNavigatedToActiveOrder', 'true');
          console.log("🔒 Set navigation lock flag");
        } catch (e) {
          console.log("⚠️ Could not set navigation flag:", e.message);
        }
        
        // Navigate immediately WITHOUT waiting
        navigation.replace("OrderDetailsScreen", { order: orderToNavigate });
        
        // Clean up AFTER navigation is initiated
        setTimeout(() => {
          console.log("🧹 Cleaning up order from popup state");
          globalOrderManager.removeOrder(bookingId);
          setOrders((prev) => prev.filter((order) => order.bookingId !== bookingId));
        }, 1000);
        
      } else {
        // If no order data, try to fetch from API as fallback
        console.error("❌ No order data available for navigation");
        console.log("🔍 Attempting to fetch ongoing booking as fallback...");
        
        try {
          const { getOngoingBookingForRider } = await import('../utils/BookingApi');
          const ongoingBookingResponse = await getOngoingBookingForRider({ riderId: driverId });
          
          if (ongoingBookingResponse && (ongoingBookingResponse._id || ongoingBookingResponse.bookingId)) {
            console.log("✅ Found ongoing booking as fallback");
            navigation.replace("OrderDetailsScreen", { order: ongoingBookingResponse });
            
            // Clean up after navigation
            setTimeout(() => {
              globalOrderManager.removeOrder(bookingId);
              setOrders((prev) => prev.filter((order) => order.bookingId !== bookingId));
            }, 1000);
            return;
          }
        } catch (fallbackError) {
          console.log("⚠️ Fallback ongoing booking fetch failed:", fallbackError.message);
        }
        
        // Final fallback: Navigate to Home with message
        console.log("🔄 All fallbacks failed, navigating to Home");
        globalOrderManager.removeOrder(bookingId);
        setOrders((prev) => prev.filter((order) => order.bookingId !== bookingId));
        
        setTimeout(() => {
          navigation.replace('Home');
          setTimeout(() => {
            Alert.alert(
              "Order Accepted", 
              "Your order was accepted successfully. You can find it in your active orders.",
              [{ text: "OK" }]
            );
          }, 1000);
        }, 500);
      }

      // If there are remaining orders, keep the popup open
      if (orders.length > 1) {
        console.log(`🎯 ${orders.length - 1} orders remaining in popup`);
      }

    } catch (err) {
      console.error("❌ Accept order error:", err);

      let errorMessage = "Failed to accept order";
      if (err.response) {
        errorMessage = err.response.data?.message || err.response.data?.error || errorMessage;
      } else if (err.message) {
        errorMessage = err.message;
      }

      Vibration.vibrate(VIBRATION_PATTERNS.error);
      Alert.alert(
        "❌ Order Acceptance Failed", 
        errorMessage,
        [{ text: "OK" }]
      );
    } finally {
      // Always clear loading state
      setAcceptingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookingId);
        return newSet;
      });
    }
  };

  const handleReject = async (bookingId) => {
    try {
      console.log("🚫 Rejecting booking:", bookingId);
      
      // Set rejecting state with vibration feedback
      setRejectingOrders(prev => new Set([...prev, bookingId]));
      Vibration.vibrate(VIBRATION_PATTERNS.medium);

      // Clear timer
      if (timerRefs.current[bookingId]) {
        clearInterval(timerRefs.current[bookingId]);
        delete timerRefs.current[bookingId];
      }

      // Clear progress animation
      if (progressAnimations.current[bookingId]) {
        delete progressAnimations.current[bookingId];
      }

      // Remove from local list and GlobalOrderManager
      globalOrderManager.removeOrder(bookingId);
      
      setOrders((prev) => {
        const filteredOrders = prev.filter((order) => order.bookingId !== bookingId);
        
        // If no orders left, close popup
        if (filteredOrders.length === 0) {
          setTimeout(() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.replace('Home');
            }
          }, 500);
        }
        
        return filteredOrders;
      });

      // Decline on backend
      const riderData = await getRiderByPhone();
      const riderId = riderData?._id || riderData?.id || riderData?.rider?._id || riderData?.rider?.id || riderData?.data?._id || riderData?.data?.id;

      if (riderId) {
        declineBooking(bookingId, riderId, "Rider declined")
          .then(() => console.log("✅ Booking declined successfully"))
          .catch((err) => console.error("❌ Failed to notify decline:", err.message));
      }

    } catch (err) {
      console.error("❌ Reject booking error:", err);
      Vibration.vibrate(VIBRATION_PATTERNS.error);
      
      // Ensure order is removed
      setOrders((prev) => {
        const filteredOrders = prev.filter((order) => order.bookingId !== bookingId);
        if (filteredOrders.length === 0) {
          setTimeout(() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.replace('Home');
            }
          }, 500);
        }
        return filteredOrders;
      });
    } finally {
      // Always clear rejecting state
      setRejectingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookingId);
        return newSet;
      });
    }
  };

  // Close popup if no orders
  useEffect(() => {
    if (orders.length === 0) {
      const timeout = setTimeout(() => {
        // Check if we can go back, otherwise navigate to Home
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.replace('Home');
        }
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [orders.length, navigation]);

  if (orders.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar 
          barStyle="dark-content" 
          backgroundColor="#F8F9FA"
          translucent={Platform.OS === 'android'}
        />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No orders available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="#F8F9FA"
        translucent={Platform.OS === 'android'}
      />
      
      {/* Compact Header with Connection Status */}
      <View style={styles.compactHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBadge}>
            <Ionicons name="car-sport" size={18} color="#fff" />
          </View>
          <Text style={styles.compactTitle}>Ride Requests</Text>
          
          {/* Connection Status Indicator */}
          <View style={[
            styles.connectionIndicator,
            connectionStatus === 'connected' && styles.connectedStatus,
            connectionStatus === 'disconnected' && styles.disconnectedStatus,
            connectionStatus === 'reconnecting' && styles.reconnectingStatus
          ]}>
            <View style={[
              styles.connectionDot,
              { backgroundColor: getConnectionDotColor(connectionStatus) }
            ]} />
            <Text style={[
              styles.connectionText,
              { color: getConnectionTextColor(connectionStatus) }
            ]}>
              {connectionStatus === 'connected' && 'Live'}
              {connectionStatus === 'disconnected' && 'Offline'}
              {connectionStatus === 'reconnecting' && 'Connecting'}
            </Text>
          </View>
        </View>
        
        <View style={styles.compactCounter}>
          <Text style={styles.compactCountText}>{orders.length}</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {orders.map((order, index) => (
          <Animated.View 
            key={order.bookingId || index} 
            style={[
              styles.compactCard,
              {
                transform: [
                  { scale: pulseAnimation },
                  { translateY: slideAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0]
                  })}
                ],
                opacity: slideAnimation
              }
            ]}
          >
            {/* Compact Header Row */}
            <View style={styles.compactCardHeader}>
              <View style={styles.leftSection}>
                <Text style={styles.vehicleLabel}>
                  🏍️ {String(order.to?.professional || order.vehicleType || "Bike")}
                </Text>
                <Text style={styles.orderNumber}>#{index + 1}</Text>
              </View>
              <View style={styles.rightSection}>
                <Text style={styles.earningsLabel}>Order Fare</Text>
                <Text style={styles.compactPrice}>
                  ₹{order.totalFare || order.price || order.amountPay || 0}
                </Text>
                {order.quickFee && order.quickFee > 0 && (
                  <Text style={styles.compactTip}>🎁 Tip: +₹{order.quickFee}</Text>
                )}
                <View style={styles.compactTimer}>
                  <Text style={styles.compactTimerText}>
                    {timers[order.bookingId] || 0}s
                  </Text>
                </View>
              </View>
            </View>

            {/* Compact Route Info */}
            <View style={styles.compactRoute}>
              <View style={styles.compactLocationRow}>
                <View style={styles.compactLocationIcon}>
                  <View style={styles.pickupDot} />
                </View>
                <Text style={styles.compactDistance}>
                  {order.driverToFromKm ? `${order.driverToFromKm}km` : '0km'}
                </Text>
                <View style={styles.compactLocationText}>
                  <Text style={styles.compactAddress} numberOfLines={2}>
                    {order.from?.address || "Pickup Address"}
                  </Text>
                </View>
              </View>
              
              <View style={styles.compactDivider} />
              
              <View style={styles.compactLocationRow}>
                <View style={styles.compactLocationIcon}>
                  <Ionicons name="location" size={12} color="#E53935" />
                </View>
                <Text style={styles.compactDistance}>
                  {order.fromToDropKm ? `${order.fromToDropKm}km` : '0km'}
                </Text>
                <View style={styles.compactLocationText}>
                  <Text style={styles.compactAddress} numberOfLines={2}>
                    {order.to?.Address || "Drop Address"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Compact Action Buttons */}
            <View style={styles.compactActions}>
              <TouchableOpacity
                style={[
                  styles.compactRejectBtn,
                  rejectingOrders.has(order.bookingId) && styles.rejectingBtn
                ]}
                onPress={() => handleReject(order.bookingId)}
                disabled={rejectingOrders.has(order.bookingId) || acceptingOrders.has(order.bookingId)}
                accessibilityLabel="Reject Order"
                accessibilityHint="Double tap to reject this order"
              >
                {rejectingOrders.has(order.bookingId) ? (
                  <ActivityIndicator size={16} color="#fff" />
                ) : (
                  <Ionicons name="close" size={16} color="#fff" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.compactAcceptBtn,
                  acceptingOrders.has(order.bookingId) && styles.acceptingBtn
                ]}
                onPress={() => handleAccept(order.bookingId)}
                disabled={acceptingOrders.has(order.bookingId) || rejectingOrders.has(order.bookingId)}
                accessibilityLabel={`Accept Order ${order.totalFare || order.price} rupees`}
                accessibilityHint="Double tap to accept this ride request"
              >
                <Animated.View
                  style={[
                    styles.compactProgress,
                    {
                      width: progressAnimations.current[order.bookingId]
                        ? progressAnimations.current[order.bookingId].interpolate({
                            inputRange: [0, 1],
                            outputRange: ["0%", "100%"],
                          })
                        : "100%",
                    },
                  ]}
                />
                <View style={styles.compactAcceptContent}>
                  {acceptingOrders.has(order.bookingId) ? (
                    <>
                      <Ionicons name="hourglass" size={16} color="#fff" />
                      <Text style={styles.compactAcceptText}>Accepting...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text style={styles.compactAcceptText}>Accept</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  compactHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 10,
  },
  orderCounter: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  counterText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollContent: {
    padding: 12,
  },
  compactCard: {
    backgroundColor: "#fff",
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  compactCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rightSection: {
    alignItems: "flex-end",
  },
  earningsLabel: {
    fontSize: 10,
    color: "#666",
    fontWeight: "500",
    marginBottom: 2,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  compactTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  compactCounter: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  compactCountText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  vehicleLabel: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "600",
    color: "#2E7D32",
  },
  orderNumber: {
    fontSize: 11,
    color: "#666",
    marginLeft: 8,
    fontWeight: "500",
  },
  compactPrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2E7D32",
  },
  compactTip: {
    fontSize: 10,
    color: "#4CAF50",
    fontWeight: "600",
    marginTop: 2,
  },
  compactTimer: {
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  compactTimerText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#E53935",
  },

  compactRoute: {
    marginBottom: 12,
  },
  compactLocationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
  },
  compactLocationIcon: {
    width: 16,
    alignItems: "center",
    marginRight: 8,
  },
  compactDistance: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666",
    minWidth: 35,
    marginRight: 8,
  },
  compactLocationText: {
    flex: 1,
  },
  compactAddress: {
    fontSize: 18,
    color: "#333",
    fontWeight: "600",
    lineHeight: 24,
  },
  compactDivider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginLeft: 59,
    marginVertical: 4,
  },
  compactActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  compactRejectBtn: {
    backgroundColor: "#E53935",
    borderRadius: 8,
    padding: 12,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  compactAcceptBtn: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flex: 1,
    marginLeft: 12,
    overflow: "hidden",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  compactProgress: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#2E7D32",
    zIndex: 1,
  },
  compactAcceptContent: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 2,
  },
  compactAcceptText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 4,
  },
  acceptingBtn: {
    backgroundColor: "#81C784", // Lighter green when loading
    opacity: 0.7,
  },
  rejectingBtn: {
    backgroundColor: "#EF5350", // Lighter red when loading
    opacity: 0.7,
  },
  connectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  connectedStatus: {
    backgroundColor: '#E8F5E9',
  },
  disconnectedStatus: {
    backgroundColor: '#FFEBEE',
  },
  reconnectingStatus: {
    backgroundColor: '#FFF3E0',
  },
  connectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  connectionText: {
    fontSize: 10,
    fontWeight: '600',
  },
  pickupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },
  emptyText: {
    fontSize: 18,
    color: "#607D8B",
    fontWeight: "600",
  },
});

// Update connection dot colors based on status
const getConnectionDotColor = (status) => {
  switch (status) {
    case 'connected': return '#4CAF50';
    case 'disconnected': return '#F44336';
    case 'reconnecting': return '#FF9800';
    default: return '#9E9E9E';
  }
};

// Update connection text color based on status
const getConnectionTextColor = (status) => {
  switch (status) {
    case 'connected': return '#2E7D32';
    case 'disconnected': return '#C62828';
    case 'reconnecting': return '#EF6C00';
    default: return '#757575';
  }
};