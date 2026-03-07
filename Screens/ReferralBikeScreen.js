import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Share,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import {
  getCampaignDetails,
  getVehicleReferralDetails,
} from "../utils/ReferralApi";

const { width } = Dimensions.get("window");

const ReferralBikeScreen = ({ route }) => {
  const navigation = useNavigation();

  // Get campaign data from navigation params
  const passedCampaignData = route?.params?.campaignData;
  const passedReferralCode = route?.params?.referralCode;

  // State management
  const [loading, setLoading] = useState(!passedCampaignData);
  const [refreshing, setRefreshing] = useState(false);
  const [campaignData, setCampaignData] = useState(passedCampaignData || null);
  const [referralStats, setReferralStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!passedCampaignData) {
      fetchData();
    } else {
      // If we have passed data, just fetch stats
      fetchStats();
    }
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch user's referral stats for this vehicle type
      const statsResponse = await getVehicleReferralDetails("2W");
      if (statsResponse && statsResponse.success) {
        setReferralStats(statsResponse.data);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching 2W referral stats:", error);
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch campaign details with milestones
      const campaignResponse = await getCampaignDetails("2W");
      if (campaignResponse && campaignResponse.success) {
        setCampaignData(campaignResponse.campaign);
      }

      await fetchStats();
    } catch (error) {
      console.error("Error fetching 2W referral data:", error);
      setError(error.message || "Failed to load data");
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleShare = async () => {
    try {
      const referralCode = passedReferralCode || referralStats?.user?.referralCode;

      if (!referralCode || referralCode === "N/A") {
        Alert.alert("Not Available", "Referral code is not available yet.");
        return;
      }

      await Share.share({
        message: `🏍️ Join RidoDrop as a 2-Wheeler rider and start earning! 💰\n\nUse my referral code: ${referralCode}\n\nGet amazing rewards! Download the app now! 🚀`,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getMilestoneIcon = (title) => {
    if (title.includes("Activation")) return "person-add";
    return "emoji-events";
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#EC4D4A" />
        <Text style={styles.loadingText}>Loading campaign details...</Text>
      </View>
    );
  }

  // Extract data with fallbacks
  const maxReward = campaignData?.maxReward || 1500;
  const startDate = formatDate(campaignData?.startDate);
  const endDate = formatDate(campaignData?.endDate);
  const milestones = campaignData?.milestones || [];
  const totalEarnings = referralStats?.totalEarnings || 0;
  // const totalReferrals = referralStats?.totalReferrals || 0;

  const totalReferrals = referralStats?.totalReferrals || 0;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={["#EC4D4A"]}
        />
      }
    >
      {/* Gradient Header */}
      <LinearGradient
        colors={["#EC4D4A", "#EC4D4A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>2 Wheeler Referral</Text>
        {/* <TouchableOpacity style={styles.termsButton}>
          <Text style={styles.termsText}>VIEW T&C</Text>
        </TouchableOpacity> */}
      </LinearGradient>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Earnings Banner - Dynamic */}
        <View style={styles.earnCard}>
          <Icon name="currency-rupee" size={40} color="#EC4D4A" />
          <Text style={styles.earnText}>
            Earn up to ₹{maxReward.toLocaleString()} per Referral
          </Text>
          {startDate && endDate && (
            <Text style={styles.earnDateText}>
              {startDate} - {endDate}
            </Text>
          )}
        </View>

        {/* User Stats Card */}
        {totalReferrals > 0 && (
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalReferrals}</Text>
              <Text style={styles.statLabel}>Total Referrals</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                ₹{totalEarnings.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Total Earned</Text>
            </View>
          </View>
        )}

        {/* How it Works Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How this referral works?</Text>
          <View style={styles.stepsContainer}>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>Send invites to your friends</Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>
                Friend gets activated before {endDate || "campaign end"}
              </Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>
                Earn rewards when they complete rides
              </Text>
            </View>
          </View>
        </View>

        {/* Your Earnings Potential - Dynamic Milestones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Earnings Potential</Text>

          {milestones.length > 0 ? (
            milestones.map((milestone) => (
              <View key={milestone.id} style={styles.milestoneCard}>
                <View style={styles.milestoneHeader}>
                  <Icon
                    name={getMilestoneIcon(milestone.title)}
                    size={24}
                    color="#EC4D4A"
                  />
                  <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                </View>
                <Text style={styles.milestoneDescription}>
                  {milestone.description}
                </Text>
                <View style={styles.rewardBox}>
                  <Text style={styles.rewardAmount}>
                    ₹{milestone.reward.toLocaleString()}
                  </Text>
                  <Text style={styles.rewardLabel}>
                    {milestone.rides === 0 ? "Instant Reward" : "Bonus Reward"}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            // Fallback static milestones
            <>
              <View style={styles.milestoneCard}>
                <View style={styles.milestoneHeader}>
                  <Icon name="person-add" size={24} color="#EC4D4A" />
                  <Text style={styles.milestoneTitle}>Friend Activation</Text>
                </View>
                <Text style={styles.milestoneDescription}>
                  Friend must activate before 31st May 2025
                </Text>
                <View style={styles.rewardBox}>
                  <Text style={styles.rewardAmount}>₹0</Text>
                  <Text style={styles.rewardLabel}>Instant Reward</Text>
                </View>
              </View>

              <View style={styles.milestoneCard}>
                <View style={styles.milestoneHeader}>
                  <Icon name="emoji-events" size={24} color="#EC4D4A" />
                  <Text style={styles.milestoneTitle}>10 Rides Bonus</Text>
                </View>
                <Text style={styles.milestoneDescription}>
                  {/* Complete 10 rides in 3 days */}
                  Complete 10 rides
                </Text>
                <View style={styles.rewardBox}>
                  <Text style={styles.rewardAmount}>₹250</Text>
                  <Text style={styles.rewardLabel}>Bonus Reward</Text>
                </View>
              </View>

              <View style={styles.milestoneCard}>
                <View style={styles.milestoneHeader}>
                  <Icon name="emoji-events" size={24} color="#EC4D4A" />
                  <Text style={styles.milestoneTitle}>25 Rides Bonus</Text>
                </View>
                <Text style={styles.milestoneDescription}>
                  {/* Complete 25 rides in 6 days */}
                  Complete 25 rides
                </Text>
                <View style={styles.rewardBox}>
                  <Text style={styles.rewardAmount}>₹350</Text>
                  <Text style={styles.rewardLabel}>Bonus Reward</Text>
                </View>
              </View>

              <View style={styles.milestoneCard}>
                <View style={styles.milestoneHeader}>
                  <Icon name="emoji-events" size={24} color="#EC4D4A" />
                  <Text style={styles.milestoneTitle}>50 Rides Bonus</Text>
                </View>
                <Text style={styles.milestoneDescription}>
                  Complete 50 rides 
                </Text>
                <View style={styles.rewardBox}>
                  <Text style={styles.rewardAmount}>₹400</Text>
                  <Text style={styles.rewardLabel}>Bonus Reward</Text>
                </View>
              </View>

              <View style={styles.milestoneCard}>
                <View style={styles.milestoneHeader}>
                  <Icon name="emoji-events" size={24} color="#EC4D4A" />
                  <Text style={styles.milestoneTitle}>75 Rides Bonus</Text>
                </View>
                <Text style={styles.milestoneDescription}>
                  {/* Complete 75 rides in 13 days */}
                  Complete 75 rides
                </Text>
                <View style={styles.rewardBox}>
                  <Text style={styles.rewardAmount}>₹500</Text>
                  <Text style={styles.rewardLabel}>Bonus Reward</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* CTA Button */}
        <TouchableOpacity style={styles.referButton} onPress={handleShare}>
          <Text style={styles.referButtonText}>Start Referring Now</Text>
          <Icon
            name="arrow-forward"
            size={20}
            color="#fff"
            style={styles.arrowIcon}
          />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f5f5f5",
    flex: 1,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    flex: 1,
    textAlign: "center",
  },
  termsButton: {
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  termsText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  earnCard: {
    backgroundColor: "#E8F5E9",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  earnText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#EC4D4A",
    marginTop: 12,
    textAlign: "center",
  },
  earnDateText: {
    fontSize: 16,
    color: "#666",
    marginTop: 8,
  },
  statsCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#EC4D4A",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  divider: {
    width: 1,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 16,
  },
  stepsContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EC4D4A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    paddingTop: 4,
  },
  milestoneCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  milestoneHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    marginLeft: 8,
  },
  milestoneDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    marginLeft: 32,
  },
  rewardBox: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rewardAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: "#EC4D4A",
  },
  rewardLabel: {
    fontSize: 14,
    color: "#666",
  },
  referButton: {
    backgroundColor: "#EC4D4A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  referButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  arrowIcon: {
    marginLeft: 8,
  },
});

export default ReferralBikeScreen;
