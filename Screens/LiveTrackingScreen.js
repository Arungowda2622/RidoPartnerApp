import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
  Dimensions,
  StatusBar,
} from "react-native";
import { MaterialIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LiveMapView from "../components/LiveMapView";
import locationTracker from "../utils/LocationTracker";
import webSocketService from "../utils/WebSocketService";
import { getRiderByPhone } from "../utils/AuthApi";

const { width, height } = Dimensions.get("window");

const LiveTrackingScreen = () => {
  const navigation = useNavigation();
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState(false);
  const [riderData, setRiderData] = useState(null);
  const [showRoute, setShowRoute] = useState(true);
  const [followRider, setFollowRider] = useState(true);
  const [trackingStats, setTrackingStats] = useState({
    totalDistance: 0,
    currentSpeed: 0,
    averageSpeed: 0,
    trackingTime: 0,
  });

  useEffect(() => {
    initializeTracking();
    return () => {
      cleanup();
    };
  }, []);

  const initializeTracking = async () => {
    try {
      // Get rider data
      const rider = await getRiderByPhone();
      setRiderData(rider);

      // Check if WebSocket is already connected (managed by GlobalOrderManager)
      const serverUrl = API_CONFIG.WS_URL;
      
      if (!webSocketService.isConnected) {
        console.log('[LiveTracking] WebSocket not connected, initializing...');
        const success = await webSocketService.initialize(
          serverUrl,
          rider?._id || "rider-id"
        );
        if (!success) {
          console.log('[LiveTracking] ❌ Failed to connect WebSocket');
        }
      } else {
        console.log('[LiveTracking] ✅ Using existing WebSocket connection');
      }

      if (webSocketService.isConnected) {
        webSocketService.setConnectionChangeCallback((connected) => {
          setConnectionStatus(connected);
        });

        webSocketService.setMessageCallback((message) => {
          handleWebSocketMessage(message);
        });
      }

      // Initialize location tracker
      await locationTracker.initialize();

      // Start tracking
      await startTracking();
    } catch (error) {
      console.error("Failed to initialize tracking:", error);
      Alert.alert("Error", "Failed to initialize tracking system");
    }
  };

  const startTracking = async () => {
    try {
      const success = await locationTracker.startTracking(handleLocationUpdate);
      if (success) {
        setIsTracking(true);
        webSocketService.sendStatusUpdate("online");
      }
    } catch (error) {
      console.error("Failed to start tracking:", error);
    }
  };

  const stopTracking = async () => {
    try {
      await locationTracker.stopTracking();
      setIsTracking(false);
      webSocketService.sendStatusUpdate("offline");
    } catch (error) {
      console.error("Failed to stop tracking:", error);
    }
  };

  const handleLocationUpdate = (locationData) => {
    setCurrentLocation(locationData);

    // Update location history
    setLocationHistory((prev) => [...prev, locationData]);

    // Calculate tracking stats
    updateTrackingStats(locationData);
  };

  const updateTrackingStats = (newLocation) => {
    if (locationHistory.length > 0) {
      const lastLocation = locationHistory[locationHistory.length - 1];
      const distance = locationTracker.constructor.calculateDistance(
        lastLocation.latitude,
        lastLocation.longitude,
        newLocation.latitude,
        newLocation.longitude
      );

      setTrackingStats((prev) => ({
        totalDistance: prev.totalDistance + distance,
        currentSpeed: newLocation.speed || 0,
        averageSpeed: calculateAverageSpeed(),
        trackingTime:
          Date.now() - (locationHistory[0]?.timestamp || Date.now()),
      }));
    }
  };

  const calculateAverageSpeed = () => {
    if (locationHistory.length < 2) return 0;

    const speeds = locationHistory
      .map((loc) => loc.speed || 0)
      .filter((speed) => speed > 0);

    if (speeds.length === 0) return 0;

    return speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
  };

  const handleWebSocketMessage = (message) => {
    switch (message.type) {
      case "new_order":
        Alert.alert("New Order", "You have received a new order!");
        break;
      case "order_update":
        // Handle order updates
        break;
      default:
        console.log("Received message:", message);
    }
  };

  const cleanup = () => {
    stopTracking();
    // Don't disconnect WebSocket - GlobalOrderManager manages it globally
    console.log('[LiveTracking] 🧹 Cleanup: keeping WebSocket connected (managed by GlobalOrderManager)');
  };

  const toggleTracking = () => {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  const clearRoute = () => {
    setLocationHistory([]);
    setTrackingStats({
      totalDistance: 0,
      currentSpeed: 0,
      averageSpeed: 0,
      trackingTime: 0,
    });
  };

  const formatDistance = (distance) => {
    if (distance < 1) {
      return `${(distance * 1000).toFixed(0)}m`;
    }
    return `${distance.toFixed(2)}km`;
  };

  const formatSpeed = (speed) => {
    if (!speed) return "0 km/h";
    return `${(speed * 3.6).toFixed(1)} km/h`; // Convert m/s to km/h
  };

  const formatTime = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF6B35" />

      {/* Header */}
      <LinearGradient colors={["#FF6B35", "#FF8E53"]} style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Live Tracking</Text>
          <Text style={styles.headerSubtitle}>
            {riderData?.name || "Rider"} • {isTracking ? "Active" : "Inactive"}
          </Text>
        </View>

        <TouchableOpacity
          onPress={toggleTracking}
          style={[
            styles.trackingButton,
            { backgroundColor: isTracking ? "#4CAF50" : "#F44336" },
          ]}
        >
          <MaterialIcons
            name={isTracking ? "location-on" : "location-off"}
            size={20}
            color="white"
          />
        </TouchableOpacity>
      </LinearGradient>

      {/* Map View */}
      <View style={styles.mapContainer}>
        <LiveMapView
          showRoute={showRoute}
          followRider={followRider}
          onLocationUpdate={handleLocationUpdate}
          style={styles.map}
        />
      </View>

      {/* Controls Panel */}
      <View style={styles.controlsPanel}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.controlButton,
              { backgroundColor: showRoute ? "#4CAF50" : "#666" },
            ]}
            onPress={() => setShowRoute(!showRoute)}
          >
            <MaterialIcons name="timeline" size={20} color="white" />
            <Text style={styles.controlButtonText}>Route</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlButton,
              { backgroundColor: followRider ? "#4CAF50" : "#666" },
            ]}
            onPress={() => setFollowRider(!followRider)}
          >
            <MaterialIcons name="my-location" size={20} color="white" />
            <Text style={styles.controlButtonText}>Follow</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={clearRoute}>
            <MaterialIcons name="clear" size={20} color="white" />
            <Text style={styles.controlButtonText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlButton,
              { backgroundColor: connectionStatus ? "#4CAF50" : "#F44336" },
            ]}
            onPress={() =>
              Alert.alert(
                "Connection",
                `Status: ${connectionStatus ? "Connected" : "Disconnected"}`
              )
            }
          >
            <MaterialIcons name="wifi" size={20} color="white" />
            <Text style={styles.controlButtonText}>Network</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Stats Panel */}
      <View style={styles.statsPanel}>
        <View style={styles.statItem}>
          <FontAwesome5 name="route" size={16} color="#FF6B35" />
          <Text style={styles.statValue}>
            {formatDistance(trackingStats.totalDistance)}
          </Text>
          <Text style={styles.statLabel}>Distance</Text>
        </View>

        <View style={styles.statItem}>
          <FontAwesome5 name="tachometer-alt" size={16} color="#FF6B35" />
          <Text style={styles.statValue}>
            {formatSpeed(trackingStats.currentSpeed)}
          </Text>
          <Text style={styles.statLabel}>Speed</Text>
        </View>

        <View style={styles.statItem}>
          <FontAwesome5 name="clock" size={16} color="#FF6B35" />
          <Text style={styles.statValue}>
            {formatTime(trackingStats.trackingTime)}
          </Text>
          <Text style={styles.statLabel}>Time</Text>
        </View>

        <View style={styles.statItem}>
          <FontAwesome5 name="chart-line" size={16} color="#FF6B35" />
          <Text style={styles.statValue}>
            {formatSpeed(trackingStats.averageSpeed)}
          </Text>
          <Text style={styles.statLabel}>Avg Speed</Text>
        </View>
      </View>

      {/* Location Info */}
      {currentLocation && (
        <View style={styles.locationInfo}>
          <Text style={styles.locationText}>
            📍 {currentLocation.latitude.toFixed(6)},{" "}
            {currentLocation.longitude.toFixed(6)}
          </Text>
          <Text style={styles.locationText}>
            🎯 Accuracy: {currentLocation.accuracy?.toFixed(1)}m
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  trackingButton: {
    padding: 10,
    borderRadius: 20,
  },
  mapContainer: {
    flex: 1,
    margin: 10,
    borderRadius: 10,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  map: {
    flex: 1,
  },
  controlsPanel: {
    backgroundColor: "white",
    paddingVertical: 15,
    paddingHorizontal: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  controlButton: {
    backgroundColor: "#666",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  controlButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 5,
  },
  statsPanel: {
    backgroundColor: "white",
    flexDirection: "row",
    paddingVertical: 15,
    paddingHorizontal: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginTop: 5,
  },
  statLabel: {
    fontSize: 10,
    color: "#666",
    marginTop: 2,
  },
  locationInfo: {
    backgroundColor: "white",
    padding: 15,
    margin: 10,
    borderRadius: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  locationText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
});

export default LiveTrackingScreen;
