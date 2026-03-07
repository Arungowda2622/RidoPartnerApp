import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Switch, 
  Alert,
  StatusBar,
  Animated,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_CONFIG } from '../config/api';

const GoToAreaScreen = () => {
  const navigation = useNavigation();
  const [preferredArea, setPreferredArea] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadPreferredArea();
  }, []);

  const loadPreferredArea = async () => {
    try {
      setIsLoading(true);
      const phone = await AsyncStorage.getItem('number');
      
      if (!phone) {
        console.log('No phone number found in storage');
        setIsLoading(false);
        return;
      }

      console.log('Loading preferred area for phone:', phone);
      const response = await axios.get(
        API_CONFIG.getEndpoint('riders/preferred-area'),
        { params: { phone } }
      );

      if (response.data.success && response.data.preferredArea) {
        setPreferredArea(response.data.preferredArea);
        console.log('Preferred area loaded:', response.data.preferredArea);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading preferred area:', error);
      setIsLoading(false);
    }
  };

  const savePreferredArea = async (areaData) => {
    try {
      setIsSaving(true);
      const phone = await AsyncStorage.getItem('number');
      
      if (!phone) {
        Alert.alert('Error', 'User not logged in');
        setIsSaving(false);
        return;
      }

      console.log('Saving preferred area for phone:', phone, areaData);
      const response = await axios.post(
        API_CONFIG.getEndpoint('riders/preferred-area'),
        {
          phone,
          ...areaData
        }
      );

      if (response.data.success) {
        setPreferredArea(response.data.preferredArea);
        console.log('Preferred area saved:', response.data.preferredArea);
        Alert.alert(
          'Success',
          areaData.enabled 
            ? 'Preferred area activated. You will now receive orders with drop locations within 5km of this area.'
            : 'Preferred area deactivated. You will receive orders based on pickup distance from your current location.'
        );
      }
      
      setIsSaving(false);
    } catch (error) {
      console.error('Error saving preferred area:', error);
      Alert.alert('Error', 'Failed to save preferred area. Please try again.');
      setIsSaving(false);
    }
  };

  const handleAddNewArea = () => {
    navigation.navigate('MapPicker', {
      initialLocation: preferredArea?.latitude && preferredArea?.longitude 
        ? {
            latitude: preferredArea.latitude,
            longitude: preferredArea.longitude,
            name: preferredArea.name,
            address: preferredArea.address
          }
        : null,
      onLocationSelect: (location) => {
        savePreferredArea({
          enabled: false,
          name: location.name,
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address
        });
      }
    });
  };

  const handleEdit = () => {
    if (!preferredArea?.latitude || !preferredArea?.longitude) {
      Alert.alert('Error', 'No area to edit');
      return;
    }

    navigation.navigate('MapPicker', {
      initialLocation: {
        latitude: preferredArea.latitude,
        longitude: preferredArea.longitude,
        name: preferredArea.name,
        address: preferredArea.address
      },
      onLocationSelect: (location) => {
        savePreferredArea({
          enabled: preferredArea.enabled,
          name: location.name,
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address
        });
      }
    });
  };

  const handleDelete = () => {
    Alert.alert(
      'Remove Area',
      'Are you sure you want to remove this preferred area?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel' 
        },
        { 
          text: 'Remove', 
          style: 'destructive', 
          onPress: () => {
            savePreferredArea({
              enabled: false,
              name: null,
              latitude: null,
              longitude: null,
              address: null
            });
          }
        }
      ]
    );
  };

  const handleToggle = () => {
    if (!preferredArea?.latitude || !preferredArea?.longitude) {
      Alert.alert('Notice', 'Please add a preferred area first');
      return;
    }

    const newEnabled = !preferredArea.enabled;
    
    if (newEnabled) {
      Alert.alert(
        'Enable Preferred Area?',
        `You will receive orders where the DROP location is within 5km of ${preferredArea.name}. This helps you get rides going towards your preferred area.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: () => {
              savePreferredArea({
                ...preferredArea,
                enabled: true
              });
            }
          }
        ]
      );
    } else {
      savePreferredArea({
        ...preferredArea,
        enabled: false
      });
    }
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#EC4D4A" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const hasArea = preferredArea?.latitude && preferredArea?.longitude;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header with blur effect on scroll */}
      <Animated.View style={[styles.header, { backgroundColor: headerOpacity.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.95)']
      })}]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preferred Areas</Text>
        <View style={styles.infoButton} />
      </Animated.View>

      <Animated.ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Subtle info banner */}
        <View style={styles.infoBanner}>
          <View style={styles.infoBannerIcon}>
            <Ionicons name="location" size={20} color="#EC4D4A" />
          </View>
          <Text style={styles.infoBannerText}>
            {hasArea && preferredArea.enabled
              ? `Active: You're receiving orders with DROP location within 5km of ${preferredArea.name}`
              : 'Set a preferred area to receive orders that are delivering TO that location (within 5km)'}
          </Text>
        </View>

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Preferred Area</Text>
          <Text style={styles.sectionSubtitle}>
            {hasArea ? (preferredArea.enabled ? 'Active' : 'Inactive') : 'Not set'}
          </Text>
        </View>

        {/* Area card */}
        {hasArea ? (
          <Animated.View 
            style={[
              styles.areaCard,
              preferredArea.enabled && styles.areaCardActive,
            ]}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardLeft}>
                <View style={[
                  styles.iconContainer,
                  preferredArea.enabled && styles.iconContainerActive
                ]}>
                  <Ionicons 
                    name={preferredArea.enabled ? "location" : "location-outline"} 
                    size={20} 
                    color={preferredArea.enabled ? "#EC4D4A" : "#666"} 
                  />
                </View>
                <View style={styles.areaInfo}>
                  <Text style={[
                    styles.areaName,
                    preferredArea.enabled && styles.areaNameActive
                  ]}>
                    {preferredArea.name || 'Selected Area'}
                  </Text>
                  {preferredArea.address && (
                    <Text style={styles.areaAddress} numberOfLines={2}>
                      {preferredArea.address}
                    </Text>
                  )}
                  <Text style={styles.areaCoords}>
                    5km radius • {preferredArea.latitude?.toFixed(4)}, {preferredArea.longitude?.toFixed(4)}
                  </Text>
                </View>
              </View>
              
              <Switch
                trackColor={{ false: '#e0e0e0', true: '#ffcccb' }}
                thumbColor={preferredArea.enabled ? '#EC4D4A' : '#f4f4f4'}
                ios_backgroundColor="#e0e0e0"
                onValueChange={handleToggle}
                value={preferredArea.enabled}
                style={styles.switch}
                disabled={isSaving}
              />
            </View>

            {/* Action buttons - minimal */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleEdit}
                activeOpacity={0.7}
                disabled={isSaving}
              >
                <Ionicons name="create-outline" size={16} color="#666" />
                <Text style={styles.actionButtonText}>Edit Location</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleDelete}
                activeOpacity={0.7}
                disabled={isSaving}
              >
                <Ionicons name="trash-outline" size={16} color="#999" />
                <Text style={styles.deleteText}>Remove</Text>
              </TouchableOpacity>
            </View>

            {preferredArea.enabled && (
              <View style={styles.warningBanner}>
                <Ionicons name="information-circle" size={16} color="#f59e0b" />
                <Text style={styles.warningText}>
                  You'll only receive orders where the drop-off is near this area. Great for heading home!
                </Text>
              </View>
            )}
          </Animated.View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No preferred area set</Text>
            <Text style={styles.emptyStateText}>
              Set your preferred area to receive orders that deliver TO that location. Perfect for heading home or to a specific destination!
            </Text>
          </View>
        )}
      </Animated.ScrollView>

      {/* Floating action button */}
      <TouchableOpacity 
        style={styles.fab}
        activeOpacity={0.9}
        onPress={handleAddNewArea}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name={hasArea ? "create" : "add"} size={28} color="#fff" />
            <Text style={styles.fabText}>
              {hasArea ? 'Change Area' : 'Add Area'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    borderBottomWidth: 0,
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
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    letterSpacing: -0.3,
  },
  infoButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 100,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: '#EC4D4A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  infoBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffebee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  areaCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  areaCardActive: {
    borderColor: '#EC4D4A',
    backgroundColor: '#fffbfb',
    shadowColor: '#EC4D4A',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainerActive: {
    backgroundColor: '#ffebee',
  },
  areaInfo: {
    flex: 1,
  },
  areaName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  areaNameActive: {
    color: '#EC4D4A',
    fontWeight: '600',
  },
  areaAddress: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  areaCoords: {
    fontSize: 11,
    color: '#999',
  },
  areaDistance: {
    fontSize: 13,
    color: '#999',
  },
  switch: {
    transform: [{ scale: 0.9 }],
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 54,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionButtonText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  deleteText: {
    fontSize: 13,
    color: '#999',
    marginLeft: 6,
    fontWeight: '500',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#92400e',
    marginLeft: 8,
    lineHeight: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 40,
  },
  fab: {
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
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: -0.2,
  },
});

export default GoToAreaScreen;