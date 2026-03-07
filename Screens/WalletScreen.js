import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_CONFIG } from "../config/api";

const { width, height } = Dimensions.get("window");

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

// Responsive spacing
const SPACING = {
  xs: scale(4),
  sm: scale(8),
  md: scale(12),
  lg: scale(16),
  xl: scale(20),
  xxl: scale(24),
};

// Responsive font sizes
const FONT_SIZES = {
  tiny: moderateScale(10),
  small: moderateScale(12),
  regular: moderateScale(14),
  medium: moderateScale(16),
  large: moderateScale(18),
  xlarge: moderateScale(20),
  xxlarge: moderateScale(24),
  xxxlarge: moderateScale(28),
};

const FONT_SIZE = FONT_SIZES.regular;

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("WalletScreen Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <Icon name="error-outline" size={64} color="#EC4D4A" />
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              marginTop: 20,
              marginBottom: 10,
            }}
          >
            Something went wrong
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#666",
              textAlign: "center",
              marginBottom: 20,
            }}
          >
            {this.state.error?.message || "An unexpected error occurred"}
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: "#EC4D4A",
              paddingHorizontal: 30,
              paddingVertical: 12,
              borderRadius: 8,
            }}
            onPress={() => {
              this.setState({ hasError: false, error: null });
              this.props.navigation?.goBack();
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const WalletScreen = ({ navigation: navProp }) => {
  const navigationHook = useNavigation();
  const navigation = navProp || navigationHook;
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState(0);
  const [popupMessage, setPopupMessage] = useState("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [riderId, setRiderId] = useState(null);
  const [activeTab, setActiveTab] = useState("transactions"); // 'transactions' or 'recharges'
  const popupAnim = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;

  // Fetch rider details and wallet balance on mount
  useEffect(() => {
    fetchRiderDetails();
  }, []);

  // Fetch rider details from AsyncStorage
  const fetchRiderDetails = async () => {
    try {
      setLoading(true);
      const phone = await AsyncStorage.getItem("number");
      if (!phone) {
        Alert.alert("Error", "Please login again");
        return;
      }

      // Fetch rider data from backend
      const riderResponse = await axios.get(
        API_CONFIG.getEndpoint("riders/get/rider"),
        { params: { number: phone } }
      );

      if (riderResponse.data && riderResponse.data.data) {
        const rider = riderResponse.data.data;
        setRiderId(rider._id);
        
        // Fetch wallet balance from rider-wallet endpoint
        const balanceResponse = await axios.get(
          API_CONFIG.getEndpoint("rider-wallet/balance"),
          { params: { phone } }
        );
        
        const walletBalance = balanceResponse.data.balance || 0;
        setBalance(walletBalance);
        
        // Save to AsyncStorage for offline access
        await AsyncStorage.setItem("riderId", rider._id);
        await AsyncStorage.setItem("walletBalance", String(walletBalance));
        
        // Fetch transaction history
        await fetchTransactions(rider._id);
      }
    } catch (error) {
      console.error("Error fetching rider details:", error);
      // Load from AsyncStorage if backend fails
      await loadOfflineData();
    } finally {
      setLoading(false);
    }
  };

  // Load offline data from AsyncStorage
  const loadOfflineData = async () => {
    try {
      const storedRiderId = await AsyncStorage.getItem("riderId");
      const storedBalance = await AsyncStorage.getItem("walletBalance");
      const storedTransactions = await AsyncStorage.getItem("walletTransactions");

      if (storedRiderId) setRiderId(storedRiderId);
      if (storedBalance) setBalance(Number(storedBalance));
      if (storedTransactions) setTransactions(JSON.parse(storedTransactions));
    } catch (error) {
      console.error("Error loading offline data:", error);
    }
  };

  // Fetch transaction history from backend
  const fetchTransactions = async (riderId) => {
    try {
      setLoadingTransactions(true);
      const response = await axios.get(
        API_CONFIG.getEndpoint("rider-wallet/transactions/detailed"),
        { params: { riderId, limit: 50 } }
      );

      // Backend returns array directly, not wrapped in transactions property
      if (response.data && Array.isArray(response.data)) {
        const formattedTransactions = response.data.map((txn) => ({
          id: txn._id,
          transactionId: txn.transactionId || `TXN${txn._id.slice(-8).toUpperCase()}`,
          amount: Math.abs(txn.amount || 0),
          type: txn.type,
          category: txn.category,
          status: txn.status,
          date: new Date(txn.createdAt).toLocaleDateString('en-IN', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
          }),
          time: new Date(txn.createdAt).toLocaleTimeString('en-IN', {
            hour: "2-digit",
            minute: "2-digit",
          }),
          timestamp: new Date(txn.createdAt).getTime(),
          description: txn.description || getCategoryLabel(txn.category) || "Wallet transaction",
          bookingId: txn.bookingId,
          metadata: txn.metadata,
        }));

        setTransactions(formattedTransactions);
        // Save to AsyncStorage
        await AsyncStorage.setItem(
          "walletTransactions",
          JSON.stringify(formattedTransactions)
        );
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      // Try fallback to history endpoint
      try {
        const fallbackResponse = await axios.get(
          API_CONFIG.getEndpoint("rider-wallet/history"),
          { params: { riderId } }
        );
        if (fallbackResponse.data && Array.isArray(fallbackResponse.data)) {
          const formattedTransactions = fallbackResponse.data.map((txn) => ({
            id: txn._id,
            transactionId: txn.transactionId || `TXN${txn._id.slice(-8).toUpperCase()}`,
            amount: Math.abs(txn.amount || 0),
            type: txn.type,
            category: txn.category || 'other',
            status: txn.status || 'completed',
            date: new Date(txn.createdAt).toLocaleDateString(),
            time: new Date(txn.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            timestamp: new Date(txn.createdAt).getTime(),
            description: txn.description || "Wallet transaction",
            bookingId: txn.bookingId,
          }));
          setTransactions(formattedTransactions);
        }
      } catch (fallbackError) {
        console.error("Fallback fetch also failed:", fallbackError);
      }
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Get category label helper
  const getCategoryLabel = (category) => {
    const labels = {
      booking_earning: 'Booking Earning',
      recharge: 'Wallet Recharge',
      withdrawal: 'Withdrawal',
      refund: 'Refund',
      deduction: 'Deduction',
      penalty: 'Penalty',
      bonus: 'Bonus',
      platform_fee: 'Platform Fee',
      commission: 'Commission',
      adjustment: 'Adjustment',
      other: 'Transaction'
    };
    return labels[category] || 'Transaction';
  };

  // Refresh data
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRiderDetails();
    setRefreshing(false);
  };

  const quickAdd = (value) => {
    setAmount(String(value));
  };

  const showPopup = (message) => {
    setPopupMessage(message);
    setShowSuccessPopup(true);

    Animated.sequence([
      Animated.timing(popupAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.delay(1500),
      Animated.timing(popupAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => setShowSuccessPopup(false));
  };

  const generateTransactionId = () => {
    return "TXN" + Math.random().toString(36).substr(2, 9).toUpperCase();
  };

  const handleAddFunds = async () => {
    const fund = Number(amount);
    if (!fund || fund <= 0) {
      Alert.alert(
        "Invalid Amount",
        "Please enter a valid amount greater than 0"
      );
      return;
    }

    if (!riderId) {
      Alert.alert("Error", "Rider information not found. Please try again.");
      return;
    }

    try {
      setLoading(true);

      // ==========================================
      // PAYMENT GATEWAY INTEGRATION (COMMENTED)
      // ==========================================
      // Uncomment and configure when ready to integrate payment gateway
      
      /*
      // Example: Razorpay Integration
      const razorpayOptions = {
        description: 'Wallet Top-up',
        image: 'https://your-logo-url.com/logo.png',
        currency: 'INR',
        key: 'YOUR_RAZORPAY_KEY_ID', // Get from Razorpay Dashboard
        amount: fund * 100, // Amount in paise (multiply by 100)
        name: 'Ridodrop',
        prefill: {
          email: 'rider@example.com',
          contact: await AsyncStorage.getItem('number'),
          name: 'Rider Name'
        },
        theme: { color: '#EC4D4A' }
      };

      RazorpayCheckout.open(razorpayOptions)
        .then(async (paymentData) => {
          // Payment successful
          console.log('Payment Success:', paymentData);
          
          // Verify payment on backend
          const verifyResponse = await axios.post(
            API_CONFIG.getEndpoint('wallet/verify-payment'),
            {
              razorpay_payment_id: paymentData.razorpay_payment_id,
              razorpay_order_id: paymentData.razorpay_order_id,
              razorpay_signature: paymentData.razorpay_signature,
              userId: riderId,
              amount: fund
            }
          );

          if (verifyResponse.data.success) {
            // Credit wallet after successful payment verification
            await creditWalletAfterPayment(fund, paymentData.razorpay_payment_id);
          }
        })
        .catch((error) => {
          console.log('Payment Error:', error);
          Alert.alert('Payment Failed', error.description || 'Payment was not completed');
        });
      */

      /*
      // Example: Stripe Integration
      const { error, paymentIntent } = await stripe.confirmPayment({
        amount: fund * 100, // Amount in cents
        currency: 'inr',
        paymentMethodType: 'card',
      });

      if (error) {
        Alert.alert('Payment Failed', error.message);
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        await creditWalletAfterPayment(fund, paymentIntent.id);
      }
      */

      /*
      // Example: PayPal Integration
      const paypalResponse = await PayPal.paymentRequest({
        amount: fund.toString(),
        currency: 'INR',
        description: 'Wallet Top-up'
      });

      if (paypalResponse.status === 'COMPLETED') {
        await creditWalletAfterPayment(fund, paypalResponse.id);
      }
      */

      // ==========================================
      // END OF PAYMENT GATEWAY INTEGRATION
      // ==========================================

      // FOR DEMO/TESTING: Direct wallet credit without payment gateway
      // Remove this section when payment gateway is integrated
      await creditWalletDirectly(fund);

    } catch (error) {
      console.error("Error adding funds:", error);
      Alert.alert("Error", "Failed to add funds. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Credit wallet after successful payment (for payment gateway integration)
  const creditWalletAfterPayment = async (fund, paymentId) => {
    try {
      const response = await axios.post(
        API_CONFIG.getEndpoint("rider-wallet/credit"),
        {
          riderId: riderId,
          amount: fund,
          description: `Wallet top-up - Payment ID: ${paymentId}`,
        }
      );

      if (response.data) {
        const newBalance = balance + fund;
        setBalance(newBalance);
        await AsyncStorage.setItem("walletBalance", String(newBalance));

        // Refresh transactions
        await fetchTransactions(riderId);
        
        // Check if rider was unblocked - just show success popup, no alert
        if (response.data.unblocked === true) {
          showPopup(`₹${fund} added successfully!`);
        } else {
          showPopup(`₹${fund} added successfully!`);
        }
        
        setAmount("");
      }
    } catch (error) {
      console.error("Error crediting wallet:", error);
      Alert.alert("Error", "Payment successful but wallet update failed. Please contact support.");
    }
  };

  // Direct wallet credit (for demo/testing without payment gateway)
  const creditWalletDirectly = async (fund) => {
    try {
      const response = await axios.post(
        API_CONFIG.getEndpoint("rider-wallet/add"),
        {
          riderId: riderId,
          amount: fund,
        }
      );

      if (response.data) {
        const newBalance = balance + fund;
        setBalance(newBalance);
        await AsyncStorage.setItem("walletBalance", String(newBalance));

        // Refresh transactions
        await fetchTransactions(riderId);
        
        // Close the recharge modal
        setShowRechargeModal(false);
        
        // Check if rider was unblocked - navigate without alert
        if (response.data.unblocked === true) {
          // Directly navigate to home, the push notification will show the success message
          navigation.navigate('Home', { 
            walletRecharged: true,
            newBalance: response.data.balance
          });
        } else {
          showPopup(`₹${fund} added successfully!`);
        }
        
        setAmount("");
      }
    } catch (error) {
      console.error("Error crediting wallet:", error);
      throw error;
    }
  };

  const popupTranslateY = popupAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });

  const formatAmount = (amount) => {
    if (typeof amount !== "number") {
      amount = Number(amount) || 0;
    }
    return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const filterTransactions = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneWeekAgo = new Date(now.getTime() - 604800000);
    const oneMonthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    );

    switch (activeFilter) {
      case "today":
        return transactions.filter((txn) => new Date(txn.timestamp) >= today);
      case "weekly":
        return transactions.filter(
          (txn) => new Date(txn.timestamp) >= oneWeekAgo
        );
      case "monthly":
        return transactions.filter(
          (txn) => new Date(txn.timestamp) >= oneMonthAgo
        );
      default:
        return transactions;
    }
  };

  const applyFilter = (filterType) => {
    setActiveFilter(filterType);
    setShowFilterModal(false);
  };

  const resetFilter = () => {
    setActiveFilter("all");
    setShowFilterModal(false);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.mainContainer}
      behavior='padding'
      keyboardVerticalOffset={0}
    >
      {/* Header - Fixed at top */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={scale(24)} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#EC4D4A"]}
            tintColor="#EC4D4A"
          />
        }
        keyboardShouldPersistTaps="handled"
      >

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#EC4D4A" />
            <Text style={styles.loadingText}>Loading wallet...</Text>
          </View>
        ) : (
          <>
            {/* Balance Card */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>WALLET BALANCE</Text>
                <TouchableOpacity onPress={onRefresh}>
                  <Icon name="refresh" size={scale(18)} color="#888" />
                </TouchableOpacity>
              </View>
              <Text style={styles.balanceAmount}>₹{formatAmount(balance)}</Text>
              
              {/* Action Buttons */}
              <View style={styles.balanceActions}>
                <TouchableOpacity 
                  style={styles.withdrawButton}
                  onPress={() => navigation.navigate('WithdrawalScreen')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.withdrawButtonText}>Withdraw</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.addMoneyButton}
                  onPress={() => setShowRechargeModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.addMoneyButtonText}>Add Money</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.minBalanceText}>Minimum balance to maintain: ₹100</Text>
            </View>

            {/* Bank Details Section */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Your Bank Details</Text>
              <TouchableOpacity 
                style={styles.optionCard}
                onPress={() => navigation.navigate('BankDetailsScreen')}
                activeOpacity={0.7}
              >
                <View style={styles.optionLeft}>
                  <View style={styles.optionIconContainer}>
                    <Icon name="account-balance" size={scale(22)} color="#EC4D4A" />
                  </View>
                  <Text style={styles.optionText}>Manage your bank details</Text>
                </View>
                <Icon name="chevron-right" size={scale(24)} color="#888" />
              </TouchableOpacity>
            </View>

            {/* Balance Details Section */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Balance Details</Text>
              <TouchableOpacity 
                style={styles.optionCard}
                onPress={() => navigation.navigate('BalanceDetailsScreen')}
                activeOpacity={0.7}
              >
                <View style={styles.optionLeft}>
                  <View style={styles.optionIconContainer}>
                    <Icon name="assessment" size={scale(22)} color="#EC4D4A" />
                  </View>
                  <Text style={styles.optionText}>Complete transaction history</Text>
                </View>
                <Icon name="chevron-right" size={scale(24)} color="#888" />
              </TouchableOpacity>
            </View>

            {/* Recent Transactions Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                <View style={styles.headerActions}>
                  <TouchableOpacity
                    style={styles.filterIconButton}
                    onPress={() => setShowFilterModal(true)}
                    activeOpacity={0.7}
                  >
                    <Icon name="filter-list" size={scale(20)} color="#EC4D4A" />
                    {activeFilter !== 'all' && (
                      <View style={styles.filterBadge} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => navigation.navigate('BalanceDetailsScreen')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewAllText}>View All</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Tabs */}
              <View style={styles.tabsContainer}>
                <TouchableOpacity
                  style={[
                    styles.tab,
                    activeTab === 'transactions' && styles.activeTab
                  ]}
                  onPress={() => setActiveTab('transactions')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.tabText,
                    activeTab === 'transactions' && styles.activeTabText
                  ]}>
                    Transactions
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.tab,
                    activeTab === 'recharges' && styles.activeTab
                  ]}
                  onPress={() => setActiveTab('recharges')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.tabText,
                    activeTab === 'recharges' && styles.activeTabText
                  ]}>
                    Recharges
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Active Filter Indicator */}
              {activeFilter !== 'all' && (
                <View style={styles.activeFilterChip}>
                  <Icon name="filter-list" size={scale(14)} color="#EC4D4A" />
                  <Text style={styles.activeFilterText}>
                    {activeFilter === 'today' ? 'Today' : 
                     activeFilter === 'weekly' ? 'This Week' : 
                     activeFilter === 'monthly' ? 'This Month' : 'All'}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => setActiveFilter('all')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon name="close" size={scale(14)} color="#EC4D4A" />
                  </TouchableOpacity>
                </View>
              )}

              {loadingTransactions ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#EC4D4A" />
                </View>
              ) : (() => {
                // First filter by tab (transactions vs recharges)
                let filteredTransactions = activeTab === 'recharges'
                  ? transactions.filter(txn => txn.category === 'recharge')
                  : transactions.filter(txn => txn.category !== 'recharge');
                
                // Then apply date filter
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

                if (activeFilter === 'today') {
                  filteredTransactions = filteredTransactions.filter(txn => 
                    txn.timestamp >= today.getTime()
                  );
                } else if (activeFilter === 'weekly') {
                  filteredTransactions = filteredTransactions.filter(txn => 
                    txn.timestamp >= oneWeekAgo.getTime()
                  );
                } else if (activeFilter === 'monthly') {
                  filteredTransactions = filteredTransactions.filter(txn => 
                    txn.timestamp >= oneMonthAgo.getTime()
                  );
                }
                
                return filteredTransactions.slice(0, 5).length === 0 ? (
                  <View style={styles.emptyState}>
                    <Icon name="receipt-long" size={scale(40)} color="#ccc" />
                    <Text style={styles.emptyStateText}>
                      {activeTab === 'recharges' ? 'No recharges yet' : 'No recent transactions'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.recentTransactionsList}>
                    {filteredTransactions.slice(0, 5).map((txn) => {
                    const isCredit = txn.type === "credit";
                    const iconName = {
                      'booking_earning': 'money',
                      'recharge': 'add-circle',
                      'withdrawal': 'remove-circle',
                      'refund': 'replay',
                      'deduction': 'remove',
                      'bonus': 'star',
                    }[txn.category] || (isCredit ? "arrow-downward" : "arrow-upward");
                    
                    return (
                    <TouchableOpacity 
                      key={txn.id} 
                      style={styles.recentTransactionCard}
                      activeOpacity={0.7}
                      onPress={() => navigation.navigate('BalanceDetailsScreen')}
                    >
                      <View style={styles.transactionLeft}>
                        <View style={[
                          styles.transactionIcon,
                          { backgroundColor: isCredit ? "#E8F5E9" : "#FFEBEE" }
                        ]}>
                          <Icon
                            name={iconName}
                            size={scale(16)}
                            color={isCredit ? "#4BB543" : "#EC4D4A"}
                          />
                        </View>
                        <View style={styles.transactionInfo}>
                          <Text style={styles.transactionTitle} numberOfLines={1}>
                            {txn.description}
                          </Text>
                          <Text style={styles.transactionTime}>
                            {txn.date} • {txn.time}
                          </Text>
                          {txn.status && txn.status !== 'completed' && (
                            <Text style={[styles.statusBadge, {
                              color: txn.status === 'pending' ? '#FF9800' : 
                                     txn.status === 'failed' ? '#F44336' : '#2196F3'
                            }]}>
                              {txn.status.toUpperCase()}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.transactionRight}>
                        <Text style={[
                          styles.transactionAmountText,
                          { color: isCredit ? "#4BB543" : "#EC4D4A" }
                        ]}>
                          {isCredit ? "+" : "-"}₹{formatAmount(txn.amount || 0)}
                        </Text>
                        {txn.bookingId && typeof txn.bookingId === 'string' && (
                          <Text style={styles.bookingIdText} numberOfLines={1}>
                            #{txn.bookingId.slice(-6)}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  )})}
                </View>
                );
              })()}
            </View>

            {/* Success Popup */}
            {showSuccessPopup && (
              <Animated.View
                style={[
                  styles.popup,
                  { transform: [{ translateY: popupTranslateY }] },
                ]}
              >
                <Text style={styles.popupText}>{popupMessage}</Text>
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>

      {/* Filter Modal */}
      {/* <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowFilterModal(false)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.filterOption}
              onPress={() => applyFilter('today')}
            >
              <Text style={styles.filterOptionText}>Today</Text>
              {activeFilter === 'today' && <Icon name="check" size={width * 0.05} color="#4BB543" />}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.filterOption}
              onPress={() => applyFilter('weekly')}
            >
              <Text style={styles.filterOptionText}>Weekly</Text>
              {activeFilter === 'weekly' && <Icon name="check" size={width * 0.05} color="#4BB543" />}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.filterOption}
              onPress={() => applyFilter('monthly')}
            >
              <Text style={styles.filterOptionText}>Monthly</Text>
              {activeFilter === 'monthly' && <Icon name="check" size={width * 0.05} color="#4BB543" />}
            </TouchableOpacity>
            
          </View>
        </TouchableOpacity>
      </Modal> */}
      {/* Recharge Modal */}
      <Modal
        visible={showRechargeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRechargeModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRechargeModal(false)}
        >
          <TouchableOpacity 
            style={styles.rechargeModalContent} 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Money to Wallet</Text>
              <TouchableOpacity
                onPress={() => setShowRechargeModal(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={scale(24)} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.rechargeModalBody}>
              <Text style={styles.currentBalanceLabel}>Current Balance</Text>
              <Text style={styles.currentBalanceAmount}>₹{formatAmount(balance)}</Text>

              <Text style={styles.quickAmountLabel}>Quick Add</Text>
              <View style={styles.quickAddRow}>
                {[100, 500, 1000, 2000].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={styles.quickAmountButton}
                    onPress={() => quickAdd(val)}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickAmountText}>₹{val}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.customAmountLabel}>Or Enter Custom Amount</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="Enter amount"
                placeholderTextColor="#999"
                style={styles.customAmountInput}
                editable={!loading}
              />

              <TouchableOpacity
                style={[styles.rechargeButton, loading && styles.rechargeButtonDisabled]}
                onPress={handleAddFunds}
                disabled={loading}
                activeOpacity={0.7}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.rechargeButtonText}>Add Money Now</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Filter Modal - Attractive Design */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Transactions</Text>
              <TouchableOpacity 
                onPress={() => setShowFilterModal(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={scale(24)} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterOptionsContainer}>
              <TouchableOpacity
                style={[
                  styles.filterOptionCard,
                  activeFilter === "today" && styles.activeFilterOption,
                ]}
                onPress={() => applyFilter("today")}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.filterIconContainer,
                  activeFilter === "today" && styles.activeFilterIconContainer
                ]}>
                  <Icon
                    name="today"
                    size={scale(18)}
                    color={activeFilter === "today" ? "#EC4D4A" : "#666"}
                  />
                </View>
                <Text
                  style={[
                    styles.filterOptionText,
                    activeFilter === "today" && styles.activeFilterText,
                  ]}
                >
                  Today
                </Text>
                {activeFilter === "today" && (
                  <View style={styles.activeIndicator} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterOptionCard,
                  activeFilter === "weekly" && styles.activeFilterOption,
                ]}
                onPress={() => applyFilter("weekly")}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.filterIconContainer,
                  activeFilter === "weekly" && styles.activeFilterIconContainer
                ]}>
                  <Icon
                    name="date-range"
                    size={scale(18)}
                    color={activeFilter === "weekly" ? "#EC4D4A" : "#666"}
                  />
                </View>
                <Text
                  style={[
                    styles.filterOptionText,
                    activeFilter === "weekly" && styles.activeFilterText,
                  ]}
                >
                  This Week
                </Text>
                {activeFilter === "weekly" && (
                  <View style={styles.activeIndicator} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterOptionCard,
                  activeFilter === "monthly" && styles.activeFilterOption,
                ]}
                onPress={() => applyFilter("monthly")}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.filterIconContainer,
                  activeFilter === "monthly" && styles.activeFilterIconContainer
                ]}>
                  <Icon
                    name="calendar-today"
                    size={scale(18)}
                    color={activeFilter === "monthly" ? "#EC4D4A" : "#666"}
                  />
                </View>
                <Text
                  style={[
                    styles.filterOptionText,
                    activeFilter === "monthly" && styles.activeFilterText,
                  ]}
                >
                  This Month
                </Text>
                {activeFilter === "monthly" && (
                  <View style={styles.activeIndicator} />
                )}
              </TouchableOpacity>

              {/* <TouchableOpacity 
          style={[
            styles.filterOptionCard,
            activeFilter === 'all' && styles.activeFilterOption
          ]}
          onPress={resetFilter}
        >
          <Icon 
            name="autorenew" 
            size={width * 0.06} 
            color={activeFilter === 'all' ? '#EC4D4A' : '#666'} 
          />
          <Text style={[
            styles.filterOptionText,
            activeFilter === 'all' && styles.activeFilterText
          ]}>Reset Filter</Text>
          {activeFilter === 'all' && (
            <View style={styles.activeIndicator} />
          )}
        </TouchableOpacity> */}
            </View>

            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.applyButtonText}>Apply Filter</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    padding: SPACING.lg,
    backgroundColor: "#fff",
    flexGrow: 1,
    paddingBottom: verticalScale(40),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    padding: SPACING.xs,
    marginLeft: -SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: "bold",
    color: "#000",
  },
  headerSpacer: {
    width: scale(32),
  },
  balanceCard: {
    backgroundColor: "#fff4f0",
    borderRadius: scale(12),
    padding: isSmallDevice ? SPACING.md : SPACING.lg,
    marginBottom: verticalScale(12),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: FONT_SIZES.small,
    color: "#666",
    fontWeight: "500",
  },
  balanceAmount: {
    fontSize: isSmallDevice ? FONT_SIZES.xlarge : FONT_SIZES.xxlarge,
    fontWeight: "bold",
    color: "#EC4D4A",
    marginTop: verticalScale(6),
  },
  balanceGradientLine: {
    height: 2,
    backgroundColor: "#EC4D4A",
    borderRadius: 1,
    marginTop: verticalScale(8),
    opacity: 0.3,
  },
  label: {
    fontSize: FONT_SIZES.small,
    color: "#444",
    marginBottom: verticalScale(6),
    fontWeight: "600",
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#EC4D4A",
    borderRadius: scale(8),
    paddingVertical: verticalScale(10),
    paddingHorizontal: SPACING.sm,
    fontSize: FONT_SIZES.regular,
    marginBottom: verticalScale(12),
    backgroundColor: "#fff",
    minHeight: verticalScale(42),
  },
  quickAddLabel: {
    fontSize: FONT_SIZES.small,
    color: "#EC4D4A",
    marginBottom: verticalScale(6),
    fontWeight: "600",
  },
  quickAddContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: verticalScale(14),
    gap: SPACING.xs,
  },
  quickAddButton: {
    borderWidth: 1,
    borderColor: "#EC4D4A",
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(8),
    borderRadius: scale(8),
    backgroundColor: "#fff",
    elevation: 1,
    shadowColor: "#EC4D4A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: verticalScale(38),
  },
  quickAddContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
  },
  quickAddText: {
    fontSize: FONT_SIZES.small,
    color: "#000",
    fontWeight: "600",
  },
  addButton: {
    backgroundColor: "#EC4D4A",
    paddingVertical: verticalScale(12),
    borderRadius: scale(8),
    alignItems: "center",
    elevation: 2,
    shadowColor: "#EC4D4A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    minHeight: verticalScale(44),
    justifyContent: "center",
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: FONT_SIZES.regular,
  },
  addButtonDisabled: {
    backgroundColor: "#ccc",
    elevation: 1,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(40),
  },
  loadingText: {
    marginTop: verticalScale(12),
    fontSize: FONT_SIZES.regular,
    color: "#666",
  },
  popup: {
    position: "absolute",
    bottom: verticalScale(40),
    left: scale(20),
    right: scale(20),
    padding: SPACING.lg,
    backgroundColor: "#4BB543",
    borderRadius: scale(10),
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  popupText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: FONT_SIZES.medium,
  },
  noTransactions: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(40),
  },
  noTransactionsText: {
    fontSize: FONT_SIZES.medium,
    color: "#888",
    fontWeight: "600",
    marginTop: verticalScale(12),
  },
  noTransactionsSubtext: {
    fontSize: FONT_SIZES.small,
    color: "#aaa",
    marginTop: verticalScale(4),
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: verticalScale(24),
    marginBottom: verticalScale(12),
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.sm,
    borderRadius: scale(8),
    backgroundColor: "#fff4f0",
  },
  filterButtonText: {
    fontSize: FONT_SIZES.small,
    color: "#EC4D4A",
    marginLeft: SPACING.xs,
    fontWeight: "600",
  },
  transactionList: {
    marginTop: verticalScale(8),
  },
  transactionCard: {
    backgroundColor: "#fff",
    borderRadius: scale(8),
    padding: SPACING.sm,
    marginBottom: verticalScale(8),
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderLeftWidth: 2,
    borderLeftColor: "#4BB543",
  },
  transactionCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: verticalScale(8),
  },
  transactionTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: SPACING.sm,
  },
  transactionIconContainer: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.xs,
  },
  transactionTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
  walletIcon: {
    marginRight: SPACING.sm,
  },
  transactionType: {
    fontSize: FONT_SIZES.regular,
    fontWeight: "500",
    color: "#333",
  },
  transactionAmount: {
    fontSize: FONT_SIZES.regular,
    fontWeight: "bold",
    color: "#4BB543",
  },
  transactionCardBody: {
    marginTop: verticalScale(4),
  },
  transactionId: {
    fontSize: FONT_SIZES.tiny,
    color: "#666",
    marginBottom: verticalScale(4),
  },
  transactionDateTime: {
    fontSize: FONT_SIZES.tiny,
    color: "#888",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    padding: SPACING.lg,
    paddingBottom: verticalScale(24),
    maxHeight: height * 0.55,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(20),
  },
  modalTitle: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "bold",
    color: "#333",
  },
  modalCloseButton: {
    padding: SPACING.xs,
  },
  filterOptionsContainer: {
    marginBottom: verticalScale(20),
  },
  filterIconContainer: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  activeFilterIconContainer: {
    backgroundColor: "#fff4f0",
  },
  filterOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: verticalScale(12),
    paddingHorizontal: SPACING.sm,
    borderRadius: scale(10),
    backgroundColor: "#f9f9f9",
    marginBottom: verticalScale(10),
    borderWidth: 1,
    borderColor: "#eee",
    minHeight: verticalScale(50),
  },
  activeFilterOption: {
    backgroundColor: "#fff4f0",
    borderColor: "#EC4D4A",
    elevation: 2,
    shadowColor: "#EC4D4A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  filterOptionText: {
    fontSize: FONT_SIZES.small,
    color: "#666",
    marginLeft: SPACING.sm,
    flex: 1,
    fontWeight: "500",
  },
  activeFilterText: {
    color: "#EC4D4A",
    fontWeight: "600",
  },
  activeIndicator: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: "#EC4D4A",
  },
  applyButton: {
    backgroundColor: "#EC4D4A",
    paddingVertical: verticalScale(12),
    borderRadius: scale(10),
    alignItems: "center",
    elevation: 2,
    shadowColor: "#EC4D4A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    minHeight: verticalScale(44),
    justifyContent: "center",
  },
  applyButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: FONT_SIZES.regular,
  },
  // New styles for restructured layout
  balanceActions: {
    flexDirection: "row",
    gap: SPACING.md,
    marginTop: verticalScale(12),
    marginBottom: verticalScale(8),
  },
  withdrawButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#EC4D4A",
    borderRadius: scale(8),
    paddingVertical: isSmallDevice ? verticalScale(10) : verticalScale(12),
    alignItems: "center",
    justifyContent: "center",
    minHeight: verticalScale(44),
  },
  withdrawButtonText: {
    color: "#EC4D4A",
    fontSize: FONT_SIZES.regular,
    fontWeight: "600",
  },
  addMoneyButton: {
    flex: 1,
    backgroundColor: "#EC4D4A",
    borderRadius: scale(8),
    paddingVertical: isSmallDevice ? verticalScale(10) : verticalScale(12),
    alignItems: "center",
    justifyContent: "center",
    minHeight: verticalScale(44),
  },
  addMoneyButtonText: {
    color: "#fff",
    fontSize: FONT_SIZES.regular,
    fontWeight: "600",
  },
  minBalanceText: {
    fontSize: FONT_SIZES.tiny,
    color: "#888",
    textAlign: "center",
    marginTop: verticalScale(6),
  },
  sectionContainer: {
    marginBottom: verticalScale(20),
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(12),
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  filterIconButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: "#fff4f0",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: scale(6),
    right: scale(6),
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: "#EC4D4A",
  },
  activeFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff4f0",
    borderRadius: scale(20),
    paddingHorizontal: SPACING.md,
    paddingVertical: verticalScale(6),
    alignSelf: "flex-start",
    marginBottom: verticalScale(12),
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: "#EC4D4A",
  },
  activeFilterText: {
    fontSize: FONT_SIZES.small,
    color: "#EC4D4A",
    fontWeight: "600",
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderRadius: scale(8),
    padding: scale(4),
    marginBottom: verticalScale(12),
  },
  tab: {
    flex: 1,
    paddingVertical: verticalScale(10),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: scale(6),
  },
  activeTab: {
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabText: {
    fontSize: FONT_SIZES.small,
    color: "#666",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#EC4D4A",
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "bold",
    color: "#333",
  },
  viewAllText: {
    fontSize: FONT_SIZES.small,
    color: "#EC4D4A",
    fontWeight: "600",
  },
  recentTransactionsList: {
    backgroundColor: "#fff",
    borderRadius: scale(10),
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  recentTransactionCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: isSmallDevice ? SPACING.sm : SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
    minHeight: verticalScale(65),
  },
  transactionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  transactionIcon: {
    width: isSmallDevice ? scale(36) : scale(40),
    height: isSmallDevice ? scale(36) : scale(40),
    borderRadius: isSmallDevice ? scale(18) : scale(20),
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.sm,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: FONT_SIZES.regular,
    fontWeight: "500",
    color: "#333",
    marginBottom: verticalScale(2),
  },
  transactionTime: {
    fontSize: FONT_SIZES.tiny,
    color: "#888",
  },
  transactionAmountText: {
    fontSize: FONT_SIZES.regular,
    fontWeight: "bold",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: verticalScale(30),
    backgroundColor: "#fff",
    borderRadius: scale(10),
  },
  emptyStateText: {
    fontSize: FONT_SIZES.small,
    color: "#999",
    marginTop: verticalScale(8),
  },
  rechargeCard: {
    backgroundColor: "#fff",
    borderRadius: scale(10),
    padding: SPACING.lg,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  quickAddRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: verticalScale(14),
  },
  quickAmountButton: {
    flex: 1,
    backgroundColor: "#fff4f0",
    borderRadius: scale(8),
    paddingVertical: verticalScale(10),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EC4D4A",
    minHeight: verticalScale(42),
  },
  quickAmountText: {
    fontSize: FONT_SIZES.regular,
    fontWeight: "600",
    color: "#EC4D4A",
  },
  customAmountInput: {
    backgroundColor: "#fff",
    borderRadius: scale(8),
    paddingHorizontal: SPACING.md,
    paddingVertical: verticalScale(12),
    fontSize: FONT_SIZES.regular,
    color: "#333",
    marginBottom: verticalScale(14),
    borderWidth: 1.5,
    borderColor: "#EC4D4A",
    minHeight: verticalScale(42),
  },
  rechargeButton: {
    backgroundColor: "#EC4D4A",
    borderRadius: scale(8),
    paddingVertical: verticalScale(12),
    alignItems: "center",
    justifyContent: "center",
    minHeight: verticalScale(44),
  },
  rechargeButtonText: {
    color: "#fff",
    fontSize: FONT_SIZES.regular,
    fontWeight: "bold",
  },
  rechargeButtonDisabled: {
    opacity: 0.6,
  },
  optionCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: scale(10),
    padding: SPACING.lg,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  optionIconContainer: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(21),
    backgroundColor: "#fff4f0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  optionText: {
    fontSize: FONT_SIZES.regular,
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
  transactionRight: {
    alignItems: "flex-end",
    marginLeft: SPACING.sm,
  },
  statusBadge: {
    fontSize: FONT_SIZES.tiny,
    fontWeight: "600",
    marginTop: verticalScale(2),
  },
  bookingIdText: {
    fontSize: FONT_SIZES.tiny,
    color: "#999",
    marginTop: verticalScale(2),
  },
  rechargeModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    padding: SPACING.xl,
    maxHeight: height * 0.7,
    marginTop: 'auto',
  },
  rechargeModalBody: {
    paddingVertical: verticalScale(10),
  },
  currentBalanceLabel: {
    fontSize: FONT_SIZES.small,
    color: "#888",
    marginBottom: verticalScale(4),
    textAlign: "center",
  },
  currentBalanceAmount: {
    fontSize: FONT_SIZES.xxlarge,
    fontWeight: "bold",
    color: "#EC4D4A",
    marginBottom: verticalScale(24),
    textAlign: "center",
  },
  quickAmountLabel: {
    fontSize: FONT_SIZES.regular,
    fontWeight: "600",
    color: "#333",
    marginBottom: verticalScale(10),
  },
  customAmountLabel: {
    fontSize: FONT_SIZES.regular,
    fontWeight: "600",
    color: "#333",
    marginTop: verticalScale(10),
    marginBottom: verticalScale(10),
  },
});

const WalletScreenWithErrorBoundary = (props) => (
  <ErrorBoundary navigation={props.navigation}>
    <WalletScreen {...props} />
  </ErrorBoundary>
);

export default WalletScreenWithErrorBoundary;
