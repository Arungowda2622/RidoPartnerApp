/**
 * RiderLocationManager - Centralized location tracking for the entire app
 * 
 * This singleton manages the rider's current GPS location and provides it
 * to any component in the app. It updates location every 45 seconds when
 * the rider is online and sends updates to the backend via WebSocket.
 * 
 * Usage:
 *   import riderLocationManager from './utils/RiderLocationManager';
 *   const location = riderLocationManager.getCurrentLocation();
 *   console.log(location); // { latitude, longitude, accuracy, timestamp, address }
 */

import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import webSocketService from './WebSocketService';

class RiderLocationManager {
  constructor() {
    this.currentLocation = null;
    this.currentAddress = null;
    this.trackingInterval = null;
    this.isTracking = false;
    this.listeners = new Set(); // Components listening for location updates
    this.lastUpdateTime = null;
    this.TRACKING_INTERVAL = 45000; // 45 seconds
    this.ADDRESS_CACHE_DURATION = 300000; // 5 minutes
    this.lastAddressUpdate = null;
  }

  /**
   * Get the current cached location (synchronous)
   * @returns {Object|null} { latitude, longitude, accuracy, timestamp, speed, heading }
   */
  getCurrentLocation() {
    return this.currentLocation;
  }

  /**
   * Get the current cached address (synchronous)
   * @returns {string|null} Formatted address string
   */
  getCurrentAddress() {
    return this.currentAddress;
  }

  /**
   * Get both location and address (synchronous)
   * @returns {Object|null} { location, address }
   */
  getLocationData() {
    return {
      location: this.currentLocation,
      address: this.currentAddress,
      lastUpdate: this.lastUpdateTime
    };
  }

  /**
   * Fetch fresh location from GPS (async)
   * @param {boolean} skipWebSocket - Don't send to backend (default: false)
   * @returns {Promise<Object|null>} Location object or null if failed
   */
  async fetchLocation(skipWebSocket = false) {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('[LocationManager] ❌ Location permission denied');
        return null;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        speed: location.coords.speed,
        heading: location.coords.heading,
        timestamp: location.timestamp,
        timestampISO: new Date(location.timestamp).toISOString(),
      };

      // Update internal cache
      this.currentLocation = locationData;
      this.lastUpdateTime = Date.now();

      console.log('[LocationManager] 📍 Location updated:', 
        locationData.latitude.toFixed(6), 
        locationData.longitude.toFixed(6)
      );

      // Fetch address if cache is stale (only every 5 minutes)
      const shouldUpdateAddress = !this.lastAddressUpdate || 
        (Date.now() - this.lastAddressUpdate) > this.ADDRESS_CACHE_DURATION;
      
      if (shouldUpdateAddress) {
        this.fetchAddress(locationData.latitude, locationData.longitude);
      }

      // Send to backend via WebSocket (unless explicitly skipped)
      if (!skipWebSocket && webSocketService.isConnected) {
        const sent = webSocketService.sendLocationUpdate(locationData);
        if (sent) {
          console.log('[LocationManager] 📤 Location sent to backend');
        }
      }

      // Notify all listeners
      this.notifyListeners(locationData);

      return locationData;
    } catch (error) {
      console.error('[LocationManager] ❌ Error fetching location:', error.message);
      return null;
    }
  }

  /**
   * Fetch address from coordinates (async, cached)
   * @param {number} latitude
   * @param {number} longitude
   */
  async fetchAddress(latitude, longitude) {
    try {
      let [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (address) {
        this.currentAddress = `${address.name || ''} ${address.street || ''}, ${address.city || ''}, ${address.region || ''}`.trim();
        this.lastAddressUpdate = Date.now();
        console.log('[LocationManager] 🏠 Address updated:', this.currentAddress);
        this.notifyListeners(this.currentLocation);
      }
    } catch (error) {
      console.error('[LocationManager] ❌ Error fetching address:', error.message);
    }
  }

  /**
   * Start continuous location tracking (every 45 seconds)
   * Automatically sends updates to backend via WebSocket
   */
  async startTracking() {
    if (this.isTracking) {
      console.log('[LocationManager] ⚠️ Already tracking');
      return;
    }

    console.log('[LocationManager] 🟢 Starting location tracking...');
    this.isTracking = true;

    // Fetch location immediately
    await this.fetchLocation();

    // Then update every 45 seconds
    this.trackingInterval = setInterval(async () => {
      await this.fetchLocation();
    }, this.TRACKING_INTERVAL);

    console.log('[LocationManager] ✅ Tracking started (45s interval)');
  }

  /**
   * Stop continuous location tracking
   */
  stopTracking() {
    if (!this.isTracking) {
      console.log('[LocationManager] ⚠️ Not tracking');
      return;
    }

    console.log('[LocationManager] 🔴 Stopping location tracking...');
    
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }

    this.isTracking = false;
    console.log('[LocationManager] ✅ Tracking stopped');
  }

  /**
   * Check if currently tracking
   * @returns {boolean}
   */
  isCurrentlyTracking() {
    return this.isTracking;
  }

  /**
   * Register a listener for location updates
   * @param {Function} callback - Called with (locationData) when location updates
   * @returns {Function} Cleanup function to remove listener
   */
  addListener(callback) {
    this.listeners.add(callback);
    console.log(`[LocationManager] 👂 Listener added (${this.listeners.size} total)`);
    
    // Return cleanup function
    return () => {
      this.listeners.delete(callback);
      console.log(`[LocationManager] 🔕 Listener removed (${this.listeners.size} remaining)`);
    };
  }

  /**
   * Notify all listeners of location update
   * @private
   */
  notifyListeners(locationData) {
    this.listeners.forEach(callback => {
      try {
        callback(locationData);
      } catch (error) {
        console.error('[LocationManager] ❌ Listener error:', error);
      }
    });
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.currentLocation = null;
    this.currentAddress = null;
    this.lastUpdateTime = null;
    this.lastAddressUpdate = null;
    console.log('[LocationManager] 🗑️ Cache cleared');
  }

  /**
   * Get location age in seconds
   * @returns {number|null} Seconds since last update
   */
  getLocationAge() {
    if (!this.lastUpdateTime) return null;
    return Math.floor((Date.now() - this.lastUpdateTime) / 1000);
  }

  /**
   * Check if cached location is still valid (< 5 minutes old)
   * @returns {boolean}
   */
  isLocationValid() {
    if (!this.currentLocation || !this.lastUpdateTime) return false;
    return (Date.now() - this.lastUpdateTime) < 300000; // 5 minutes
  }
}

// Export singleton instance
const riderLocationManager = new RiderLocationManager();
export default riderLocationManager;
