import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Dimensions,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { getOrderHistory } from "../utils/EarningsApi";
import HeaderWithBackButton from "../components/HeaderWithBackButton";

const OrdersScreenNew = () => {
  const navigation = useNavigation();
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const isSmallScreen = SCREEN_WIDTH < 360;
  
  // State management
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState("all"); // all, completed, cancelled
  const [timeFilter, setTimeFilter] = useState("all"); // all, today, week, month
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Fetch orders data
  const fetchOrders = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      console.log("📊 Fetching orders...");
      
      const historyResponse = await getOrderHistory();
      
      if (historyResponse && historyResponse.bookings) {
        console.log("✅ Orders fetched:", historyResponse.count, "orders");
        setOrders(historyResponse.bookings);
      } else {
        console.log("⚠️ No orders data received");
        setOrders([]);
      }
      
    } catch (error) {
      console.error("❌ Error fetching orders:", error);
      Alert.alert(
        "Error",
        "Failed to load orders. Please try again.",
        [
          { text: "Retry", onPress: () => fetchOrders() },
          { text: "Cancel", style: "cancel" }
        ]
      );
    } finally {
      setLoading(false);
      if (refreshing) setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchOrders();
  }, []);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Silent refresh when screen is focused
      fetchOrders(true);
    }, [])
  );

  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  // Filter orders based on current filters
  const getFilteredOrders = () => {
    let filtered = [...orders];

    // Filter by status
    if (view === "completed") {
      filtered = filtered.filter(order => 
        order.status === 'completed' || order.bookingStatus === 'Completed'
      );
    } else if (view === "cancelled") {
      filtered = filtered.filter(order => 
        order.status === 'cancelled' || order.bookingStatus === 'Cancelled'
      );
    }

    // Filter by time
    if (timeFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(order => {
        if (!order.createdAt) return false;
        
        const orderDate = new Date(order.createdAt);
        
        switch (timeFilter) {
          case "today":
            return orderDate >= today;
          case "week":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return orderDate >= weekAgo;
          case "month":
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            return orderDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  // Calculate filtered stats
  const getFilteredStats = () => {
    const filteredOrders = getFilteredOrders();
    const completedOrders = filteredOrders.filter(order => 
      order.status === 'completed' || order.bookingStatus === 'Completed'
    );
    const cancelledOrders = filteredOrders.filter(order => 
      order.status === 'cancelled' || order.bookingStatus === 'Cancelled'
    );
    
    const totalEarnings = completedOrders.reduce((sum, order) => {
      return sum + parseFloat(order.totalDriverEarnings || order.price || 0);
    }, 0);

    return {
      totalOrders: filteredOrders.length,
      completedCount: completedOrders.length,
      cancelledCount: cancelledOrders.length,
      totalEarnings: totalEarnings.toFixed(2)
    };
  };

  // Get filter display name
  const getFilterDisplayName = () => {
    switch (timeFilter) {
      case "today":
        return "Today's Orders";
      case "week":
        return "This Week's Orders";
      case "month":
        return "This Month's Orders";
      default:
        return "All Orders";
    }
  };

  // Render individual order item
  const renderOrderItem = ({ item }) => {
    const isCompleted = item.status === 'completed' || item.bookingStatus === 'Completed';
    const isCancelled = item.status === 'cancelled' || item.bookingStatus === 'Cancelled';
    
    const earnings = parseFloat(item.totalDriverEarnings || item.price || 0);
    const quickFee = parseFloat(item.quickFee || 0);

    const orderDate = item.createdAt ? new Date(item.createdAt) : null;
    const dateStr = orderDate ? orderDate.toLocaleDateString('en-IN') : 'N/A';
    const timeStr = orderDate ? orderDate.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }) : 'N/A';

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View style={styles.orderIdContainer}>
            <Text style={styles.orderId}>
              Order #{item._id?.slice(-8).toUpperCase() || 'N/A'}
            </Text>
            <View style={[
              styles.statusBadge,
              isCompleted && styles.completedBadge,
              isCancelled && styles.cancelledBadge,
            ]}>
              <Text style={[
                styles.statusText,
                isCompleted && styles.completedText,
                isCancelled && styles.cancelledText,
              ]}>
                {isCompleted ? 'Completed' : isCancelled ? 'Cancelled' : item.status || 'Unknown'}
              </Text>
            </View>
          </View>
          <View style={styles.earningsContainer}>
            {isCompleted && (
              <Text style={styles.earningsAmount}>₹{earnings.toFixed(2)}</Text>
            )}
            <Text style={styles.orderDateTime}>{dateStr} • {timeStr}</Text>
          </View>
        </View>

        <View style={styles.routeContainer}>
          {/* Pickup Point */}
          <View style={styles.locationRow}>
            <View style={styles.locationIndicator}>
              <View style={styles.fromDot} />
              {item.dropLocation && item.dropLocation.length > 0 && (
                <View style={styles.routeLine} />
              )}
            </View>
            <View style={styles.locationDetails}>
              <Text style={styles.locationLabel}>Pickup</Text>
              <Text style={styles.locationAddress}>
                {item.fromAddress?.address || item.from?.address || 'Pickup location'}
              </Text>
            </View>
          </View>
          
          {/* All Drop Points */}
          {item.dropLocation && item.dropLocation.length > 0 ? (
            item.dropLocation.map((dropPoint, index) => (
              <View key={index} style={styles.locationRow}>
                <View style={styles.locationIndicator}>
                  {index < item.dropLocation.length - 1 ? (
                    <>
                      <View style={styles.stopDot} />
                      <View style={styles.routeLine} />
                    </>
                  ) : (
                    <View style={styles.dropDot} />
                  )}
                </View>
                <View style={styles.locationDetails}>
                  <Text style={styles.locationLabel}>
                    {index === item.dropLocation.length - 1 ? 'Drop-off' : `Stop ${index + 1}`}
                  </Text>
                  <Text style={styles.locationAddress}>
                    {dropPoint?.Address || dropPoint?.address || 'Drop location'}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.locationRow}>
              <View style={styles.locationIndicator}>
                <View style={styles.dropDot} />
              </View>
              <View style={styles.locationDetails}>
                <Text style={styles.locationLabel}>Drop-off</Text>
                <Text style={styles.locationAddress}>
                  {item.to?.Address || 'Drop location'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {isCompleted && (
          <View style={styles.earningsBreakdown}>
            {quickFee > 0 && (
              <View style={styles.earningsRow}>
                <Text style={styles.earningsLabel}>Quick Fee:</Text>
                <Text style={styles.quickFeeValue}>₹{quickFee.toFixed(2)}</Text>
              </View>
            )}
            <View style={[styles.earningsRow, styles.totalEarningsRow]}>
              <Text style={styles.totalEarningsLabel}>Your Earnings:</Text>
              <Text style={styles.totalEarningsValue}>₹{earnings.toFixed(2)}</Text>
            </View>
          </View>
        )}

        <View style={styles.orderFooter}>
          <View style={styles.vehicleTypeContainer}>
            <MaterialIcons name="motorcycle" size={16} color="#666" />
            <Text style={styles.vehicleType}>{item.vehicleType || '2W'}</Text>
          </View>
          <View style={styles.paymentContainer}>
            <MaterialIcons name="payment" size={16} color="#666" />
            <Text style={styles.paymentMethod}>{item.payFrom || 'Cash'}</Text>
          </View>
          {item.driverToFromKm && (
            <View style={styles.distanceContainer}>
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={styles.distance}>{item.driverToFromKm} km</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.safeArea}>
        <HeaderWithBackButton title="Orders" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EC4D4A" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </View>
    );
  }

  const filteredOrders = getFilteredOrders();
  const stats = getFilteredStats();

  return (
    <View style={styles.safeArea}>
      <HeaderWithBackButton title="Orders" />
      
      <View style={styles.container}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>
              {getFilterDisplayName()}
            </Text>
            <TouchableOpacity 
              style={styles.filterButton}
              onPress={() => setShowFilterModal(true)}
            >
              <Ionicons name="filter" size={20} color="#EC4D4A" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.summaryStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalOrders}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.completedCount}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.cancelledCount}</Text>
              <Text style={styles.statLabel}>Cancelled</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>₹{stats.totalEarnings}</Text>
              <Text style={styles.statLabel}>Earned</Text>
            </View>
          </View>
        </View>

        {/* Status Filter Tabs */}
        <View style={styles.tabContainer}>
          {[
            { key: 'all', label: 'All Orders' },
            { key: 'completed', label: 'Completed' },
            { key: 'cancelled', label: 'Cancelled' }
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, view === tab.key && styles.activeTab]}
              onPress={() => setView(tab.key)}
            >
              <Text style={[styles.tabText, view === tab.key && styles.activeTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Orders List */}
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item._id || Math.random().toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#EC4D4A"]}
              tintColor="#EC4D4A"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No orders found</Text>
              <Text style={styles.emptySubtitle}>
                {view === 'all' ? 
                  (timeFilter === 'all' ? 'You haven\'t completed any orders yet' :
                   timeFilter === 'today' ? 'No orders found for today' :
                   timeFilter === 'week' ? 'No orders found for this week' :
                   'No orders found for this month') :
                 view === 'completed' ? 'No completed orders in this period' :
                 'No cancelled orders in this period'}
              </Text>
              <TouchableOpacity style={styles.refreshButton} onPress={() => fetchOrders()}>
                <Ionicons name="refresh" size={20} color="#EC4D4A" />
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          }
          contentContainerStyle={filteredOrders.length === 0 ? styles.emptyListContainer : styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Filter Modal */}
        <Modal
          visible={showFilterModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowFilterModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filter Orders</Text>
                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.filterSectionTitle}>Time Period</Text>
                {[
                  { key: 'all', label: 'All Time', icon: 'infinite' },
                  { key: 'today', label: 'Today', icon: 'today' },
                  { key: 'week', label: 'This Week', icon: 'calendar' },
                  { key: 'month', label: 'This Month', icon: 'calendar-outline' }
                ].map(filter => (
                  <TouchableOpacity
                    key={filter.key}
                    style={[
                      styles.filterOption,
                      timeFilter === filter.key && styles.activeFilterOption
                    ]}
                    onPress={() => {
                      setTimeFilter(filter.key);
                      setShowFilterModal(false);
                    }}
                  >
                    <Ionicons 
                      name={filter.icon} 
                      size={20} 
                      color={timeFilter === filter.key ? "#EC4D4A" : "#666"} 
                    />
                    <Text style={[
                      styles.filterOptionText,
                      timeFilter === filter.key && styles.activeFilterText
                    ]}>
                      {filter.label}
                    </Text>
                    {timeFilter === filter.key && (
                      <Ionicons name="checkmark" size={20} color="#EC4D4A" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  listContent: {
    paddingBottom: 20,
  },
  
  // Summary Card
  summaryCard: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginVertical: 16,
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    flexWrap: "wrap",
  },
  summaryTitle: {
    fontSize: 16,
    color: "#333",
    fontWeight: "bold",
    flexShrink: 1,
    marginRight: 8,
  },
  filterButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#FFEBEE",
    minWidth: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    flexWrap: "nowrap",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 4,
    minWidth: 0,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  statLabel: {
    fontSize: 10,
    color: "#666",
    marginTop: 2,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 2,
  },

  // Order Cards
  orderCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  orderIdContainer: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#FFF3E0",
  },
  completedBadge: {
    backgroundColor: "#FFEBEE",
  },
  cancelledBadge: {
    backgroundColor: "#FFEBEE",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#FF9800",
  },
  completedText: {
    color: "#EC4D4A",
  },
  cancelledText: {
    color: "#F44336",
  },
  earningsContainer: {
    alignItems: "flex-end",
  },
  earningsAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#EC4D4A",
  },
  orderDateTime: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },

  // Route
  routeContainer: {
    marginVertical: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  locationIndicator: {
    width: 20,
    alignItems: "center",
    marginRight: 12,
  },
  fromDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4CAF50",
    marginTop: 4,
  },
  stopDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF9800",
    marginTop: 4,
  },
  dropDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E53935",
    marginTop: 4,
  },
  routeLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 4,
    minHeight: 30,
  },
  locationDetails: {
    flex: 1,
    paddingBottom: 12,
  },
  locationLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  locationAddress: {
    fontSize: 14,
    color: "#333",
    marginTop: 4,
    lineHeight: 20,
  },

  // Earnings Breakdown
  earningsBreakdown: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  earningsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  totalEarningsRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  earningsLabel: {
    fontSize: 14,
    color: "#666",
  },
  quickFeeValue: {
    fontSize: 14,
    color: "#FF9800",
    fontWeight: "500",
  },
  totalEarningsLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  totalEarningsValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#EC4D4A",
  },

  // Order Footer
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  vehicleTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  vehicleType: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  paymentContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  paymentMethod: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  distance: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },

  // Tabs
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: "#EC4D4A",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  activeTabText: {
    color: "#fff",
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: "#FFEBEE",
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#EC4D4A",
    marginLeft: 6,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "50%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F8F9FA",
  },
  activeFilterOption: {
    backgroundColor: "#FFEBEE",
  },
  filterOptionText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 12,
    flex: 1,
  },
  activeFilterText: {
    color: "#EC4D4A",
    fontWeight: "500",
  },
});

export default OrdersScreenNew;