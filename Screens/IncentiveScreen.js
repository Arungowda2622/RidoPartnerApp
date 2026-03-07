import React from "react";
import { useNavigation } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { ProgressBar } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import HeaderWithBackButton from "../components/HeaderWithBackButton";

const incentives = [
  { title: "Complete 10 Rides", progress: 0.7, reward: "₹200" },
  { title: "Drive 50 KM", progress: 0.5, reward: "₹150" },
  { title: "Work 5 Days", progress: 0.3, reward: "₹100" },
];

export default function IncentiveScreen() {
  const navigation = useNavigation();
  return (
    <View style={styles.safeArea}>
      <HeaderWithBackButton title="Incentives" />
      <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.earningsCard}>
        <MaterialIcons name="emoji-events" size={26} color="#FFD700" />
        <View style={{ marginLeft: 10 }}>
          <Text style={styles.earnedLabel}>Total Incentives Earned</Text>
          <Text style={styles.earnedAmount}>₹450</Text>
        </View>
      </View>
      <Text style={styles.sectionTitle}>Progress This Week</Text>
      {incentives.map((item, index) => (
        <View key={index} style={styles.incentiveCard}>
          <Text style={styles.incentiveTitle}>{item.title}</Text>
          <ProgressBar
            progress={item.progress}
            color="#4caf50"
            style={styles.progressBar}
          />
          <View style={styles.rewardRow}>
            <Text style={styles.progressText}>
              {Math.round(item.progress * 100)}% completed
            </Text>
            <Text style={styles.rewardText}>Reward: {item.reward}</Text>
          </View>
        </View>
      ))}
      <TouchableOpacity style={styles.btn}>
        <Text style={styles.btnText}>View Full Incentive Plan</Text>
      </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7f9fb",
  },
  container: {
    padding: 20,
    backgroundColor: "#f7f9fb",
  },
  header: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1b3c73",
    marginBottom: 20,
  },
  earningsCard: {
    backgroundColor: "#fffbe6",
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 3,
  },
  earnedLabel: {
    fontSize: 14,
    color: "#555",
  },
  earnedAmount: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2e7d32",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  incentiveCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderColor: "#ddd",
    borderWidth: 1,
  },
  incentiveTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 10,
  },
  progressBar: {
    height: 10,
    borderRadius: 8,
    backgroundColor: "#e0e0e0",
  },
  rewardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  progressText: {
    fontSize: 12,
    color: "#666",
  },
  rewardText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4caf50",
  },
  btn: {
    marginTop: 30,
    backgroundColor: "#14519c",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
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
