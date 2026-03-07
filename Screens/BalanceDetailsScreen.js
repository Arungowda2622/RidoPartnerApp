import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Modal,
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

const CATEGORIES = [
  { label: 'All Transactions', value: 'all' },
  { label: 'Earnings', value: 'booking_earning' },
  { label: 'Recharge', value: 'recharge' },
  { label: 'Withdrawal', value: 'withdrawal' },
  { label: 'Refund', value: 'refund' },
  { label: 'Deduction', value: 'deduction' },
  { label: 'Bonus', value: 'bonus' },
  { label: 'Platform Fee', value: 'platform_fee' },
  { label: 'Other', value: 'other' },
];

const DATE_FILTERS = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'All Time', value: 'all' },
];

const CATEGORY_CONFIG = {
  booking_earning: { icon: 'money', color: '#4BB543', bgColor: '#e8f5e9' },
  recharge: { icon: 'add-circle', color: '#2196F3', bgColor: '#e3f2fd' },
  withdrawal: { icon: 'remove-circle', color: '#FF5722', bgColor: '#fbe9e7' },
  refund: { icon: 'replay', color: '#9C27B0', bgColor: '#f3e5f5' },
  deduction: { icon: 'remove', color: '#F44336', bgColor: '#ffebee' },
  penalty: { icon: 'warning', color: '#FF9800', bgColor: '#fff3e0' },
  bonus: { icon: 'star', color: '#FFC107', bgColor: '#fffde7' },
  platform_fee: { icon: 'account-balance', color: '#795548', bgColor: '#efebe9' },
  commission: { icon: 'payments', color: '#607D8B', bgColor: '#eceff1' },
  adjustment: { icon: 'tune', color: '#00BCD4', bgColor: '#e0f7fa' },
  other: { icon: 'more-horiz', color: '#9E9E9E', bgColor: '#f5f5f5' },
};

const STATUS_CONFIG = {
  completed: { label: 'Completed', color: '#4BB543' },
  pending: { label: 'Pending', color: '#FF9800' },
  processing: { label: 'Processing', color: '#2196F3' },
  failed: { label: 'Failed', color: '#F44336' },
  cancelled: { label: 'Cancelled', color: '#9E9E9E' },
};

const BalanceDetailsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [riderId, setRiderId] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState('month');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  
  const [stats, setStats] = useState({
    totalCredits: 0,
    totalDebits: 0,
    netBalance: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [selectedCategory, selectedDateFilter, transactions]);

  const fetchData = async () => {
    try {
      const storedRiderId = await AsyncStorage.getItem('riderId');
      setRiderId(storedRiderId);

      if (!storedRiderId) {
        return;
      }

      await Promise.all([fetchTransactions(storedRiderId), fetchStats(storedRiderId)]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTransactions = async (rId) => {
    try {
      const response = await axios.get(
        API_CONFIG.getEndpoint('rider-wallet/transactions/detailed'),
        { params: { riderId: rId, limit: 500 } }
      );

      // Backend returns array directly
      setTransactions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchStats = async (rId) => {
    try {
      const response = await axios.get(
        API_CONFIG.getEndpoint('rider-wallet/transactions/stats'),
        { params: { riderId: rId, period: 'all' } }
      );

      // Backend response structure: { totalEarnings, totalDeductions, netAmount }
      const data = response.data;
      setStats({
        totalCredits: data.totalEarnings || 0,
        totalDebits: data.totalDeductions || 0,
        netBalance: data.netAmount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Set default stats on error
      setStats({
        totalCredits: 0,
        totalDebits: 0,
        netBalance: 0,
      });
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    // Apply date filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    if (selectedDateFilter === 'today') {
      filtered = filtered.filter((t) => new Date(t.createdAt) >= today);
    } else if (selectedDateFilter === 'week') {
      filtered = filtered.filter((t) => new Date(t.createdAt) >= weekAgo);
    } else if (selectedDateFilter === 'month') {
      filtered = filtered.filter((t) => new Date(t.createdAt) >= monthStart);
    }

    setFilteredTransactions(filtered);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return `Today ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (isYesterday) {
      return `Yesterday ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const renderTransactionCard = ({ item }) => {
    const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other;
    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.completed;
    const isCredit = item.type === 'credit';

    return (
      <View style={styles.transactionCard}>
        <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
          <Icon name={config.icon} size={scale(24)} color={config.color} />
        </View>

        <View style={styles.transactionContent}>
          <View style={styles.transactionHeader}>
            <Text style={styles.transactionTitle}>{item.description || 'Transaction'}</Text>
            <Text style={[styles.transactionAmount, isCredit ? styles.creditAmount : styles.debitAmount]}>
              {isCredit ? '+' : '-'}₹{Math.abs(item.amount).toFixed(2)}
            </Text>
          </View>

          <View style={styles.transactionDetails}>
            <View style={styles.transactionMeta}>
              <View style={[styles.categoryBadge, { backgroundColor: config.bgColor }]}>
                <Text style={[styles.categoryBadgeText, { color: config.color }]}>
                  {item.category.replace('_', ' ')}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}15` }]}>
                <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </Text>
              </View>
            </View>

            <Text style={styles.transactionDate}>{formatDate(item.createdAt)}</Text>
          </View>

          {item.bookingId && (
            <Text style={styles.transactionSubtext}>
              Booking: {typeof item.bookingId === 'object' ? item.bookingId._id || item.bookingId.bookingId || 'N/A' : item.bookingId}
            </Text>
          )}

          {item.transactionId && (
            <Text style={styles.transactionSubtext}>ID: {item.transactionId}</Text>
          )}

          {item.metadata && item.metadata.platformFee && (
            <Text style={styles.transactionSubtext}>
              Platform Fee: ₹{item.metadata.platformFee.toFixed(2)}
            </Text>
          )}

          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Balance: ₹{item.closingBalance?.toFixed(2) || '0.00'}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Icon name="receipt-long" size={scale(64)} color="#ccc" />
      <Text style={styles.emptyText}>No transactions found</Text>
      <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={scale(24)} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Balance Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EC4D4A" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
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
        <Text style={styles.headerTitle}>Balance Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Icon name="arrow-upward" size={scale(20)} color="#4BB543" />
          <Text style={styles.statLabel}>Total Credits</Text>
          <Text style={[styles.statValue, { color: '#4BB543' }]}>
            ₹{stats.totalCredits.toFixed(2)}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="arrow-downward" size={scale(20)} color="#F44336" />
          <Text style={styles.statLabel}>Total Debits</Text>
          <Text style={[styles.statValue, { color: '#F44336' }]}>
            ₹{stats.totalDebits.toFixed(2)}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="account-balance-wallet" size={scale(20)} color="#2196F3" />
          <Text style={styles.statLabel}>Net Balance</Text>
          <Text style={[styles.statValue, { color: '#2196F3' }]}>
            ₹{stats.netBalance.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Filters Row */}
      <View style={styles.filtersRow}>
        {/* Date Filter Dropdown */}
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Icon name="calendar-today" size={scale(18)} color="#EC4D4A" />
          <Text style={styles.dropdownText} numberOfLines={1}>
            {DATE_FILTERS.find(f => f.value === selectedDateFilter)?.label || 'Today'}
          </Text>
          <Icon name="arrow-drop-down" size={scale(20)} color="#666" />
        </TouchableOpacity>

        {/* Category Filter Dropdown */}
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowCategoryPicker(true)}
        >
          <Icon name="filter-list" size={scale(18)} color="#EC4D4A" />
          <Text style={styles.dropdownText} numberOfLines={1}>
            {CATEGORIES.find(c => c.value === selectedCategory)?.label || 'All'}
          </Text>
          <Icon name="arrow-drop-down" size={scale(20)} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Transaction Count */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>
          {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Transactions List */}
      <FlatList
        data={filteredTransactions}
        renderItem={renderTransactionCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#EC4D4A']} />}
        ListEmptyComponent={renderEmptyList}
      />

      {/* Date Filter Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Time Period</Text>
            {DATE_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.modalOption,
                  selectedDateFilter === filter.value && styles.modalOptionActive
                ]}
                onPress={() => {
                  setSelectedDateFilter(filter.value);
                  setShowDatePicker(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  selectedDateFilter === filter.value && styles.modalOptionTextActive
                ]}>
                  {filter.label}
                </Text>
                {selectedDateFilter === filter.value && (
                  <Icon name="check" size={scale(20)} color="#EC4D4A" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Category Filter Modal */}
      <Modal
        visible={showCategoryPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryPicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <ScrollView style={styles.modalScrollView}>
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.value}
                  style={[
                    styles.modalOption,
                    selectedCategory === category.value && styles.modalOptionActive
                  ]}
                  onPress={() => {
                    setSelectedCategory(category.value);
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    selectedCategory === category.value && styles.modalOptionTextActive
                  ]}>
                    {category.label}
                  </Text>
                  {selectedCategory === category.value && (
                    <Icon name="check" size={scale(20)} color="#EC4D4A" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
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
  statsContainer: {
    flexDirection: 'row',
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: scale(10),
    padding: isSmallDevice ? SPACING.sm : SPACING.md,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    minHeight: verticalScale(85),
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: FONT_SIZES.tiny,
    color: '#888',
    marginTop: verticalScale(4),
    textAlign: 'center',
    numberOfLines: 2,
  },
  statValue: {
    fontSize: isSmallDevice ? FONT_SIZES.regular : FONT_SIZES.medium,
    fontWeight: 'bold',
    marginTop: verticalScale(2),
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: verticalScale(12),
  },
  dropdownButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: scale(8),
    paddingVertical: verticalScale(10),
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: SPACING.xs,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  dropdownText: {
    flex: 1,
    fontSize: FONT_SIZES.small,
    color: '#333',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: scale(12),
    width: '100%',
    maxWidth: scale(320),
    maxHeight: height * 0.6,
    padding: SPACING.lg,
  },
  modalTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: SPACING.md,
  },
  modalScrollView: {
    maxHeight: height * 0.45,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    paddingHorizontal: SPACING.md,
    borderRadius: scale(8),
    marginBottom: SPACING.xs,
  },
  modalOptionActive: {
    backgroundColor: '#fff4f0',
  },
  modalOptionText: {
    fontSize: FONT_SIZES.regular,
    color: '#666',
    fontWeight: '500',
  },
  modalOptionTextActive: {
    color: '#EC4D4A',
    fontWeight: '600',
  },
  countContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: verticalScale(8),
  },
  countText: {
    fontSize: FONT_SIZES.small,
    color: '#888',
    fontWeight: '600',
  },
  listContent: {
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  transactionCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: scale(12),
    padding: isSmallDevice ? SPACING.sm : SPACING.md,
    marginBottom: SPACING.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  iconContainer: {
    width: isSmallDevice ? scale(40) : scale(48),
    height: isSmallDevice ? scale(40) : scale(48),
    borderRadius: isSmallDevice ? scale(20) : scale(24),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  transactionContent: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: verticalScale(6),
  },
  transactionTitle: {
    flex: 1,
    fontSize: FONT_SIZES.regular,
    fontWeight: '600',
    color: '#333',
    marginRight: SPACING.sm,
  },
  transactionAmount: {
    fontSize: FONT_SIZES.medium,
    fontWeight: 'bold',
  },
  creditAmount: {
    color: '#4BB543',
  },
  debitAmount: {
    color: '#F44336',
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(6),
  },
  transactionMeta: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  categoryBadge: {
    paddingVertical: verticalScale(2),
    paddingHorizontal: SPACING.sm,
    borderRadius: scale(4),
  },
  categoryBadgeText: {
    fontSize: FONT_SIZES.tiny,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingVertical: verticalScale(2),
    paddingHorizontal: SPACING.sm,
    borderRadius: scale(4),
  },
  statusBadgeText: {
    fontSize: FONT_SIZES.tiny,
    fontWeight: '600',
  },
  transactionDate: {
    fontSize: FONT_SIZES.tiny,
    color: '#999',
  },
  transactionSubtext: {
    fontSize: FONT_SIZES.tiny,
    color: '#888',
    marginBottom: verticalScale(2),
  },
  balanceRow: {
    marginTop: verticalScale(4),
    paddingTop: verticalScale(6),
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  balanceLabel: {
    fontSize: FONT_SIZES.small,
    color: '#666',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(80),
  },
  emptyText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: '600',
    color: '#999',
    marginTop: verticalScale(16),
  },
  emptySubtext: {
    fontSize: FONT_SIZES.small,
    color: '#bbb',
    marginTop: verticalScale(4),
  },
});

export default BalanceDetailsScreen;
