import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Platform,
    Alert,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import locationTracker from '../utils/LocationTracker';
import webSocketService from '../utils/WebSocketService';

const { width, height } = Dimensions.get('window');

const LiveMapView = ({
    showRoute = true,
    followRider = true,
    onLocationUpdate,
    initialRegion = null,
    style = {}
}) => {
    const [currentLocation, setCurrentLocation] = useState(null);
    const [routeCoordinates, setRouteCoordinates] = useState([]);
    const [isTracking, setIsTracking] = useState(false);
    const mapRef = useRef(null);
    const markerRef = useRef(null);

    useEffect(() => {
        initializeMap();
        return () => {
            stopTracking();
        };
    }, []);

    const initializeMap = async () => {
        try {
            // Initialize location tracker
            const initialized = await locationTracker.initialize();
            if (!initialized) {
                Alert.alert('Error', 'Failed to initialize location tracking');
                return;
            }

            // Get initial location
            const location = await locationTracker.getCurrentLocation();
            if (location) {
                setCurrentLocation(location);
                setInitialRegion(location);
            }

            // Start tracking
            await startTracking();
        } catch (error) {
            console.error('Failed to initialize map:', error);
            Alert.alert('Error', 'Failed to initialize map');
        }
    };

    const setInitialRegion = (location) => {
        if (!initialRegion && location) {
            const region = {
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            };
            if (mapRef.current) {
                mapRef.current.animateToRegion(region, 1000);
            }
        }
    };

    const startTracking = async () => {
        try {
            const success = await locationTracker.startTracking(handleLocationUpdate);
            if (success) {
                setIsTracking(true);
                console.log('Location tracking started');
            }
        } catch (error) {
            console.error('Failed to start tracking:', error);
        }
    };

    const stopTracking = async () => {
        try {
            await locationTracker.stopTracking();
            setIsTracking(false);
            console.log('Location tracking stopped');
        } catch (error) {
            console.error('Failed to stop tracking:', error);
        }
    };

    const handleLocationUpdate = (locationData) => {
        setCurrentLocation(locationData);

        // Add to route coordinates
        if (showRoute) {
            setRouteCoordinates(prev => [...prev, locationData]);
        }

        // Send to WebSocket
        webSocketService.sendLocationUpdate(locationData);

        // Call parent callback
        if (onLocationUpdate) {
            onLocationUpdate(locationData);
        }

        // Follow rider if enabled
        if (followRider && mapRef.current) {
            const region = {
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            };
            mapRef.current.animateToRegion(region, 1000);
        }
    };

    const getMarkerRotation = () => {
        if (!currentLocation || currentLocation.heading === null) return 0;
        return currentLocation.heading;
    };

    const getMarkerIcon = () => {
        return (
            <View style={styles.markerContainer}>
                <MaterialIcons
                    name="directions-bike"
                    size={30}
                    color="#FF6B35"
                    style={[
                        styles.markerIcon,
                        { transform: [{ rotate: `${getMarkerRotation()}deg` }] }
                    ]}
                />
                <View style={styles.markerPulse} />
            </View>
        );
    };

    const clearRoute = () => {
        setRouteCoordinates([]);
    };

    const getRouteCoordinates = () => {
        return routeCoordinates.map(coord => ({
            latitude: coord.latitude,
            longitude: coord.longitude,
        }));
    };

    return (
        <View style={[styles.container, style]}>
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                showsUserLocation={false}
                showsMyLocationButton={true}
                showsCompass={true}
                showsScale={true}
                showsTraffic={true}
                initialRegion={initialRegion || {
                    latitude: 37.78825,
                    longitude: -122.4324,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
                onMapReady={() => {
                    console.log('Map is ready');
                }}
            >
                {/* Current location marker */}
                {currentLocation && (
                    <Marker
                        ref={markerRef}
                        coordinate={{
                            latitude: currentLocation.latitude,
                            longitude: currentLocation.longitude,
                        }}
                        anchor={{ x: 0.5, y: 0.5 }}
                        flat={true}
                        rotation={getMarkerRotation()}
                    >
                        {getMarkerIcon()}
                    </Marker>
                )}

                {/* Route polyline */}
                {showRoute && routeCoordinates.length > 1 && (
                    <Polyline
                        coordinates={getRouteCoordinates()}
                        strokeWidth={3}
                        strokeColor="#FF6B35"
                        lineDashPattern={[1]}
                    />
                )}
            </MapView>

            {/* Status indicator */}
            <View style={styles.statusContainer}>
                <View style={[styles.statusIndicator, { backgroundColor: isTracking ? '#4CAF50' : '#F44336' }]} />
                <Text style={styles.statusText}>
                    {isTracking ? 'Tracking Active' : 'Tracking Inactive'}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        width: '100%',
        height: '100%',
    },
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    markerIcon: {
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    markerPulse: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 107, 53, 0.3)',
        borderWidth: 2,
        borderColor: 'rgba(255, 107, 53, 0.6)',
    },
    statusContainer: {
        position: 'absolute',
        top: 20,
        right: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#333',
    },
});

export default LiveMapView; 
