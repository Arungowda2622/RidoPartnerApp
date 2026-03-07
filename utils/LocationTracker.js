import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const LOCATION_TASK_NAME = 'background-location-task';
const LOCATION_HISTORY_KEY = 'location_history';
const MAX_HISTORY_ENTRIES = 1000;

class LocationTracker {
    constructor() {
        this.isTracking = false;
        this.locationSubscription = null;
        this.backgroundSubscription = null;
        this.onLocationUpdate = null;
        this.locationHistory = [];
        this.lastLocation = null;
        this.accuracy = Location.Accuracy.Balanced;
        this.distanceFilter = 10; // meters
        this.timeInterval = 5000; // 5 seconds
    }

    // Initialize the location tracker
    async initialize() {
        try {
            // Request permissions
            const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
            const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();

            if (foregroundStatus !== 'granted' || backgroundStatus !== 'granted') {
                throw new Error('Location permissions not granted');
            }

            // Enable location services
            await Location.enableNetworkProviderAsync();

            // Load location history from storage
            await this.loadLocationHistory();

            return true;
        } catch (error) {
            console.error('Failed to initialize location tracker:', error);
            return false;
        }
    }

    // Start real-time location tracking
    async startTracking(callback) {
        if (this.isTracking) return;

        try {
            this.onLocationUpdate = callback;
            this.isTracking = true;

            // Start foreground location updates
            this.locationSubscription = await Location.watchPositionAsync(
                {
                    accuracy: this.accuracy,
                    distanceInterval: this.distanceFilter,
                    timeInterval: this.timeInterval,
                    mayShowUserSettingsDialog: true,
                },
                this.handleLocationUpdate.bind(this)
            );

            // DISABLED FOR EXPO GO - Start background location updates
            // await this.startBackgroundTracking();

            console.log('Location tracking started (background tracking disabled for Expo Go)');
            return true;
        } catch (error) {
            console.error('Failed to start location tracking:', error);
            this.isTracking = false;
            return false;
        }
    }

    // Stop location tracking
    async stopTracking() {
        if (!this.isTracking) return;

        try {
            if (this.locationSubscription) {
                this.locationSubscription.remove();
                this.locationSubscription = null;
            }

            // DISABLED FOR EXPO GO - Stop background location updates
            // await this.stopBackgroundTracking();

            this.isTracking = false;
            this.onLocationUpdate = null;

            console.log('Location tracking stopped');
            return true;
        } catch (error) {
            console.error('Failed to stop location tracking:', error);
            return false;
        }
    }

    // Handle location updates
    async handleLocationUpdate(location) {
        const locationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            altitude: location.coords.altitude,
            heading: location.coords.heading,
            speed: location.coords.speed,
            timestamp: location.timestamp,
            timestampISO: new Date(location.timestamp).toISOString(),
        };

        // Update last location
        this.lastLocation = locationData;

        // Add to history
        this.addToHistory(locationData);

        // Call callback if provided
        if (this.onLocationUpdate) {
            this.onLocationUpdate(locationData);
        }

