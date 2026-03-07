import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const TrainingVideosScreen = () => {
  const navigation = useNavigation();

  const videos = [
    { id: 1, title: "Introduction to RaidoDrop", status: "approved" },
    { id: 2, title: "Getting Started with the App", status: "approved" },
    { id: 3, title: "Understanding Vehicle Requirements", status: "approved" },
    { id: 4, title: "Safety Guidelines", status: "approved" },
    { id: 5, title: "Customer Service Basics", status: "approved" },
    { id: 6, title: "Navigation and Routes", status: "pending" },
    { id: 7, title: "Handling Payments", status: "pending" },
    { id: 8, title: "Emergency Procedures", status: "pending" },
    { id: 9, title: "Vehicle Maintenance", status: "pending" },
    { id: 10, title: "Customer Communication", status: "pending" },
    { id: 11, title: "App Features Overview", status: "pending" },
    { id: 12, title: "Rating System", status: "pending" },
    { id: 13, title: "Working Hours and Breaks", status: "pending" },
    { id: 14, title: "Insurance and Documentation", status: "pending" },
    { id: 15, title: "Final Assessment", status: "pending" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      {/* <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="play-circle" size={28} color="#fff" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Training Videos</Text>
            <Text style={styles.headerSubtitle}>
              Complete all videos to get started
            </Text>
          </View>
        </View>
      </View> */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Training Videos</Text>
          <Text style={styles.headerSubtitle}>
            Complete all videos to get started
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.videosList}>
          {videos.map((video) => (
            <View key={video.id} style={styles.videoItem}>
              <View style={styles.videoInfo}>
                <View style={styles.videoIconContainer}>
                  <Ionicons name="videocam" size={24} color="#EC4D4A" />
                </View>
                <View style={styles.videoTextContainer}>
                  <Text style={styles.videoNumber}>Video {video.id}</Text>
                  <Text style={styles.videoTitle}>{video.title}</Text>
                </View>
              </View>
              <View
                style={[
                  styles.statusContainer,
                  video.status === "approved"
                    ? styles.approvedContainer
                    : styles.pendingContainer,
                ]}
              >
                {video.status === "approved" ? (
                  <>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#EC4D4A"
                    />
                    <Text style={styles.statusText}>Approved</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="time" size={18} color="#F59E0B" />
                    <Text style={[styles.statusText, styles.pendingText]}>
                      Pending
                    </Text>
                  </>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    // backgroundColor: "#EC4D4A",
    // paddingTop: Platform.OS === "ios" ? 0 : 20,
    // paddingBottom: 24,
    // borderBottomLeftRadius: 30,
    // borderBottomRightRadius: 30,
    // shadowColor: "#EC4D4A",
    // shadowOffset: { width: 0, height: 4 },
    // shadowOpacity: 0.2,
    // shadowRadius: 8,
    // elevation: 4,

    backgroundColor: "#EC4D4A",
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#EC4D4A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    alignItems: "center", // 👈 centers the header text block
    justifyContent: "center",
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 16,
    top: Platform.OS === "ios" ? 50 : 30,
    zIndex: 1,
    padding: 8,
  },
  // headerContent: {
  //   flexDirection: "row",
  //   alignItems: "center",
  //   paddingHorizontal: 20,
  //   marginTop: Platform.OS === "ios" ? 0 : 20,
  // },
  headerCenter: {
    alignItems: "center", // 👈 center text horizontally
    justifyContent: "center",
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    textAlign: "center",
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
  },
  scrollView: {
    flex: 1,
  },
  videosList: {
    padding: 16,
  },
  videoItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  videoInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  videoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  videoTextContainer: {
    flex: 1,
  },
  videoNumber: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 2,
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1f2937",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  approvedContainer: {
    backgroundColor: "#FEF2F2",
  },
  pendingContainer: {
    backgroundColor: "#FFFBEB",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#EC4D4A",
    marginLeft: 4,
  },
  pendingText: {
    color: "#F59E0B",
  },
});

export default TrainingVideosScreen;
