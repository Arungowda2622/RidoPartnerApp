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
  Animated,
  Dimensions,
  PanResponder,
  Platform,
} from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { getOrderHistory, getRiderEarnings, calculateEarnings, getRiderStats } from "../utils/EarningsApi";
import HeaderWithBackButton from "../components/HeaderWithBackButton";

const OrderHistoryScreen = () => {
  const navigation = useNavigation();
  
  // State management
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekDates, setWeekDates] = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [earningsData, setEarningsData] = useState({
    totalEarnings: 0,
    completedOrders: 0,
    weeklyEarnings: [],
    monthlyEarnings: [],
    averagePerOrder: 0
  });
  const [riderStats, setRiderStats] = useState({
    bonus: 0,
    totalTrips: 0,
    rating: 0
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  // Generate week dates for calendar
  const generateWeekDates = (offset = 0) => {
    const today = new Date();
    // Normalize today to avoid timezone issues
    const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Calculate start of week (Sunday)
    const startOfWeek = new Date(normalizedToday);
    startOfWeek.setDate(normalizedToday.getDate() - normalizedToday.getDay() + (offset * 7));
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  // Initialize week dates
  useEffect(() => {
    const dates = generateWeekDates(weekOffset);
    setWeekDates(dates);
    
    // Set selected date logic
    if (weekOffset === 0) {
      // For current week, default to today if available
      const today = new Date();
      const todayInWeek = dates.find(date => 
        date.toDateString() === today.toDateString()
      );
      if (todayInWeek) {
        setSelectedDate(todayInWeek);
      } else {
        setSelectedDate(dates[0]);
      }
    } else {
      // For other weeks, check if current selected date is in this week
      const currentSelectedInWeek = dates.find(date => 
        selectedDate && date.toDateString() === selectedDate.toDateString()
      );
      if (!currentSelectedInWeek) {
        // If current selected date is not in this week, default to first day
        setSelectedDate(dates[0]);
      }
    }
  }, [weekOffset]);

  // Fetch order history data
  const fetchOrderHistory = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      console.log("📊 Fetching order history...");
      
      // Fetch order history using the simple API first
      const historyResponse = await getOrderHistory();
      
      if (historyResponse && historyResponse.bookings) {
        console.log("✅ Order history fetched:", historyResponse.count, "orders");
        setOrders(historyResponse.bookings);
        
        // Calculate earnings from the fetched orders
        const calculated = calculateEarnings(historyResponse.bookings);
        setEarningsData(calculated);
        
        console.log("💰 Earnings calculated:", {
          totalEarnings: calculated.totalEarnings,
          completedOrders: calculated.completedOrders
        });
      } else {
        console.log("⚠️ No order history data received");
        setOrders([]);
      }

      // Fetch rider stats
      try {
        const stats = await getRiderStats();
        setRiderStats(stats);
      } catch (statsError) {
        console.log("⚠️ Could not fetch rider stats:", statsError.message);
      }
      
    } catch (error) {
      console.error("❌ Error fetching order history:", error);
      Alert.alert(
        "Error",
        "Failed to load order history. Please try again.",
        [
          { text: "Retry", onPress: () => fetchOrderHistory() },
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
    fetchOrderHistory();
  }, []);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Silent refresh when screen is focused
      fetchOrderHistory(true);
    }, [])
  );

  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchOrderHistory();
  };

  // Get real-time earnings breakdown from booking data
  const getEarningsBreakdown = (booking) => {
    const feeBreakdown = booking?.feeBreakdown || {};
    
    return {
      tripFare: parseFloat(booking?.price || 0),
      platformFee: parseFloat(feeBreakdown.platformFee || 0),
      platformFeePercentage: parseFloat(feeBreakdown.platformFeePercentage || 0),
      gstAmount: parseFloat(feeBreakdown.gstAmount || 0),
      gstPercentage: parseFloat(feeBreakdown.gstPercentage || 0),
      riderEarnings: parseFloat(feeBreakdown.riderEarnings || booking?.totalDriverEarnings || booking?.price || 0),
      quickFee: parseFloat(booking?.quickFee || 0)
    };
  };

  // Filter orders for selected date
  const getOrdersForSelectedDate = () => {
    if (!selectedDate) return [];
    
    const selectedDateString = selectedDate.toDateString();
    
    return orders.filter(order => {
      if (!order.createdAt) return false;
      const orderDate = new Date(order.createdAt);
      return orderDate.toDateString() === selectedDateString;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  // Get weekly summary for current week
  const getWeeklySummary = () => {
    const weekStart = new Date(weekDates[0]);
    const weekEnd = new Date(weekDates[6]);
    weekEnd.setHours(23, 59, 59, 999);
    
    const weekOrders = orders.filter(order => {
      if (!order.createdAt) return false;
      const orderDate = new Date(order.createdAt);
      return orderDate >= weekStart && orderDate <= weekEnd &&
             (order.status === 'completed' || order.bookingStatus === 'Completed');
    });

    const totalEarnings = weekOrders.reduce((sum, order) => {
      return sum + parseFloat(order.totalDriverEarnings || order.price || 0);
    }, 0);

    // Mock time spent calculation (8h 53m from reference)
    const totalMinutes = weekOrders.length * 45; // Assume 45 mins per trip
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return {
      totalEarnings: totalEarnings.toFixed(2),
      timeSpent: `${hours}h ${minutes}m`,
      tripCount: weekOrders.length
    };
  };

  // Navigate to previous/next week
  const navigateWeek = (direction) => {
    setWeekOffset(prev => prev + direction);
  };

  // Handle trip selection for detail view
  const handleTripPress = (trip) => {
    navigation.navigate('TripDetailScreen', { trip });
  };

  // Handle date picker
  const handleDatePickerPress = () => {
    setTempDate(selectedDate || new Date());
    setShowDatePicker(true);
  };

  const handleDateSelect = (event, date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (date) {
      // Normalize the date to avoid timezone issues
      const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      // Calculate which week this date belongs to
      const today = new Date();
      const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // Calculate start of week for selected date (Sunday = 0)
      const selectedWeekStart = new Date(normalizedDate);
      selectedWeekStart.setDate(normalizedDate.getDate() - normalizedDate.getDay());
      
      // Calculate start of current week
      const currentWeekStart = new Date(normalizedToday);
      currentWeekStart.setDate(normalizedToday.getDate() - normalizedToday.getDay());
      
      // Calculate week difference more accurately
      const timeDiff = selectedWeekStart.getTime() - currentWeekStart.getTime();
      const weekDiff = Math.round(timeDiff / (7 * 24 * 60 * 60 * 1000));
      
      // Set the week offset and selected date
      setWeekOffset(weekDiff);
      setSelectedDate(normalizedDate);
      
      if (Platform.OS === 'ios') {
        setShowDatePicker(false);
      }
    }
  };

  const closeDatePicker = () => {
    setShowDatePicker(false);
  };

  // Navigate to current week (today)
  const goToCurrentWeek = () => {
    const today = new Date();
    const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    setWeekOffset(0);
    setSelectedDate(normalizedToday);
  };

  // Render calendar date item
  const renderDateItem = ({ item: date }) => {
    const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
    const isToday = date.toDateString() === new Date().toDateString();
    
    // Check if date has orders
    const hasOrders = orders.some(order => {
      if (!order.createdAt) return false;
      return new Date(order.createdAt).toDateString() === date.toDateString() &&
             (order.status === 'completed' || order.bookingStatus === 'Completed');
    });

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <TouchableOpacity 
        style={[
          styles.dateItem,
          isSelected && styles.selectedDateItem
        ]}
        onPress={() => setSelectedDate(date)}
      >
        <Text style={[
          styles.dayName,
          isSelected && styles.selectedDayName
        ]}>
          {dayNames[date.getDay()]}
        </Text>
        <View style={[
          styles.dateNumber,
          isSelected && styles.selectedDateNumber,
          isToday && !isSelected && styles.todayDateNumber
        ]}>
          <Text style={[
            styles.dateText,
            isSelected && styles.selectedDateText,
            isToday && !isSelected && styles.todayDateText
          ]}>
            {date.getDate()}
          </Text>
        </View>
        {hasOrders && !isSelected && (
          <View style={styles.orderIndicator} />
        )}
      </TouchableOpacity>
    );
  };

  // Render trip item for selected date
  const renderTripItem = ({ item }) => {
    const isCompleted = item.status === 'completed' || item.bookingStatus === 'Completed';
    if (!isCompleted) return null;

    const earnings = parseFloat(item.totalDriverEarnings || item.price || 0);
    const orderDate = item.createdAt ? new Date(item.createdAt) : null;
    const timeStr = orderDate ? orderDate.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    }) : 'N/A';

    return (
      <TouchableOpacity 
        style={styles.tripItem}
        onPress={() => handleTripPress(item)}
      >
        <View style={styles.tripHeader}>
          <Text style={styles.tripLabel}>Trip</Text>
          <Text style={styles.tripEarnings}>+ ₹{earnings.toFixed(2)}</Text>
        </View>
        <Text style={styles.tripTime}>{timeStr}</Text>
      </TouchableOpacity>
    );
  };

  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.safeArea}>
        <HeaderWithBackButton title="Order History" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EC4D4A" />
          <Text style={styles.loadingText}>Loading order history...</Text>
        </View>
      </View>
    );
  }

  const weeklySummary = getWeeklySummary();
  const selectedDateOrders = getOrdersForSelectedDate();
  const selectedDateString = selectedDate ? selectedDate.toLocaleDateString('en-GB') : '';

  return (
    <View style={styles.safeArea}>
      <HeaderWithBackButton title="Earnings" />
      
      <View style={styles.container}>
        {/* Week Navigation Header */}
        <View style={styles.weekHeader}>
          <TouchableOpacity onPress={() => navigateWeek(-1)} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color="#666" />
          </TouchableOpacity>
          <View style={styles.centerContainer}>
            <TouchableOpacity onPress={handleDatePickerPress} style={styles.weekRangeContainer}>
              <Text style={styles.weekRange}>
                {weekDates.length > 0 && 
                  `${weekDates[0].getDate()} ${weekDates[0].toLocaleDateString('en-GB', { month: 'short' })} - ${weekDates[6].getDate()} ${weekDates[6].toLocaleDateString('en-GB', { month: 'short' })}`
                }
              </Text>
              <Ionicons name="calendar-outline" size={16} color="#4285F4" style={styles.calendarIcon} />
            </TouchableOpacity>
            {weekOffset !== 0 && (
              <TouchableOpacity onPress={goToCurrentWeek} style={styles.todayButton}>
                <Text style={styles.todayButtonText}>Today</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={() => navigateWeek(1)} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Weekly Earnings Summary */}
        <View style={styles.weeklySummary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>₹{weeklySummary.totalEarnings}</Text>
            <Text style={styles.summaryLabel}>Earnings</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{weeklySummary.timeSpent}</Text>
            <Text style={styles.summaryLabel}>Time Spent</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{weeklySummary.tripCount}</Text>
            <Text style={styles.summaryLabel}>Trips Taken</Text>
          </View>
        </View>

        {/* Calendar - Horizontal Date Picker */}
        <View style={styles.calendarContainer}>
          <FlatList
            data={weekDates}
            renderItem={renderDateItem}
            keyExtractor={(item) => item.toDateString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.calendarList}
            ItemSeparatorComponent={() => <View style={styles.dateSeparator} />}
          />
        </View>

        {/* Selected Date Display */}
        <View style={styles.selectedDateContainer}>
          <Text style={styles.selectedDateTitle}>{selectedDateString}</Text>
          <View style={styles.dailySummary}>
            <View style={styles.dailyEarningsContainer}>
              <Text style={styles.dailyEarnings}>
                ₹{selectedDateOrders.reduce((sum, order) => {
                  return sum + parseFloat(order.totalDriverEarnings || order.price || 0);
                }, 0).toFixed(2)}
              </Text>
              <Text style={styles.dailyLabel}>Earnings</Text>
            </View>
            <View style={styles.dailyStatsContainer}>
              <Text style={styles.dailyTime}>
                {selectedDateOrders.length > 0 ? 
                  `${Math.floor(selectedDateOrders.length * 45 / 60)}h ${(selectedDateOrders.length * 45) % 60}m` : 
                  '0h 0m'
                }
              </Text>
              <Text style={styles.dailyLabel}>Time Spent</Text>
            </View>
            <View style={styles.dailyStatsContainer}>
              <Text style={styles.dailyTrips}>{selectedDateOrders.length}</Text>
              <Text style={styles.dailyLabel}>Trips Taken</Text>
            </View>
          </View>
        </View>

        {/* Daily Trips List */}
        <View style={styles.tripsContainer}>
          <FlatList
            data={selectedDateOrders}
            renderItem={renderTripItem}
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
              <View style={styles.emptyTripsContainer}>
                <Ionicons name="car-outline" size={48} color="#ccc" />
                <Text style={styles.emptyTripsTitle}>No trips on this date</Text>
                <Text style={styles.emptyTripsSubtitle}>
                  Select another date to view your trips
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <Modal
            visible={showDatePicker}
            transparent={true}
            animationType="fade"
            onRequestClose={closeDatePicker}
          >
            <View style={styles.datePickerOverlay}>
              <View style={styles.datePickerContainer}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity onPress={closeDatePicker}>
                    <Text style={styles.datePickerCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.datePickerTitle}>Select Date</Text>
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity onPress={() => handleDateSelect(null, tempDate)}>
                      <Text style={styles.datePickerDone}>Done</Text>
                    </TouchableOpacity>
                  )}
                  {Platform.OS !== 'ios' && (
                    <View style={{ width: 44 }} />
                  )}
                </View>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    if (Platform.OS === 'android') {
                      handleDateSelect(event, date);
                    } else {
                      setTempDate(date || tempDate);
                    }
                  }}
                  maximumDate={new Date()}
                  style={styles.datePicker}
                />
              </View>
            </View>
          </Modal>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },

  // Week Navigation Header
  weekHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
  },
  weekRangeContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  weekRange: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginRight: 8,
  },
  calendarIcon: {
    marginLeft: 4,
  },
  todayButton: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "#4285F4",
    borderRadius: 12,
  },
  todayButtonText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },

  // Weekly Summary Section
  weeklySummary: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
  },

  // Calendar Section
  calendarContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  calendarList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dateItem: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectedDateItem: {
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
  },
  dayName: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  selectedDayName: {
    color: "#333",
    fontWeight: "500",
  },
  dateNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedDateNumber: {
    backgroundColor: "#4285F4",
  },
  todayDateNumber: {
    backgroundColor: "#E3F2FD",
  },
  dateText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  selectedDateText: {
    color: "#fff",
    fontWeight: "bold",
  },
  todayDateText: {
    color: "#4285F4",
    fontWeight: "bold",
  },
  orderIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4CAF50",
    marginTop: 4,
  },
  dateSeparator: {
    width: 8,
  },

  // Selected Date Section
  selectedDateContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedDateTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4285F4",
    marginBottom: 12,
    textAlign: "center",
  },
  dailySummary: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dailyEarningsContainer: {
    alignItems: "center",
    flex: 1,
  },
  dailyEarnings: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  dailyStatsContainer: {
    alignItems: "center",
    flex: 1,
  },
  dailyTime: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  dailyTrips: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  dailyLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },

  // Trips List Section
  tripsContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 8,
  },
  tripItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tripHeader: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tripLabel: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  tripEarnings: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "600",
  },
  tripTime: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },

  // Empty Trips State
  emptyTripsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyTripsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyTripsSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },

  // Date Picker Modal
  datePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  datePickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "90%",
    maxWidth: 350,
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  datePickerCancel: {
    fontSize: 16,
    color: "#666",
  },
  datePickerDone: {
    fontSize: 16,
    color: "#4285F4",
    fontWeight: "600",
  },
  datePicker: {
    height: 200,
  },
});

export default OrderHistoryScreen;