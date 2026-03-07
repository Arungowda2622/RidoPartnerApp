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

const ReferralAutoScreen = ({ route }) => {
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
      // Fetch user's referral stats for 3W
      const statsResponse = await getVehicleReferralDetails("3W");
      if (statsResponse && statsResponse.success) {
        setReferralStats(statsResponse.data);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching 3W referral stats:", error);
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch campaign details with milestones for 3W
      const campaignResponse = await getCampaignDetails("3W");
      if (campaignResponse && campaignResponse.success) {
        setCampaignData(campaignResponse.campaign);
      }

      await fetchStats();
    } catch (error) {
      console.error("Error fetching 3W referral data:", error);
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
        message: `🛺 Join RidoDrop as a 3-Wheeler rider and start earning! 💰\n\nUse my referral code: ${referralCode}\n\nGet amazing rewards! Download the app now! 🚀`,
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
        <Text style={styles.title}>3 Wheeler Referral</Text>
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
            // Fallback static milestones if API fails
            <>
              <View style={styles.milestoneCard}>
                <View style={styles.milestoneHeader}>
                  <Icon name="person-add" size={24} color="#EC4D4A" />
                  <Text style={styles.milestoneTitle}>Friend Activation</Text>
                </View>
                <Text style={styles.milestoneDescription}>
                  Friend must activate before campaign end
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
                  {/* Complete 50 rides in 10 days */}
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
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
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
    flexDirection: "row",
    padding: 16,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#EC4D4A",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
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

export default ReferralAutoScreen;

//   return (
//     <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
//       {/* Gradient Header */}
//       <LinearGradient
//         colors={['#EC4D4A', '#FF6B6B']}
//         start={{ x: 0, y: 0 }}
//         end={{ x: 1, y: 0 }}
//         style={styles.header}
//       >
//         <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
//           <Icon name="arrow-back" size={24} color="#fff" />
//         </TouchableOpacity>
//         <Text style={styles.title}>3 Wheeler Referral</Text>
//         <TouchableOpacity style={styles.termsButton}>
//           <Text style={styles.termsText}>VIEW T&C</Text>
//         </TouchableOpacity>
//       </LinearGradient>

//       {/* Main Content */}
//       <View style={styles.content}>
//         {/* Earnings Banner */}
//         <View style={styles.earnCard}>
//           <LinearGradient
//             colors={['#FFE8E8', '#FFD4D4']}
//             style={styles.earnGradient}
//             start={{ x: 0, y: 0 }}
//             end={{ x: 1, y: 0 }}
//           >
//             <Icon name="currency-rupee" size={28} color="#EC4D4A" style={styles.moneyIcon} />
//             <Text style={styles.earnText}>Earn up to ₹20,000</Text>
//             <Text style={styles.earnSubText}>Per 3W Rider Referral</Text>
//           </LinearGradient>
//         </View>

//         {/* How it Works Section */}
//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>How this referral works?</Text>
//           <View style={styles.stepsContainer}>
//             <View style={styles.step}>
//               <View style={styles.stepNumber}>
//                 <Text style={styles.stepNumberText}>1</Text>
//               </View>
//               <Text style={styles.stepText}>Share your referral code with auto drivers</Text>
//             </View>
//             <View style={styles.step}>
//               <View style={styles.stepNumber}>
//                 <Text style={styles.stepNumberText}>2</Text>
//               </View>
//               <Text style={styles.stepText}>Friend registers and activates as a 3W rider</Text>
//             </View>
//             <View style={styles.step}>
//               <View style={styles.stepNumber}>
//                 <Text style={styles.stepNumberText}>3</Text>
//               </View>
//               <Text style={styles.stepText}>They complete milestone rides</Text>
//             </View>
//             <View style={styles.step}>
//               <View style={styles.stepNumber}>
//                 <Text style={styles.stepNumberText}>4</Text>
//               </View>
//               <Text style={styles.stepText}>You earn rewards at each milestone!</Text>
//             </View>
//           </View>
//         </View>

//         {/* Milestones Section */}
//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>Earning Milestones</Text>
//           <Text style={styles.sectionSubtitle}>Track your friend's progress and earn at each milestone</Text>
//           <View style={styles.milestonesContainer}>
//             {milestones.map((milestone) => (
//               <View key={milestone.id} style={styles.milestoneCard}>
//                 <View style={styles.milestoneHeader}>
//                   <View style={styles.milestoneIconCircle}>
//                     <Icon name="emoji-events" size={20} color="#EC4D4A" />
//                   </View>
//                   <View style={styles.milestoneInfo}>
//                     <Text style={styles.milestoneRides}>{milestone.description}</Text>
//                     <Text style={styles.milestoneAmount}>Earn ₹{milestone.amount.toLocaleString()}</Text>
//                   </View>
//                 </View>
//               </View>
//             ))}
//           </View>
//         </View>

//         {/* Benefits Section */}
//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>Benefits</Text>
//           <View style={styles.benefitsContainer}>
//             <View style={styles.benefitItem}>
//               <Icon name="verified" size={24} color="#EC4D4A" />
//               <Text style={styles.benefitText}>No limit on earnings</Text>
//             </View>
//             <View style={styles.benefitItem}>
//               <Icon name="schedule" size={24} color="#EC4D4A" />
//               <Text style={styles.benefitText}>Instant credit on completion</Text>
//             </View>
//             <View style={styles.benefitItem}>
//               <Icon name="card-giftcard" size={24} color="#EC4D4A" />
//               <Text style={styles.benefitText}>Multiple rewards per referral</Text>
//             </View>
//             <View style={styles.benefitItem}>
//               <Icon name="trending-up" size={24} color="#EC4D4A" />
//               <Text style={styles.benefitText}>Unlimited referrals allowed</Text>
//             </View>
//           </View>
//         </View>

//         {/* CTA Button */}
//         <TouchableOpacity style={styles.referButton}>
//           <Text style={styles.referButtonText}>Share Referral Code</Text>
//           <Icon name="share" size={20} color="#fff" />
//         </TouchableOpacity>
//       </View>
//     </ScrollView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     backgroundColor: '#f9f9f9',
//     flex: 1,
//   },
//   header: {
//     paddingTop: 50,
//     paddingBottom: 20,
//     paddingHorizontal: 16,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     borderBottomLeftRadius: 20,
//     borderBottomRightRadius: 20,
//     elevation: 5,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.2,
//     shadowRadius: 6,
//   },
//   backButton: {
//     padding: 8,
//   },
//   title: {
//     fontSize: 20,
//     fontWeight: '700',
//     color: '#fff',
//     flex: 1,
//     textAlign: 'center',
//   },
//   termsButton: {
//     backgroundColor: 'rgba(255,255,255,0.2)',
//     paddingVertical: 6,
//     paddingHorizontal: 12,
//     borderRadius: 16,
//   },
//   termsText: {
//     fontSize: 12,
//     fontWeight: '600',
//     color: '#fff',
//   },
//   content: {
//     padding: 16,
//     paddingBottom: 100,
//   },
//   earnCard: {
//     marginBottom: 24,
//     borderRadius: 16,
//     overflow: 'hidden',
//     elevation: 4,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.15,
//     shadowRadius: 6,
//   },
//   earnGradient: {
//     padding: 24,
//     alignItems: 'center',
//   },
//   moneyIcon: {
//     marginBottom: 8,
//   },
//   earnText: {
//     fontSize: 28,
//     fontWeight: '800',
//     color: '#EC4D4A',
//     marginBottom: 4,
//   },
//   earnSubText: {
//     fontSize: 16,
//     color: '#666',
//     fontWeight: '500',
//   },
//   section: {
//     marginBottom: 24,
//   },
//   sectionTitle: {
//     fontSize: 20,
//     fontWeight: '700',
//     color: '#333',
//     marginBottom: 8,
//   },
//   sectionSubtitle: {
//     fontSize: 14,
//     color: '#666',
//     marginBottom: 16,
//   },
//   stepsContainer: {
//     backgroundColor: '#fff',
//     borderRadius: 12,
//     padding: 16,
//     elevation: 2,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//   },
//   step: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   stepNumber: {
//     width: 32,
//     height: 32,
//     borderRadius: 16,
//     backgroundColor: '#EC4D4A',
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginRight: 12,
//   },
//   stepNumberText: {
//     fontSize: 16,
//     fontWeight: '700',
//     color: '#fff',
//   },
//   stepText: {
//     flex: 1,
//     fontSize: 15,
//     color: '#333',
//     lineHeight: 20,
//   },
//   milestonesContainer: {
//     gap: 12,
//   },
//   milestoneCard: {
//     backgroundColor: '#fff',
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 12,
//     borderLeftWidth: 4,
//     borderLeftColor: '#EC4D4A',
//     elevation: 2,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//   },
//   milestoneHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   milestoneIconCircle: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: '#FFE8E8',
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginRight: 12,
//   },
//   milestoneInfo: {
//     flex: 1,
//   },
//   milestoneRides: {
//     fontSize: 15,
//     fontWeight: '600',
//     color: '#333',
//     marginBottom: 4,
//   },
//   milestoneAmount: {
//     fontSize: 18,
//     fontWeight: '800',
//     color: '#EC4D4A',
//   },
//   benefitsContainer: {
//     backgroundColor: '#fff',
//     borderRadius: 12,
//     padding: 16,
//     elevation: 2,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//   },
//   benefitItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   benefitText: {
//     fontSize: 15,
//     color: '#333',
//     marginLeft: 12,
//     flex: 1,
//   },
//   referButton: {
//     backgroundColor: '#EC4D4A',
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 16,
//     borderRadius: 12,
//     marginTop: 8,
//     elevation: 4,
//     shadowColor: '#EC4D4A',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 6,
//   },
//   referButtonText: {
//     fontSize: 16,
//     fontWeight: '700',
//     color: '#fff',
//     marginRight: 8,
//   },
// });

// export default ReferralAutoScreen;
