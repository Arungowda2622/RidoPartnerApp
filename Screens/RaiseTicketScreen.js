import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import HeaderWithBackButton from '../components/HeaderWithBackButton';
import { API_CONFIG } from '../config/api';
import { 
  scale, 
  moderateScale, 
  FONT_SIZES, 
  SPACING, 
  BORDER_RADIUS,
  ICON_SIZES 
} from '../utils/responsive';

// const API_URL = 'https://ridodrop-backend-24-10-2025.onrender.com/api/v1';
const API_URL = `${API_CONFIG.BASE_URL}/api/v1`;

const PARTNER_ISSUE_TYPES = [
  'Payment Not Received',
  'Order Assignment Problem',
  'Customer Unavailable',
  'Wrong Pickup Address',
  'Vehicle Breakdown',
  'Accident/Emergency',
  'App Technical Issue',
  'Wallet Issue',
  'Other'
];

const RaiseTicketScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Get order details if passed (for order-specific tickets)
  const orderData = route.params?.orderData;
  const orderId = route.params?.orderId;
  
  const [loading, setLoading] = useState(false);
  const [showIssueTypes, setShowIssueTypes] = useState(false);
  
  const [formData, setFormData] = useState({
    issueType: '',
    subject: '',
    description: ''
  });
  
  const [images, setImages] = useState([]);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    loadUserData();
    requestPermissions();
  }, []);

  const loadUserData = async () => {
    try {
      const riderId = await AsyncStorage.getItem('riderId');
      const name = await AsyncStorage.getItem('name') || 
                   await AsyncStorage.getItem('riderName') || 
                   'Partner';
      const phone = await AsyncStorage.getItem('number') || 
                     await AsyncStorage.getItem('phone') || 
                     await AsyncStorage.getItem('riderPhone') || 
                     await AsyncStorage.getItem('mobile') ||
                     await AsyncStorage.getItem('phoneNumber') || 
                     '';
      const email = await AsyncStorage.getItem('email');

      console.log('User data loaded:', { riderId, name, phone, email });
      setUserData({ riderId, name, phone, email });
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload images');
      }
    }
  };

  const pickImage = async () => {
    if (images.length >= 3) {
      Alert.alert('Limit reached', 'You can upload maximum 3 images');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImages([...images, result.assets[0]]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

  const validateForm = () => {
    if (!formData.issueType) {
      Alert.alert('Required', 'Please select an issue type');
      return false;
    }
    if (!formData.subject.trim()) {
      Alert.alert('Required', 'Please enter a subject');
      return false;
    }
    if (!formData.description.trim()) {
      Alert.alert('Required', 'Please describe your issue');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (!userData?.riderId) {
      Alert.alert('Error', 'User information not found. Please login again.');
      return;
    }

    if (!userData?.phone) {
      Alert.alert('Error', 'Phone number is required. Please update your profile.');
      return;
    }

    try {
      setLoading(true);

      // Create FormData for multipart upload
      const formDataToSend = new FormData();
      
      // Add text fields
      formDataToSend.append('userType', 'partner');
      formDataToSend.append('userId', userData.riderId);
      formDataToSend.append('userName', userData.name || 'Partner');
      formDataToSend.append('userPhone', userData.phone);
      if (userData.email) formDataToSend.append('userEmail', userData.email);
      
      formDataToSend.append('issueType', formData.issueType);
      formDataToSend.append('subject', formData.subject);
      formDataToSend.append('description', formData.description);
      
      // Add order info if available
      if (orderId) {
        formDataToSend.append('bookingId', orderId);
        formDataToSend.append('issueCategory', 'booking-specific');
      }

      // Add images
      images.forEach((image, index) => {
        const imageUri = Platform.OS === 'ios' ? image.uri.replace('file://', '') : image.uri;
        const imageFile = {
          uri: imageUri,
          type: 'image/jpeg',
          name: `ticket_image_${index}.jpg`
        };
        formDataToSend.append('attachments', imageFile);
      });

      console.log('Submitting ticket...');
      
      const response = await fetch(`${API_URL}/tickets`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        body: formDataToSend
      });

      const result = await response.json();

      if (response.ok && result.success) {
        Alert.alert(
          'Success! 🎉',
          `Your ticket ${result.data.ticketId} has been created. Our support team will contact you soon.`,
          [
            {
              text: 'View My Tickets',
              onPress: () => navigation.replace('MyTickets')
            },
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        throw new Error(result.message || 'Failed to create ticket');
      }

    } catch (error) {
      console.error('Error submitting ticket:', error);
      Alert.alert('Error', error.message || 'Failed to submit ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        <HeaderWithBackButton title="Raise a Ticket" />
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Order Info Banner (if available) */}
          {orderData && (
            <View style={styles.orderBanner}>
              <Ionicons name="document-text" size={ICON_SIZES.regular} color="#EC4D4A" />
              <View style={styles.orderInfo}>
                <Text style={styles.orderTitle}>Order-Specific Issue</Text>
                <Text style={styles.orderId}>Order #{orderData.bookingId || orderData._id?.slice(-6)}</Text>
              </View>
            </View>
          )}

          {/* Issue Type Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Issue Type *</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowIssueTypes(!showIssueTypes)}
            >
              <Text style={[styles.dropdownText, !formData.issueType && styles.placeholder]}>
                {formData.issueType || 'Select issue type'}
              </Text>
              <Ionicons 
                name={showIssueTypes ? 'chevron-up' : 'chevron-down'} 
                size={ICON_SIZES.regular} 
                color="#666" 
              />
            </TouchableOpacity>

            {showIssueTypes && (
              <View style={styles.dropdownList}>
                {PARTNER_ISSUE_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setFormData({ ...formData, issueType: type });
                      setShowIssueTypes(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{type}</Text>
                    {formData.issueType === type && (
                      <Ionicons name="checkmark" size={ICON_SIZES.regular} color="#EC4D4A" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Subject */}
          <View style={styles.section}>
            <Text style={styles.label}>Subject *</Text>
            <TextInput
              style={styles.input}
              placeholder="Brief summary of your issue"
              value={formData.subject}
              onChangeText={(text) => setFormData({ ...formData, subject: text })}
              maxLength={100}
            />
            <Text style={styles.charCount}>{formData.subject.length}/100</Text>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Please describe your issue in detail..."
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>{formData.description.length}/500</Text>
          </View>

          {/* Image Upload */}
          <View style={styles.section}>
            <Text style={styles.label}>Attachments (Optional)</Text>
            <Text style={styles.hint}>Upload up to 3 images</Text>
            
            <View style={styles.imagesContainer}>
              {images.map((image, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri: image.uri }} style={styles.image} />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={ICON_SIZES.medium} color="#EC4D4A" />
                  </TouchableOpacity>
                </View>
              ))}

              {images.length < 3 && (
                <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
                  <Ionicons name="camera" size={ICON_SIZES.xlarge} color="#999" />
                  <Text style={styles.addImageText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={ICON_SIZES.regular} color="#fff" />
                <Text style={styles.submitButtonText}>Submit Ticket</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={ICON_SIZES.regular} color="#0066FF" />
            <Text style={styles.infoText}>
              Our support team typically responds within 24 hours. You'll receive updates via SMS and in-app notifications.
            </Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  content: {
    flex: 1,
    padding: SPACING.medium,
  },
  orderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    padding: moderateScale(12),
    borderRadius: BORDER_RADIUS.regular,
    marginBottom: SPACING.medium,
    borderLeftWidth: scale(4),
    borderLeftColor: '#EC4D4A',
  },
  orderInfo: {
    marginLeft: moderateScale(12),
  },
  orderTitle: {
    fontSize: FONT_SIZES.regular,
    fontWeight: '600',
    color: '#333',
  },
  orderId: {
    fontSize: FONT_SIZES.small,
    color: '#666',
    marginTop: scale(2),
  },
  section: {
    marginBottom: SPACING.large,
  },
  label: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
    color: '#333',
    marginBottom: SPACING.small,
  },
  hint: {
    fontSize: FONT_SIZES.small,
    color: '#999',
    marginTop: -scale(4),
    marginBottom: SPACING.small,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.regular,
    padding: moderateScale(14),
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dropdownText: {
    fontSize: FONT_SIZES.medium,
    color: '#333',
  },
  placeholder: {
    color: '#999',
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.regular,
    marginTop: SPACING.small,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: scale(300),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: moderateScale(14),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: FONT_SIZES.medium,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.regular,
    padding: moderateScale(14),
    fontSize: FONT_SIZES.medium,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#333',
  },
  textArea: {
    height: scale(120),
    paddingTop: moderateScale(14),
  },
  charCount: {
    fontSize: FONT_SIZES.small,
    color: '#999',
    textAlign: 'right',
    marginTop: scale(4),
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(12),
  },
  imageWrapper: {
    position: 'relative',
    width: scale(100),
    height: scale(100),
  },
  image: {
    width: scale(100),
    height: scale(100),
    borderRadius: BORDER_RADIUS.regular,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -scale(8),
    right: -scale(8),
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.medium,
  },
  addImageBtn: {
    width: scale(100),
    height: scale(100),
    borderRadius: BORDER_RADIUS.regular,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  addImageText: {
    fontSize: FONT_SIZES.small,
    color: '#999',
    marginTop: scale(4),
  },
  submitButton: {
    backgroundColor: '#EC4D4A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: moderateScale(16),
    borderRadius: BORDER_RADIUS.regular,
    marginTop: SPACING.small,
    gap: SPACING.small,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: moderateScale(12),
    borderRadius: BORDER_RADIUS.regular,
    marginTop: SPACING.medium,
    marginBottom: SPACING.xlarge,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.small,
    color: '#1976D2',
    marginLeft: SPACING.small,
    lineHeight: scale(18),
  },
});

export default RaiseTicketScreen;
