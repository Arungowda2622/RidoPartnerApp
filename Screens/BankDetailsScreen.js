import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_CONFIG } from '../config/api';

const { width, height } = Dimensions.get('window');

// Device size detection
const isSmallDevice = width < 375;
const isLargeDevice = width >= 414;

// Enhanced responsive scaling
const scale = (size) => {
  const baseWidth = 375;
  const ratio = width / baseWidth;
  return Math.round(size * ratio);
};

const verticalScale = (size) => {
  const baseHeight = 667;
  const ratio = height / baseHeight;
  return Math.round(size * ratio);
};

const moderateScale = (size, factor = 0.5) => {
  return Math.round(size + (scale(size) - size) * factor);
};

const SPACING = {
  xs: scale(4),
  sm: scale(8),
  md: scale(12),
  lg: scale(16),
  xl: scale(20),
  xxl: scale(24),
};

const FONT_SIZES = {
  tiny: moderateScale(10),
  small: moderateScale(12),
  regular: moderateScale(14),
  medium: moderateScale(16),
  large: moderateScale(18),
  xlarge: moderateScale(20),
};

const BankDetailsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasBankDetails, setHasBankDetails] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [riderId, setRiderId] = useState(null);
  
  // Form fields
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [branch, setBranch] = useState('');
  const [upiId, setUpiId] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    fetchBankDetails();
  }, []);

  const fetchBankDetails = async () => {
    try {
      setLoading(true);
      const storedRiderId = await AsyncStorage.getItem('riderId');
      setRiderId(storedRiderId);

      if (!storedRiderId) {
        Alert.alert('Error', 'Rider information not found');
        return;
      }

      const response = await axios.get(
        API_CONFIG.getEndpoint('rider-wallet/bank-details'),
        { params: { riderId: storedRiderId } }
      );

      if (response.data.hasBankDetails) {
        const details = response.data.bankDetails;
        setHasBankDetails(true);
        setAccountHolderName(details.accountHolderName || '');
        setAccountNumber(details.accountNumber || ''); // Will be masked
        setIfscCode(details.ifscCode || '');
        setBankName(details.bankName || '');
        setBranch(details.branch || '');
        setUpiId(details.upiId || '');
        setIsVerified(details.isVerified || false);
      } else {
        setIsEditing(true); // Enable editing for new entry
      }
    } catch (error) {
      console.error('Error fetching bank details:', error);
      if (error.response?.status === 404) {
        setIsEditing(true); // Enable editing for new entry
      } else {
        Alert.alert('Error', 'Failed to load bank details');
      }
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!accountHolderName.trim()) {
      Alert.alert('Error', 'Please enter account holder name');
      return false;
    }

    if (!accountNumber.trim()) {
      Alert.alert('Error', 'Please enter account number');
      return false;
    }

    if (isEditing && accountNumber !== confirmAccountNumber) {
      Alert.alert('Error', 'Account numbers do not match');
      return false;
    }

    if (accountNumber.length < 9 || accountNumber.length > 18) {
      Alert.alert('Error', 'Please enter a valid account number (9-18 digits)');
      return false;
    }

    if (!bankName.trim()) {
      Alert.alert('Error', 'Please enter bank name');
      return false;
    }

    if (ifscCode && ifscCode.length !== 11) {
      Alert.alert('Error', 'IFSC code must be 11 characters');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      const endpoint = hasBankDetails
        ? 'rider-wallet/bank-details'
        : 'rider-wallet/bank-details';

      const method = hasBankDetails ? 'put' : 'post';

      const payload = {
        riderId,
        accountHolderName: accountHolderName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
        bankName: bankName.trim(),
        branch: branch.trim(),
        upiId: upiId.trim(),
      };

      const response = await axios[method](
        API_CONFIG.getEndpoint(endpoint),
        payload
      );

      if (response.data) {
        Alert.alert(
          'Success',
          hasBankDetails
            ? 'Bank details updated successfully. Please wait for admin verification.'
            : 'Bank details added successfully. Please wait for admin verification.',
          [
            {
              text: 'OK',
              onPress: () => {
                setIsEditing(false);
                fetchBankDetails();
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error saving bank details:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save bank details');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setConfirmAccountNumber(accountNumber);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (hasBankDetails) {
      fetchBankDetails();
    } else {
      navigation.goBack();
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={scale(24)} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bank Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EC4D4A" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={scale(24)} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bank Details</Text>
        {hasBankDetails && !isEditing && (
          <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
            <Icon name="edit" size={scale(20)} color="#EC4D4A" />
          </TouchableOpacity>
        )}
        {!hasBankDetails && <View style={styles.headerSpacer} />}
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Verification Status */}
        {hasBankDetails && !isEditing && (
          <View style={[styles.statusCard, isVerified ? styles.verifiedCard : styles.pendingCard]}>
            <Icon
              name={isVerified ? 'verified' : 'schedule'}
              size={scale(24)}
              color={isVerified ? '#4BB543' : '#FF9800'}
            />
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusTitle}>
                {isVerified ? 'Verified' : 'Pending Verification'}
              </Text>
              <Text style={styles.statusSubtitle}>
                {isVerified
                  ? 'Your bank details are verified'
                  : 'Your bank details are under admin verification'}
              </Text>
            </View>
          </View>
        )}

        {/* Form */}
        <View style={styles.form}>
          {/* Account Holder Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Account Holder Name *</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={accountHolderName}
              onChangeText={setAccountHolderName}
              placeholder="Enter account holder name"
              placeholderTextColor="#999"
              editable={isEditing}
              autoCapitalize="words"
            />
          </View>

          {/* Account Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Account Number *</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder="Enter account number"
              placeholderTextColor="#999"
              keyboardType="numeric"
              editable={isEditing}
              maxLength={18}
              secureTextEntry={!isEditing && hasBankDetails}
            />
          </View>

          {/* Confirm Account Number (only in edit mode) */}
          {isEditing && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Account Number *</Text>
              <TextInput
                style={styles.input}
                value={confirmAccountNumber}
                onChangeText={setConfirmAccountNumber}
                placeholder="Re-enter account number"
                placeholderTextColor="#999"
                keyboardType="numeric"
                maxLength={18}
              />
            </View>
          )}

          {/* IFSC Code */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>IFSC Code</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={ifscCode}
              onChangeText={(text) => setIfscCode(text.toUpperCase())}
              placeholder="Enter IFSC code"
              placeholderTextColor="#999"
              editable={isEditing}
              autoCapitalize="characters"
              maxLength={11}
            />
          </View>

          {/* Bank Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bank Name *</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={bankName}
              onChangeText={setBankName}
              placeholder="Enter bank name"
              placeholderTextColor="#999"
              editable={isEditing}
              autoCapitalize="words"
            />
          </View>

          {/* Branch */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Branch</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={branch}
              onChangeText={setBranch}
              placeholder="Enter branch name"
              placeholderTextColor="#999"
              editable={isEditing}
              autoCapitalize="words"
            />
          </View>

          {/* UPI ID */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>UPI ID (Optional)</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={upiId}
              onChangeText={setUpiId}
              placeholder="Enter UPI ID"
              placeholderTextColor="#999"
              editable={isEditing}
              autoCapitalize="none"
            />
          </View>

          {/* Note */}
          {isEditing && (
            <View style={styles.noteCard}>
              <Icon name="info" size={scale(20)} color="#FF9800" />
              <Text style={styles.noteText}>
                Please ensure your bank details are correct. They will be verified by admin before you can request withdrawals.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fixed Action Buttons at Bottom */}
      {isEditing && (
        <View style={[styles.fixedButtonContainer, { paddingBottom: insets.bottom || SPACING.md }]}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Details</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: 'bold',
    color: '#000',
  },
  editButton: {
    padding: SPACING.xs,
  },
  headerSpacer: {
    width: scale(32),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.regular,
    color: '#666',
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: verticalScale(100), // Add space for fixed buttons
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: scale(10),
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  verifiedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4BB543',
  },
  pendingCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  statusTextContainer: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  statusTitle: {
    fontSize: FONT_SIZES.regular,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: verticalScale(2),
  },
  statusSubtitle: {
    fontSize: FONT_SIZES.small,
    color: '#666',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: scale(10),
    padding: SPACING.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  inputGroup: {
    marginBottom: verticalScale(16),
  },
  label: {
    fontSize: FONT_SIZES.small,
    fontWeight: '600',
    color: '#333',
    marginBottom: verticalScale(6),
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderRadius: scale(8),
    paddingHorizontal: SPACING.md,
    paddingVertical: verticalScale(12),
    fontSize: FONT_SIZES.regular,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  inputDisabled: {
    backgroundColor: '#f0f0f0',
    color: '#666',
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff9e6',
    borderRadius: scale(8),
    padding: SPACING.md,
    marginVertical: verticalScale(16),
  },
  noteText: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.small,
    color: '#666',
    lineHeight: verticalScale(18),
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: verticalScale(8),
  },
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  button: {
    flex: 1,
    paddingVertical: verticalScale(14),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#EC4D4A',
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.regular,
    fontWeight: '600',
    color: '#EC4D4A',
  },
  saveButton: {
    backgroundColor: '#EC4D4A',
  },
  saveButtonText: {
    fontSize: FONT_SIZES.regular,
    fontWeight: 'bold',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default BankDetailsScreen;
