import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Alert,
  Linking,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRoute, useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Bill() {
  const route = useRoute();
  const navigation = useNavigation();
  const booking = route?.params?.booking;

  // Defensive extraction
  const amountPay = booking?.amountPay || booking?.price || "--";
  const payFrom = booking?.payFrom || "--";
  const pickupAddress = booking?.fromAddress?.address || "Pickup Address";
  const dropAddress = booking?.dropLocation?.[0]?.Address || "Drop Address";
  const orderId = booking?._id || "--";
  const date = booking?.createdAt
    ? new Date(booking.createdAt).toLocaleString()
    : "--";
  const vehicleType = booking?.vehicleType || "--";
  const distance = booking?.distanceKm || "--";
  const clientPhone = booking?.fromAddress?.receiverMobile || "****";
  const clientName = booking?.fromAddress?.receiverName || "Client";

  // Dynamic pricing breakdown
  const priceBreakdown = booking?.priceBreakdown || {};
  const riderEarnings = booking?.riderEarnings || priceBreakdown?.riderEarnings || "--";
  const platformFee = booking?.platformFee || priceBreakdown?.fees?.platformFee || 0;
  const baseFare = priceBreakdown?.components?.baseFare || "--";
  const distanceCharge = priceBreakdown?.components?.distanceCharge || "--";
  const surgeMultiplier = priceBreakdown?.multipliers?.surgeMultiplier || 1;
  const hasSurge = surgeMultiplier > 1;

  const [loading, setLoading] = React.useState(false);
  const [collected, setCollected] = React.useState(!!booking?.cashCollected);
  const [showBreakdown, setShowBreakdown] = React.useState(false);

  const handleCollectCash = async () => {
    Alert.alert("Confirm", "Are you sure you have collected the cash?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes",
        onPress: async () => {
          setLoading(true);
          try {
            const response = await fetch(
              // `https://ridodrop-backend-24-10-2025.onrender.com/api/v1/collect-cash/${booking._id}`,
              `${API_CONFIG.BASE_URL}/api/v1/collect-cash/${booking._id}`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
              }
            );
            const data = await res.json();
            console.log(data);

            if (res.ok) {
              setCollected(true);
              Alert.alert("Success", "Cash marked as collected!", [
                { text: "OK", onPress: () => navigation.navigate("Home") },
              ]);
            } else {
              Alert.alert("Error", data.message || "Failed to update");
            }
          } catch (e) {
            Alert.alert("Error", "Network error", e);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleCall = () => {
    if (clientPhone && clientPhone.length >= 6) {
      Linking.openURL(`tel:${clientPhone}`);
    } else {
      Alert.alert("No valid phone number");
    }
  };

  const handleHelp = () => {
    Alert.alert("Help", "For support, please contact customer care.");
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Gradient Header with Help */}
      <LinearGradient
        colors={["#EC4D4A", "#FFB677"]}
        style={styles.headerGradient}
      >
        <Text style={styles.header}>Order Fare</Text>
        <TouchableOpacity style={styles.helpButton} onPress={handleHelp}>
          <Text style={styles.helpText}>Help</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Card */}
      <View style={styles.card}>
        {/* Client Row */}
        <View style={styles.clientRow}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={24} color="#fff" />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.clientName}>{clientName}</Text>
            <Text style={styles.clientPhone}>{clientPhone}</Text>
          </View>
          <TouchableOpacity style={styles.callButton} onPress={handleCall}>
            <Ionicons name="call" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Amount Row */}
        <View style={styles.amountRow}>
          <LinearGradient
            colors={["#EC4D4A", "#FFB677"]}
            style={styles.amountCircle}
          >
            <MaterialCommunityIcons
              name="currency-inr"
              size={28}
              color="#fff"
            />
          </LinearGradient>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.amount}>₹{amountPay}</Text>
            <Text style={styles.subText}>Collect at {payFrom}</Text>
            {hasSurge && (
              <View style={styles.surgeBadge}>
                <Ionicons name="trending-up" size={12} color="#FF6B6B" />
                <Text style={styles.surgeText}>{surgeMultiplier.toFixed(1)}x Surge</Text>
              </View>
            )}
          </View>
          <TouchableOpacity 
            style={styles.breakdownButton}
            onPress={() => setShowBreakdown(!showBreakdown)}
          >
            <Ionicons 
              name={showBreakdown ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#EC4D4A" 
            />
          </TouchableOpacity>
        </View>

        {/* Price Breakdown (Collapsible) */}
        {showBreakdown && (
          <View style={styles.breakdownContainer}>
            <Text style={styles.breakdownTitle}>💰 Fare Breakdown</Text>
            
            {baseFare !== "--" && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Base Fare</Text>
                <Text style={styles.breakdownValue}>₹{baseFare}</Text>
              </View>
            )}
            
            {distanceCharge !== "--" && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Distance Charge</Text>
                <Text style={styles.breakdownValue}>₹{distanceCharge}</Text>
              </View>
            )}
            
            {priceBreakdown?.components?.trafficCharge > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Traffic Surcharge</Text>
                <Text style={styles.breakdownValue}>₹{Math.round(priceBreakdown.components.trafficCharge)}</Text>
              </View>
            )}
            
            {priceBreakdown?.components?.weatherCharge > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Weather Surcharge</Text>
                <Text style={styles.breakdownValue}>₹{Math.round(priceBreakdown.components.weatherCharge)}</Text>
              </View>
            )}
            
            {priceBreakdown?.components?.waitingCharge > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Waiting Charges</Text>
                <Text style={styles.breakdownValue}>₹{Math.round(priceBreakdown.components.waitingCharge)}</Text>
              </View>
            )}
            
            {priceBreakdown?.components?.loadCharge > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Load Charges</Text>
                <Text style={styles.breakdownValue}>₹{Math.round(priceBreakdown.components.loadCharge)}</Text>
              </View>
            )}
            
            <View style={styles.breakdownDivider} />
            
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabelBold}>Total Amount</Text>
              <Text style={styles.breakdownValueBold}>₹{amountPay}</Text>
            </View>
            
            {platformFee > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabelPlatform}>Platform Fee ({priceBreakdown?.fees?.platformFeePercentage}%)</Text>
                <Text style={styles.breakdownValuePlatform}>-₹{platformFee}</Text>
              </View>
            )}
            
            <View style={styles.breakdownDivider} />
            
            <View style={styles.earningsRow}>
              <Ionicons name="wallet" size={18} color="#4CAF50" />
              <Text style={styles.earningsLabel}>Your Earnings</Text>
              <Text style={styles.earningsValue}>₹{riderEarnings}</Text>
            </View>
          </View>
        )}

        {/* Timeline for Pickup & Drop */}
        <View style={styles.timelineBlock}>
          <View style={styles.timelineDot} />
          <View style={styles.timelineLine} />
          <View style={styles.timelineDotDrop} />
          <View style={{ marginLeft: 16 }}>
            <Text style={styles.pickupPoint}>{pickupAddress}</Text>
            <Text style={styles.dropPoint}>{dropAddress}</Text>
          </View>
        </View>

        {/* Meta Info Row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar" size={16} color="#EC4D4A" />
            <Text style={styles.metaText}>{date}</Text>
          </View>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="pricetag" size={16} color="#EC4D4A" />
          <Text style={styles.metaText}>{orderId}</Text>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="car" size={16} color="#EC4D4A" />
            <Text style={styles.metaText}>{vehicleType}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="navigate" size={16} color="#EC4D4A" />
            <Text style={styles.metaText}>{distance} km</Text>
          </View>
        </View>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={[styles.button, collected && { backgroundColor: "#aaa" }]}
        onPress={handleCollectCash}
        disabled={collected || loading}
      >
        <Ionicons
          name="checkmark-circle"
          size={22}
          color="#fff"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.buttonText}>
          {collected ? "Cash Collected" : "Cash Collected"}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f7fb",
  },
  headerGradient: {
    paddingVertical: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    flexDirection: "row",
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: 1,
    flex: 1,
    textAlign: "center",
  },
  helpButton: {
    position: "absolute",
    right: 18,
    top: 18,
    padding: 6,
    zIndex: 2,
  },
  helpText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
    textDecorationLine: "underline",
  },
  card: {
    margin: 18,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    elevation: 6,
    shadowColor: "#EC4D4A",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  clientRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EC4D4A",
    alignItems: "center",
    justifyContent: "center",
  },
  clientName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
  },
  clientPhone: {
    fontSize: 13,
    color: "#888",
  },
  callButton: {
    backgroundColor: "#2e7d32",
    borderRadius: 20,
    padding: 10,
    marginLeft: 10,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  breakdownButton: {
    padding: 8,
    backgroundColor: "#FFF5F5",
    borderRadius: 20,
  },
  surgeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFE5E5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  surgeText: {
    fontSize: 11,
    color: "#FF6B6B",
    fontWeight: "600",
    marginLeft: 4,
  },
  breakdownContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 12,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  breakdownLabel: {
    fontSize: 13,
    color: "#666",
  },
  breakdownValue: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
  breakdownLabelBold: {
    fontSize: 14,
    color: "#333",
    fontWeight: "700",
  },
  breakdownValueBold: {
    fontSize: 14,
    color: "#EC4D4A",
    fontWeight: "700",
  },
  breakdownLabelPlatform: {
    fontSize: 13,
    color: "#999",
    fontStyle: "italic",
  },
  breakdownValuePlatform: {
    fontSize: 13,
    color: "#999",
    fontWeight: "500",
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 10,
  },
  earningsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  earningsLabel: {
    fontSize: 14,
    color: "#2E7D32",
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
  },
  earningsValue: {
    fontSize: 16,
    color: "#1B5E20",
    fontWeight: "700",
  },
  amountCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EC4D4A",
  },
  amount: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#222",
  },
  subText: {
    fontSize: 14,
    color: "#888",
    marginTop: 2,
  },
  timelineBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4CAF50",
    marginTop: 2,
    marginRight: 2,
  },
  timelineLine: {
    width: 2,
    height: 32,
    backgroundColor: "#bbb",
    marginLeft: 4,
    marginRight: 4,
    marginTop: 2,
  },
  timelineDotDrop: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#EC4D4A",
    marginTop: 22,
    marginRight: 8,
  },
  pickupPoint: {
    fontSize: 15,
    color: "#222",
    fontWeight: "500",
    marginBottom: 8,
  },
  dropPoint: {
    fontSize: 15,
    color: "#EC4D4A",
    fontWeight: "500",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    justifyContent: "space-between",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: "#444",
    marginLeft: 4,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 24,
    marginTop: 18,
    backgroundColor: "#EC4D4A",
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: "#EC4D4A",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 17,
    marginLeft: 2,
    letterSpacing: 0.5,
  },
});
