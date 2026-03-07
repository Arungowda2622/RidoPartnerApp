import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  TextInput,
  Keyboard
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

const MapPickerScreen = ({ navigation, route }) => {
  const { onLocationSelect, initialLocation } = route.params || {};
  
  const [selectedLocation, setSelectedLocation] = useState(
    initialLocation || {
      latitude: 12.9716,
      longitude: 77.5946,
      name: '',
      address: ''
    }
  );
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const mapRef = useRef(null);

  useEffect(() => {
    if (!initialLocation) {
      getCurrentLocation();
    }
  }, []);

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      setSelectedLocation({ latitude, longitude, name: 'Current Location', address: 'Loading...' });
      
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        }, 1000);
      }

      // Get address for the location
      getAddressFromCoords(latitude, longitude);
      
      setLoading(false);
    } catch (error) {
      console.error('Error getting location:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to get current location');
    }
  };

  const getAddressFromCoords = async (latitude, longitude) => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (results && results.length > 0) {
        const result = results[0];
        const address = `${result.name || ''}, ${result.street || ''}, ${result.city || ''}, ${result.region || ''}`.replace(/^,\s*|,\s*$/g, '');
        const name = result.name || result.street || result.city || 'Selected Location';
        
        setSelectedLocation(prev => ({
          ...prev,
          name,
          address
        }));
      }
    } catch (error) {
      console.error('Error getting address:', error);
    }
  };

  const handleMapPress = (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude, name: 'Selected Location', address: 'Loading...' });
    getAddressFromCoords(latitude, longitude);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a location to search');
      return;
    }

    try {
      setIsSearching(true);
      Keyboard.dismiss();

      const results = await Location.geocodeAsync(searchQuery);

      if (results && results.length > 0) {
        const result = results[0];
        const { latitude, longitude } = result;

        setSelectedLocation({
          latitude,
          longitude,
          name: searchQuery,
          address: 'Loading...'
        });

        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01
          }, 1000);
        }

        // Get detailed address
        getAddressFromCoords(latitude, longitude);
      } else {
        Alert.alert('Not Found', 'Could not find the location. Please try a different search term.');
      }

      setIsSearching(false);
    } catch (error) {
      console.error('Error searching location:', error);
      setIsSearching(false);
      Alert.alert('Error', 'Failed to search location. Please try again.');
    }
  };

  const handleConfirm = () => {
    if (!selectedLocation.latitude || !selectedLocation.longitude) {
      Alert.alert('Error', 'Please select a location on the map');
      return;
    }

    if (onLocationSelect) {
      onLocationSelect(selectedLocation);
    }
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        }}
        onPress={handleMapPress}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {selectedLocation.latitude && selectedLocation.longitude && (
          <Marker
            coordinate={{
              latitude: selectedLocation.latitude,
              longitude: selectedLocation.longitude
            }}
            title={selectedLocation.name || 'Selected Location'}
            description={selectedLocation.address}
            pinColor="#EC4D4A"
            draggable
            onDragEnd={(e) => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              setSelectedLocation({ latitude, longitude, name: 'Selected Location', address: 'Loading...' });
              getAddressFromCoords(latitude, longitude);
            }}
          />
        )}
      </MapView>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Preferred Area</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" style={{ marginLeft: 4 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a location..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {isSearching && <ActivityIndicator size="small" color="#EC4D4A" style={{ marginRight: 4 }} />}
        </View>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={isSearching}
        >
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Location Info Card */}
      {selectedLocation.latitude && (
        <View style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="location" size={24} color="#EC4D4A" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              {selectedLocation.name || 'Selected Location'}
            </Text>
            {selectedLocation.address && (
              <Text style={styles.infoAddress} numberOfLines={2}>
                {selectedLocation.address}
              </Text>
            )}
            <Text style={styles.infoCoords}>
              {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
            </Text>
          </View>
        </View>
      )}

      {/* Current Location Button */}
      <TouchableOpacity
        style={styles.currentLocationButton}
        onPress={getCurrentLocation}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#EC4D4A" />
        ) : (
          <Ionicons name="locate" size={24} color="#EC4D4A" />
        )}
      </TouchableOpacity>

      {/* Confirm Button */}
      <TouchableOpacity
        style={styles.confirmButton}
        onPress={handleConfirm}
        activeOpacity={0.9}
      >
        <Ionicons name="checkmark-circle" size={24} color="#fff" />
        <Text style={styles.confirmButtonText}>Confirm Location</Text>
      </TouchableOpacity>

      {/* Instructions */}
      <View style={styles.instructionsCard}>
        <Text style={styles.instructionsText}>
          Tap anywhere on the map to select your preferred area
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa'
  },
  map: {
    flex: 1
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a'
  },
  searchContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 80,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 8
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 14,
    color: '#1a1a1a'
  },
  searchButton: {
    backgroundColor: '#EC4D4A',
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  infoCard: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 188 : 148,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffebee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  infoContent: {
    flex: 1
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4
  },
  infoAddress: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4
  },
  infoCoords: {
    fontSize: 11,
    color: '#999'
  },
  currentLocationButton: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EC4D4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  confirmButton: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: '#EC4D4A',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#EC4D4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  instructionsCard: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 80,
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 12,
    padding: 12
  },
  instructionsText: {
    color: '#fff',
    fontSize: 13,
    textAlign: 'center'
  }
});

export default MapPickerScreen;
