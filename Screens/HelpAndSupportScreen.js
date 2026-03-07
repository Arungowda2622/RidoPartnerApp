import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import HeaderWithBackButton from "../components/HeaderWithBackButton";

const HelpAndSupportScreen = () => {
  const navigation = useNavigation();

  const handleChatSupport = () => {
    // Navigate to Raise Ticket screen
    navigation.navigate("RaiseTicket");
  };

  const handleCallSupport = () => {
    // Navigate to My Tickets screen
    navigation.navigate("MyTickets");
  };

  return (
    <View style={styles.safeArea}>
      <HeaderWithBackButton title="Help & Support" />
      <View style={styles.container}>

      <TouchableOpacity style={styles.card} onPress={handleChatSupport}>
        <Ionicons
          name="create-outline"
          size={28}
          color="#EC4D4A"
        />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Raise a Ticket</Text>
          <Text style={styles.subtitle}>
            Report an issue and get support
          </Text>
        </View>
        <Ionicons name="chevron-forward-outline" size={20} color="#999" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={handleCallSupport}>
        <Ionicons name="list-outline" size={28} color="#EC4D4A" />
        <View style={styles.textContainer}>
          <Text style={styles.title}>My Tickets</Text>
          <Text style={styles.subtitle}>
            View and track your support tickets
          </Text>
        </View>
        <Ionicons name="chevron-forward-outline" size={20} color="#999" />
      </TouchableOpacity>
    </View>
    </View>
  );
};

export default HelpAndSupportScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 20,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  backBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    textAlign: "center",
  },
  spacer: {
    width: 40, // Same width as back button to balance the layout
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#f9f9f9",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
    marginHorizontal: 16,
    elevation: 1,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
  },
  subtitle: {
    fontSize: 13,
    color: "#777",
    marginTop: 4,
  },
});
