import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  TextInput,
  Linking,
  Dimensions,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Animated,
  PanResponder,
  Alert,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import webSocketService from "../utils/WebSocketService";
import { getRiderByPhone } from "../utils/AuthApi";
import { updateBookingStep } from "../utils/BookingApi";
import { API_CONFIG } from "../config/api";
import axios from "axios";

const { height, width } = Dimensions.get("window");
const GOOGLE_MAPS_APIKEY = "AIzaSyDboH1OPn2tZixD8iFGiH9EJPvzsd4CL2Q";

const reasons = [
  "Customer not available",
  "Wrong address",
  "Vehicle issue",
  "Personal emergency",
  "Order assigned by mistake",
  "Other",
];

const OrderDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const order = route.params?.order || {};
  const mapRef = useRef(null);
  const isInitialized = useRef(false); // Prevent duplicate initialization

  // Map-related state
  const [currentLocation, setCurrentLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [mapReady, setMapReady] = useState(false);
  
  // Debug logging for route coordinates
  useEffect(() => {
    console.log('🔍 [POLYLINE DEBUG] routeCoordinates changed:', {
      length: routeCoordinates?.length || 0,
      hasData: routeCoordinates && routeCoordinates.length > 0,
      firstPoint: routeCoordinates?.[0],
      lastPoint: routeCoordinates?.[routeCoordinates.length - 1]
    });
  }, [routeCoordinates]);

  // Fallback to set map ready after 2 seconds if callbacks don't fire
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!mapReady) {
        console.log("⏰ Setting mapReady via fallback timer");
        setMapReady(true);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);


  // Robust coordinate extraction (adapted from MapProgress.js)
  const isValidCoord = (v) => v !== undefined && v !== null && v !== "" && !isNaN(Number(v));
  const pickupLat = order?.from?.latitude || order?.fromAddress?.latitude || order?.pickup?.latitude || order?.pickupLocation?.latitude || order?.pickupCoordinates?.latitude || order?.source?.latitude;
  const pickupLng = order?.from?.longitude || order?.fromAddress?.longitude || order?.pickup?.longitude || order?.pickupLocation?.longitude || order?.pickupCoordinates?.longitude || order?.source?.longitude;
  
  // For OrderDetailsScreen, we want to route TO the pickup location
  // Origin: currentLocation, Destination: pickup
  const pickup = isValidCoord(pickupLat) && isValidCoord(pickupLng)
    ? { latitude: Number(pickupLat), longitude: Number(pickupLng) }
    : null;

  // Get initial location and calculate route to pickup
  useEffect(() => {
    const getInitialLocation = async () => {
      // Prevent duplicate initialization
      if (isInitialized.current) {
        console.log("⏭️ OrderDetailsScreen: Already initialized, skipping");
        return;
      }
      isInitialized.current = true;
      
      try {
        console.log("🔍 OrderDetailsScreen: Requesting location permission...");
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          console.log("✅ Permission granted, getting location...");
          const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          const currentLoc = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setCurrentLocation(currentLoc);
          console.log("📍 Initial location obtained:", location.coords);

          // Calculate route to pickup location using Google Directions API

          if (pickup) {
            console.log("🚦 About to call fetchRouteFromCurrentLocation with:", {
              currentLoc,
              pickup
            });
            await fetchRouteFromCurrentLocation(currentLoc, pickup);
          } else {
            console.log("❌ Pickup location is invalid:", pickup);
          }
        } else {
          console.log("⚠️ Permission denied, using default location");
          setCurrentLocation({ latitude: 12.9716, longitude: 77.5946 });
        }
      } catch (error) {
        console.log("⚠️ Error getting location:", error.message);
        setCurrentLocation({ latitude: 12.9716, longitude: 77.5946 });
      }
      setMapReady(true);
    };
    getInitialLocation();
  }, [order._id]); // Use stable ID instead of entire object



  const [selectedReason, setSelectedReason] = useState(null);
  const [showReasons, setShowReasons] = useState(false);
  const [otherReason, setOtherReason] = useState("");
  const [showSupportOptions, setShowSupportOptions] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const progressTexts = [
    "Reached Pick Up Location",
  ];
  const [rider, setRider] = useState(null);
  const [locationInterval, setLocationInterval] = useState(null);
  let isMounted = true; // Fixed: Added variable declaration

  // Slide to confirm state
  const [sliderWidth, setSliderWidth] = useState(Dimensions.get('window').width - 56); // Default width with padding
  const slideAnim = useRef(new Animated.Value(0)).current;
  const SLIDER_THRESHOLD = 0.85; // 85% slide to confirm
  const PROXIMITY_THRESHOLD = 0.1; // 100 meters in kilometers
  
  // Distance to pickup state
  const [distanceToPickup, setDistanceToPickup] = useState(null);

  // Image capture state
  const [capturedImages, setCapturedImages] = useState([]);
  
  // Track component mount status to prevent crashes
  const isMountedRef = useRef(true);

  // PanResponder for slide button
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, gestureState) => {
        const maxSlide = Math.max(sliderWidth - 60, 100); // Button width (60px) with zero right padding
        if (gestureState.dx >= 0 && gestureState.dx <= maxSlide) {
          slideAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const maxSlide = Math.max(sliderWidth - 60, 100); // Button width (60px) with zero right padding
        const slidePercentage = gestureState.dx / maxSlide;
        
        if (slidePercentage >= SLIDER_THRESHOLD) {
          // Slide completed - trigger action
          Animated.spring(slideAnim, {
            toValue: sliderWidth - 60, // Move to absolute end position
            useNativeDriver: false,
          }).start(() => {
            // Navigate to MapProgress immediately
            handleStepClick();
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

  // Save progress step to AsyncStorage
  const saveStep = async (step) => {
    try {
      await AsyncStorage.setItem("orderProgressStep", String(step));
    } catch (e) {}
  };

  // Clear progress step from AsyncStorage
  const clearStep = async () => {
    try {
      await AsyncStorage.removeItem("orderProgressStep");
    } catch (e) {}
  };

  // Send notification to customer app (placeholder)
  const sendStepNotification = async (stepText) => {
    try {
      await fetch(
        // "https://ridodrop-backend-24-10-2025.onrender.com/api/v1/notification/send-step",
        `${API_CONFIG.BASE_URL}/api/v1/notification/send-step`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: order._id, stepText }),
        }
      );
    } catch (e) {
      // Optionally handle error
    }
  };

  // On mount, restore progress step from AsyncStorage
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem("orderProgressStep");
      if (saved && !isNaN(Number(saved))) setProgressStep(Number(saved));
    })();
  }, []);

  // When progressStep changes, save it (unless at end)
  useEffect(() => {
    if (progressStep < progressTexts.length - 1) {
      saveStep(progressStep);
    } else {
      clearStep();
    }
  }, [progressStep]);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance;
  };

  // Handler for clicking a progress step
  const handleStepClick = async () => {
    /* PROXIMITY CHECKING COMMENTED OUT
    // Check if driver is near pickup location
    const pickupLat = order?.from?.latitude || order?.fromAddress?.latitude;
    const pickupLng = order?.from?.longitude || order?.fromAddress?.longitude;
    
    if (!currentLocation || !pickupLat || !pickupLng) {
      Alert.alert(
        "Location Error",
        "Unable to verify your location. Please ensure location services are enabled."
      );
      return;
    }
    
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      pickupLat,
      pickupLng
    );
    
    console.log(`📏 Distance to pickup: ${(distance * 1000).toFixed(0)} meters`);
    
    // Check if driver is within proximity threshold (100 meters)
    if (distance > PROXIMITY_THRESHOLD) {
      Alert.alert(
        "Too Far from Pickup",
        `You are ${(distance * 1000).toFixed(0)} meters away from the pickup location. Please get closer (within 100 meters) before marking as arrived.`,
        [{ text: "OK" }]
      );
      // Reset slide animation
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: false,
      }).start();
      return;
    }
    */
    
    await sendStepNotification(progressTexts[progressStep]);
    clearStep();
    
    // UPDATE BACKEND: Mark as "Reached Pickup Location" (Step 1)
    try {
      const bookingId = order._id || order.bookingId;
      const currentDropIndex = order.currentDropIndex || 0;
      
      console.log("📍 Updating backend: Reached Pickup Location");
      console.log("📋 Booking ID:", bookingId);
      console.log("📊 Setting Step: 2 (Reached Pickup)");
      
      await updateBookingStep(bookingId, 2, currentDropIndex, 'at_pickup');
      
      console.log("✅ Backend updated successfully - Reached Pickup Location");
    } catch (error) {
      console.error("❌ Failed to update backend:", error);
      Alert.alert(
        "Error",
        "Failed to update booking status. Please try again.",
        [{ text: "OK" }]
      );
      // Reset slide animation on error
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: false,
      }).start();
      return;
    }
    
    // Check payFrom to determine navigation flow - AFTER backend update
    const payFromRaw = order?.payFrom || "drop"; // Default to drop if not specified
    const payFrom = payFromRaw.toLowerCase().trim();
    console.log(`💰 Payment location: ${payFrom}`);
    console.log(`📋 Order payFrom raw value:`, payFromRaw);
    
    // Check if payment is at pickup (handle various formats)
    const isPickupPayment = payFrom.includes("pickup") || payFrom === "pickup";
    const isDropPayment = payFrom.includes("drop") || payFrom === "drop";
    
    // FIRST CHECK: If payment is at pickup, go to PaymentScreen first
    if (isPickupPayment) {
      console.log("✅ Payment at PICKUP detected - Navigating to PaymentScreen FIRST");
      navigation.navigate("PaymentScreen", { order });
    } 
    // SECOND CHECK: If payment is at drop location, go directly to MapProgress
    else if (isDropPayment) {
      console.log("✅ Payment at DROP detected - Navigating directly to MapProgress (payment after delivery)");
      navigation.navigate("mapProgress", { order });
    } 
    // FALLBACK: Default behavior for unknown values (treat as drop payment)
    else {
      console.log("⚠️ Unknown payFrom value - Defaulting to DROP payment flow");
      console.log(`⚠️ PayFrom value was: "${payFromRaw}"`);
      navigation.navigate("mapProgress", { order });
    }
  };

  // Helper to call a number
  const handleCall = (number) => {
    if (!number) return;
    Linking.openURL(`tel:${number}`);
  };

  // Helper to open external map navigation to pickup location  
  const handleMap = (address, latitude, longitude, isDropLocation = false) => {
    console.log("🗺️ [NEW] Location button pressed - Opening external map navigation to pickup location");
    
    // Use pickup location coordinates
    const pickupLat = order?.from?.latitude || order?.fromAddress?.latitude || latitude;
    const pickupLng = order?.from?.longitude || order?.fromAddress?.longitude || longitude;
    
    if (!pickupLat || !pickupLng) {
      console.error("❌ No pickup coordinates available");
      Alert.alert("Error", "Pickup location coordinates not available");
      return;
    }

    console.log(`📍 Using pickup coordinates: ${pickupLat}, ${pickupLng}`);

    // Open external map navigation (same logic as MapProgress handleMapNavigate)
    let url = "";
    if (Platform.OS === "ios") {
      // iOS - Open Apple Maps with navigation
      url = `http://maps.apple.com/?daddr=${pickupLat},${pickupLng}`;
    } else if (Platform.OS === "android") {
      // Android - Open Google Maps with navigation
      url = `google.navigation:q=${pickupLat},${pickupLng}`;
    } else {
      // Fallback - Open Google Maps web
      url = `https://www.google.com/maps/dir/?api=1&destination=${pickupLat},${pickupLng}`;
    }

    console.log(`📱 Opening external map with URL: ${url}`);
    Linking.openURL(url).catch((error) => {
      console.error("❌ Error opening external map:", error);
      Alert.alert("Error", "Unable to open map navigation. Please ensure you have a maps app installed.");
    });
  };

  // Decode Google's encoded polyline format (same as MapProgress.js)
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

  // Generate beautiful curved polyline between two points with extreme curve for visibility
  const generateCurvedRoute = (from, to, numPoints = 150) => {
    if (!from || !to || !from.latitude || !from.longitude || !to.latitude || !to.longitude) {
      return [];
    }
    
    const curvePoints = [];
    const latDiff = to.latitude - from.latitude;
    const lngDiff = to.longitude - from.longitude;
    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
    
    // EXTREME curve intensity - make it super visible
    const curveIntensity = Math.max(distance * 0.3, 0.005); // Perpendicular offset
    
    // Calculate perpendicular direction (rotate 90 degrees)
    const perpLat = -lngDiff;
    const perpLng = latDiff;
    const perpLength = Math.sqrt(perpLat * perpLat + perpLng * perpLng);
    
    // Normalize perpendicular vector
    const normPerpLat = perpLength > 0 ? perpLat / perpLength : 0;
    const normPerpLng = perpLength > 0 ? perpLng / perpLength : 0;
    
    // Create control points with strong perpendicular offset for visible arc
    const control1Lat = from.latitude + latDiff * 0.25 + normPerpLat * curveIntensity * 0.8;
    const control1Lng = from.longitude + lngDiff * 0.25 + normPerpLng * curveIntensity * 0.8;
    
    const control2Lat = from.latitude + latDiff * 0.75 + normPerpLat * curveIntensity * 0.8;
    const control2Lng = from.longitude + lngDiff * 0.75 + normPerpLng * curveIntensity * 0.8;
    
    // Generate smooth cubic bezier curve with many points
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const u = 1 - t;
      
      // Cubic Bezier curve formula
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
    
    return curvePoints;
  };

  // Improved route fetching with proper Google Directions API (matching MapProgress.js)
  const fetchRouteFromCurrentLocation = async (origin, destination) => {
    try {
      if (!origin || !destination) {
        return;
      }
      const originStr = `${origin.latitude},${origin.longitude}`;
      const destStr = `${destination.latitude},${destination.longitude}`;
      const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destStr}&key=${GOOGLE_MAPS_APIKEY}&mode=driving&alternatives=false`;
      const response = await fetch(directionsUrl);
      const data = await response.json();
      if (data.status === "OK" && data.routes.length > 0) {
        const route = data.routes[0];
        if (route.overview_polyline?.points) {
          const points = decodePolyline(route.overview_polyline.points);
          setRouteCoordinates(points);
          if (mapRef.current && points.length > 0) {
            setTimeout(() => {
              mapRef.current.fitToCoordinates([origin, destination], {
                edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
                animated: true,
              });
            }, 500);
          }
          return;
        }
      }
      setRouteCoordinates([]);
    } catch (error) {
      setRouteCoordinates([]);
    }
  };



  // Calculate initial region - Use current location ONLY to render map immediately
  const getInitialRegion = () => {
    // ALWAYS use current location if available (rider's GPS location)
    if (currentLocation && currentLocation.latitude && currentLocation.longitude) {
      return {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
    }

    // Default: Bangalore, India (only while waiting for GPS)
    return {
      latitude: 12.9716,
      longitude: 77.5946,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
  };

  // Don't need separate animation effect, region prop handles it

  // Initial route setup - will be handled by location effect above

  // Stable route updates - only when location changes significantly
  const lastRouteUpdate = useRef({ locationKey: '', lastUpdate: 0 });
  
  useEffect(() => {
    if (!currentLocation) return;
    
    const pickupLat = order?.from?.latitude || order?.fromAddress?.latitude;
    const pickupLng = order?.from?.longitude || order?.fromAddress?.longitude;
    
    if (pickupLat && pickupLng) {
      // Create a stable location key to prevent constant updates
      // Round to ~10 meter precision to reduce unnecessary updates
      const locationKey = `${Math.round(currentLocation.latitude * 1000)}_${Math.round(currentLocation.longitude * 1000)}`;
      
      // Throttle updates: minimum 10 seconds between route recalculations
      const now = Date.now();
      const timeSinceLastUpdate = now - lastRouteUpdate.current.lastUpdate;
      
      // Only update if location changed significantly AND enough time passed
      if (lastRouteUpdate.current.locationKey !== locationKey && timeSinceLastUpdate > 10000) {
        // Calculate distance
        const distance = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          pickupLat,
          pickupLng
        );
        setDistanceToPickup(distance);
        
        const pickup = {
          latitude: pickupLat,
          longitude: pickupLng
        };
        
        // Update route using new advanced function
        fetchRouteFromCurrentLocation(currentLocation, pickup);
        
        // Update ref to prevent unnecessary re-renders
        lastRouteUpdate.current = { locationKey, lastUpdate: now };
      }
    }
  }, [currentLocation?.latitude, currentLocation?.longitude, order]);

  useEffect(() => {
    let intervalId = null;
    let riderId = null;

    const startLocationUpdates = async () => {
      try {
        // Get rider info and token
        const riderData = await getRiderByPhone();
        riderId = riderData?._id || riderData?.id || riderData?.rider?._id;
        const token = await AsyncStorage.getItem("token");

        if (!riderId) {
          console.log("⚠️ No rider ID, but continuing with location updates");
        }
        
        // Get initial location
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const newLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setCurrentLocation(newLocation);
        console.log("📍 Initial location for live tracking:", newLocation);

        // Don't touch WebSocket here - GlobalOrderManager manages it globally
        // Just use the existing connection for location updates
        console.log("[OrderDetails] ✅ Using GlobalOrderManager's WebSocket connection");
        console.log("[OrderDetails] 📡 WebSocket status:", webSocketService.isConnected ? 'Connected' : 'Disconnected');

        // Start sending location every 6 seconds (reduced frequency to prevent unnecessary updates)
        intervalId = setInterval(async () => {
          try {
            let { coords } = await Location.getCurrentPositionAsync({});
            
            // Always send to WebSocket for accurate tracking
            webSocketService.sendLocationUpdate({
              latitude: coords.latitude,
              longitude: coords.longitude,
              accuracy: coords.accuracy,
              speed: coords.speed,
              heading: coords.heading,
              timestamp: Date.now(),
              timestampISO: new Date().toISOString(),
            });
            
            // Only update UI if location changed significantly (>10 meters)
            if (currentLocation) {
              const distance = calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                coords.latitude,
                coords.longitude
              );
              
              // Update UI only if moved more than 10 meters (prevents constant re-renders)
              if (distance > 0.01) { // 0.01 km = 10 meters
                setCurrentLocation({
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                });
              }
            } else {
              // First location update
              setCurrentLocation({
                latitude: coords.latitude,
                longitude: coords.longitude,
              });
            }
          } catch (err) {
            console.log(err, "error rider socket");
          }
        }, 6000);

        setLocationInterval(intervalId);
      } catch (err) {
        console.error("Error starting location updates:", err);
      }
    };

    startLocationUpdates();

    return () => {
      if (intervalId) clearInterval(intervalId);
      // Don't disconnect WebSocket here - GlobalOrderManager manages it globally
      // It should remain connected even when navigating away from OrderDetailsScreen
      console.log("[OrderDetails] 🧹 Stopping location updates but keeping WebSocket connected");
      setLocationInterval(null);
      // Reset initialization flag for next mount
      isInitialized.current = false;
      isMounted = false;
      isMountedRef.current = false;
      console.log("🧹 OrderDetailsScreen cleanup: component unmounted");
    };
  }, []);

  // Camera permission handler
  const requestCameraPermission = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Camera Permission Required",
          "Ridodrop Partner needs camera access to capture delivery proof photos. Please enable camera permission in your device settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }}
          ]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error("❌ Permission error:", error);
      Alert.alert("Error", "Failed to request camera permission. Please try again.");
      return false;
    }
  };

  // Handle image capture for pickup location
  const handleImageCapture = async () => {
    // Check if component is mounted
    if (!isMountedRef.current) {
      console.log("⚠️ Component unmounted, canceling camera operation");
      return;
    }

    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;
    
    // Check again after async permission request
    if (!isMountedRef.current) {
      console.log("⚠️ Component unmounted during permission request");
      return;
    }

    try {
      console.log("📷 Launching camera...");
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        allowsMultipleSelection: false,
        quality: 0.6,
        exif: false,
      });
      
      // Check if component is still mounted after camera operation
      if (!isMountedRef.current) {
        console.log("⚠️ Component unmounted during camera operation");
        return;
      }

      console.log("📷 Camera result:", JSON.stringify(result, null, 2));

      if (!result.canceled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log("✅ Image captured:", imageUri);
        
        // Only update state if component is still mounted
        if (isMountedRef.current) {
          setCapturedImages((prev) => [...prev, imageUri]);
        }
        
        // Auto-upload image immediately
        const bookingId = order._id || order.bookingId;
        console.log("📦 Booking ID:", bookingId);
        
        if (bookingId) {
          try {
            console.log("🚀 Starting auto-upload...");
            await uploadPickupImage(bookingId, imageUri);
            
            // Only show alert if component is still mounted
            if (isMountedRef.current) {
              Alert.alert("Success", "Pickup image uploaded successfully!");
            }
          } catch (err) {
            console.error("❌ Upload failed:", err);
            if (isMountedRef.current) {
              Alert.alert("Upload Failed", err.message || "Could not upload image to server.");
            }
          }
        } else {
          console.error("❌ No booking ID found");
          if (isMountedRef.current) {
            Alert.alert("Error", "Booking not found. Cannot upload image.");
          }
        }
      } else {
        console.log("📷 Camera cancelled or no image captured");
      }
    } catch (error) {
      console.error("❌ Camera error:", error);
      if (isMountedRef.current) {
        const errorMessage = error.message?.includes('permission')
          ? "Camera permission was denied. Please enable it in settings."
          : "Failed to capture image. Please try again.";
        Alert.alert("Camera Error", errorMessage);
      }
    }
  };

  // Upload pickup image to backend
  const uploadPickupImage = async (bookingId, imageUri) => {
    console.log("📸 Starting upload for booking:", bookingId, "URI:", imageUri);
    
    if (!isMountedRef.current) {
      console.log("⚠️ Component unmounted, canceling upload");
      return;
    }
    
    let fileName = "photo.jpg";
    let fileType = "image/jpeg";
    
    if (imageUri) {
      const uriParts = imageUri.split("/");
      const lastPart = uriParts[uriParts.length - 1];
      if (lastPart && lastPart.includes(".")) {
        fileName = lastPart;
        const ext = lastPart.split(".").pop()?.toLowerCase();
        if (ext === "png") fileType = "image/png";
        else if (ext === "jpg" || ext === "jpeg") fileType = "image/jpeg";
      }
    }
    
    // Properly handle URI for both platforms
    let processedUri = imageUri;
    if (Platform.OS === 'ios' && imageUri.startsWith('file://')) {
      processedUri = imageUri;
    } else if (Platform.OS === 'android' && !imageUri.startsWith('file://')) {
      processedUri = imageUri;
    }

    const formData = new FormData();
    formData.append("image", {
      uri: processedUri,
      name: fileName,
      type: fileType,
    });

    try {
      const uploadUrl = API_CONFIG.getUploadEndpoint(`upload-pickup-image/${bookingId}`);
      console.log("📤 Uploading to:", uploadUrl);
      console.log("📦 FormData:", { uri: processedUri, name: fileName, type: fileType });
      
      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
          // DO NOT set Content-Type - let fetch handle it automatically for FormData
        },
      });
      
      if (!isMountedRef.current) {
        console.log("⚠️ Component unmounted, ignoring upload response");
        return;
      }
      
      console.log("📥 Response status:", response.status);
      const data = await response.json();
      console.log("📄 Response data:", data);

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (data && data.success && (data.imagePath || data.imageData)) {
        const imageUrl = data.imagePath || data.imageData?.url;
        console.log("✅ Pickup image uploaded to Cloudinary:", imageUrl);
        
        const sizeInfo = data.cloudinaryResult ? 
          ` (${Math.round(data.cloudinaryResult.bytes / 1024)}KB)` : '';
        
        if (isMountedRef.current) {
          Alert.alert(
            "✅ Pickup Image Uploaded", 
            `Pickup image uploaded successfully to cloud storage!${sizeInfo}`
          );
        }
      } else {
        if (isMountedRef.current) {
          Alert.alert("Error", data.message || "Failed to upload image");
        }
      }
      return data;
    } catch (error) {
      console.log("Upload error:", error);
      
      let errorMessage = "Failed to upload image";
      if (error.name === 'NetworkError' || error.message.includes('fetch')) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert("Upload Error", errorMessage);
      throw error;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Order ID Section - At the top */}
        <View style={styles.orderIdCardTop}>
          <Text style={styles.orderIdLabel}>Order ID:</Text>
          <Text style={styles.orderIdValue}>
            #{order.bookingId || order._id || "N/A"}
          </Text>
        </View>

      {/* Map Section - Fill remaining space */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={getInitialRegion()}
          onMapReady={() => {
            console.log("🗺️ Map is ready");
            setMapReady(true);
          }}
          loadingEnabled={true}
          loadingIndicatorColor="#EC4D4A"
          loadingBackgroundColor="#f5f5f5"
          minZoomLevel={12}
          maxZoomLevel={18}
          zoomEnabled={true}
          scrollEnabled={true}
          pitchEnabled={false}
          rotateEnabled={false}
        >
          {/* Real-Time Current Location Marker */}
          {currentLocation && currentLocation.latitude && currentLocation.longitude && (
            <Marker
              coordinate={currentLocation}
              identifier="currentLocationMarker"
              title="Your Current Location"
              description="You are here"
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <Image
                source={require('../assets/rider.png')}
                style={{ width: 40, height: 40 }}
                resizeMode="contain"
              />
            </Marker>
          )}

          {/* Pickup Location Marker */}
          {((order?.from?.latitude && order?.from?.longitude) || 
            (order?.fromAddress?.latitude && order?.fromAddress?.longitude)) && (
            <Marker
              coordinate={{
                latitude: parseFloat(order.from?.latitude || order.fromAddress?.latitude),
                longitude: parseFloat(order.from?.longitude || order.fromAddress?.longitude)
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


          {/* Polyline rendering logic (matches MapProgress.js) */}
          {(() => {
            const hasGoogleRoute = routeCoordinates && routeCoordinates.length > 2;
            const hasCurrentLocation = currentLocation && currentLocation.latitude && currentLocation.longitude;
            const hasPickupLocation = pickup && pickup.latitude && pickup.longitude;
            const shouldShowFallback = hasCurrentLocation && hasPickupLocation && (!routeCoordinates || routeCoordinates.length < 3);
            if (hasGoogleRoute) {
              return (
                <Polyline
                  key="google-directions-route"
                  coordinates={routeCoordinates}
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
              );
            } else if (shouldShowFallback) {
              const from = { latitude: Number(currentLocation.latitude), longitude: Number(currentLocation.longitude) };
              const to = { latitude: Number(pickup.latitude), longitude: Number(pickup.longitude) };
              const curvedPoints = generateCurvedRoute(from, to, 150);
              if (curvedPoints.length < 3) {
                return null;
              }
              return (
                <Polyline
                  key={`curved-fallback-${currentLocation.latitude}-${currentLocation.longitude}`}
                  coordinates={curvedPoints}
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
              );
            }
            return null;
          })()}
        </MapView>

        {/* Locate Me Button */}
        <TouchableOpacity
          style={styles.locateMeButton}
          onPress={() => {
            if (currentLocation && currentLocation.latitude && currentLocation.longitude && mapRef.current) {
              mapRef.current.animateToRegion({
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }, 1000);
            } else {
              console.log("⚠️ Cannot locate: currentLocation not available", currentLocation);
            }
          }}
        >
          <Ionicons name="locate" size={24} color="#666" />
        </TouchableOpacity>

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
                  <Text style={styles.customerName}>
                    👤{" "}
                    {order.from?.receiverName ||
                      order.fromAddress?.receiverName ||
                      order.customer?.name ||
                      "Customer Name"}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.menuButton}
                  onPress={() => navigation.navigate("OrderMenuScreen", { order })}
                >
                  <Ionicons name="menu" size={24} color="#EC4D4A" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.customerAddress}>
                📍{" "}
                {order.from?.address ||
                  order.fromAddress?.address ||
                  order.pickup ||
                  "Pickup address not available"}
              </Text>
              {order.from?.house || order.fromAddress?.house ? (
                <Text style={styles.customerHouse}>
                  🏠 {order.from?.house || order.fromAddress?.house}
                </Text>
              ) : null}
              
              {/* Distance to Pickup Indicator */}
              {distanceToPickup !== null && (
                <View style={styles.distanceIndicator}>
                  <Ionicons 
                    name="navigate" 
                    size={16} 
                    color={distanceToPickup <= PROXIMITY_THRESHOLD ? "#4CAF50" : "#EC4D4A"} 
                  />
                  <Text style={[
                    styles.distanceText,
                    distanceToPickup <= PROXIMITY_THRESHOLD && styles.distanceTextNear
                  ]}>
                    {distanceToPickup < 1 
                      ? `${(distanceToPickup * 1000).toFixed(0)}m away`
                      : `${distanceToPickup.toFixed(2)}km away`
                    }
                    {distanceToPickup <= PROXIMITY_THRESHOLD && " ✓ Close enough"}
                  </Text>
                </View>
              )}
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={styles.actionButtonWithText}
                  onPress={() =>
                    handleCall(
                      order.from?.receiverMobile ||
                        order.fromAddress?.receiverMobile ||
                        order.customer?.phone
                    )
                  }
                >
                  <Ionicons name="call" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButtonWithText}
                  onPress={() => {
                    console.log("🗺️ Location button pressed - Opening external Google Maps navigation");
                    
                    // Get pickup coordinates
                    const pickupLat = order?.from?.latitude || order?.fromAddress?.latitude;
                    const pickupLng = order?.from?.longitude || order?.fromAddress?.longitude;
                    
                    if (!pickupLat || !pickupLng) {
                      console.error("❌ No pickup coordinates available");
                      Alert.alert("Error", "Pickup location coordinates not available");
                      return;
                    }

                    console.log(`📍 Opening navigation to: ${pickupLat}, ${pickupLng}`);

                    // Open external map navigation
                    let url = "";
                    if (Platform.OS === "ios") {
                      url = `http://maps.apple.com/?daddr=${pickupLat},${pickupLng}`;
                    } else if (Platform.OS === "android") {
                      url = `google.navigation:q=${pickupLat},${pickupLng}`;
                    } else {
                      url = `https://www.google.com/maps/dir/?api=1&destination=${pickupLat},${pickupLng}`;
                    }

                    console.log(`📱 Opening: ${url}`);
                    Linking.openURL(url).catch((error) => {
                      console.error("❌ Error opening map:", error);
                      Alert.alert("Error", "Unable to open map navigation");
                    });
                  }}
                >
                  <Ionicons name="location" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Location</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButtonWithText}
                  onPress={handleImageCapture}
                >
                  <Ionicons name="image" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Upload</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButtonWithText}>
                  <Ionicons name="chatbox" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Message</Text>
                </TouchableOpacity>
              </View>
              
              {/* Slide to Subscribe Button */}
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
                      Reached Pick Up Location
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
                    <Ionicons name="chevron-forward" size={24} color="#EC4D4A" />
                    <Ionicons name="chevron-forward" size={24} color="#EC4D4A" style={styles.doubleArrow} />
                  </View>
                </Animated.View>
              </View>
            </View>
          </View>
        </View>
      </View>
      </View>
    </SafeAreaView>
  );
};const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
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
  locateMeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  bottomCardContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
  },
  contentContainer: {
    flex: 1,
    padding: 0,
  },
  currentLocationMarker: {
    backgroundColor: "#E8F5E8",
    borderRadius: 20,
    padding: 8,
    elevation: 6,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: "#4CAF50",
  },
  pickupMarker: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 8,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
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
  dropMarker: {
    alignItems: "center",
    justifyContent: "center",
  },
  mapLoadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  mapLoadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#EC4D4A",
    fontWeight: "600",
  },
  orderIdCardTop: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 8 : 8,
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
  orderIdCardCentered: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#EC4D4A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
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
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    shadowColor: "#EC4D4A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "600",
  },
  statusText: {
    color: "#EC4D4A",
    textTransform: "capitalize",
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
  testButton: {
    padding: 4,
    marginLeft: 8,
  },
  paymentButtonSmall: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "#4CAF50",
    gap: 4,
  },
  paymentButtonSmallText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "700",
  },
  paymentButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EC4D4A",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  paymentButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "700",
  },
  phoneContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EC4D4A",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  phoneText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
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
  iconButton: {
    backgroundColor: "#EC4D4A",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    elevation: 2,
  },
  customerPhone: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 2,
    fontWeight: "500",
  },
  customerHouse: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
    marginBottom: 8,
  },
  distanceIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f9ff",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e0e7ff",
  },
  distanceText: {
    fontSize: 13,
    color: "#EC4D4A",
    fontWeight: "600",
    marginLeft: 6,
  },
  distanceTextNear: {
    color: "#4CAF50",
  },
  actionSection: {
    marginBottom: 16,
  },
  endTripCard: {
    backgroundColor: "#EC4D4A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  estimateCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    shadowColor: "#EC4D4A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  estimateLabel: {
    fontSize: 15,
    color: "#EC4D4A",
    fontWeight: "600",
    marginRight: 6,
  },
  estimateValue: {
    fontSize: 15,
    color: "#1f2937",
    fontWeight: "600",
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
  swipeButtonContainer: {
    marginTop: 16,
    width: "100%",
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
    fontSize: 18,
    color: "#fff",
    fontWeight: "600",
    letterSpacing: 0.5,
    zIndex: 2,
    flex: 1,
    textAlign: "center",
  },
  arrowContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    right: 90,
    zIndex: 2,
  },
  arrow1: {
    marginRight: -8,
  },
  arrow2: {
    marginLeft: -4,
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
  swipeButton: {
    backgroundColor: "#2563EB",
    borderRadius: 50,
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingLeft: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    minHeight: 56,
  },
  swipeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1E40AF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginLeft: 4,
  },
  swipeButtonText: {
    fontSize: 17,
    color: "#fff",
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
    marginRight: 16,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  locationIcon: {
    marginRight: 8,
  },
  locationType: {
    fontSize: 15,
    color: "#EC4D4A",
    fontWeight: "700",
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
  locationActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionButton: {
    backgroundColor: "#EC4D4A",
    borderRadius: 8,
    padding: 10,
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  cancelSection: {
    marginTop: 18,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    shadowColor: "#EC4D4A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  fullWidthButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EC4D4A",
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 0,
    marginTop: 0,
    width: "100%",
    alignSelf: "center",
    elevation: 2,
  },
  fullWidthButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  reasonTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#EC4D4A",
    marginBottom: 10,
    marginTop: 6,
  },
  reasonsList: {
    gap: 10,
  },
  reasonItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#eee",
  },
  reasonItemSelected: {
    backgroundColor: "#FEF2F2",
    borderColor: "#EC4D4A",
  },
  reasonText: {
    fontSize: 14,
    color: "#1f2937",
  },
  reasonTextSelected: {
    color: "#EC4D4A",
    fontWeight: "700",
  },
  otherReasonInput: {
    borderWidth: 1,
    borderColor: "#EC4D4A",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    marginBottom: 8,
    minHeight: 40,
    fontSize: 14,
    backgroundColor: "#fff",
    color: "#1f2937",
  },
  supportOptionsContainer: {
    marginBottom: 10,
    marginTop: 0,
  },
  supportOptionButton: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#EC4D4A",
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 8,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    alignSelf: "center",
    elevation: 2,
  },
  supportOptionText: {
    color: "#EC4D4A",
    fontWeight: "700",
    fontSize: 15,
  },
  progressCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EC4D4A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  progressCardText: {
    fontSize: 16,
    color: "#EC4D4A",
    fontWeight: "700",
  },
  endTripText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "700",
  },
});

export default OrderDetailsScreen;