import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Modal,
  Alert,
  ScrollView,
  Linking,
  Platform,
  Animated,
  PanResponder,
} from "react-native";
import { Image } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getRiderByPhone } from "../utils/AuthApi";
import { API_CONFIG } from "../config/api";
import {
  getOngoingBookingForRider,
  updateBookingStep,
  completeBooking,
  getBookingDetailsById,
} from "../utils/BookingApi";
import * as Location from "expo-location";
import polyline from "@mapbox/polyline";
import { useRoute } from "@react-navigation/native";
import axios from "axios";
const { width, height } = Dimensions.get("window");

const GOOGLE_MAPS_APIKEY = "AIzaSyDboH1OPn2tZixD8iFGiH9EJPvzsd4CL2Q";

// Helper function to calculate distance between two coordinates (in kilometers)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
};

export default function MapProgress({ navigation }) {
  const route = useRoute();
  const order = route?.params?.order;

  const [isArrived, setIsArrived] = useState(false);
  const [capturedImages, setCapturedImages] = useState([]);
  const [showImagePage, setShowImagePage] = useState(false);
  const [loadingStep, setLoadingStep] = useState(!order); // Skip loading if order exists
  const [booking, setBooking] = useState(order || null); // Set booking immediately if order exists
  const [bookingLoading, setBookingLoading] = useState(!order); // Skip loading if order exists
  const TRIP_STEP_KEY = "TRIP_PROGRESS_STEP";
  const [userLocation, setUserLocation] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [distanceToTarget, setDistanceToTarget] = useState(null);
  const [stepImages, setStepImages] = useState({
    startDrop: null,
    reachedDrop: null,
  });
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [customerRating, setCustomerRating] = useState(0);
  
  // Transition control to prevent sync conflicts
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Add debounce state to prevent rapid successive swipes
  const [isSwipeProcessing, setIsSwipeProcessing] = useState(false);
  const lastSwipeTime = useRef(0);
  
  // Force re-render key for UI synchronization
  const [mapKey, setMapKey] = useState(0);
  
  // Multiple drop locations support
  const [currentDropIndex, setCurrentDropIndex] = useState(() => {
    // Initialize drop index based on order/booking data, defaulting to 0
    if (order?.currentDropIndex !== undefined) {
      return Number(order.currentDropIndex);
    }
    return 0; // First drop by default
  });
  
  // Current step state - Always start at step 3 (ready to swipe for drop completion)
  const [currentStep, setCurrentStep] = useState(3);
  
  // Get total number of drop locations
  const totalDropLocations = booking?.dropLocation?.length || 1;
  const hasMultipleDrops = totalDropLocations > 1;

  // Function to handle reaching drop location when cash is already collected
  const handleReachedDropLocation = async () => {
    if (!booking) return;
    
    console.log("✅ Cash already collected, navigating directly to review screen");
    console.log(`💰 Cash collected status: ${booking.cashCollected}`);
    console.log(`📋 Original payFrom: ${booking.payFrom}`);
    
    try {
      const nextStep = currentStep + 1;
      console.log(`📈 Progressing from step ${currentStep} to ${nextStep}`);
      
      setCurrentStep(nextStep);
      await AsyncStorage.setItem(TRIP_STEP_KEY, String(nextStep));
      
      // Update backend with step progression
      if (booking && booking._id) {
        let tripState = 'pending';
        if (nextStep === 2) tripState = 'en_route_to_drop';
        else if (nextStep === 3) tripState = 'at_drop';
        else if (nextStep === 4) tripState = 'completed';
        
        const updateResponse = await updateBookingStep(booking._id, nextStep, currentDropIndex, tripState);
        console.log(`✅ Backend updated - Step: ${nextStep}, DropIndex: ${currentDropIndex}, TripState: ${tripState}`);
        
        // Update local booking state
        if (updateResponse && updateResponse.booking) {
          setBooking(updateResponse.booking);
          console.log("✅ Local booking state updated from backend response");
        }
      }
      
      console.log(`✅ Step progression completed: ${currentStep} → ${nextStep}`);
    } catch (error) {
      console.error("❌ Error in step progression:", error);
      // Revert step change on error
      const revertStep = currentStep - 1;
      setCurrentStep(revertStep);
      await AsyncStorage.setItem(TRIP_STEP_KEY, String(revertStep));
    }
  };

  // Slide to confirm state
  const [sliderWidth, setSliderWidth] = useState(Dimensions.get('window').width - 56);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const SLIDER_THRESHOLD = 0.85;
  const [isProcessingSwipe, setIsProcessingSwipe] = useState(false);

  console.log("📋 CURRENT BOOKING DATA:", JSON.stringify(booking, null, 2));
  console.log("📍 DROP LOCATIONS:", booking?.dropLocation);
  console.log("🎯 CURRENT DROP INDEX:", currentDropIndex);
  console.log("📊 TOTAL DROP LOCATIONS:", totalDropLocations);
  console.log("🔢 CURRENT STEP:", currentStep);
  
  // Simple step display - ONE SWIPE PER DROP
  const getStepName = () => {
    if (currentDropIndex >= totalDropLocations) {
      return "Trip Completed";
    }
    return `Complete Drop ${currentDropIndex + 1}/${totalDropLocations}`;
  };
  
  const stepName = getStepName();
  
  // REMOVED AUTO-ADVANCE TIMER - This was causing loops in step progression
  // Users will manually swipe to complete each step for better control
  // Auto-advance can conflict with manual swipes and backend synchronization

  const mapRef = useRef(null);

  // PanResponder for slide button - use refs to get latest values
  const currentDropIndexRef = useRef(currentDropIndex);
  const bookingRef = useRef(booking);
  const totalDropLocationsRef = useRef(totalDropLocations);
  
  // Update refs when state changes
  useEffect(() => {
    currentDropIndexRef.current = currentDropIndex;
    bookingRef.current = booking;
    totalDropLocationsRef.current = totalDropLocations;
  }, [currentDropIndex, booking, totalDropLocations]);
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        // CRITICAL: Use refs to get LATEST values, not closure values
        const latestDropIndex = currentDropIndexRef.current;
        const latestBooking = bookingRef.current;
        const latestTotalDrops = totalDropLocationsRef.current;
        const isCompleted = latestBooking?.status === 'completed';
        const shouldAllow = !isSwipeProcessing && !isCompleted;
        
        console.log("👆 Pan Start Check (using refs for latest values):", {
          latestDropIndex,
          latestTotalDrops,
          isCompleted,
          isSwipeProcessing,
          bookingStatus: latestBooking?.status,
          bookingId: latestBooking?._id,
          currentStep: latestBooking?.currentStep,
          tripState: latestBooking?.tripState,
          shouldAllow
        });
        
        return shouldAllow;
      },
      onMoveShouldSetPanResponder: () => {
        // CRITICAL: Use refs to get LATEST values
        const latestBooking = bookingRef.current;
        const isCompleted = latestBooking?.status === 'completed';
        return !isSwipeProcessing && !isCompleted;
      },
      onPanResponderGrant: () => {
        if (isSwipeProcessing) {
          console.log("🚫 Pan gesture blocked - processing in progress");
          return;
        }
        // CRITICAL: Use ref to get latest booking status
        const latestBooking = bookingRef.current;
        if (latestBooking?.status === 'completed') {
          console.log("🚫 Pan gesture blocked - trip already completed");
          return;
        }
        console.log("✅ Pan gesture granted - swipe can proceed");
      },
      onPanResponderMove: (_, gestureState) => {
        const maxSlide = Math.max(sliderWidth - 60, 100); // Button width (60px) with zero right padding
        if (gestureState.dx >= 0 && gestureState.dx <= maxSlide) {
          slideAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const maxSlide = Math.max(sliderWidth - 60, 100); // Button width (60px) with zero right padding
        const slidePercentage = gestureState.dx / maxSlide;
        
        console.log("📱 Swipe Release:", {
          dx: gestureState.dx,
          maxSlide,
          slidePercentage,
          threshold: SLIDER_THRESHOLD,
          meetsThreshold: slidePercentage >= SLIDER_THRESHOLD
        });
        
        if (slidePercentage >= SLIDER_THRESHOLD) {
          // STRONGER DEBOUNCE: Prevent any duplicate calls
          const now = Date.now();
          const timeSinceLastSwipe = now - lastSwipeTime.current;
          
          console.log("⏱️ Debounce Check:", {
            now,
            lastSwipeTime: lastSwipeTime.current,
            timeSinceLastSwipe,
            cooldown: 3000,
            isSwipeProcessing,
            willBlock: isSwipeProcessing || timeSinceLastSwipe < 3000
          });
          
          if (isSwipeProcessing || timeSinceLastSwipe < 3000) {
            console.log("🚫 Swipe ignored - processing in progress or too recent (3s cooldown)");
            // Reset slide animation
            Animated.spring(slideAnim, {
              toValue: 0,
              useNativeDriver: false,
            }).start();
            return;
          }
          
          // CRITICAL: Check if already at completed state - use ref for latest value
          const latestBooking = bookingRef.current;
          
          console.log("🔍 Completion Check:", {
            bookingStatus: latestBooking?.status,
            tripState: latestBooking?.tripState,
            currentStep: latestBooking?.currentStep,
            currentDropIndex: latestBooking?.currentDropIndex,
            isCompleted: latestBooking?.status === 'completed'
          });
          
          if (latestBooking?.status === 'completed') {
            console.log("🚫 Booking already completed - no more swipes allowed");
            Animated.spring(slideAnim, {
              toValue: 0,
              useNativeDriver: false,
            }).start();
            return;
          }
          
          // Set processing state immediately to block other swipes
          setIsSwipeProcessing(true);
          setIsProcessingSwipe(true);
          lastSwipeTime.current = now;
          console.log("🔒 Swipe processing started - All further swipes blocked");
          console.log("🔒 Processing locked at:", now);
          
          // SIMPLE ONE SWIPE PER DROP APPROACH
          Animated.spring(slideAnim, {
            toValue: sliderWidth - 60,
            useNativeDriver: false,
          }).start(async () => {
            try {
              // CRITICAL: Use refs to get latest state values
              const latestBooking = bookingRef.current;
              const latestDropIndex = currentDropIndexRef.current;
              const latestTotalDrops = totalDropLocationsRef.current;
              
              console.log("🚀 SWIPE DETECTED - One Swipe Per Drop System");
              console.log("📊 Current State (from refs):", {
                currentDropIndex: latestDropIndex,
                totalDrops: latestTotalDrops,
                bookingId: latestBooking?._id,
                backendDropIndex: latestBooking?.currentDropIndex,
                dropsRemaining: latestTotalDrops - latestDropIndex - 1
              });
              
              if (!latestBooking?._id) {
                console.log("❌ No booking ID found");
                setIsProcessingSwipe(false);
                throw new Error("No booking ID found");
              }
              
              // Check if already completed
              if (latestBooking.tripState === 'completed' || latestBooking.status === 'completed') {
                console.log("🚫 Booking already completed");
                setIsProcessingSwipe(false);
                Alert.alert("Trip Completed", "This booking has already been completed.");
                return;
              }
              
              // Get current location for drop completion (non-blocking)
              let currentLat = null;
              let currentLng = null;
              const locationPromise = Location.getCurrentPositionAsync({}).then(location => {
                currentLat = location.coords.latitude;
                currentLng = location.coords.longitude;
                console.log("📍 Current rider location:", { currentLat, currentLng });
              }).catch(locErr => {
                console.log("⚠️ Could not get location:", locErr.message);
              });
              
              // Check if this is the last drop - CRITICAL: Use backend's currentDropIndex for accuracy
              const actualDropIndex = Number(latestBooking.currentDropIndex !== undefined ? latestBooking.currentDropIndex : latestDropIndex);
              const isLastDrop = actualDropIndex >= (latestTotalDrops - 1);
              
              console.log("📍 Drop Status:", {
                localDropIndex: latestDropIndex,
                backendDropIndex: latestBooking.currentDropIndex,
                actualDropIndex: actualDropIndex,
                totalDrops: latestTotalDrops,
                dropNumber: actualDropIndex + 1,
                isLastDrop,
                nextDropExists: !isLastDrop
              });
              
              if (isLastDrop) {
                // LAST DROP - Check payment requirements first
                console.log("🏁 LAST DROP - Checking payment requirements");
                
                // Check if payment needs to be collected at drop
                const isDropPayment = latestBooking.payFrom?.toLowerCase().includes('delivery') || 
                                     latestBooking.payFrom?.toLowerCase().includes('drop') ||
                                     latestBooking.payFrom?.toLowerCase().includes('pay on delivery');
                
                const isOnlinePayment = latestBooking.paymentMethod === 'online' || 
                                       latestBooking.paymentStatus === 'completed' ||
                                       latestBooking.isOnlinePayment;
                
                console.log("💰 Payment Check:", {
                  payFrom: latestBooking.payFrom,
                  isDropPayment,
                  isOnlinePayment,
                  cashCollected: latestBooking.cashCollected,
                  paymentStatus: latestBooking.paymentStatus
                });
                
                // If payment at drop and not collected, redirect to payment screen
                if (isDropPayment && !isOnlinePayment && !latestBooking.cashCollected) {
                  console.log("💰 Payment required at drop - redirecting to payment collection screen");
                  setIsProcessingSwipe(false);
                  navigation.navigate("DropPaymentScreen", { order: latestBooking });
                  return;
                }
                
                // Payment already collected or online - proceed with completion
                console.log("✅ Payment verified - Completing entire booking");
                
                // Wait for location before completing
                await locationPromise;
                
                // Call completeBooking API
                console.log("📤 Calling completeBooking API...");
                const completionResponse = await completeBooking(latestBooking._id, currentLat, currentLng);
                console.log("📥 Completion Response:", completionResponse);
                
                if (!completionResponse) {
                  setIsProcessingSwipe(false);
                  throw new Error("Backend did not respond to completeBooking");
                }
                
                if (completionResponse.error === 'PAYMENT_NOT_COLLECTED') {
                  console.log("⚠️ Backend blocked - payment not collected");
                  setIsProcessingSwipe(false);
                  navigation.navigate("DropPaymentScreen", { order: latestBooking });
                  return;
                }
                
                // Clear trip progress
                await AsyncStorage.removeItem(TRIP_STEP_KEY);
                setCurrentStep(0);
                setIsProcessingSwipe(false);
                
                console.log("✅ Booking completed successfully!");
                console.log(`✅ All ${latestTotalDrops} drops delivered`);
                
                // Navigate to payment/review screen
                if (completionResponse.booking?.payFrom?.toLowerCase().includes('delivery') && 
                    !completionResponse.booking?.cashCollected) {
                  console.log("💰 Navigating to payment screen");
                  navigation.navigate("DropPaymentScreen", { order: completionResponse.booking });
                } else {
                  console.log("✅ Navigating to review screen");
                  navigation.navigate("OrderReviewScreen", {
                    booking: completionResponse.booking,
                    amount: completionResponse.booking.totalDriverEarnings || completionResponse.booking.price,
                    nextBookings: completionResponse.nextBookings || [],
                    hasNextBookings: completionResponse.hasNextBookings || false,
                  });
                }
                
              } else {
                // NOT LAST DROP - Move to next drop location
                console.log(`🚛 NOT last drop - moving to next drop location`);
                
                // Optimistically update UI first for immediate feedback
                const optimisticNextDropIndex = actualDropIndex + 1;
                console.log("⚡ Optimistic UI update - showing next drop immediately");
                setCurrentDropIndex(optimisticNextDropIndex);
                setMapKey(prev => prev + 1);
                
                // CRITICAL FIX: Reset button animation IMMEDIATELY for visual feedback
                // But KEEP swipe locked until backend confirms to prevent race conditions
                slideAnim.setValue(0);
                console.log("🔄 Swipe button animation reset IMMEDIATELY (visual only)");
                console.log("🔒 Swipe LOCKED until backend confirms (prevents race condition)");
                
                // DON'T wait for location - it's not needed for multi-drop progression
                // Location fetch happens in parallel but doesn't block backend call
                
                // Simply increment the drop index and reset to "going to drop" state
                // Backend will handle step progression
                console.log("📤 Updating backend for next drop IMMEDIATELY...");
                
                // Use actualDropIndex (already calculated above with backend sync)
                console.log(`📊 Completing drop index: ${actualDropIndex} (local state: ${latestDropIndex}, backend: ${latestBooking.currentDropIndex})`);
                
                const updateResponse = await updateBookingStep(
                  latestBooking._id, 
                  4, // Step 4 signals drop completion
                  actualDropIndex, // Use actual drop index from backend
                  'going_to_next_drop'
                );
                
                console.log("📥 Backend Response:", updateResponse);
                
                if (!updateResponse || !updateResponse.booking) {
                  throw new Error("Backend did not respond properly");
                }
                
                // Update local state with next drop
                const updatedBooking = updateResponse.booking;
                const backendDropIndex = Number(updatedBooking.currentDropIndex || 0);
                const backendStep = Number(updatedBooking.currentStep || 0);
                
                console.log("📊 Backend returned:", {
                  backendDropIndex,
                  backendStep,
                  tripState: updatedBooking.tripState
                });
                
                // CRITICAL: Update refs IMMEDIATELY before state updates
                // This ensures next swipe has fresh data even if state update is async
                bookingRef.current = updatedBooking;
                currentDropIndexRef.current = backendDropIndex;
                totalDropLocationsRef.current = updatedBooking.dropLocation?.length || latestTotalDrops;
                console.log("✅ Refs updated immediately with backend data");
                
                // Sync with backend step (should be 3 - ready to swipe)
                const syncedStep = backendStep === 3 ? 3 : 3; // Fallback to 3 if backend step is unexpected
                setCurrentDropIndex(backendDropIndex);
                setCurrentStep(syncedStep);
                setBooking(updatedBooking);
                await AsyncStorage.setItem(TRIP_STEP_KEY, String(syncedStep));
                
                // Force re-render to refresh PanResponder checks
                setMapKey(prev => prev + 1);
                
                console.log("✅ State synced with backend:", {
                  dropIndex: backendDropIndex,
                  step: syncedStep,
                  readyToSwipe: true,
                  status: updatedBooking.status,
                  tripState: updatedBooking.tripState
                });
                
                console.log("✅ Drop completed! Moving to next location:", {
                  justCompletedIndex: actualDropIndex,
                  justCompletedNumber: actualDropIndex + 1,
                  nextDropIndex: backendDropIndex,
                  nextDropNumber: backendDropIndex + 1,
                  totalDrops: latestTotalDrops,
                  remaining: latestTotalDrops - backendDropIndex
                });
                
                // Immediately update map to show next drop location
                updateMapAfterStepChange(3, backendDropIndex, updatedBooking);
                
                // NOW unlock swipe after backend confirms
                setIsSwipeProcessing(false);
                setIsProcessingSwipe(false);
                console.log("✅ Backend sync complete - UI already updated");
                console.log("🔓 SWIPE UNLOCKED after backend confirmation");
                console.log("🔓 Refs after backend sync:", {
                  bookingId: bookingRef.current?._id,
                  dropIndex: currentDropIndexRef.current,
                  totalDrops: totalDropLocationsRef.current,
                  currentStep: bookingRef.current?.currentStep
                });
                
                // Log completion without interrupting user flow
                const completedDropNumber = actualDropIndex + 1;
                const nextDropNumber = backendDropIndex + 1;
                console.log(`✅ Drop ${completedDropNumber} completed! Moving to drop ${nextDropNumber} of ${latestTotalDrops}`);
              }
              
            } catch (error) {
              console.log("❌❌❌ ERROR IN SWIPE COMPLETION ❌❌❌");
              console.log("Error Type:", error.constructor.name);
              console.log("Error Message:", error.message);
              console.log("Error Stack:", error.stack);
              
              if (error.response) {
                console.log("Backend Error Response:", {
                  status: error.response.status,
                  statusText: error.response.statusText,
                  data: error.response.data
                });
              }
              
              // Show user-friendly error
              Alert.alert(
                "Error",
                error.message || "Failed to update booking. Please try again.",
                [{ text: "OK" }]
              );
              
              // Reset button position and unlock on error
              Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: false,
              }).start();
              
              setIsSwipeProcessing(false);
              setIsProcessingSwipe(false);
              console.log("🔓 UI UNLOCKED after error");
            }
          });
        } else {
          // Slide not completed - reset
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: false,
            tension: 50,
            friction: 7,
          }).start();
        }
      },
    })
  ).current;

  // Define a default region
  // Remove defaultRegion, always use real pickup/drop or user location

  useEffect(() => {
    // Simple initialization - ONE SWIPE PER DROP system
    const loadStepAndBooking = async () => {
      try {
        if (order) {
          // Order passed from OrderDetailsScreen
          setBooking(order);
          
          // Sync with backend step or default to 3
          const backendStep = Number(order.currentStep || 3);
          const syncedStep = backendStep >= 3 ? 3 : 3; // Always ready to swipe in MapProgress
          setCurrentStep(syncedStep);
          await AsyncStorage.setItem(TRIP_STEP_KEY, String(syncedStep));
          
          // Load currentDropIndex from booking data
          if (order.currentDropIndex !== undefined) {
            setCurrentDropIndex(order.currentDropIndex);
            console.log("📍 Initialized with drop index:", order.currentDropIndex);
          }
          
          console.log("✅ MapProgress initialized:", {
            step: syncedStep,
            backendStep: order.currentStep,
            dropIndex: order.currentDropIndex || 0,
            totalDrops: order.dropLocation?.length || 1
          });
          
          setLoadingStep(false);
          setBookingLoading(false);
        } else {
          // Fetch rider and booking if no order passed
          const riderData = await getRiderByPhone();
          const riderId = riderData?._id || riderData?.id || riderData?.rider?._id;
          
          if (riderId) {
            console.log("🔍 Fetching ongoing booking for riderId:", riderId);
            const ongoingBooking = await getOngoingBookingForRider({ riderId });
            
            if (ongoingBooking?.bookingId || ongoingBooking?._id) {
              const bookingId = ongoingBooking.bookingId || ongoingBooking._id;
              const fullBookingDetails = await getBookingDetailsById(bookingId);
              
              if (fullBookingDetails) {
                setBooking(fullBookingDetails);
                
                // Sync with backend step or default to 3
                const backendStep = Number(fullBookingDetails.currentStep || 3);
                const syncedStep = backendStep >= 3 ? 3 : 3; // Always ready to swipe in MapProgress
                setCurrentStep(syncedStep);
                await AsyncStorage.setItem(TRIP_STEP_KEY, String(syncedStep));
                
                // Load currentDropIndex from booking data
                if (fullBookingDetails.currentDropIndex !== undefined) {
                  setCurrentDropIndex(fullBookingDetails.currentDropIndex);
                  console.log("📍 Loaded drop index:", fullBookingDetails.currentDropIndex);
                }
                
                console.log("✅ Booking loaded and initialized:", {
                  step: syncedStep,
                  backendStep: fullBookingDetails.currentStep,
                  dropIndex: fullBookingDetails.currentDropIndex || 0,
                  totalDrops: fullBookingDetails.dropLocation?.length || 1
                });
              } else {
                setBooking(ongoingBooking?.booking || ongoingBooking);
              }
            } else {
              setBooking(ongoingBooking?.booking || ongoingBooking);
            }
          }
          
          setLoadingStep(false);
          setBookingLoading(false);
        }
        
        // Get user current location
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          let location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      } catch (e) {
        console.error("❌ Error loading booking:", e);
        setLoadingStep(false);
        setBookingLoading(false);
      }
    };
    loadStepAndBooking();
  }, []);

  // Check if booking is completed and navigate away
  useEffect(() => {
    const checkBookingCompletion = () => {
      // Only navigate if booking is TRULY completed (not just step 4)
      const isActuallyCompleted = booking && 
                                  (booking.status === 'completed' || 
                                   booking.bookingStatus === 'Completed' ||
                                   booking.tripState === 'completed');
      
      // CRITICAL: Also check if all drops are completed for multi-drop bookings
      const totalDrops = booking?.dropLocation?.length || 1;
      const currentDropIdx = booking?.currentDropIndex || 0;
      const allDropsCompleted = currentDropIdx >= (totalDrops - 1);
      
      if (isActuallyCompleted && allDropsCompleted) {
        console.log("🏁 Booking is ACTUALLY completed - auto-navigating to completion screen");
        console.log("📊 Completion details:", {
          currentStep: booking.currentStep,
          tripState: booking.tripState,
          status: booking.status,
          bookingStatus: booking.bookingStatus,
          payFrom: booking.payFrom,
          cashCollected: booking.cashCollected,
          currentDropIndex: currentDropIdx,
          totalDrops: totalDrops,
          allDropsCompleted: allDropsCompleted
        });
        
        // Check if payment collection is needed
        if (booking.payFrom?.toLowerCase().includes('delivery') && !booking.cashCollected) {
          console.log("💰 Payment collection needed");
          navigation.navigate("DropPaymentScreen", { order: booking });
        } else {
          console.log("✅ Navigating to order review");
          navigation.navigate("OrderReviewScreen", {
            booking: booking,
            amount: booking.totalDriverEarnings || booking.amountPay || booking.price,
          });
        }
      } else if (isActuallyCompleted && !allDropsCompleted) {
        console.log("⚠️ Booking marked completed but NOT all drops finished!");
        console.log(`📦 Only ${currentDropIdx + 1}/${totalDrops} drops completed`);
        console.log("🚫 NOT navigating - rider must complete remaining drops");
      } else if (booking?.currentStep >= 4) {
        console.log("⚠️ Step is 4 but booking not completed - rider needs to complete properly");
        console.log("⚠️ Status:", booking.status, "BookingStatus:", booking.bookingStatus, "TripState:", booking.tripState);
      }
    };
    
    // Check immediately and also after any booking updates
    checkBookingCompletion();
  }, [booking?.currentStep, booking?.tripState, booking?.status, booking?.bookingStatus, navigation]);

  // REMOVED AUTOMATIC SYNC - This was causing loops!
  // Backend sync will only happen on manual refresh or app load
  // Swipe actions will update backend first, then local state

  // REMOVED AUTOMATIC DROP INDEX SYNC - This was causing unwanted button resets
  // Drop index changes will be handled manually in swipe logic

  // Simple location fetch - OrderDetailsScreen already handles continuous tracking via WebSocket
  useEffect(() => {
    let mounted = true;
    let locationInterval;
    
    const getCurrentLocation = async () => {
      try {
        // Request foreground permissions only (no background needed)
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('⚠️ Location permission not granted');
          return;
        }

        // Get current position
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        if (mounted) {
          const newLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: location.timestamp
          };
          
          console.log("📍 MapProgress location:", {
            lat: newLocation.latitude,
            lng: newLocation.longitude,
            accuracy: newLocation.accuracy
          });
          
          setCurrentLocation(newLocation);
        }
      } catch (error) {
        console.error("❌ Error getting location:", error);
      }
    };
    
    // Get initial location
    getCurrentLocation();
    
    // Update location periodically (every 10 seconds)
    // Note: OrderDetailsScreen handles main tracking via WebSocket every 6 seconds
    locationInterval = setInterval(() => {
      if (mounted) {
        getCurrentLocation();
      }
    }, 10000);
    
    return () => {
      mounted = false;
      if (locationInterval) {
        clearInterval(locationInterval);
      }
      console.log("🧹 [MapProgress] Location tracking cleanup");
    };
  }, []);

  // Comprehensive coordinate extraction - Handle multiple possible data structures
  const pickupLat = booking?.from?.latitude || 
                   booking?.fromAddress?.latitude || 
                   booking?.pickup?.latitude ||
                   booking?.pickupLocation?.latitude ||
                   booking?.pickupCoordinates?.latitude ||
                   booking?.source?.latitude;
  const pickupLng = booking?.from?.longitude || 
                   booking?.fromAddress?.longitude || 
                   booking?.pickup?.longitude ||
                   booking?.pickupLocation?.longitude ||
                   booking?.pickupCoordinates?.longitude ||
                   booking?.source?.longitude;
  // FIXED: Prioritize dropLocation[currentDropIndex] for multi-drop bookings
  const dropLat = booking?.dropLocation?.[currentDropIndex]?.latitude || 
                 booking?.to?.latitude ||
                 booking?.drop?.latitude ||
                 booking?.destination?.latitude ||
                 booking?.dropAddress?.latitude ||
                 booking?.dropCoordinates?.latitude;
  const dropLng = booking?.dropLocation?.[currentDropIndex]?.longitude || 
                 booking?.to?.longitude ||
                 booking?.drop?.longitude ||
                 booking?.destination?.longitude ||
                 booking?.dropAddress?.longitude ||
                 booking?.dropCoordinates?.longitude;

  console.log('🔍 COORDINATE EXTRACTION (mapKey:', mapKey, '):', {
    pickupLat, pickupLng, dropLat, dropLng,
    currentDropIndex,
    totalDropLocations,
    currentStep,
    stepName: stepName,
    fromAddressCoords: booking?.fromAddress ? `${booking.fromAddress.latitude},${booking.fromAddress.longitude}` : 'none',
    dropLocationCoords: booking?.dropLocation?.[currentDropIndex] ? `${booking.dropLocation[currentDropIndex].latitude},${booking.dropLocation[currentDropIndex].longitude}` : 'none',
    currentDropDetails: booking?.dropLocation?.[currentDropIndex],
    allDropLocations: booking?.dropLocation?.map((drop, idx) => ({
      index: idx,
      coordinates: `${drop?.latitude || 'N/A'},${drop?.longitude || 'N/A'}`,
      address: drop?.Address || drop?.address || 'N/A',
      isCurrent: idx === currentDropIndex
    }))
  });
  
  console.log('📍 FINAL DROP CALCULATION:', {
    currentDropIndex,
    dropFromCurrentIndex: booking?.dropLocation?.[currentDropIndex],
    finalDropResult: { latitude: dropLat, longitude: dropLng }
  });
  
  console.log('🗺️ ROUTE RENDERING DEBUG:', {
    hasCurrentLocation: !!currentLocation,
    hasUserLocation: !!userLocation,
    hasFinalDrop: !!finalDrop,
    routeCoordsLength: routeCoords?.length || 0,
    shouldShowGoogleRoute: routeCoords && routeCoords.length > 2,
    shouldShowFallbackRoute: currentLocation && finalDrop && (!routeCoords || routeCoords.length < 3)
  });

  const isValidCoord = (v) =>
    v !== undefined && v !== null && v !== "" && !isNaN(Number(v));

  // Create coordinate objects with fallback to approximate Bangalore coordinates
  const pickup =
    isValidCoord(pickupLat) && isValidCoord(pickupLng)
      ? { latitude: Number(pickupLat), longitude: Number(pickupLng) }
      : null;
  const drop =
    isValidCoord(dropLat) && isValidCoord(dropLng)
      ? { latitude: Number(dropLat), longitude: Number(dropLng) }
      : null;

  // If coordinates are missing, attempt to use current location with offsets for demo polylines
  const availableLocation = currentLocation || userLocation;
  const fallbackPickup = !pickup && availableLocation ? {
    latitude: availableLocation.latitude - 0.01, // Slightly north
    longitude: availableLocation.longitude - 0.01 // Slightly west
  } : null;
  
  const fallbackDrop = !drop && availableLocation ? {
    latitude: availableLocation.latitude + 0.01, // Slightly south  
    longitude: availableLocation.longitude + 0.01 // Slightly east
  } : null;
  
  const finalPickup = pickup || fallbackPickup;
  const finalDrop = drop || fallbackDrop;

  console.log('📍 FINAL COORDINATES:', {
    pickup: finalPickup,
    drop: finalDrop,
    usingFallbacks: !pickup || !drop,
    pickupFallback: !!fallbackPickup,
    dropFallback: !!fallbackDrop
  });

  // Debug logging - removed to prevent infinite loops
  // Polylines are now managed stably without useEffect dependencies

  // Decode Google's encoded polyline format (same as OrderDetailsScreen)
  const decodePolyline = (encoded) => {
    const points = [];
    let index = 0,
      len = encoded.length;
    let lat = 0,
      lng = 0;

    while (index < len) {
      let b,
        shift = 0,
        result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }
    return points;
  };

  // Initialize proper navigation polylines and map view
  useEffect(() => {
    if (booking && finalPickup && finalDrop) {
      console.log('🚀 INITIALIZING navigation polylines and map view');
      console.log('🏁 Drop coords:', finalDrop.latitude, finalDrop.longitude);
      console.log('📍 currentLocation:', currentLocation);
      console.log('📍 userLocation:', userLocation);
      
      // Fit map to show both pickup and drop locations
      fitMapToPickupAndDrop();
      
      // Initialize route from current location to drop if available
      const locationForRoute = currentLocation || userLocation;
      
      if (locationForRoute?.latitude && locationForRoute?.longitude && finalDrop?.latitude && finalDrop?.longitude) {
        console.log('✅ Valid location found, fetching route');
        console.log('📍 From:', locationForRoute.latitude, locationForRoute.longitude);
        console.log('📍 To:', finalDrop.latitude, finalDrop.longitude);
        fetchRouteFromCurrentLocation(locationForRoute, finalDrop);
      } else {
        console.log('⚠️ No valid current location available for route');
        console.log('⚠️ locationForRoute:', locationForRoute);
        console.log('⚠️ finalDrop:', finalDrop);
        
        // Test with known coordinates from the booking
        if (finalDrop?.latitude && finalDrop?.longitude) {
          const testLocation = {
            latitude: 13.026977513468914, // From booking logs  
            longitude: 77.63195014022003
          };
          console.log('🧪 Testing route with fallback coordinates');
          fetchRouteFromCurrentLocation(testLocation, finalDrop);
        }
      }
      
      console.log('✅ Navigation route fetch initiated');
    }
  }, [booking?._id, finalPickup?.latitude, finalDrop?.latitude, currentLocation?.latitude]); // Include pickup coords

  // Enhanced route fetching with Google Directions API
  const fetchRouteFromCurrentLocation = async (origin, destination) => {
    console.log('🚗 fetchRouteFromCurrentLocation called:', {
      hasOrigin: !!origin,
      hasDestination: !!destination,
      origin: origin ? `${origin.latitude},${origin.longitude}` : 'none',
      destination: destination ? `${destination.latitude},${destination.longitude}` : 'none'
    });
    
    try {
      if (!origin || !destination) {
        console.log('❌ No origin or destination for route');
        return;
      }
      
      const originStr = `${origin.latitude},${origin.longitude}`;
      const destStr = `${destination.latitude},${destination.longitude}`;
      
      const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destStr}&key=${GOOGLE_MAPS_APIKEY}&mode=driving&alternatives=false`;
      
      console.log('🚗 Fetching Google Directions route...');
      console.log('📍 From:', originStr, 'To:', destStr);
      
      setRouteLoading(true);
      
      const response = await fetch(directionsUrl);
      const data = await response.json();
      
      console.log('📥 Google API response status:', data.status);
      console.log('📥 Google API response:', data);
      
      if (data.status === "OK" && data.routes.length > 0) {
        const route = data.routes[0];
        if (route.overview_polyline?.points) {
          const points = decodePolyline(route.overview_polyline.points);
          setRouteCoords(points);
          console.log(`✅ Google Directions route fetched - ${points.length} points`);
          console.log('🗺️ Using Google Directions polyline');
          return;
        }
      } else {
        console.log('⚠️ Google API failed:', data.status, data.error_message || 'No error message');
      }
      
      // Clear route coords to let curved fallback show
      console.log('🔄 Clearing route coords to show curved fallback');
      setRouteCoords([]);
      
    } catch (error) {
      console.error('❌ Error fetching Google Directions:', error.message);
      setRouteCoords([]);
    } finally {
      setRouteLoading(false);
    }
  };

  // Update map after step change confirmation from backend
  const updateMapAfterStepChange = (confirmedStep, confirmedDropIndex, updatedBooking) => {
    console.log("🗺️ Updating map after step change:", {
      step: confirmedStep,
      dropIndex: confirmedDropIndex,
      hasCurrentLocation: !!currentLocation,
      hasUserLocation: !!userLocation
    });
    
    // Use currentLocation from tracker, fallback to userLocation if needed
    const locationForRoute = currentLocation || userLocation;
    
    if (!locationForRoute) {
      console.log("⚠️ No location available for map update");
      return;
    }
    
    try {
      // Get the current drop location based on confirmed drop index
      const currentDropLocation = updatedBooking?.dropLocation?.[confirmedDropIndex];
      
      if (currentDropLocation?.latitude && currentDropLocation?.longitude) {
        const dropCoords = {
          latitude: currentDropLocation.latitude,
          longitude: currentDropLocation.longitude
        };
        
        console.log("🎯 Updating map to show route to drop:", {
          dropIndex: confirmedDropIndex + 1,
          total: updatedBooking?.dropLocation?.length || 1,
          coordinates: dropCoords,
          address: currentDropLocation.Address || currentDropLocation.address,
          usingLocation: currentLocation ? 'tracker' : 'fallback'
        });
        
        // Fetch new route from current location to current drop
        fetchRouteFromCurrentLocation(locationForRoute, dropCoords);
        
        // Update map view to show the route
        if (mapRef.current) {
          const coordinates = [
            { latitude: locationForRoute.latitude, longitude: locationForRoute.longitude },
            dropCoords
          ];
          
          console.log("🗺️ Fitting map to show route");
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 100, right: 50, bottom: 350, left: 50 },
            animated: true,
          });
        }
      } else {
        console.log("⚠️ No valid drop location coordinates for map update");
      }
    } catch (error) {
      console.error("❌ Error updating map:", error.message);
    }
  };

  // Stable route updates - only when location significantly changes, always to drop location
  const lastRouteUpdate = useRef({ locationKey: '' });
  
  useEffect(() => {
    if (!currentLocation || !finalDrop) return;
    
    if (!finalDrop?.latitude || !finalDrop?.longitude) return;
    
    // Create a stable location key to prevent constant updates
    const locationKey = `${Math.round(currentLocation.latitude * 1000)}_${Math.round(currentLocation.longitude * 1000)}`;
    
    // Only update if location changed significantly
    if (lastRouteUpdate.current.locationKey !== locationKey) {
      console.log('🎯 Stable route update to Drop Location');
      
      // Calculate distance to drop location
      const dist = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        finalDrop.latitude,
        finalDrop.longitude
      );
      setDistanceToTarget(dist);
      
      // Update route to drop location
      fetchRouteFromCurrentLocation(currentLocation, finalDrop);
      
      // Update ref to prevent unnecessary re-renders
      lastRouteUpdate.current = { locationKey };
    }
  }, [currentLocation?.latitude, currentLocation?.longitude, finalDrop?.latitude, finalDrop?.longitude]);

  // Update route and map when currentDropIndex changes (for multiple drop locations)
  useEffect(() => {
    if (currentLocation && finalDrop && hasMultipleDrops && booking?.dropLocation?.length > 0) {
      console.log('🎯 Drop index changed, updating route to drop location:', currentDropIndex + 1, 'of', totalDropLocations);
      console.log('📍 New target coordinates:', {
        latitude: finalDrop.latitude,
        longitude: finalDrop.longitude,
        address: booking.dropLocation[currentDropIndex]?.Address || booking.dropLocation[currentDropIndex]?.address || 'N/A'
      });
      
      // Update route with small delay to ensure state has updated
      setTimeout(() => {
        fetchRouteFromCurrentLocation(currentLocation, finalDrop);
        
        // Also fit map to show current location and new drop
        if (mapRef.current && currentLocation && finalDrop) {
          const coordinates = [
            { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
            { latitude: finalDrop.latitude, longitude: finalDrop.longitude }
          ];
          
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 100, right: 50, bottom: 350, left: 50 },
            animated: true,
          });
        }
      }, 300);
    }
  }, [currentDropIndex, finalDrop?.latitude, finalDrop?.longitude]);

  // Main useEffect for currentDropIndex changes (consolidated from duplicates)
  useEffect(() => {
    if (currentLocation && finalDrop && hasMultipleDrops && booking?.dropLocation?.length > 0) {
      console.log('🎯 Drop index changed - updating route and map for drop location:', currentDropIndex + 1, 'of', totalDropLocations);
      console.log('📍 New target coordinates:', {
        latitude: finalDrop.latitude,
        longitude: finalDrop.longitude,
        address: booking.dropLocation[currentDropIndex]?.Address || booking.dropLocation[currentDropIndex]?.address || 'N/A'
      });
      
      // Update route and map with proper delay to ensure state has updated
      setTimeout(() => {
        fetchRouteFromCurrentLocation(currentLocation, finalDrop);
        fitMapToPickupAndDrop();
        
        console.log('🗺️ Map and route updated for new drop location');
      }, 300);
    }
  }, [currentDropIndex, finalDrop?.latitude, finalDrop?.longitude]);

  // Generate beautiful curved polyline between two points
  const generateCurvedRoute = (from, to, numPoints = 25) => {
    console.log('🎯 Generating beautiful curved route:', { from, to, numPoints });
    
    if (!from || !to || !isValidCoord(from.latitude) || !isValidCoord(from.longitude) || !isValidCoord(to.latitude) || !isValidCoord(to.longitude)) {
      console.log('❌ Invalid coordinates for curve generation');
      // Return fallback coordinates if available
      if (from && to) {
        console.log('🔄 Using basic coordinates for minimal curve');
        return [from, to]; // At least show something
      }
      return [];
    }
    
    const curvePoints = [];
    const latDiff = to.latitude - from.latitude;
    const lngDiff = to.longitude - from.longitude;
    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
    
    // Create a more natural curve with multiple control points
    const midLat = (from.latitude + to.latitude) / 2;
    const midLng = (from.longitude + to.longitude) / 2;
    
    // Dynamic curve offset based on distance (longer routes = more curve)
    const curveIntensity = Math.min(distance * 0.5, 0.015); // Increased intensity and max offset for more visible curves
    
    // Create two control points for a more realistic S-curve
    const control1Offset = curveIntensity * 0.7;
    const control2Offset = curveIntensity * 0.3;
    
    const control1Lat = from.latitude + latDiff * 0.25 - lngDiff * control1Offset;
    const control1Lng = from.longitude + lngDiff * 0.25 + latDiff * control1Offset;
    
    const control2Lat = from.latitude + latDiff * 0.75 + lngDiff * control2Offset;
    const control2Lng = from.longitude + lngDiff * 0.75 - latDiff * control2Offset;
    
    // Generate smooth cubic bezier curve
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const u = 1 - t;
      
      // Cubic Bezier curve formula for more natural roads
      const lat = u * u * u * from.latitude +
                  3 * u * u * t * control1Lat +
                  3 * u * t * t * control2Lat +
                  t * t * t * to.latitude;
                  
      const lng = u * u * u * from.longitude +
                  3 * u * u * t * control1Lng +
                  3 * u * t * t * control2Lng +
                  t * t * t * to.longitude;
      
      curvePoints.push({ 
        latitude: Number(lat), 
        longitude: Number(lng) 
      });
    }
    
    console.log('✅ Generated beautiful curved route with', curvePoints.length, 'points');
    console.log('🌟 Route type: Smooth cubic bezier with natural road curves');
    
    return curvePoints;
  };

  // Removed redundant initial route effect - handled in stable initialization above

  // Helper to animate map to a region
  const animateToRegion = (region) => {
    if (mapRef.current && region) {
      mapRef.current.animateToRegion(region, 1000);
    }
  };

  // Fit map to show both pickup and drop locations with proper zoom
  const fitMapToPickupAndDrop = () => {
    if (!mapRef.current || !finalPickup || !finalDrop) return;

    const validCoords = [];
    
    // Add pickup coordinates
    if (finalPickup?.latitude && finalPickup?.longitude) {
      validCoords.push({
        latitude: parseFloat(finalPickup.latitude),
        longitude: parseFloat(finalPickup.longitude)
      });
    }
    
    // Add drop coordinates  
    if (finalDrop?.latitude && finalDrop?.longitude) {
      validCoords.push({
        latitude: parseFloat(finalDrop.latitude),
        longitude: parseFloat(finalDrop.longitude)
      });
    }
    
    // Add current location if available for better context
    if (currentLocation?.latitude && currentLocation?.longitude) {
      validCoords.push({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude
      });
    }

    if (validCoords.length >= 2) {
      console.log(`🎯 Fitting ${validCoords.length} coordinates to map view`);
      try {
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.fitToCoordinates(validCoords, {
              edgePadding: { top: 120, right: 80, bottom: 300, left: 80 }, // Extra bottom padding for bottom card
              animated: true,
            });
          }
        }, 500); // Small delay to ensure map is ready
      } catch (error) {
        console.log("⚠️ fitToCoordinates failed:", error.message);
        // Fallback to center between pickup and drop
        const centerLat = (finalPickup.latitude + finalDrop.latitude) / 2;
        const centerLng = (finalPickup.longitude + finalDrop.longitude) / 2;
        const latDelta = Math.abs(finalPickup.latitude - finalDrop.latitude) * 1.5;
        const lngDelta = Math.abs(finalPickup.longitude - finalDrop.longitude) * 1.5;
        
        animateToRegion({
          latitude: centerLat,
          longitude: centerLng,
          latitudeDelta: Math.max(latDelta, 0.01),
          longitudeDelta: Math.max(lngDelta, 0.01),
        });
      }
    }
  };

  // Modified handleStepButton to animate map
  const handleStepButton = async () => {
    console.log("🎯 handleStepButton called:", {
      currentStep,
      stepName: stepName,
      currentDropIndex,
      totalDropLocations,
      hasMultipleDrops
    });
    
    // Always fit map to show both pickup and drop with proper zoom
    if (stepName === "Start Trip") {
      // Focus on pickup but show both locations
      fitMapToPickupAndDrop();
    } else if (stepName === "Started Trip") {
      // Focus on drop but show both locations  
      fitMapToPickupAndDrop();
    }

    // Image upload is now optional - removed mandatory image requirement for drop location

    // Payment logic updated for 4-step flow (no Reached Pickup step)
    const payFromRaw = booking?.payFrom || "";
    const payFrom = payFromRaw.toLowerCase().trim();
    const isPickupPayment = payFrom.includes("pickup");
    
    // Note: Pickup payment handling would need to be done before reaching MapProgress
    // or integrated into the Start Trip step
    
    // Enhanced drop payment detection - covers multiple variations
    const isDropPayment = payFrom.includes("drop") || 
                         payFrom.includes("delivery") || 
                         payFrom.includes("pay on delivery") ||
                         payFromRaw.toLowerCase().includes("delivery") ||
                         payFromRaw.toLowerCase().includes("pay on delivery");
    
    console.log("🔍 Payment detection:", {
      payFromRaw,
      payFrom,
      isPickupPayment,
      isDropPayment,
      currentStep,
      stepName: stepName || `Step ${currentStep}`,
      isAtDropLocation,
      cashCollected: booking.cashCollected,
      paymentStatus: booking.paymentStatus,
      payFromRawLower: payFromRaw.toLowerCase(),
      includesDelivery: payFromRaw.toLowerCase().includes("delivery"),
      includesPayOnDelivery: payFromRaw.toLowerCase().includes("pay on delivery")
    });
    
    // CRITICAL: Handle "Reached Drop Location" step with comprehensive payment logic
    // Handle both normal steps and overflow steps from multiple drops
    const isAtDropLocation = stepName === "Reached Drop Location";
    
    if (isAtDropLocation) {
      
      // Case 1: Cash already collected (from any source) - Complete the ride
      if (booking.cashCollected) {
        console.log("✅ Cash already collected, completing ride immediately");
        await handleReachedDropLocation();
        return;
      }
      
      // Case 2: Online/Digital payment - Complete the ride (no cash collection needed)
      if (booking.paymentStatus === 'completed' || booking.paymentStatus === 'paid' || 
          booking.isOnlinePayment || booking.isWalletPayment) {
        console.log("✅ Online/Digital payment completed, completing ride");
        await handleReachedDropLocation();
        return;
      }
      
      // Case 3: Drop payment required and not collected - Go to payment screen
      if (isDropPayment && !booking.cashCollected) {
        console.log("💰 Drop payment required and not collected - Navigating to DropPaymentScreen");
        navigation.navigate("DropPaymentScreen", { order: booking });
        return;
      }
      
      // Case 4: Payment was supposed to be at pickup but not collected - Error case, go to payment
      if (isPickupPayment && !booking.cashCollected && 
          booking.paymentStatus !== 'completed' && !booking.isOnlinePayment) {
        console.log("⚠️ Pickup payment was not collected, redirecting to payment screen");
        navigation.navigate("DropPaymentScreen", { order: booking });
        return;
      }
      
      // Case 5: Fetch latest booking status to check for recent payment updates
      try {
        console.log("🔍 Fetching latest booking status to check for payment updates...");
        const riderData = await getRiderByPhone();
        const riderId = riderData?._id || riderData?.id || riderData?.rider?._id;
        
        if (riderId) {
          const latestBooking = await getOngoingBookingForRider({ riderId });
          if (latestBooking && (latestBooking.cashCollected || 
              latestBooking.paymentStatus === 'completed' || 
              latestBooking.isOnlinePayment)) {
            console.log("✅ Latest API data confirms payment completed, proceeding with ride completion");
            
            // Update local state with latest data
            const updatedBooking = { 
              ...booking, 
              cashCollected: latestBooking.cashCollected || booking.cashCollected,
              paymentStatus: latestBooking.paymentStatus || booking.paymentStatus,
              isOnlinePayment: latestBooking.isOnlinePayment || booking.isOnlinePayment
            };
            setBooking(updatedBooking);
            
            await handleReachedDropLocation();
            return;
          }
        }
        
        // If we reach here, payment is truly not collected
        console.log("❌ No payment found, redirecting to payment collection");
        navigation.navigate("DropPaymentScreen", { order: booking });
        return;
        
      } catch (error) {
        console.log("⚠️ Could not fetch latest booking status:", error.message);
        // Fallback: redirect to payment screen
        navigation.navigate("DropPaymentScreen", { order: booking });
        return;
      }
    }
    // End Trip logic - also handle payment collection
    const isEndTripStep = stepName === "End Trip" || 
                         (currentStep >= 10); // High step numbers indicate completion
    
    if (isEndTripStep) {
      if (booking && booking._id) {
        // Check payment requirements before ending trip
        const isPickupPayment = booking.payFrom === "pickup";
        const cashAlreadyCollected = booking.cashCollected;
        
        console.log("🏁 End Trip - Payment location:", booking.payFrom);
        console.log("💰 Cash collected:", cashAlreadyCollected);
        
        // If it's drop payment and cash not collected, redirect to payment screen
        if (isDropPayment && !cashAlreadyCollected && 
            booking.paymentStatus !== 'completed' && !booking.isOnlinePayment) {
          console.log("💰 End Trip: Drop payment required but not collected - Redirecting to DropPaymentScreen");
          navigation.navigate("DropPaymentScreen", { order: booking });
          return;
        }
        
        // If payment at pickup and cash collected, show rating modal first
        if (isPickupPayment && cashAlreadyCollected) {
          console.log("⭐ Showing rating modal for pickup payment");
          setShowRatingModal(true);
          return;
        }
        
        // Otherwise complete directly (payment at drop already handled)
        setCurrentStep(0);
        await AsyncStorage.removeItem(TRIP_STEP_KEY);

        // Get current location before completing
        let currentLat = null;
        let currentLng = null;
        try {
          let location = await Location.getCurrentPositionAsync({});
          currentLat = location.coords.latitude;
          currentLng = location.coords.longitude;
          console.log("📍 Current location for completion:", {
            currentLat,
            currentLng,
          });
        } catch (locErr) {
          console.log("⚠️ Could not get location:", locErr.message);
        }

        // Complete booking with location
        const completionResponse = await completeBooking(
          booking._id,
          currentLat,
          currentLng
        );

        console.log("✅ Booking completed successfully");
        console.log("📦 Next bookings:", completionResponse.nextBookings);

        // Navigate to review screen immediately after completion
        console.log("✅ Trip completed - Navigating to OrderReviewScreen");
        
        // Reset navigation stack to prevent back navigation issues
        navigation.reset({
          index: 1,
          routes: [
            { name: 'Home' },
            { 
              name: 'OrderReviewScreen',
              params: {
                booking,
                amount: booking.totalDriverEarnings || booking.amountPay || booking.price,
                nextBookings: completionResponse.nextBookings || [],
                hasNextBookings: completionResponse.hasNextBookings || false,
              }
            },
          ],
        });
      }
      return;
    }

    if (currentStep < tripSteps.length - 1) {
      // Multi-drop handling is now done in panResponder logic only
      // This function handles normal step progression for non-multi-drop scenarios
      
      // Normal step progression for all cases
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      await AsyncStorage.setItem(TRIP_STEP_KEY, String(nextStep));
      
      if (booking && booking._id) {
        // Determine appropriate tripState based on step
        let tripState = 'pending';
        if (nextStep === 2) tripState = 'en_route_to_drop';
        else if (nextStep === 3) tripState = 'at_drop';
        else if (nextStep === 4) tripState = 'completed';
        
        console.log(`📤 Updating backend - Step: ${nextStep}, DropIndex: ${currentDropIndex}, TripState: ${tripState}`);
        const updateResponse = await updateBookingStep(booking._id, nextStep, currentDropIndex, tripState);
        
        // Update local booking state with the response data
        if (updateResponse && updateResponse.booking) {
          console.log("🔄 Updating local booking state with backend response");
          console.log("🔍 Backend Response Booking dropLocation:", {
            hasDropLocation: !!updateResponse.booking.dropLocation,
            dropLocationCount: updateResponse.booking.dropLocation?.length || 0,
            dropLocations: updateResponse.booking.dropLocation?.map((drop, idx) => ({
              index: idx,
              ReciversName: drop.ReciversName,
              ReciversMobileNum: drop.ReciversMobileNum
            }))
          });
          setBooking(updateResponse.booking);
          console.log("✅ Local booking state updated with latest backend data");
          
          // Ensure step is synchronized with the updated booking
          const updatedStep = Number(updateResponse.booking.currentStep);
          if (updatedStep !== nextStep) {
            console.log("⚠️ Step corrected after backend response:", updatedStep);
            setCurrentStep(updatedStep);
            await AsyncStorage.setItem(TRIP_STEP_KEY, String(updatedStep));
          }
        }
      }
      
      // CRITICAL: Reset slide animation to initial position after all state updates
      // Use setTimeout to ensure React has finished re-rendering
      setTimeout(() => {
        console.log("🔄 Resetting swipe button to initial state for next step");
        slideAnim.setValue(0); // Immediate reset without animation
        console.log("✅ Swipe button reset completed");
      }, 100);
    } else {
      // Trip completed - final step
      setCurrentStep(0);
      await AsyncStorage.setItem(TRIP_STEP_KEY, "0");

      if (booking && booking._id) {
        // Get current location before completing
        let currentLat = null;
        let currentLng = null;
        try {
          let location = await Location.getCurrentPositionAsync({});
          currentLat = location.coords.latitude;
          currentLng = location.coords.longitude;
          console.log("📍 Current location for completion:", {
            currentLat,
            currentLng,
          });
        } catch (locErr) {
          console.log("⚠️ Could not get location:", locErr.message);
        }

        // Complete booking with location
        const completionResponse = await completeBooking(
          booking._id,
          currentLat,
          currentLng
        );

        console.log("✅ Booking completed successfully");
        console.log("📦 Next bookings:", completionResponse.nextBookings);

        await AsyncStorage.removeItem(TRIP_STEP_KEY);

        // Navigate to review screen immediately after completion
        console.log("✅ Trip completed - Navigating to OrderReviewScreen");
        
        // Reset navigation stack to prevent back navigation issues
        navigation.reset({
          index: 1,
          routes: [
            { name: 'Home' },
            { 
              name: 'OrderReviewScreen',
              params: {
                booking,
                amount: booking.totalDriverEarnings || booking.amountPay || booking.price,
                nextBookings: completionResponse.nextBookings || [],
                hasNextBookings: completionResponse.hasNextBookings || false,
              }
            },
          ],
        });
      }
    }
  };

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Camera permission is required to take photos."
      );
      return false;
    }
    return true;
  };

  const handleImageButtonPress = () => {
    // Always open camera directly for immediate capture and upload
    handleImageCapture();
  };

  const handleImageCapture = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      console.log("Camera result:", result);

      if (!result.canceled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setCapturedImages((prev) => [...prev, imageUri]);
        
        // Auto-upload image immediately
        if (booking && booking._id) {
          try {
            console.log("Auto-uploading image:", imageUri);
            await uploadImage(booking._id, imageUri);
            Alert.alert("Success", "Image uploaded successfully!");
          } catch (err) {
            console.error("Upload failed:", err);
            Alert.alert("Upload Failed", "Could not upload image to server.");
          }
        } else {
          console.log("No booking._id found for upload");
          Alert.alert("Error", "Booking not found. Cannot upload image.");
        }
      }
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert("Error", "Failed to capture image. Please try again.");
    }
  };

  const handleAddMoreImages = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setCapturedImages((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to capture image. Please try again.");
    }
  };

  const handleRemoveImage = (index) => {
    setCapturedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveImages = async () => {
    if (!booking || !booking._id) {
      Alert.alert("Error", "Booking not found.");
      return;
    }
    try {
      for (const imageUri of capturedImages) {
        await uploadImage(booking._id, imageUri);
      }
      Alert.alert("Success", "All images uploaded!");
    } catch (err) {
      Alert.alert("Error", "Failed to upload one or more images.");
    }
    setShowImagePage(false);
  };

  const handleRetakeAllImages = () => {
    setCapturedImages([]);
    setShowImagePage(false);
  };

  // Add this function for step-specific image capture
  const handleImageCaptureForStep = async (step) => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      console.log("Step camera result:", result);
      if (!result.canceled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setStepImages((prev) => ({ ...prev, [step]: imageUri }));
        setCapturedImages((prev) => [...prev, imageUri]);
        
        // Auto-upload to backend immediately
        if (booking && booking._id) {
          try {
            console.log(
              "Auto-uploading image for step:",
              step,
              "bookingId:",
              booking?._id,
              "uri:",
              imageUri
            );
            await uploadImage(booking._id, imageUri);
            Alert.alert("Success", "Image uploaded successfully!");
          } catch (err) {
            console.error("Upload failed:", err);
            Alert.alert("Upload Failed", "Could not upload image to server.");
          }
        } else {
          console.log("No booking._id found for upload in handleImageCaptureForStep");
          Alert.alert("Error", "Booking not found. Cannot upload image.");
        }
      }
    } catch (error) {
      console.error("Step camera error:", error);
      Alert.alert("Error", "Failed to capture image. Please try again.");
    }
  };

  // Image Preview Page Component
  if (loadingStep || bookingLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text>Loading Trip Details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Address Card logic
  // FIXED: For multi-drop bookings, always show drop contact based on currentDropIndex
  // Only show pickup on very first step (Step 0 or 1) AND currentDropIndex is 0
  let showPickup = currentStep < 2 && currentDropIndex === 0; // Show pickup only for first drop's initial steps
  let showDrop = currentStep >= 2 || currentDropIndex > 0; // Show drop for Started Trip OR any subsequent drops

  // Determine contact info
  let contactName = "";
  let contactNumber = "";
  
  // Debug: Log booking structure for receiver details
  console.log("🔍 Contact Info Debug:", {
    currentStep,
    currentDropIndex,
    showPickup,
    showDrop,
    hasFromAddress: !!booking?.fromAddress,
    hasDropLocations: !!booking?.dropLocation,
    dropLocationCount: booking?.dropLocation?.length || 0,
    currentDropData: booking?.dropLocation?.[currentDropIndex]
  });
  
  // Try to get customer name from various sources
  if (booking) {
    // First priority: customer object (fallback only)
    if (booking.customer && booking.customer.name) {
      contactName = booking.customer.name;
      if (booking.customer.lname) {
        contactName += " " + booking.customer.lname;
      }
    }
    
    // Get phone number and name based on current step and drop index
    if (showPickup && booking.fromAddress) {
      // PICKUP LOCATION - Use pickup receiver details (only for first drop's initial steps)
      contactNumber = booking.fromAddress.receiverMobile || "";
      if (booking.fromAddress.receiverName) {
        contactName = booking.fromAddress.receiverName;
      }
      console.log("📞 Pickup Contact:", { name: contactName, phone: contactNumber });
    } else if (
      showDrop &&
      booking.dropLocation &&
      booking.dropLocation[currentDropIndex]
    ) {
      // DROP LOCATION - Use drop receiver details (for all drops at any step)
      const currentDrop = booking.dropLocation[currentDropIndex];
      
      console.log("🔍 Current Drop Raw Data:", JSON.stringify(currentDrop, null, 2));
      
      // Try multiple field name variations for receiver phone
      contactNumber = currentDrop.ReciversMobileNum || 
                     currentDrop.receiverMobile || 
                     currentDrop.ReceiverMobile || 
                     currentDrop.receiverNumber || 
                     "";
      
      // Try multiple field name variations for receiver name
      if (currentDrop.ReciversName || currentDrop.receiverName || currentDrop.ReceiverName) {
        contactName = currentDrop.ReciversName || 
                     currentDrop.receiverName || 
                     currentDrop.ReceiverName || 
                     contactName;
      }
      
      console.log("📞 Drop Contact (Index " + currentDropIndex + "):", { 
        name: contactName, 
        phone: contactNumber,
        allFields: {
          ReciversMobileNum: currentDrop.ReciversMobileNum,
          receiverMobile: currentDrop.receiverMobile,
          ReceiverMobile: currentDrop.ReceiverMobile,
          ReciversName: currentDrop.ReciversName,
          receiverName: currentDrop.receiverName
        }
      });
    }
    
    // Final fallback ONLY if no contact number found
    if (!contactNumber) {
      console.log("⚠️ No receiver phone found, using customer fallback");
      if (booking.customer?.phone) {
        contactNumber = booking.customer.phone;
      } else if (booking.fromAddress?.receiverMobile) {
        contactNumber = booking.fromAddress.receiverMobile;
      }
      console.log("📞 Fallback Contact:", contactNumber);
    }
    
    console.log("📞 ===== FINAL CONTACT INFO =====");
    console.log("📞 Name:", contactName);
    console.log("📞 Number:", contactNumber);
    console.log("📞 ==============================");
  }

  // Debug logging for crash diagnosis
  // console.log('booking:', booking);

  const handlePhonePress = () => {
    console.log("📞 ===== CALL BUTTON PRESSED =====");
    console.log("📞 Current State:", {
      currentStep,
      currentDropIndex,
      showPickup: currentStep < 2,
      showDrop: currentStep >= 2
    });
    console.log("📞 Contact Details:", { 
      contactName, 
      contactNumber 
    });
    console.log("📞 Booking DropLocation:", {
      hasDropLocation: !!booking?.dropLocation,
      dropLocationLength: booking?.dropLocation?.length || 0,
      currentDrop: booking?.dropLocation?.[currentDropIndex] ? {
        ReciversName: booking.dropLocation[currentDropIndex].ReciversName,
        ReciversMobileNum: booking.dropLocation[currentDropIndex].ReciversMobileNum,
        receiverName: booking.dropLocation[currentDropIndex].receiverName,
        receiverMobile: booking.dropLocation[currentDropIndex].receiverMobile
      } : "NO DROP LOCATION"
    });
    console.log("📞 Customer Phone (fallback):", booking?.customer?.phone);
    console.log("📞 ===== CALLING:", contactNumber, "=====");
    
    if (contactNumber) {
      Linking.openURL(`tel:${contactNumber}`);
    } else {
      Alert.alert("No phone number available", "No contact number found for this location");
    }
  };

  const handleMapNavigate = () => {
    let target = null;
    // FIXED: Navigate to pickup ONLY for first drop's initial steps
    // For multi-drop bookings on subsequent drops, always navigate to current drop
    if (currentStep < 2 && currentDropIndex === 0 && finalPickup) {
      target = finalPickup;
    }
    // Navigate to current drop for all other cases (includes multi-drop at any step)
    else if (finalDrop) {
      target = finalDrop;
    }

    if (!target) {
      Alert.alert("Error", "Target location not available");
      return;
    }

    const { latitude, longitude } = target;
    let url = "";
    if (Platform.OS === "ios") {
      url = `http://maps.apple.com/?daddr=${latitude},${longitude}`;
    } else if (Platform.OS === "android") {
      url = `google.navigation:q=${latitude},${longitude}`;
    } else {
      url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    }

    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Unable to open map");
    });
  };

  const uploadImage = async (bookingId, imageUri) => {
    let fileName = "photo.jpg";
    let fileType = "image/jpeg";
    if (imageUri) {
      const uriParts = imageUri.split("/");
      const lastPart = uriParts[uriParts.length - 1];
      if (lastPart && lastPart.includes(".")) {
        fileName = lastPart;
        const ext = lastPart.split(".").pop();
        if (ext === "png") fileType = "image/png";
        // Add more types if needed
      }
    }

    const formData = new FormData();
    formData.append("image", {
      uri: imageUri,
      name: fileName,
      type: fileType,
    });

    try {
      const uploadUrl = API_CONFIG.getUploadEndpoint(`upload-drop-image/${bookingId}`);
      console.log("Uploading drop image to:", uploadUrl);
      
      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      });
      // const response = await fetch(
      //   `https://ridodrop-backend-24-10-2025.onrender.com/api/v1/upload-image/${bookingId}`,
      //   {
      //     method: "POST",
      //     body: formData,
      //     headers: {
      //       Accept: "application/json",
      //     },
      //   }
      // );
      const data = await response.json();
      console.log("Upload response:", data);

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (data && data.success && (data.imagePath || data.imageData)) {
        const imageUrl = data.imagePath || data.imageData?.url;
        console.log("✅ Image uploaded to Cloudinary:", imageUrl);
        
        // Show success with additional info if available
        const sizeInfo = data.cloudinaryResult ? 
          ` (${Math.round(data.cloudinaryResult.bytes / 1024)}KB)` : '';
        
        Alert.alert(
          "✅ Drop Image Uploaded", 
          `Drop image uploaded successfully to cloud storage!${sizeInfo}`
        );
      } else {
        Alert.alert("Error", data.message || "Failed to upload image");
      }
      return data;
    } catch (error) {
      console.log("Upload error:", error);
      
      let errorMessage = "Failed to upload image";
      if (error.name === 'NetworkError' || error.message.includes('fetch')) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.message.includes('HTTP')) {
        errorMessage = `Server error: ${error.message}`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert("❌ Upload Failed", errorMessage);
      throw error;
    }
  };

  const ImagePreviewPage = () => (
    <Modal
      visible={showImagePage}
      animationType="slide"
      onRequestClose={() => setShowImagePage(false)}
    >
      <SafeAreaView style={styles.imagePageContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

        {/* Header */}
        <LinearGradient
          colors={["#1a1a1a", "#2d2d2d"]}
          style={styles.imagePageHeader}
        >
          <View style={styles.imagePageHeaderContent}>
            <TouchableOpacity
              style={styles.backButtonImagePage}
              onPress={() => setShowImagePage(false)}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.imagePageTitle}>Captured Images</Text>
            <TouchableOpacity
              style={styles.closeButtonImagePage}
              onPress={() => setShowImagePage(false)}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Image Grid */}
        <ScrollView style={styles.imageGridContainer}>
          <View style={styles.imageGrid}>
            {capturedImages.map((imageUri, index) => (
              <View key={index} style={styles.imageItem}>
                <Image source={{ uri: imageUri }} style={styles.gridImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => handleRemoveImage(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#EC4D4A" />
                </TouchableOpacity>
              </View>
            ))}

            {/* Add More Button */}
            <TouchableOpacity
              style={styles.addMoreButton}
              onPress={handleAddMoreImages}
            >
              <Ionicons name="add" size={40} color="#EC4D4A" />
              <Text style={styles.addMoreText}>Add More</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.imagePageActions}>
          <TouchableOpacity
            style={styles.retakeAllButton}
            onPress={handleRetakeAllImages}
          >
            <Ionicons name="refresh" size={20} color="#EC4D4A" />
            <Text style={styles.retakeAllText}>Retake All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveAllButton}
            onPress={handleSaveImages}
          >
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.saveAllText}>Save All</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  // Handle rating submission for pickup payment scenario
  const handleRatingSubmit = async () => {
    try {
      setShowRatingModal(false);
      
      console.log("⭐ Customer rating:", customerRating);
      
      // Get current location before completing
      let currentLat = null;
      let currentLng = null;
      try {
        let location = await Location.getCurrentPositionAsync({});
        currentLat = location.coords.latitude;
        currentLng = location.coords.longitude;
      } catch (locErr) {
        console.log("⚠️ Could not get location:", locErr.message);
      }

      // Complete the booking
      if (booking && booking._id) {
        const completionResponse = await completeBooking(
          booking._id,
          currentLat,
          currentLng
        );
        
        console.log("✅ Booking completed successfully with rating:", customerRating);
        
        // Clear trip progress from AsyncStorage
        await AsyncStorage.removeItem(TRIP_STEP_KEY);
        
        Alert.alert(
          "Order Completed",
          `You have successfully completed the order! Rating: ${customerRating} stars`,
          [
            {
              text: "OK",
              onPress: () => {
                // Navigate to OrderReviewScreen
                navigation.reset({
                  index: 1,
                  routes: [
                    { name: 'Home' },
                    { 
                      name: 'OrderReviewScreen',
                      params: {
                        booking,
                        amount: booking.totalDriverEarnings || booking.amountPay || booking.price,
                        nextBookings: completionResponse.nextBookings || [],
                        hasNextBookings: completionResponse.hasNextBookings || false,
                      }
                    },
                  ],
                });
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error completing booking:", error);
      Alert.alert(
        "Error",
        "Failed to complete the order. Please try again.",
        [
          {
            text: "OK",
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: "Home" }],
              });
            },
          },
        ]
      );
    }
  };

  // Essential debug info - check coordinates and polylines
  console.log('🎯 MARKER DEBUG:', {
    platform: Platform.OS,
    hasBooking: !!booking,
    bookingId: booking?._id || booking?.bookingId,
    currentLocation: currentLocation ? {
      lat: currentLocation.latitude,
      lng: currentLocation.longitude,
      valid: !!(currentLocation.latitude && currentLocation.longitude),
      validCoord: isValidCoord(currentLocation.latitude) && isValidCoord(currentLocation.longitude)
    } : 'NO CURRENT LOCATION',
    finalPickup: finalPickup ? {
      lat: finalPickup.latitude,
      lng: finalPickup.longitude,
      valid: !!(finalPickup.latitude && finalPickup.longitude)
    } : null,
    finalDrop: finalDrop ? {
      lat: finalDrop.latitude,
      lng: finalDrop.longitude,
      valid: !!(finalDrop.latitude && finalDrop.longitude)
    } : null,
    coordinateTypes: {
      pickupType: typeof finalPickup?.latitude,
      dropType: typeof finalDrop?.latitude,
      currentLocationType: typeof currentLocation?.latitude
    }
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Order ID Section - At the top */}
        <View style={styles.orderIdCardTop}>
          <Text style={styles.orderIdLabel}>Order ID:</Text>
          <Text style={styles.orderIdValue}>
            #{booking?.bookingId || booking?._id || "N/A"}
          </Text>
        </View>

        {/* Map Section - Fill remaining space */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={
              // Calculate initial region to fit pickup and drop
              finalPickup && finalDrop && finalPickup.latitude && finalDrop.latitude
                ? (() => {
                    const centerLat = (finalPickup.latitude + finalDrop.latitude) / 2;
                    const centerLng = (finalPickup.longitude + finalDrop.longitude) / 2;
                    const latDelta = Math.abs(finalPickup.latitude - finalDrop.latitude) * 1.8;
                    const lngDelta = Math.abs(finalPickup.longitude - finalDrop.longitude) * 1.8;
                    return {
                      latitude: centerLat,
                      longitude: centerLng,
                      latitudeDelta: Math.max(latDelta, 0.01), // Minimum zoom level
                      longitudeDelta: Math.max(lngDelta, 0.01),
                    };
                  })()
                : finalPickup && finalPickup.latitude && finalPickup.longitude
                ? {
                    latitude: finalPickup.latitude,
                    longitude: finalPickup.longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  }
                : currentLocation
                ? {
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  }
                : {
                    latitude: 12.9716,
                    longitude: 77.5946,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  }
            }
            showsUserLocation={false}
            showsMyLocationButton={true}
            showsCompass={true}
            minZoomLevel={10}
            maxZoomLevel={18}
            zoomEnabled={true}
            scrollEnabled={true}
            pitchEnabled={false}
            rotateEnabled={false}
            onMapReady={() => {
              console.log('🗺️ Map ready - will fit to coordinates');
              // Fit to coordinates once map is ready
              setTimeout(() => {
                fitMapToPickupAndDrop();
              }, 1000);
            }}
            onPress={handleMapNavigate}
          >
            {/* Pickup Marker - Custom Icon */}
            {finalPickup && finalPickup.latitude && finalPickup.longitude && (
              <Marker
                coordinate={{
                  latitude: parseFloat(finalPickup.latitude),
                  longitude: parseFloat(finalPickup.longitude)
                }}
                identifier="pickupMarker"
                title="Pickup Location"
                description="Package pickup point"
                anchor={{ x: 0.5, y: 1 }}
                centerOffset={{ x: 0, y: -20 }}
              >
                <Image
                  source={require('../assets/pickup.png')}
                  style={{ width: 40, height: 40 }}
                  resizeMode="contain"
                />
              </Marker>
            )}
            
            {/* Drop Marker - Custom Icon */}
            {finalDrop && finalDrop.latitude && finalDrop.longitude && (
              <Marker
                key={`dropMarker-${currentDropIndex}`} // Force re-render when drop index changes
                coordinate={{
                  latitude: parseFloat(finalDrop.latitude),
                  longitude: parseFloat(finalDrop.longitude)
                }}
                identifier={`dropMarker-${currentDropIndex}`}
                title={hasMultipleDrops ? `Drop Location ${currentDropIndex + 1}/${totalDropLocations}` : "Drop-off Location"}
                description={hasMultipleDrops ? `Destination ${currentDropIndex + 1}` : "Customer destination"}
                anchor={{ x: 0.5, y: 1 }}
                centerOffset={{ x: 0, y: -20 }}
              >
                <Image
                  source={require('../assets/drop.png')}
                  style={{ width: 40, height: 40 }}
                  resizeMode="contain"
                />
              </Marker>
            )}
            {/* Real-Time Current Location Marker - Custom Rider Icon */}
            {currentLocation &&
              isValidCoord(currentLocation.latitude) &&
              isValidCoord(currentLocation.longitude) && (
                <Marker
                  coordinate={{
                    latitude: parseFloat(currentLocation.latitude),
                    longitude: parseFloat(currentLocation.longitude)
                  }}
                  identifier="currentLocationMarker"
                  title="Your Current Location"
                  description="Rider position updating in real-time"
                  anchor={{ x: 0.5, y: 0.5 }}
                  flat={Platform.OS === 'android'}
                  tracksViewChanges={Platform.OS === 'ios' ? false : undefined}
                >
                  <View style={{ 
                    width: 45, 
                    height: 45, 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    backgroundColor: 'transparent'
                  }}>
                    <Image
                      source={require('../assets/rider.png')}
                      style={{ width: 45, height: 45 }}
                      resizeMode="contain"
                    />
                  </View>
                </Marker>
              )}
            {/* NAVIGATION POLYLINES - CURVED ROUTES ONLY */}
            
            {/* Google Directions route - HIGHEST PRIORITY */}
            {routeCoords && routeCoords.length > 2 && (
              <Polyline
                key="google-directions-route"
                coordinates={routeCoords}
                strokeColor="#EC4D4A"
                strokeWidth={6}
                strokeOpacity={1.0}
                lineCap="round"
                lineJoin="round"
                geodesic={true}
                zIndex={1000}
                tappable={false}
                fillColor="#EC4D4A"
              />
            )}
            
            {/* Curved fallback route: Current Location to Drop (when Google Directions fails) */}
            {currentLocation && finalDrop && currentLocation.latitude && currentLocation.longitude && finalDrop.latitude && finalDrop.longitude && (!routeCoords || routeCoords.length < 3) && (
              <Polyline
                key="curved-fallback-route"
                coordinates={generateCurvedRoute(currentLocation, finalDrop, 30)}
                strokeColor="#EC4D4A"
                strokeWidth={6}
                strokeOpacity={1.0}
                lineCap="round"
                lineJoin="round"
                geodesic={false}
                zIndex={900}
                tappable={false}
                fillColor="#EC4D4A"
              />
            )}

            
            {/* Uncomment to show debug line */}
            {/* currentLocation && (currentStep < 2 ? pickup : drop) && (
              <Polyline
                coordinates={[currentLocation, currentStep < 2 ? pickup : drop]}
                strokeColor="#4CAF50"
                strokeWidth={2}
                strokeOpacity={0.5}
                lineDashPattern={[5, 5]}
                geodesic={true}
              />
            ) */}
          </MapView>
        </View>

        {/* Bottom Card - Fixed at bottom */}
        <View style={styles.bottomCardContainer}>
          <View style={styles.locationCard}>
            {/* Curved Top Edge */}
            <View style={styles.curvedTop} />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={styles.customerInfoHeader}>
                  <View style={styles.customerInfo}>
                    <View style={styles.dropLocationHeader}>
                      <Text style={styles.dropLocationLabel}>
                        {hasMultipleDrops 
                          ? `Drop Location ${currentDropIndex + 1}/${totalDropLocations}` 
                          : "Drop Location"}
                      </Text>
                      {hasMultipleDrops && (
                        <View style={styles.multiDropBadge}>
                          <Ionicons name="location" size={14} color="#FFF" />
                          <Text style={styles.multiDropBadgeText}>
                            {currentDropIndex + 1}/{totalDropLocations}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.customerInfoContainer}>
                      <Text style={styles.customerName}>
                        👤{" "}
                        {booking?.dropLocation?.[currentDropIndex]?.ReciversName ||
                          booking?.customer?.name ||
                          "Customer Name"}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.menuButton}
                    onPress={() => navigation.navigate("OrderMenuScreen", { order: booking })}
                  >
                    <Ionicons name="menu" size={24} color="#EC4D4A" />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.customerAddress}>
                  📍{" "}
                  {booking?.dropLocation?.[currentDropIndex]?.Address ||
                    booking?.dropLocation?.[currentDropIndex]?.address ||
                    "Drop address not available"}
                </Text>
                {booking?.dropLocation?.[currentDropIndex]?.landmark ? (
                  <Text style={styles.customerHouse}>
                    🏠 {booking.dropLocation[currentDropIndex].landmark}
                  </Text>
                ) : null}
                
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={styles.actionButtonWithText}
                    onPress={handlePhonePress}
                  >
                    <Ionicons name="call" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButtonWithText}
                    onPress={handleMapNavigate}
                  >
                    <Ionicons name="location" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Location</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButtonWithText}
                    onPress={handleImageButtonPress}
                  >
                    <Ionicons name="camera" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Drop</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButtonWithText}
                    onPress={() => navigation.navigate("BookingImages", { booking })}
                  >
                    <Ionicons name="images" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Images</Text>
                  </TouchableOpacity>
                </View>
                
                {/* Slide to Confirm Button */}
                {/* Show swipe button if booking exists and not completed */}
                {(() => {
                  const shouldShow = booking && !(booking?.tripState === 'completed' && booking?.status === 'completed');
                  console.log('🔘 SWIPE BUTTON VISIBILITY:', {
                    shouldShow,
                    hasBooking: !!booking,
                    tripState: booking?.tripState,
                    status: booking?.status,
                    currentStep: booking?.currentStep,
                    bookingStatus: booking?.bookingStatus
                  });
                  return shouldShow;
                })() && (
                <View 
                  style={styles.slideToConfirmContainer}
                  onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
                >
                  <View style={styles.slideTrack} pointerEvents="box-none">
                    {/* Animated Progress Fill */}
                    <Animated.View
                      style={[
                        styles.progressFill,
                        {
                          width: slideAnim.interpolate({
                            inputRange: [0, sliderWidth - 60],
                            outputRange: [70, sliderWidth + 5], // Extend beyond track to ensure complete fill
                            extrapolate: 'clamp',
                          }),
                        },
                      ]}
                    />
                    
                    {/* Text Only */}
                    <View style={styles.slideContent}>
                      <Text style={styles.slideText}>
                        {(() => {
                          // Show processing state if swipe is being processed
                          if (isSwipeProcessing) {
                            return "Updating... Please wait";
                          }
                          
                          // Handle completed trip state
                          if (booking?.tripState === 'completed' && booking?.status === 'completed') {
                            return "Trip Completed";
                          }
                          
                          // ONE SWIPE PER DROP - Show progress (minimalistic)
                          if (hasMultipleDrops) {
                            return `Swipe to Complete Drop ${currentDropIndex + 1}/${totalDropLocations}`;
                          }
                          
                          return "Swipe to Complete Drop";
                        })()}
                      </Text>
                    </View>
                  </View>
                  
                  <Animated.View
                    {...panResponder.panHandlers}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={[
                      styles.slideButton,
                      {
                        transform: [{ translateX: slideAnim }],
                      },
                    ]}
                  >
                    {/* Button Inner Circle */}
                    <View style={styles.buttonInner}>
                      {isProcessingSwipe ? (
                        <>
                          <Ionicons name="hourglass" size={24} color="#EC4D4A" />
                          <Text style={{ fontSize: 10, color: '#EC4D4A', marginTop: 2 }}>Wait</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="chevron-forward" size={24} color="#EC4D4A" />
                          <Ionicons name="chevron-forward" size={24} color="#EC4D4A" style={styles.doubleArrow} />
                        </>
                      )}
                    </View>
                  </Animated.View>
                </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Image Preview Page */}
        <ImagePreviewPage />

        {/* Rating Modal for Pickup Payment */}
        <Modal
          visible={showRatingModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowRatingModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Icon */}
              <View style={styles.iconContainer}>
                <View style={styles.iconCircle}>
                  <Ionicons name="star" size={48} color="#FDB913" />
                </View>
              </View>

              {/* Title */}
              <Text style={styles.modalTitle}>
                Rate Your Customer
              </Text>

              {/* Subtitle */}
              <Text style={styles.modalSubtitle}>
                How was your experience with this customer?
              </Text>

              {/* Stars */}
              <View style={styles.starsContainer}>
                {[0, 1, 2, 3, 4].map((index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setCustomerRating(index + 1)}
                    activeOpacity={0.7}
                    style={styles.starButton}
                  >
                    <Ionicons
                      name={index < customerRating ? "star" : "star-outline"}
                      size={48}
                      color={index < customerRating ? "#FDB913" : "#E0E0E0"}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Submit Button */}
              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  customerRating === 0 && styles.submitButtonDisabled
                ]}
                onPress={handleRatingSubmit}
                activeOpacity={0.8}
                disabled={customerRating === 0}
              >
                <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                <Text style={styles.submitButtonText}>Submit & Complete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  orderIdCardTop: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EC4D4A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  orderIdLabel: {
    fontSize: 16,
    color: "#EC4D4A",
    fontWeight: "700",
    marginRight: 8,
  },
  orderIdValue: {
    fontSize: 16,
    color: "#1f2937",
    fontWeight: "600",
  },
  mapContainer: {
    flex: 1,
    width: "100%",
    backgroundColor: "#e0e0e0",
    overflow: "hidden",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  currentLocationMarker: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 25,
    padding: 8,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
  },
  navigationIcon: {
    width: 32,
    height: 32,
  },

  bottomCardContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
  },
  locationCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 20,
    paddingTop: 32,
    paddingBottom: 40,
    marginBottom: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    minHeight: 300,
  },
  curvedTop: {
    position: "absolute",
    top: -1,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: "#fff",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },
  customerInfo: {
    marginBottom: 12,
    flex: 1,
  },
  customerInfoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  menuButton: {
    padding: 4,
  },
  customerName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  customerAddress: {
    fontSize: 15,
    color: "#6b7280",
    marginBottom: 16,
  },
  customerHouse: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
    marginBottom: 8,
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 20,
    gap: 8,
  },
  actionButtonWithText: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EC4D4A",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 6,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
  slideToConfirmContainer: {
    marginTop: 0,
    width: "100%",
    height: 70,
    position: "relative",
  },
  slideTrack: {
    width: "100%",
    height: 70,
    backgroundColor: "#EC4D4A",
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    overflow: "hidden",
    position: "relative",
    shadowColor: "#EC4D4A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  progressFill: {
    position: "absolute",
    left: 0,
    top: 0,
    height: "100%",
    backgroundColor: "#D32F2F",
    borderRadius: 35,
    zIndex: 1,
  },
  slideContent: {
    position: "relative",
    zIndex: 2,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    paddingLeft: 80,
  },
  slideText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
    letterSpacing: 0.3,
    zIndex: 2,
    flex: 1,
    textAlign: "center",
  },
  slideButton: {
    position: "absolute",
    left: 5,
    top: 5,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
    overflow: "hidden",
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  doubleArrow: {
    position: "absolute",
    left: 8,
  },
  // Image Preview Page Styles
  imagePageContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  imagePageHeader: {
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  imagePageHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButtonImagePage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePageTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  closeButtonImagePage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageGridContainer: {
    flex: 1,
    padding: 20,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 15,
  },
  imageItem: {
    width: (width - 60) / 2,
    height: (width - 60) / 2,
    borderRadius: 15,
    overflow: "hidden",
    position: "relative",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gridImage: {
    width: "100%",
    height: "100%",
    borderRadius: 15,
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#fff",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  addMoreButton: {
    width: (width - 60) / 2,
    height: (width - 60) / 2,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#EC4D4A",
    borderStyle: "dashed",
    backgroundColor: "#FFF5F5",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  addMoreText: {
    color: "#EC4D4A",
    fontWeight: "600",
    marginTop: 5,
    fontSize: 14,
  },
  imagePageActions: {
    flexDirection: "row",
    padding: 20,
    gap: 15,
  },
  retakeAllButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 10,
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#EC4D4A",
  },
  retakeAllText: {
    color: "#EC4D4A",
    fontWeight: "600",
    marginLeft: 5,
  },
  saveAllButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 10,
    backgroundColor: "#EC4D4A",
  },
  saveAllText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 5,
  },
  // Rating Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FEE2E2",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000",
    marginBottom: 16,
    lineHeight: 30,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  modalSubtitle: {
    fontSize: 15,
    color: "#6b7280",
    marginBottom: 32,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginBottom: 32,
    paddingVertical: 16,
  },
  starButton: {
    padding: 4,
  },
  submitButton: {
    backgroundColor: "#EC4D4A",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#EC4D4A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: "#D1D5DB",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  androidMarkerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
  },
  androidMarkerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 18,
    width: 36,
    height: 36,
    borderWidth: 2,
    borderColor: '#333333',
  },
  // iOS-specific marker styles
  iosMarkerWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 40,
    height: 50,
  },
  iosMarkerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    width: 40,
    height: 40,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: -2,
  },
  iosMarkerPin: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 12,
    borderRightWidth: 6,
    borderBottomWidth: 0,
    borderLeftWidth: 6,
    borderTopColor: '#4CAF50',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    alignSelf: 'center',
    marginTop: -2,
  },
  dropCounter: {
    fontSize: 13,
    color: "#EC4D4A",
    fontWeight: "600",
    marginLeft: 8,
    opacity: 0.8,
  },
  dropLocationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    justifyContent: "space-between",
    width: "100%",
  },
  dropLocationLabel: {
    fontSize: 14,
    color: "#EC4D4A",
    fontWeight: "700",
    flex: 1,
  },
  multiDropBadge: {
    backgroundColor: "#EC4D4A",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  multiDropBadgeText: {
    fontSize: 12,
    color: "#FFF",
    fontWeight: "700",
  },
});