        // Save to storage periodically
        if (this.locationHistory.length % 10 === 0) {
            await this.saveLocationHistory();
        }
    }

    // Add location to history
    addToHistory(locationData) {
        this.locationHistory.push(locationData);

        // Keep only the last MAX_HISTORY_ENTRIES entries
        if (this.locationHistory.length > MAX_HISTORY_ENTRIES) {
            this.locationHistory = this.locationHistory.slice(-MAX_HISTORY_ENTRIES);
        }
    }

    // Get current location
    async getCurrentLocation() {
        try {
            const location = await Location.getCurrentPositionAsync({
                accuracy: this.accuracy,
            });

            return {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy: location.coords.accuracy,
                altitude: location.coords.altitude,
                heading: location.coords.heading,
                speed: location.coords.speed,
                timestamp: location.timestamp,
                timestampISO: new Date(location.timestamp).toISOString(),
            };
        } catch (error) {
            console.error('Failed to get current location:', error);
            return null;
        }
    }

    // Get location history
    getLocationHistory() {
        return [...this.locationHistory];
    }

    // Get last known location
    getLastLocation() {
        return this.lastLocation;
    }

    // Clear location history
    async clearLocationHistory() {
        this.locationHistory = [];
        await AsyncStorage.removeItem(LOCATION_HISTORY_KEY);
    }

    // Save location history to storage
    async saveLocationHistory() {
        try {
            await AsyncStorage.setItem(LOCATION_HISTORY_KEY, JSON.stringify(this.locationHistory));
        } catch (error) {
            console.error('Failed to save location history:', error);
        }
    }

    // Load location history from storage
    async loadLocationHistory() {
        try {
            const history = await AsyncStorage.getItem(LOCATION_HISTORY_KEY);
            if (history) {
                this.locationHistory = JSON.parse(history);
            }
        } catch (error) {
            console.error('Failed to load location history:', error);
            this.locationHistory = [];
        }
    }

    // Start background location tracking
    // DISABLED FOR EXPO GO - Background location is not supported in Expo Go
    async startBackgroundTracking() {
        console.log('Background tracking is disabled for Expo Go compatibility');
        return;
        /* COMMENTED OUT FOR EXPO GO
        try {
            // Define background task
            TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
                if (error) {
                    console.error('Background location task error:', error);
                    return;
                }

                if (data) {
                    const { locations } = data;
                    if (locations && locations.length > 0) {
                        const location = locations[0];
                        this.handleLocationUpdate(location);
                    }
                }
            });

            // Start background location updates
            await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                accuracy: this.accuracy,
                distanceInterval: this.distanceFilter,
                timeInterval: this.timeInterval,
                foregroundService: {
                    notificationTitle: 'RidoDrop Driver',
                    notificationBody: 'Tracking your location for deliveries',
                    notificationColor: '#FF6B35',
                },
                activityType: Location.ActivityType.AutomotiveNavigation,
                showsBackgroundLocationIndicator: true,
            });

            console.log('Background location tracking started');
        } catch (error) {
            console.error('Failed to start background tracking:', error);
        }
        */
    }

    // Stop background location tracking
    // DISABLED FOR EXPO GO - Background location is not supported in Expo Go
    async stopBackgroundTracking() {
        console.log('Background tracking stop is disabled for Expo Go compatibility');
        return;
        /* COMMENTED OUT FOR EXPO GO
        try {
            await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
            console.log('Background location tracking stopped');
        } catch (error) {
            console.error('Failed to stop background tracking:', error);
        }
        */
    }

    // Update tracking settings
    updateSettings({ accuracy, distanceFilter, timeInterval }) {
        if (accuracy) this.accuracy = accuracy;
        if (distanceFilter) this.distanceFilter = distanceFilter;
        if (timeInterval) this.timeInterval = timeInterval;
    }

    // Get tracking status
    getTrackingStatus() {
        return {
            isTracking: this.isTracking,
            hasLocation: !!this.lastLocation,
            historyCount: this.locationHistory.length,
            lastLocation: this.lastLocation,
        };
    }

    // Calculate distance between two points
    static calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // Distance in kilometers
        return distance;
    }

    static deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    // Calculate bearing between two points
    static calculateBearing(lat1, lon1, lat2, lon2) {
        const dLon = this.deg2rad(lon2 - lon1);
        const lat1Rad = this.deg2rad(lat1);
        const lat2Rad = this.deg2rad(lat2);

        const y = Math.sin(dLon) * Math.cos(lat2Rad);
        const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

        let bearing = Math.atan2(y, x);
        bearing = this.rad2deg(bearing);
        bearing = (bearing + 360) % 360;

        return bearing;
    }

    static rad2deg(rad) {
        return rad * (180 / Math.PI);
    }
}

// Create singleton instance
const locationTracker = new LocationTracker();

export default locationTracker; 