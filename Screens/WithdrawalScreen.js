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
  xxlarge: moderateScale(24),
};

const WithdrawalScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [riderId, setRiderId] = useState(null);
  const [balance, setBalance] = useState(0);
  const [hasBankDetails, setHasBankDetails] = useState(false);
  const [isBankVerified, setIsBankVerified] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  
  const [amount, setAmount] = useState('');
  const [withdrawalFee, setWithdrawalFee] = useState(0);
  const [netAmount, setNetAmount] = useState(0);
  const [minimumBalance, setMinimumBalance] = useState(100);
  const [minimumWithdrawal, setMinimumWithdrawal] = useState(500);
  const [dailyLimit, setDailyLimit] = useState(10000);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    calculateNetAmount();
  }, [amount]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const storedRiderId = await AsyncStorage.getItem('riderId');
      setRiderId(storedRiderId);

      if (!storedRiderId) {
        Alert.alert('Error', 'Rider information not found');
        return;
      }

      // Fetch wallet balance
      const phone = await AsyncStorage.getItem('number');
      const balanceResponse = await axios.get(
        API_CONFIG.getEndpoint('rider-wallet/balance'),
        { params: { phone } }
      );
      setBalance(balanceResponse.data.balance || 0);

      // Fetch bank details
      try {
        const bankResponse = await axios.get(
          API_CONFIG.getEndpoint('rider-wallet/bank-details'),
          { params: { riderId: storedRiderId } }
        );

        if (bankResponse.data.hasBankDetails) {
          setHasBankDetails(true);
          const details = bankResponse.data.bankDetails;
          setIsBankVerified(details.isVerified || false);
          setBankName(details.bankName || '');
          setAccountNumber(details.accountNumber || '');
        }
      } catch (error) {
        console.error('Error fetching bank details:', error);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const calculateNetAmount = () => {
    const amt = parseFloat(amount) || 0;
    const fee = withdrawalFee; // Currently 0
    const net = amt - fee;
    setNetAmount(net);
  };

  const quickAmount = (value) => {
    setAmount(String(value));
  };

  const validateWithdrawal = () => {
    const amt = parseFloat(amount);

    if (!amt || amt <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return false;
    }

    if (!hasBankDetails) {
      Alert.alert(
        'Bank Details Required',
        'Please add your bank details before requesting withdrawal',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Now', onPress: () => navigation.navigate('BankDetailsScreen') },
        ]
      );
      return false;
    }

    if (!isBankVerified) {
      Alert.alert(
        'Verification Pending',
        'Your bank details are pending admin verification. Please wait for approval before requesting withdrawal.',
        [{ text: 'OK' }]
      );
      return false;
    }

    if (amt < minimumWithdrawal) {
      Alert.alert('Error', `Minimum withdrawal amount is ₹${minimumWithdrawal}`);
      return false;
    }

    if (amt > dailyLimit) {
      Alert.alert('Error', `Daily withdrawal limit is ₹${dailyLimit}`);
      return false;
    }

    if (balance < amt) {
      Alert.alert('Error', `Insufficient balance. Available: ₹${balance.toFixed(2)}`);
      return false;
    }

    const remainingBalance = balance - amt;
    if (remainingBalance < minimumBalance) {
      Alert.alert(
        'Error',
        `Minimum balance of ₹${minimumBalance} must be maintained.\nAfter withdrawal, you'll have ₹${remainingBalance.toFixed(2)}`
      );
      return false;
    }

    return true;
  };

  const handleWithdrawal = async () => {
    if (!validateWithdrawal()) return;

    Alert.alert(
      'Confirm Withdrawal',
      `Request withdrawal of ₹${amount}?\n\nAmount will be credited to:\n${bankName}\nAccount: ${accountNumber}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setRequesting(true);

              const response = await axios.post(
                API_CONFIG.getEndpoint('rider-wallet/withdrawal/request'),
                {
                  riderId,
                  amount: parseFloat(amount),
                  paymentMethod: 'bank_transfer',
                }
              );

              if (response.data) {
                Alert.alert(
                  'Success',
                  `Withdrawal request of ₹${amount} submitted successfully!\n\nTransaction ID: ${response.data.withdrawal.transactionId}\n\nYour request will be processed within 24-48 hours.`,
                  [
                    {
                      text: 'OK',
                      onPress: () => navigation.goBack(),
                    },
                  ]
                );
              }
            } catch (error) {
              console.error('Withdrawal error:', error);
              const errorMsg = error.response?.data?.message || 'Failed to process withdrawal request';
              Alert.alert('Error', errorMsg);
            } finally {
              setRequesting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={scale(24)} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Withdraw Money</Text>
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
        <Text style={styles.headerTitle}>Withdraw Money</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>₹{balance.toFixed(2)}</Text>
          <Text style={styles.withdrawableText}>
            Withdrawable: ₹{Math.max(0, balance - minimumBalance).toFixed(2)}
          </Text>
        </View>

        {/* Bank Details Status */}
        {!hasBankDetails ? (
          <TouchableOpacity
            style={styles.warningCard}
            onPress={() => navigation.navigate('BankDetailsScreen')}
          >
            <Icon name="warning" size={scale(24)} color="#FF9800" />
            <View style={styles.warningTextContainer}>
              <Text style={styles.warningTitle}>No Bank Details</Text>
              <Text style={styles.warningSubtitle}>Add bank details to withdraw</Text>
            </View>
            <Icon name="chevron-right" size={scale(24)} color="#FF9800" />
          </TouchableOpacity>
        ) : !isBankVerified ? (
          <View style={styles.warningCard}>
            <Icon name="schedule" size={scale(24)} color="#FF9800" />
            <View style={styles.warningTextContainer}>
              <Text style={styles.warningTitle}>Verification Pending</Text>
              <Text style={styles.warningSubtitle}>Bank details under verification</Text>
            </View>
          </View>
        ) : (
          <View style={styles.bankCard}>
            <Icon name="verified" size={scale(24)} color="#4BB543" />
            <View style={styles.bankTextContainer}>
              <Text style={styles.bankTitle}>{bankName}</Text>
              <Text style={styles.bankSubtitle}>Account: {accountNumber}</Text>
            </View>
          </View>
        )}

        {/* Withdrawal Form */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Enter Amount</Text>

          {/* Quick Amount Buttons */}
          <View style={styles.quickAmountRow}>
            {[500, 1000, 2000, 5000].map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.quickAmountButton,
                  amount === String(value) && styles.quickAmountButtonActive,
                ]}
                onPress={() => quickAmount(value)}
                disabled={!hasBankDetails || !isBankVerified}
              >
                <Text
                  style={[
                    styles.quickAmountText,
                    amount === String(value) && styles.quickAmountTextActive,
                  ]}
                >
                  ₹{value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Amount Input */}
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter amount"
            placeholderTextColor="#999"
            keyboardType="numeric"
            editable={hasBankDetails && isBankVerified}
          />

          {/* Breakdown */}
          {amount && parseFloat(amount) > 0 && (
            <View style={styles.breakdownCard}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Withdrawal Amount</Text>
                <Text style={styles.breakdownValue}>₹{parseFloat(amount).toFixed(2)}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Processing Fee</Text>
                <Text style={styles.breakdownValue}>₹{withdrawalFee.toFixed(2)}</Text>
              </View>
              <View style={styles.breakdownDivider} />
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabelBold}>You'll Receive</Text>
                <Text style={styles.breakdownValueBold}>₹{netAmount.toFixed(2)}</Text>
              </View>
            </View>
          )}

          {/* Info Notes */}
          <View style={styles.infoCard}>
            <Icon name="info" size={scale(18)} color="#2196F3" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoText}>• Minimum withdrawal: ₹{minimumWithdrawal}</Text>
              <Text style={styles.infoText}>• Daily limit: ₹{dailyLimit}</Text>
              <Text style={styles.infoText}>• Minimum balance to maintain: ₹{minimumBalance}</Text>
              <Text style={styles.infoText}>• Processing time: 24-48 hours</Text>
              <Text style={styles.infoText}>• Zero processing fee</Text>
            </View>
          </View>

          {/* Withdraw Button */}
          <TouchableOpacity
            style={[
              styles.withdrawButton,
              (!hasBankDetails || !isBankVerified || requesting) && styles.withdrawButtonDisabled,
            ]}
            onPress={handleWithdrawal}
            disabled={!hasBankDetails || !isBankVerified || requesting}
          >
            {requesting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.withdrawButtonText}>Request Withdrawal</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Withdrawal History Link */}
        <TouchableOpacity
          style={styles.historyLink}
          onPress={() => navigation.navigate('WithdrawalHistoryScreen')}
        >
          <Text style={styles.historyLinkText}>View Withdrawal History</Text>
          <Icon name="chevron-right" size={scale(20)} color="#EC4D4A" />
        </TouchableOpacity>
      </ScrollView>
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
  },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: scale(12),
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#EC4D4A',
  },
  balanceLabel: {
    fontSize: FONT_SIZES.small,
    color: '#888',
    fontWeight: '600',
    marginBottom: verticalScale(4),
  },
  balanceAmount: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: 'bold',
    color: '#EC4D4A',
    marginBottom: verticalScale(4),
  },
  withdrawableText: {
    fontSize: FONT_SIZES.small,
    color: '#666',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff9e6',
    borderRadius: scale(10),
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  warningTextContainer: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  warningTitle: {
    fontSize: FONT_SIZES.regular,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: verticalScale(2),
  },
  warningSubtitle: {
    fontSize: FONT_SIZES.small,
    color: '#666',
  },
  bankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    borderRadius: scale(10),
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#4BB543',
  },
  bankTextContainer: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  bankTitle: {
    fontSize: FONT_SIZES.regular,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: verticalScale(2),
  },
  bankSubtitle: {
    fontSize: FONT_SIZES.small,
    color: '#666',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: scale(12),
    padding: SPACING.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.medium,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: verticalScale(12),
  },
  quickAmountRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: verticalScale(16),
  },
  quickAmountButton: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: scale(8),
    paddingVertical: isSmallDevice ? verticalScale(10) : verticalScale(12),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    minHeight: verticalScale(44),
  },
  quickAmountButtonActive: {
    backgroundColor: '#fff4f0',
    borderColor: '#EC4D4A',
  },
  quickAmountText: {
    fontSize: FONT_SIZES.regular,
    fontWeight: '600',
    color: '#666',
  },
  quickAmountTextActive: {
    color: '#EC4D4A',
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderRadius: scale(10),
    paddingHorizontal: SPACING.md,
    paddingVertical: verticalScale(14),
    fontSize: isSmallDevice ? FONT_SIZES.medium : FONT_SIZES.large,
    fontWeight: 'bold',
    color: '#333',
    borderWidth: 1.5,
    borderColor: '#EC4D4A',
    textAlign: 'center',
    marginBottom: verticalScale(16),
    minHeight: verticalScale(50),
  },
  breakdownCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: scale(8),
    padding: SPACING.md,
    marginBottom: verticalScale(16),
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(8),
  },
  breakdownLabel: {
    fontSize: FONT_SIZES.regular,
    color: '#666',
  },
  breakdownValue: {
    fontSize: FONT_SIZES.regular,
    color: '#333',
    fontWeight: '500',
  },
  breakdownLabelBold: {
    fontSize: FONT_SIZES.regular,
    color: '#333',
    fontWeight: 'bold',
  },
  breakdownValueBold: {
    fontSize: FONT_SIZES.regular,
    color: '#EC4D4A',
    fontWeight: 'bold',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: verticalScale(8),
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e3f2fd',
    borderRadius: scale(8),
    padding: SPACING.md,
    marginBottom: verticalScale(16),
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  infoText: {
    fontSize: FONT_SIZES.small,
    color: '#666',
    marginBottom: verticalScale(4),
    lineHeight: verticalScale(18),
  },
  withdrawButton: {
    backgroundColor: '#EC4D4A',
    borderRadius: scale(10),
    paddingVertical: verticalScale(14),
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#EC4D4A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  withdrawButtonText: {
    fontSize: FONT_SIZES.regular,
    fontWeight: 'bold',
    color: '#fff',
  },
  withdrawButtonDisabled: {
    opacity: 0.5,
  },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(16),
  },
  historyLinkText: {
    fontSize: FONT_SIZES.regular,
    color: '#EC4D4A',
    fontWeight: '600',
    marginRight: SPACING.xs,
  },
});

export default WithdrawalScreen;
