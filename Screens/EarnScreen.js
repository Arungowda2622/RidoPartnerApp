import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import HeaderWithBackButton from "../components/HeaderWithBackButton";

const weeklyEarnings = [
  { id: "1", day: "Mon", amount: 520 },
  { id: "2", day: "Tue", amount: 450 },
  { id: "3", day: "Wed", amount: 620 },
  { id: "4", day: "Thu", amount: 700 },
  { id: "5", day: "Fri", amount: 810 },
  { id: "6", day: "Sat", amount: 920 },
  { id: "7", day: "Sun", amount: 580 },
];

const monthlyEarnings = [
  { id: "1", week: "Week 1", amount: 3100 },
  { id: "2", week: "Week 2", amount: 2750 },
  { id: "3", week: "Week 3", amount: 2980 },
  { id: "4", week: "Week 4", amount: 3320 },
];

export default function EarnScreen() {
  const [view, setView] = useState("weekly");

  const currentData = view === "weekly" ? weeklyEarnings : monthlyEarnings;
  const totalEarnings = currentData.reduce((sum, item) => sum + item.amount, 0);

  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderWithBackButton title="Earnings" />
      <View style={styles.container}>
      {/* Toggle Buttons */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            view === "weekly" && styles.activeButton,
          ]}
          onPress={() => setView("weekly")}
        >
          <Text
            style={[styles.toggleText, view === "weekly" && styles.activeText]}
          >
            Weekly
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            view === "monthly" && styles.activeButton,
          ]}
          onPress={() => setView("monthly")}
        >
          <Text
            style={[styles.toggleText, view === "monthly" && styles.activeText]}
          >
            Monthly
          </Text>
        </TouchableOpacity>
      </View>

      {/* Total Card */}
      <View style={styles.card}>
        <Text style={styles.totalLabel}>
          Total {view === "weekly" ? "This Week" : "This Month"}
        </Text>
        <Text style={styles.totalAmount}>₹{totalEarnings}</Text>
      </View>

      {/* Earnings List */}
      <FlatList
        data={currentData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.earningItem}>
            <Text style={styles.day}>
              {view === "weekly" ? item.day : item.week}
            </Text>
            <Text style={styles.amount}>₹{item.amount}</Text>
          </View>
        )}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>
            {view === "weekly" ? "Daily Earnings" : "Weekly Breakdown"}
          </Text>
        }
      />

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryBox}>
          <Ionicons name="checkmark-done-circle" size={28} color="#4caf50" />
          <Text style={styles.summaryLabel}>Completed</Text>
          <Text style={styles.summaryValue}>42 Orders</Text>
        </View>
        <View style={styles.summaryBox}>
          <MaterialIcons name="emoji-events" size={28} color="#ff9800" />
          <Text style={styles.summaryLabel}>Bonuses</Text>
          <Text style={styles.summaryValue}>₹850</Text>
        </View>
      </View>

      {/* Order History Button */}
      <TouchableOpacity 
        style={styles.orderHistoryButton}
        onPress={() => navigation.navigate('OrderHistory')}
      >
        <Ionicons name="receipt-outline" size={24} color="#4caf50" />
        <Text style={styles.orderHistoryText}>View Order History</Text>
        <Ionicons name="chevron-forward" size={20} color="#4caf50" />
      </TouchableOpacity>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#f4f4f4",
    padding: 16,
    marginTop: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
    color: "#333",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: "#ddd",
    marginHorizontal: 8,
    borderRadius: 20,
  },
  toggleText: {
    fontSize: 14,
    color: "#333",
  },
  activeButton: {
    backgroundColor: "#4caf50",
  },
  activeText: {
    color: "white",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#4caf50",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  totalLabel: {
    color: "white",
    fontSize: 16,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#555",
  },
  earningItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomColor: "#ddd",
    borderBottomWidth: 1,
  },
  day: {
    fontSize: 16,
    color: "#333",
  },
  amount: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    alignItems: "center",
    elevation: 3,
  },
  summaryLabel: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  orderHistoryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  orderHistoryText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#4caf50",
    marginLeft: 12,
  },
  backBtn: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 10,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
});

