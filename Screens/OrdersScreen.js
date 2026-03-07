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
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import { getBookings, assignOrder, declineBooking } from "../utils/BookingApi";
import { getRiderByPhone, updateOnlineStatus } from "../utils/AuthApi";
import * as Location from "expo-location";
import { Audio } from "expo-av";
import { scheduleNotificationSafely } from "../utils/NotificationHelper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import HeaderWithBackButton from "../components/HeaderWithBackButton";
import webSocketService from "../utils/WebSocketService";
import globalOrderManager from "../utils/GlobalOrderManager";

export default function OrdersScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const bookingsFromParams = route.params?.booking?.bookings || [];
  const [orders, setOrders] = useState(bookingsFromParams);
  const [loading, setLoading] = useState(false);
  const [timers, setTimers] = useState({});
  const timerRefs = useRef({});
  const progressAnimations = useRef({});
  const [isOnline, setIsOnline] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const soundRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [isTogglingOnline, setIsTogglingOnline] = useState(false);

  // Toggle online status function (similar to HomeScreen)
  const toggleOnlineStatus = async () => {
    if (isTogglingOnline) return; // Prevent multiple toggles

    setIsTogglingOnline(true);
    
    try {
      const newOnlineStatus = !isOnline;
      console.log("🔘 OrdersScreen: Toggling online status to:", newOnlineStatus);

      // Update local state immediately for better UX
      setIsOnline(newOnlineStatus);
      await AsyncStorage.setItem("isOnline", newOnlineStatus ? "true" : "false");

      // Update backend status
      try {
        const phoneNumber = await AsyncStorage.getItem("number");
        if (phoneNumber) {
          let latitude = null;
          let longitude = null;

          if (newOnlineStatus) {
            // When going online, send current location
            try {
              let { status } = await Location.requestForegroundPermissionsAsync();
              if (status === "granted") {
                let location = await Location.getCurrentPositionAsync({
                  accuracy: Location.Accuracy.High,
                });
                latitude = location.coords.latitude;
                longitude = location.coords.longitude;
                console.log("📍 OrdersScreen: Sending location with status update");
              }
            } catch (locErr) {
              console.log("⚠️ Could not get location:", locErr.message);
            }
          }

          await updateOnlineStatus(phoneNumber, newOnlineStatus, latitude, longitude);
          console.log("✅ OrdersScreen: Backend status updated successfully");
        }
      } catch (error) {
        console.error("❌ Error updating backend status:", error);
      }

      // If going online, fetch orders after a short delay
      if (newOnlineStatus) {
        setTimeout(() => {
          fetchOrders(true); // Silent fetch
        }, 1000);
      }

      // Notify HomeScreen about the status change via navigation
      // This ensures HomeScreen updates when user returns to it
      try {
        if (navigation.getParent) {
          const parentNavigator = navigation.getParent();
          if (parentNavigator) {
            parentNavigator.setParams({ 
              onlineStatusUpdated: Date.now(), // Use timestamp to ensure it's always different
              isOnline: newOnlineStatus 
            });
          }
        }
        
        // Also store a flag for cross-screen communication
        await AsyncStorage.setItem("statusChangedFrom", "OrdersScreen");
        console.log("📨 OrdersScreen: Notified other screens about status change");
      } catch (navError) {
        console.log("⚠️ Could not notify other screens:", navError.message);
      }
      
    } catch (error) {
      console.error("❌ Error toggling online status:", error);
      // Revert on error  
      const revertedStatus = !newOnlineStatus;
      setIsOnline(revertedStatus);
      await AsyncStorage.setItem("isOnline", revertedStatus ? "true" : "false");
      
      Alert.alert("Error", "Failed to update online status. Please try again.");
    } finally {
      setIsTogglingOnline(false);
    }
  };

  // Sync with GlobalOrderManager orders
  useEffect(() => {
    const initializeOrderSync = async () => {
      // Wait for GlobalOrderManager to be initialized
      let attempts = 0;
      while (!globalOrderManager.isInitialized && attempts < 10) {
        console.log('[OrdersScreen] ⏳ Waiting for GlobalOrderManager initialization...');
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      
      if (!globalOrderManager.isInitialized) {
        console.log('[OrdersScreen] ⚠️ GlobalOrderManager not initialized after 5s, continuing anyway');
      }
      
      const syncWithGlobalOrderManager = () => {
        const activeOrders = globalOrderManager.getActiveOrders();
        console.log('[OrdersScreen] 🔄 Syncing with GlobalOrderManager, active orders:', activeOrders.length);
        
        setOrders(prevOrders => {
          // Only update if orders have actually changed
          const prevIds = prevOrders.map(o => o.bookingId).sort().join(',');
          const newIds = activeOrders.map(o => o.bookingId).sort().join(',');
          
          if (prevIds !== newIds) {
            console.log('[OrdersScreen] 📱 Orders changed, updating list');
            
            // Initialize timers for new orders
            const newTimers = {};
            activeOrders.forEach((order) => {
              if (!timers[order.bookingId]) {
                newTimers[order.bookingId] = 15;
              }
            });
            
            if (Object.keys(newTimers).length > 0) {
              setTimers(prev => ({ ...prev, ...newTimers }));
            }
            
            return activeOrders;
          }
          
          return prevOrders;
        });
      };
      
      // Initial sync
      syncWithGlobalOrderManager();
      
      // Set up callback for immediate updates when orders change
      const handleOrderUpdate = (updatedOrders) => {
        console.log('[OrdersScreen] 📲 Received order update from GlobalOrderManager:', updatedOrders.length);
        setOrders(updatedOrders);
        
        // Initialize timers for new orders
        const newTimers = {};
        updatedOrders.forEach((order) => {
          if (!timers[order.bookingId]) {
            newTimers[order.bookingId] = 15;
          }
        });
        
        if (Object.keys(newTimers).length > 0) {
          setTimers(prev => ({ ...prev, ...newTimers }));
        }
      };
      
      // Register callback with GlobalOrderManager
      if (globalOrderManager.setOrdersScreenCallback) {
        globalOrderManager.setOrdersScreenCallback(handleOrderUpdate);
        console.log('[OrdersScreen] ✅ Registered callback with GlobalOrderManager');
      } else {
        console.log('[OrdersScreen] ⚠️ setOrdersScreenCallback not available');
      }
      
      // Set up periodic sync as backup
      const syncInterval = setInterval(syncWithGlobalOrderManager, 3000);
      
      // Set WebSocket connection status
      setWsConnected(webSocketService.isConnected);
      
      return () => {
        clearInterval(syncInterval);
        // Remove callback on cleanup
        if (globalOrderManager.setOrdersScreenCallback) {
          globalOrderManager.setOrdersScreenCallback(null);
        }
      };
    };
    
    const cleanup = initializeOrderSync();
    return () => {
      if (cleanup && typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, []);

  // WebSocket message handling is done by GlobalOrderManager
  // OrdersScreen just displays orders, actual order management is global








  // Check online status on component mount and focus
  useEffect(() => {
    const checkOnlineStatus = async () => {
      try {
        const onlineStatus = await AsyncStorage.getItem("isOnline");
        const isCurrentlyOnline = onlineStatus === "true";
        console.log("📱 OrdersScreen: Checking online status:", isCurrentlyOnline);
        setIsOnline(isCurrentlyOnline);
      } catch (error) {
        console.error("❌ Error checking online status:", error);
        setIsOnline(false);
      }
    };
    checkOnlineStatus();
  }, []);

  // Also check online status when screen is focused (dynamic checking)
  useFocusEffect(
    useCallback(() => {
      const checkOnlineStatusOnFocus = async () => {
        try {
          const onlineStatus = await AsyncStorage.getItem("isOnline");
          const isCurrentlyOnline = onlineStatus === "true";
          const changedFrom = await AsyncStorage.getItem("statusChangedFrom");
          
          console.log("🔄 OrdersScreen focused - online status:", isCurrentlyOnline);
          if (changedFrom) {
            console.log("📨 OrdersScreen: Status was changed from", changedFrom);
          }
          
          // Only update if different to avoid unnecessary re-renders
          setIsOnline((prevOnline) => {
            if (prevOnline !== isCurrentlyOnline) {
              console.log("📱 OrdersScreen: Status changed from", prevOnline, "to", isCurrentlyOnline);
              if (changedFrom === "HomeScreen") {
                console.log("✅ OrdersScreen: Received update from HomeScreen");
              }
              return isCurrentlyOnline;
            }
            return prevOnline;
          });
          
          // Clear the flag after processing
          if (changedFrom) {
            await AsyncStorage.removeItem("statusChangedFrom");
          }
        } catch (error) {
          console.error("❌ Error checking online status on focus:", error);
        }
      };
      
      checkOnlineStatusOnFocus();
    }, [])
  );

  // Pulse animation for waiting state
  useEffect(() => {
    if (isOnline && orders.length === 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
    return () => pulseAnim.stopAnimation();
  }, [isOnline, orders.length]);

  const fetchOrders = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      // Get location permission and coordinates
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        if (!silent) {
          Alert.alert(
            "Location Error",
            "Location permission is required to fetch orders"
          );
        }
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Get phone number from AsyncStorage
      let phoneNumber = await AsyncStorage.getItem("number");

      if (!phoneNumber) {
        if (!silent) {
          Alert.alert(
            "Authentication Error",
            "Phone number not found. Please login again."
          );
        }
        return;
      }

      // Call API with all required parameters
      const bookingData = await getBookings(latitude, longitude, phoneNumber);

      // Check if API call was successful
      if (!bookingData.success) {
        if (!silent) {
          Alert.alert("Error", bookingData.message || "Failed to fetch bookings");
        }
        setOrders([]);
        return;
      }

      // Set orders from response - Only show first 3 bookings to avoid overwhelming the driver
      const bookings = bookingData.bookings || [];
      
      // Limit to 3 orders at a time to avoid overwhelming drivers
      const limitedBookings = bookings.slice(0, 3);
      
      setOrders(limitedBookings);

      // Initialize timers for new orders
      const newTimers = {};
      limitedBookings.forEach((booking) => {
        newTimers[booking.bookingId] = 15;
      });
      setTimers(newTimers);
    } catch (err) {
      if (!silent) {
        Alert.alert("Error", err.message || "Failed to fetch orders");
      }
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      // Only fetch if orders list is empty or it's a manual refresh
      // This prevents fetching all orders on every screen focus
      if (orders.length === 0) {
        console.log('📱 OrdersScreen focused - fetching initial orders');
        fetchOrders();
      } else {
        console.log('📱 OrdersScreen focused - already have orders, skipping fetch');
      }
      
      // Send location update to WebSocket when screen is focused
      const updateLocationToWS = async () => {
        try {
          const location = await Location.getCurrentPositionAsync({});
          if (webSocketService.isConnected) {
            webSocketService.sendLocationUpdate({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              accuracy: location.coords.accuracy,
              speed: location.coords.speed,
              heading: location.coords.heading,
              timestamp: Date.now(),
              timestampISO: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.log('[WS] Could not send location update:', err);
        }
      };

      updateLocationToWS();
    }, [orders.length])
  );

  // Listen for route params changes and update orders
  useEffect(() => {
    if (route.params?.booking?.bookings) {
      const bookings = route.params.booking.bookings;
      setOrders(bookings);
      
      // Initialize timers for new orders
      const newTimers = {};
      bookings.forEach((booking) => {
        newTimers[booking.bookingId] = 15;
      });
      setTimers(newTimers);
    }
  }, [route.params?.booking]);

  // Countdown timer effect
  useEffect(() => {
    orders.forEach((booking) => {
      const bookingId = booking.bookingId;
      
      // Initialize progress animation if not exists
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
            // Timer reached 0, auto-cancel order
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

    // Cleanup function
    return () => {
      Object.values(timerRefs.current).forEach((timer) => clearInterval(timer));
    };
  }, [orders]);

  const handleAutoCancel = async (bookingId) => {
    console.log("⏰ Timer expired, auto-declining order:", bookingId);
    
    // Remove order from list and GlobalOrderManager
    globalOrderManager.removeOrder(bookingId);
    setOrders((prev) => prev.filter((order) => order.bookingId !== bookingId));
    
    // Clear timer reference
    if (timerRefs.current[bookingId]) {
      clearInterval(timerRefs.current[bookingId]);
      delete timerRefs.current[bookingId];
    }
    
    // Clear progress animation
    if (progressAnimations.current[bookingId]) {
      delete progressAnimations.current[bookingId];
    }

    // Notify backend that rider didn't accept in time (auto-decline)
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
    try {
      console.log("🎯 Accepting order:", bookingId);

      // Clear the timer for this booking
      if (timerRefs.current[bookingId]) {
        clearInterval(timerRefs.current[bookingId]);
        delete timerRefs.current[bookingId];
      }

      const riderData = await getRiderByPhone();
      console.log("🔍 Full rider data:", JSON.stringify(riderData, null, 2));

      const driverId = riderData?._id || riderData?.id || riderData?.rider?._id || riderData?.rider?.id || riderData?.data?._id || riderData?.data?.id;

      if (!driverId) {
        console.log("❌ Driver ID not found in rider data:", JSON.stringify(riderData, null, 2));
        throw new Error("Rider ID not found. Please login again.");
      }

      console.log("✅ Assigning order to driver:", driverId);

      // Get current location for distance calculation
      let latitude = null;
      let longitude = null;
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        latitude = location.coords.latitude;
        longitude = location.coords.longitude;
        console.log("📍 Driver location:", { latitude, longitude });
      } catch (locErr) {
        console.log("⚠️ Could not get location:", locErr.message);
      }

      // Assign the order to the driver with location
      const assignResponse = await assignOrder(
        bookingId,
        driverId,
        "accepted",
        latitude,
        longitude
      );

      console.log("✅ Order assigned response:", assignResponse);

      // Check if the response has the booking data
      if (!assignResponse || !assignResponse.success) {
        throw new Error(assignResponse?.message || "Failed to assign order");
      }

      // Vibration
      Vibration.vibrate(1000);

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

      // Push notification
      await scheduleNotificationSafely({
        content: {
          title: "Order Accepted",
          body: "You have accepted a new order!",
        },
        trigger: null,
      });

      // Remove accepted order from list and GlobalOrderManager
      globalOrderManager.removeOrder(bookingId);
      setOrders((prev) =>
        prev.filter((order) => order.bookingId !== bookingId)
      );

      // Use the full booking object returned from backend
      const fullBookingData = assignResponse?.booking;

      if (!fullBookingData) {
        throw new Error("Full booking data not received from server");
      }

      console.log(
        "📦 Full booking data received:",
        JSON.stringify(fullBookingData, null, 2)
      );
      console.log("👤 Customer data:", fullBookingData.customer);
      console.log("📍 Drop location data:", fullBookingData.dropLocation);
      console.log(
        "📍 From address data:",
        fullBookingData.from || fullBookingData.fromAddress
      );
      console.log("📍 To address data:", fullBookingData.to);
      console.log("🚀 Navigating to OrderDetailsScreen");

      // Navigate to OrderDetailsScreen with complete booking data
      navigation.navigate("OrderDetailsScreen", { order: fullBookingData });
    } catch (err) {
      console.error("❌ Accept order error:", err);

      // Re-add timer if accept fails
      if (timerRefs.current[bookingId]) {
        clearInterval(timerRefs.current[bookingId]);
      }

      // Extract more detailed error message
      let errorMessage = "Failed to accept order";

      if (err.response) {
        // Axios error with response
        console.error("Response data:", err.response.data);
        console.error("Response status:", err.response.status);
        errorMessage =
          err.response.data?.message ||
          err.response.data?.error ||
          errorMessage;
      } else if (err.message) {
        errorMessage = err.message;
      }

      Alert.alert("Failed to accept order", errorMessage);
    }
  };

  // ✅ HANDLE REJECT: Decline booking and call API
  const handleReject = async (bookingId) => {
    try {
      console.log("🚫 Rejecting booking:", bookingId);

      // Clear timer for this booking immediately
      if (timerRefs.current[bookingId]) {
        clearInterval(timerRefs.current[bookingId]);
        delete timerRefs.current[bookingId];
      }

      // Clear progress animation
      if (progressAnimations.current[bookingId]) {
        delete progressAnimations.current[bookingId];
      }

      // Remove from local list and GlobalOrderManager immediately for better UX
      globalOrderManager.removeOrder(bookingId);
      setOrders((prev) =>
        prev.filter((order) => order.bookingId !== bookingId)
      );

      // Get rider data
      const riderData = await getRiderByPhone();
      console.log("🔍 Full rider data for decline:", JSON.stringify(riderData, null, 2));
      const riderId = riderData?._id || riderData?.id || riderData?.rider?._id || riderData?.rider?.id || riderData?.data?._id || riderData?.data?.id;

      if (!riderId) {
        console.log("❌ Rider ID not found");
        throw new Error("Rider ID not found. Please login again.");
      }

      // Call API to decline booking (async, no need to wait)
      declineBooking(bookingId, riderId, "Rider declined")
        .then(() => {
          console.log("✅ Booking declined successfully on backend");
        })
        .catch((err) => {
          console.error("❌ Failed to notify backend about decline:", err.message);
        });

      console.log("✅ Booking removed from list");
    } catch (err) {
      console.error("❌ Reject booking error:", err);
      
      // Ensure order is removed from list
      setOrders((prev) =>
        prev.filter((order) => order.bookingId !== bookingId)
      );
    }
  };

  // Main render logic starts here
  if (orders.length === 0) {
    return (
      <View style={styles.safeArea}>
        <HeaderWithBackButton title="Orders" />
        <View style={styles.emptyContainer}>
          {isOnline ? (
            <>
              <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
                <View style={styles.iconCircle}>
                  <Ionicons name="bicycle" size={60} color="#4CAF50" />
                </View>
              </Animated.View>
              <Text style={styles.emptyTitle}>Searching for rides...</Text>
              <Text style={styles.emptySubtitle}>
                You're online! We'll notify you when a new ride request comes in.
              </Text>
              <View style={styles.statusPill}>
                <View style={styles.onlineDot} />
                <Text style={styles.statusText}>You are online</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.iconContainer}>
                <View style={[styles.iconCircle, styles.iconCircleOffline]}>
                  <Ionicons name="power" size={60} color="#9E9E9E" />
                </View>
              </View>
              <Text style={styles.emptyTitle}>You're offline</Text>
              <Text style={styles.emptySubtitle}>
                Go online from the Home screen to start receiving ride requests.
              </Text>
              <TouchableOpacity 
                style={styles.goOnlineBtn}
                onPress={toggleOnlineStatus}
                disabled={isTogglingOnline}
              >
                {isTogglingOnline ? (
                  <Ionicons name="sync" size={20} color="#fff" />
                ) : (
                  <Ionicons name="power" size={20} color="#fff" />
                )}
                <Text style={styles.goOnlineBtnText}>
                  {isTogglingOnline ? "Going Online..." : "Go Online"}
                </Text>
              </TouchableOpacity>
            </>
          )}
          
          <TouchableOpacity style={styles.refreshButton} onPress={() => fetchOrders(false)}>
            <Ionicons name="refresh" size={20} color="#2196F3" />
            <Text style={styles.refreshButtonText}>Check for Orders</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.popupModeButton} 
            onPress={() => {
              const activeOrders = globalOrderManager.getActiveOrders();
              if (activeOrders.length > 0) {
                navigation.navigate("OrderPopup", { orders: activeOrders });
              } else {
                fetchOrders(false);
              }
            }}
          >
            <Ionicons name="layers" size={20} color="#4CAF50" />
            <Text style={styles.popupModeText}>Popup Mode</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <HeaderWithBackButton title="Orders" />

      <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>
            {orders.length} Order{orders.length > 1 ? "s" : ""}
          </Text>
          <View style={styles.headerActions}>
            {wsConnected && (
              <View style={styles.liveIndicatorSmall}>
                <View style={styles.liveDotSmall} />
                <Text style={styles.liveTextSmall}>Live</Text>
              </View>
            )}
            <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchOrders(false)}>
              <Ionicons name="refresh" size={16} color="#1976D2" />
            </TouchableOpacity>
          </View>
        </View>

        {orders.map((booking, idx) => (
          <View style={styles.card} key={booking.bookingId || idx}>
            <View style={styles.headerRow}>
              <Text style={styles.bikeLabel}>
                {`🏍️ ${booking.to?.professional || "Bike"}`}
              </Text>
              <View style={styles.priceContainer}>
                <Text style={styles.price}>
                  {`₹${booking.partialWalletPayment ? booking.remainingAmountToPay : (booking.price || booking.totalFare || booking.amountPay)}`}
                </Text>
                {booking.partialWalletPayment && booking.walletAmountUsed > 0 && (
                  <View style={styles.walletBadge}>
                    <Text style={styles.walletBadgeText}>💳 ₹{booking.walletAmountUsed} via Wallet</Text>
                  </View>
                )}
                {booking.quickFee && booking.quickFee > 0 && (
                  <View style={styles.tipContainer}>
                    <Text style={styles.tipLabel}>{`💰 Tip: ₹${booking.quickFee}`}</Text>
                  </View>
                )}
                {timers[booking.bookingId] && (
                  <Text style={styles.timerText}>
                    {`${timers[booking.bookingId]}s`}
                  </Text>
                )}
              </View>
            </View>            <View style={styles.locationBlock}>
              <View style={styles.locationItem}>
                <View style={styles.locationMarker} />
                <Text style={styles.km}>{`${booking.driverToFromKm} Km`}</Text>
                <View style={styles.locationContent}>
                  <Text style={styles.placeTitle}>
                    {booking.from?.address || "Pickup Address"}
                  </Text>
                  <Text style={styles.address}>
                    {booking.from?.house || "No additional details"}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.locationItem}>
                <Ionicons
                  name="location"
                  size={16}
                  color="#E53935"
                  style={styles.destinationIcon}
                />
                <Text style={styles.km}>{`${booking.fromToDropKm} Km`}</Text>
                <View style={styles.locationContent}>
                  <Text style={styles.placeTitle}>
                    {booking.to?.Address || "Drop Address"}
                  </Text>
                  <Text style={styles.address}>
                    {`${booking.to?.Address1 || ""}${booking.to?.Address1 && booking.to?.Address2 ? " " : ""}${booking.to?.Address2 || ""}`}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => handleReject(booking.bookingId)}
              >
                <Ionicons name="close" size={20} color="#fff" />
                <Text style={styles.rejectText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => handleAccept(booking.bookingId)}
              >
                <Animated.View
                  style={[
                    styles.timerProgress,
                    {
                      width: progressAnimations.current[booking.bookingId]
                        ? progressAnimations.current[
                            booking.bookingId
                          ].interpolate({
                            inputRange: [0, 1],
                            outputRange: ["0%", "100%"],
                          })
                        : "100%",
                    },
                  ]}
                />
                <View style={styles.acceptBtnContent}>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.acceptText}>Accept</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
      </View>
    </View>
  );

}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
    backgroundColor: "#F5F7FA",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#2C3E50",
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#E3F2FD",
  },
  refreshText: {
    color: "#1976D2",
    fontWeight: "600",
    marginLeft: 4,
  },
  loadingText: {
    fontSize: 18,
    color: "#607D8B",
    textAlign: "center",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#1A237E",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    marginBottom: 24,
  },
  bikeLabel: {
    backgroundColor: "#E3F2FD",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    fontWeight: "600",
    color: "#1976D2",
    fontSize: 14,
  },
  price: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2E7D32",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timerText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#E53935",
    backgroundColor: "#FFEBEE",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cash: {
    color: "#43A047",
    fontSize: 14,
  },
  locationBlock: {
    marginTop: 8,
  },
  locationItem: {
    flexDirection: "row",
    marginBottom: 12,
  },
  locationMarker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#1976D2",
    marginRight: 12,
    marginTop: 6,
  },
  destinationIcon: {
    marginRight: 8,
    marginTop: 4,
  },
  km: {
    fontSize: 14,
    fontWeight: "600",
    color: "#546E7A",
    marginRight: 12,
    minWidth: 40,
  },
  locationContent: {
    flex: 1,
  },
  placeTitle: {
    fontWeight: "700",
    fontSize: 16,
    color: "#263238",
    marginBottom: 4,
  },
  address: {
    fontSize: 13,
    color: "#607D8B",
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: "#ECEFF1",
    marginVertical: 12,
    marginLeft: 22,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },
  rejectBtn: {
    backgroundColor: "#E53935",
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    flex: 0.5,
    marginRight: 12,
    justifyContent: "center",
  },
  rejectText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  acceptBtn: {
    backgroundColor: "#43A047",
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    flex: 1.5,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  acceptBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  timerProgress: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#2E7D32",
    zIndex: 1,
  },
  acceptText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  noOrdersText: {
    fontSize: 18,
    color: "#607D8B",
    textAlign: "center",
    fontWeight: "600",
    marginBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  iconCircleOffline: {
    backgroundColor: "#F5F5F5",
    shadowColor: "#9E9E9E",
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 12,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#607D8B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 24,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4CAF50",
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4CAF50",
  },
  goOnlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
    marginBottom: 24,
    elevation: 4,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  goOnlineBtnText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 8,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#E3F2FD",
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2196F3",
    marginLeft: 6,
  },
  popupModeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#E8F5E9",
    marginTop: 12,
  },
  popupModeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4CAF50",
    marginLeft: 6,
  },
  wsIndicator: {
    position: "absolute",
    top: 10,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 10,
    elevation: 3,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  wsIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
    marginRight: 6,
  },
  wsIndicatorText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4CAF50",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  liveIndicatorSmall: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  liveDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4CAF50",
    marginRight: 4,
  },
  liveTextSmall: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4CAF50",
  },
  tipContainer: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  tipLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#2E7D32",
  },
  walletBadge: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  walletBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#1976D2",
  },
});
