import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, Dimensions, Image, Animated, Alert, ScrollView, KeyboardAvoidingView, Platform, Keyboard, StatusBar } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api';
import globalOrderManager from '../utils/GlobalOrderManager';

const { width, height } = Dimensions.get('window');

const compliments = [
  { label: 'Friendly', icon: 'emoticon-happy-outline' },
  { label: 'Respectful', icon: 'hand-heart-outline' },
  { label: 'Professional', icon: 'account-tie' },
  { label: 'On Time', icon: 'clock-check-outline' },
];

const OrderReviewScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const nextBookings = route.params?.nextBookings || [];
  const hasNextBookings = route.params?.hasNextBookings || false;
  const booking = route.params?.booking || {};
  
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedCompliments, setSelectedCompliments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const checkAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Extract earnings and distance from booking
  const earnings = booking?.totalFare || booking?.fare || booking?.price || 0;
  const distance = booking?.distanceKm || booking?.distance || booking?.totalDistance || '0';
  
  // Format distance to 1 decimal place if it's a number
  const formattedDistance = typeof distance === 'string' && distance.includes('km')
    ? distance // Already formatted like "5.2 km"
    : typeof distance === 'number' 
    ? distance.toFixed(1) 
    : parseFloat(distance) ? parseFloat(distance).toFixed(1) : '0.0';


  useEffect(() => {
    // Animate check icon
    Animated.spring(checkAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
    
    // Fade in and slide up animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Show next bookings alert if available
    if (hasNextBookings && nextBookings.length > 0) {
      setTimeout(() => {
        Alert.alert(
          "🎉 New Bookings Available!",
          `You have ${nextBookings.length} new booking(s) nearby. Would you like to view them?`,
          [
            {
              text: "Later",
              style: "cancel",
            },
            {
              text: "View Orders",
              onPress: () => {
                navigation.replace("Orders", {
                  booking: {
                    success: true,
                    bookings: nextBookings,
                  },
                });
              },
            },
          ]
        );
      }, 1000);
    }
  }, [hasNextBookings, nextBookings]);

  const toggleCompliment = (index) => {
    if (selectedCompliments.includes(index)) {
      setSelectedCompliments(selectedCompliments.filter(i => i !== index));
    } else {
      setSelectedCompliments([...selectedCompliments, index]);
    }
  };

  const handleSubmit = async () => {
    // Prevent duplicate submissions
    if (isSubmitting) {
      console.log('⚠️ Review submission already in progress, ignoring duplicate click');
      return;
    }
    
    // Submit rider review if rating is provided
    if (rating > 0) {
      setIsSubmitting(true);
      try {
        const bookingId = route.params?.booking?._id;
        if (bookingId) {
          // Get rider ID from AsyncStorage
          const riderId = await AsyncStorage.getItem('riderId') || await AsyncStorage.getItem('userId') || await AsyncStorage.getItem('number');
          
          console.log('📋 Review submission details:', {
            bookingId,
            riderId,
            rating,
            hasComment: !!comment,
            selectedCompliments: selectedCompliments.length,
            bookingUserId: route.params?.booking?.userId
          });
          
          if (riderId) {
            // const API_URL = "https://ridodrop-backend-24-10-2025.onrender.com/api/v1";
            const API_URL = `${API_CONFIG.BASE_URL}/api/v1`;
            const complimentLabels = selectedCompliments.map(i => compliments[i].label);
            const feedbackText = comment || `${complimentLabels.join(', ')}`;
            
            const reviewData = {
              rating: rating,
              feedback: feedbackText || `Trip completed with ${rating} star rating`,
              riderId: riderId
            };
            
            console.log('📤 Submitting rider review from OrderReviewScreen:', reviewData);
            
            const reviewResponse = await axios.post(`${API_URL}/review/${bookingId}/rider`, reviewData, {
              headers: { 'Content-Type': 'application/json' },
              timeout: 8000
            });
            
            console.log('✅ Rider review submitted successfully:', reviewResponse.data);
            
            // Restart polling when returning to home after ride completion
            console.log('🔄 Ride completed - restarting polling for new bookings');
            globalOrderManager.restartPolling();
            
            // Navigate directly to home without popup
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            });
            return;
          }
        }
      } catch (error) {
        console.error('❌ Error submitting rider review from OrderReviewScreen:', error);
        console.error('❌ Error details:', error.response?.data || error.message);
        
        setIsSubmitting(false); // Reset loading state on error
        
        // If already reviewed, just navigate to home
        if (error.response?.data?.message === 'You have already reviewed this booking') {
          console.log('ℹ️ Review already submitted, navigating to home');
          globalOrderManager.restartPolling();
          navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          });
          return;
        }
        
        // Show error feedback for other errors
        Alert.alert(
          "⚠️ Review Submission Failed",
          error.response?.data?.message || "Failed to submit review. Please try again.",
          [
            {
              text: "Skip Review",
              style: "cancel",
              onPress: () => {
                // Restart polling when returning to home after ride completion
                console.log('🔄 Ride completed - restarting polling for new bookings');
                globalOrderManager.restartPolling();
                
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Home' }],
                });
              }
            },
            {
              text: "Retry",
              onPress: () => {} // Stay on screen to retry
            }
          ]
        );
        return; // Don't navigate on error
      }
    }
    
    // If no rating, navigate directly
    // Restart polling when returning to home after ride completion
    console.log('🔄 Ride completed - restarting polling for new bookings');
    globalOrderManager.restartPolling();
    
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };



  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order Completed</Text>
      </View>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
        >
        {/* Success Card with Animation */}
        <Animated.View 
          style={[
            styles.successCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <LinearGradient
            colors={["#4CAF50", "#45A049"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientCard}
          >
            <Animated.View
              style={[
                styles.checkCircle,
                { transform: [{ scale: checkAnim }] },
              ]}
            >
              <Ionicons name="checkmark-circle" size={64} color="#fff" />
            </Animated.View>
            <Text style={styles.completedText}>Delivery Completed!</Text>
            <Text style={styles.thankYouText}>Great job on this delivery 🎉</Text>
            
            {/* Delivery Summary */}
            <View style={styles.summaryContainer}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <MaterialCommunityIcons name="cash" size={24} color="#fff" />
                  <Text style={styles.summaryLabel}>Earnings</Text>
                  <Text style={styles.summaryValue}>₹{earnings}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <MaterialCommunityIcons name="map-marker-distance" size={24} color="#fff" />
                  <Text style={styles.summaryLabel}>Distance</Text>
                  <Text style={styles.summaryValue}>
                    {formattedDistance.toString().includes('km') ? formattedDistance : `${formattedDistance} km`}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Customer Info Card */}
        {booking?.pickupDetails && (
          <Animated.View 
            style={[
              styles.customerCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.customerHeader}>
              <View style={styles.avatarContainer}>
                <FontAwesome5 name="user-circle" size={50} color="#EC4D4A" />
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>
                  {booking.pickupDetails?.name || 'Customer'}
                </Text>
                <Text style={styles.customerPhone}>
                  {booking.pickupDetails?.phone || ''}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Review Section */}
        <Animated.View 
          style={[
            styles.reviewCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.ratingHeader}>
            <MaterialCommunityIcons name="star-outline" size={24} color="#EC4D4A" />
            <Text style={styles.ratingTitle}>Rate your customer</Text>
          </View>
          
          {/* Star Rating */}
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map(i => (
              <TouchableOpacity 
                key={i} 
                onPress={() => setRating(i)} 
                activeOpacity={0.7}
                style={styles.starButton}
              >
                <Ionicons
                  name={rating >= i ? 'star' : 'star-outline'}
                  size={36}
                  color={rating >= i ? '#FFC107' : '#E0E0E0'}
                />
              </TouchableOpacity>
            ))}
          </View>
          
          {rating > 0 && (
            <Text style={styles.ratingText}>
              {rating === 5 ? 'Excellent!' : rating === 4 ? 'Great!' : rating === 3 ? 'Good' : rating === 2 ? 'Fair' : 'Needs Improvement'}
            </Text>
          )}

          {/* Comment Input */}
          <View style={styles.commentSection}>
            <Text style={styles.commentLabel}>Additional Feedback (Optional)</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Share your experience with this customer..."
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
              textAlignVertical="top"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitButton, (rating === 0 || isSubmitting) && styles.submitButtonDisabled]} 
            onPress={handleSubmit} 
            activeOpacity={0.8}
            disabled={rating === 0 || isSubmitting}
          >
            <LinearGradient
              colors={(rating === 0 || isSubmitting) ? ['#CCC', '#AAA'] : ['#EC4D4A', '#D43D3A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Submitting...' : (rating === 0 ? 'Please Rate to Continue' : 'Submit Review')}
              </Text>
              <Ionicons name="arrow-forward-circle" size={24} color="#fff" style={styles.submitIcon} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.skipButton} 
            onPress={() => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  keyboardView: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  scrollContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  successCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  gradientCard: {
    padding: 20,
    alignItems: 'center',
  },
  checkCircle: {
    marginBottom: 10,
  },
  completedText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
    textAlign: 'center',
  },
  thankYouText: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.95,
    textAlign: 'center',
    marginBottom: 16,
  },
  summaryContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#fff',
    opacity: 0.9,
    marginTop: 6,
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  customerCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 16,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 3,
  },
  customerPhone: {
    fontSize: 13,
    color: '#666',
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  starButton: {
    marginHorizontal: 3,
    padding: 3,
  },
  ratingText: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 16,
  },
  complimentsSection: {
    marginBottom: 24,
  },
  complimentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  complimentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  complimentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#EC4D4A',
    backgroundColor: '#fff',
    marginRight: 8,
    marginBottom: 8,
  },
  complimentChipActive: {
    backgroundColor: '#EC4D4A',
    borderColor: '#EC4D4A',
  },
  complimentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EC4D4A',
    marginLeft: 6,
  },
  complimentTextActive: {
    color: '#fff',
  },
  commentSection: {
    marginBottom: 16,
  },
  commentLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    fontSize: 14,
    backgroundColor: '#FAFAFA',
    color: '#1a1a1a',
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
    shadowColor: '#EC4D4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0.1,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  submitIcon: {
    marginLeft: 10,
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#999',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default OrderReviewScreen; 