{
  /* import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  getRiderEarnings,
  calculateEarnings,
  getRiderStats,
} from "../utils/EarningsApi";

export default function EarnScreen() {
  const [view, setView] = useState("weekly");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [earningsData, setEarningsData] = useState({
    totalEarnings: 0,
    completedOrders: 0,
    weeklyEarnings: [],
    monthlyEarnings: [],
  });
  const [riderStats, setRiderStats] = useState({
    bonus: 0,
    totalTrips: 0,
  });

  const navigation = useNavigation();

  const fetchEarningsData = async () => {
    try {
      console.log("📊 Fetching earnings data...");
      setLoading(true);

      const response = await getRiderEarnings();
      console.log("📦 Raw API response:", response);

      const bookings = response.bookings || response.data || response || [];
      const calculated = calculateEarnings(bookings);
      setEarningsData(calculated);

      try {
        const stats = await getRiderStats();
        setRiderStats(stats);
      } catch (statsError) {
        console.log("⚠️ Could not fetch rider stats");
      }

      setLoading(false);
    } catch (error) {
      console.error("❌ Error fetching earnings:", error);
      setLoading(false);
      Alert.alert("Error", "Unable to load earnings data.");
    }
  };

  useEffect(() => {
    fetchEarningsData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchEarningsData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEarningsData();
    setRefreshing(false);
  };

  const currentData = view === "weekly" ? earningsData.weeklyEarnings : earningsData.monthlyEarnings;
  const totalEarnings = currentData.reduce((sum, item) => sum + item.amount, 0);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4caf50" />
        <Text style={styles.loadingText}>Loading earnings data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <MaterialIcons name="arrow-back" size={28} color="#1b3c73" />
      </TouchableOpacity>
      <Text style={styles.title}>Earnings</Text>

      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleButton, view === "weekly" && styles.activeButton]}
          onPress={() => setView("weekly")}
        >
          <Text style={[styles.toggleText, view === "weekly" && styles.activeText]}>
            Weekly
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, view === "monthly" && styles.activeButton]}
          onPress={() => setView("monthly")}
        >
          <Text style={[styles.toggleText, view === "monthly" && styles.activeText]}>
            Monthly
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.totalLabel}>
          Total {view === "weekly" ? "This Week" : "This Month"}
        </Text>
        <Text style={styles.totalAmount}>₹{totalEarnings.toFixed(2)}</Text>
        <Text style={styles.totalSubtext}>
          From {currentData.filter((item) => item.amount > 0).length} working{" "}
          {view === "weekly" ? "days" : "weeks"}
        </Text>
      </View>

      <FlatList
        data={currentData}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4caf50"]} />
        }
        renderItem={({ item }) => (
          <View style={styles.earningItem}>
            <View style={styles.earningItemLeft}>
              <Text style={styles.day}>{view === "weekly" ? item.day : item.week}</Text>
              {item.amount === 0 && <Text style={styles.noEarningsText}>No trips</Text>}
            </View>
            <Text style={[styles.amount, item.amount === 0 && styles.zeroAmount]}>
              ₹{item.amount.toFixed(2)}
            </Text>
          </View>
        )}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>
            {view === "weekly" ? "Daily Earnings" : "Weekly Breakdown"}
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No earnings data available</Text>
            <Text style={styles.emptySubtext}>Complete trips to start earning</Text>
          </View>
        }
      />

      <View style={styles.summaryRow}>
        <View style={styles.summaryBox}>
          <Ionicons name="checkmark-done-circle" size={28} color="#4caf50" />
          <Text style={styles.summaryLabel}>Completed</Text>
          <Text style={styles.summaryValue}>{earningsData.completedOrders} Orders</Text>
        </View>
        <View style={styles.summaryBox}>
          <MaterialIcons name="emoji-events" size={28} color="#ff9800" />
          <Text style={styles.summaryLabel}>Bonuses</Text>
          <Text style={styles.summaryValue}>₹{riderStats.bonus || 0}</Text>
        </View>
      </View>
    </View>
  );
} */
}
