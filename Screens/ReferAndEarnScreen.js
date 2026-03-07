// import React, { useState } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   Image,
//   Share,
//   Dimensions,
// } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
// import { LinearGradient } from 'expo-linear-gradient'; // ensure expo-linear-gradient is installed

// const { width } = Dimensions.get('window');

// const ReferAndEarnScreen = () => {
//   const referralCode = 'RIDODROP123';
//   const [referralCount, setReferralCount] = useState(12); // static for now, can be dynamic via API

//   const handleShare = async () => {
//     try {
//       const result = await Share.share({
//         message: `Use my referral code ${referralCode} to get rewards! 🚚💰 Download the app now.`,
//       });

//       if (result.action === Share.sharedAction) {
//         if (!result.activityType) {
//           setReferralCount(referralCount + 1); // increase share count
//         }
//       }
//     } catch (error) {
//       alert(error.message);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Image
//         source={require('../assets/Rafer.png')}
//         style={styles.banner}
//         resizeMode="contain"
//       />

//       <Text style={styles.title}>Refer and Earn</Text>
//       <Text style={styles.subtitle}>Invite friends and earn rewards for every referral!</Text>

//       <View style={styles.referralCard}>
//         <Text style={styles.codeLabel}>Your Referral Code</Text>
//         <Text style={styles.code}>{referralCode}</Text>

//         <TouchableOpacity onPress={handleShare}>
//           <LinearGradient
//             colors={['#ff512f', '#dd2476']}
//             start={{ x: 0, y: 0 }}
//             end={{ x: 1, y: 0 }}
//             style={styles.shareButton}
//           >
//             <Ionicons name="share-social-outline" size={20} color="white" />
//             <Text style={styles.shareText}>Share Code</Text>
//           </LinearGradient>
//         </TouchableOpacity>
//       </View>

//       <View style={styles.statsBox}>
//         <Ionicons name="people" size={22} color="#333" />
//         <Text style={styles.statsText}>{referralCount} people used your code</Text>
//       </View>

//       <View style={styles.howItWorks}>
//         <Text style={styles.howTitle}>How It Works</Text>
//         <Text style={styles.howItem}>• Share your referral code</Text>
//         <Text style={styles.howItem}>• Friends get discounts on their first booking</Text>

//       </View>
//     </View>
//   );
// };

// export default ReferAndEarnScreen;

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fefefe',
//     paddingHorizontal: 20,
//     paddingTop: 10,
//   },
//   banner: {
//     width: '100%',
//     height: 180,
//     marginBottom: 10,
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: '800',
//     textAlign: 'center',
//     color: '#222',
//   },
//   subtitle: {
//     fontSize: 16,
//     textAlign: 'center',
//     color: '#666',
//     marginVertical: 10,
//   },
//   referralCard: {
//     backgroundColor: '#fff',
//     borderRadius: 16,
//     padding: 20,
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOpacity: 0.05,
//     shadowRadius: 10,
//     elevation: 3,
//     marginVertical: 20,
//   },
//   codeLabel: {
//     fontSize: 14,
//     color: '#999',
//     marginBottom: 5,
//   },
//   code: {
//     fontSize: 22,
//     fontWeight: 'bold',
//     letterSpacing: 2,
//     marginBottom: 20,
//     color: '#222',
//   },
//   shareButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 12,
//     paddingHorizontal: 25,
//     borderRadius: 30,
//   },
//   shareText: {
//     color: '#fff',
//     fontWeight: 'bold',
//     fontSize: 16,
//     marginLeft: 8,
//   },
//   statsBox: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#e6f3ff',
//     padding: 14,
//     borderRadius: 12,
//     marginBottom: 25,
//   },
//   statsText: {
//     marginLeft: 10,
//     fontSize: 16,
//     color: '#333',
//     fontWeight: '500',
//   },
//   howItWorks: {
//     backgroundColor: '#fff',
//     borderRadius: 12,
//     padding: 20,
//     shadowColor: '#000',
//     shadowOpacity: 0.04,
//     shadowRadius: 8,
//     elevation: 2,
//   },
//   howTitle: {
//     fontSize: 18,
//     fontWeight: '700',
//     marginBottom: 10,
//     color: '#222',
//   },
//   howItem: {
//     fontSize: 15,
//     color: '#555',
//     marginBottom: 8,
//   },
// });

// import React from 'react';
// import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, TextInput } from 'react-native';
// import { Ionicons, MaterialIcons } from '@expo/vector-icons';

// const ReferAndEarnScreen = () => {
//   return (
//     <ScrollView contentContainerStyle={styles.container}>
//       {/* Header */}
//       <View style={styles.header}>
//         <Ionicons name="arrow-back" size={24} />
//         <Text style={styles.headerTitle}>Refer & Earn</Text>
//         <TouchableOpacity>
//           <Ionicons name="help-circle-outline" size={24} />
//         </TouchableOpacity>
//       </View>

//       {/* Illustration */}
//       <Image
//         source={require('../assets/Rafer.png')} // Replace with your actual illustration asset
//         style={styles.illustration}
//         resizeMode="contain"
//       />
//       <Text style={styles.mainTitle}>Refer and Earn</Text>

//       {/* Total Earnings */}
//       <TouchableOpacity style={styles.earningsCard}>
//         <View style={styles.earningsIcon}>
//           <MaterialIcons name="payments" size={20} color="#00C853" />
//         </View>
//         <Text style={styles.earningsText}>Total Earnings:</Text>
//         <Text style={styles.earningsAmount}>₹0</Text>
//       </TouchableOpacity>

//       {/* Active Campaigns */}
//       <Text style={styles.sectionTitle}>Active Campaigns</Text>

//       <View style={styles.campaignRow}>
//         <Image source={require('../assets/bike.png')} style={styles.vehicleIcon} />
//         <Text style={styles.campaignText}>2 Wheeler Referral = ₹600</Text>
//         <TouchableOpacity><Text style={styles.linkText}>Know more</Text></TouchableOpacity>
//       </View>

//       <View style={styles.campaignRow}>
//         <Image source={require('../assets/Auto.png')} style={styles.vehicleIcon} />
//         <Text style={styles.campaignText}>3 Wheeler Referral = ₹1200</Text>
//         <TouchableOpacity><Text style={styles.linkText}>Know more</Text></TouchableOpacity>
//       </View>

//        <View style={styles.campaignRow}>
//         <Image source={require('../assets/truck.png')} style={styles.vehicleIcon} />
//         <Text style={styles.campaignText}>1 Truck Referral = ₹1600</Text>
//         <TouchableOpacity><Text style={styles.linkText}>Know more</Text></TouchableOpacity>
//       </View>

//       {/* Referral Code */}
//       <View style={styles.referralCard}>
//         <Text style={styles.referralLabel}>Your referral code is</Text>
//         <View style={styles.codeRow}>
//           <Text style={styles.codeText}>RH21OI9</Text>
//           <TouchableOpacity>
//             <Text style={styles.copyText}>Copy Link</Text>
//           </TouchableOpacity>
//         </View>
//       </View>

//       {/* Refer Friends Button */}
//       <TouchableOpacity style={styles.referButton}>
//         <Text style={styles.referButtonText}>Refer Friends</Text>
//       </TouchableOpacity>
//     </ScrollView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     padding: 16,
//     backgroundColor: '#fff',
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   headerTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
//   illustration: {
//     height: 160,
//     width: '100%',
//     marginVertical: 20,
//   },
//   mainTitle: {
//     textAlign: 'center',
//     fontSize: 18,
//     fontWeight: '600',
//     marginBottom: 16,
//   },
//   earningsCard: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#F1F1F1',
//     padding: 16,
//     borderRadius: 10,
//     marginBottom: 20,
//   },
//   earningsIcon: {
//     marginRight: 10,
//   },
//   earningsText: {
//     fontSize: 16,
//     fontWeight: '500',
//   },
//   earningsAmount: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#00C853',
//     marginLeft: 6,
//   },
//   sectionTitle: {
//     fontWeight: 'bold',
//     fontSize: 16,
//     marginBottom: 12,
//   },
//   campaignRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 10,
//   },
//   vehicleIcon: {
//     height: 24,
//     width: 24,
//     marginRight: 10,
//   },
//   campaignText: {
//     flex: 1,
//     fontSize: 15,
//   },
//   linkText: {
//     color: '#2979FF',
//     fontWeight: '500',
//   },
//   referralCard: {
//     backgroundColor: '#7C4DFF',
//     padding: 16,
//     borderRadius: 10,
//     marginVertical: 20,
//   },
//   referralLabel: {
//     color: '#fff',
//     fontSize: 14,
//     marginBottom: 6,
//   },
//   codeRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   codeText: {
//     color: '#fff',
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
//   copyText: {
//     color: '#fff',
//     textDecorationLine: 'underline',
//     fontSize: 14,
//   },
//   referButton: {
//     backgroundColor: '#FFD600',
//     paddingVertical: 14,
//     borderRadius: 10,
//     alignItems: 'center',
//     marginBottom: 30,
//   },
//   referButtonText: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#000',
//   },
// });

// export default ReferAndEarnScreen;

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Alert,
  ActivityIndicator,
  Share,
  Clipboard,
  RefreshControl,
} from "react-native";
import { Ionicons, MaterialIcons, FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import {
  getCurrentUserReferralStats,
  getReferralCampaigns,
  shareReferralCode,
} from "../utils/ReferralApi";

const { width } = Dimensions.get("window");

const ReferAndEarnScreen = () => {
  const navigation = useNavigation();

  const handleBack = () => {
    try {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        // Fallback: navigate to a safe root (Tabs -> Home) if no history
        navigation.navigate("Home");
      }
    } catch (e) {
      console.warn("Back navigation failed, redirecting to Home", e);
      navigation.navigate("Home");
    }
  };

  // State management
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [referralData, setReferralData] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [error, setError] = useState(null);

  // Fetch referral data on component mount
  useEffect(() => {
    // Wrap in try-catch to prevent crash
    const loadData = async () => {
      try {
        await fetchReferralData();
      } catch (err) {
        console.error("Error in useEffect:", err);
        setError("Failed to load screen");
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const fetchReferralData = async () => {
    try {
      console.log("🔄 Starting to fetch referral data...");
      setLoading(true);
      setError(null);

      // Initialize with empty campaigns
      setCampaigns([]);

      // Fetch campaigns first (has fallback so won't crash)
      try {
        console.log("📋 Fetching campaigns...");
        const campaignsResponse = await getReferralCampaigns();
        console.log("📋 Campaigns response:", campaignsResponse);

        if (
          campaignsResponse &&
          campaignsResponse.success &&
          campaignsResponse.campaigns
        ) {
          // Filter out priority 0 campaigns (test/temporary campaigns)
          const activeCampaigns = campaignsResponse.campaigns.filter(
            campaign => campaign.priority >= 1 && campaign.priority <= 3
          );
          
          console.log("📋 Filtered campaigns (priority 1-3):", activeCampaigns.map(c => ({
            type: c.vehicleType,
            priority: c.priority,
            maxReward: c.maxReward || c.rewardAmount
          })));
          
          // Filter out duplicates - keep only one campaign per vehicle type
          // Prioritize by: priority (lower = higher priority), then highest maxReward
          const uniqueCampaigns = [];
          const vehicleTypesAdded = new Set();
          
          // Sort campaigns by priority (lower number = higher priority)
          const sortedCampaigns = [...activeCampaigns].sort((a, b) => {
            // Lower priority number comes first (1 before 2 before 3)
            if (a.priority !== b.priority) return a.priority - b.priority;
            
            // If same priority, prefer higher reward
            const maxRewardA = a.maxReward || a.rewardAmount || 0;
            const maxRewardB = b.maxReward || b.rewardAmount || 0;
            if (maxRewardB !== maxRewardA) return maxRewardB - maxRewardA;
            
            // If same reward, prefer more recent
            return new Date(b.startDate) - new Date(a.startDate);
          });
          
          // Keep first occurrence of each vehicle type (by priority)
          sortedCampaigns.forEach(campaign => {
            if (!vehicleTypesAdded.has(campaign.vehicleType)) {
              uniqueCampaigns.push(campaign);
              vehicleTypesAdded.add(campaign.vehicleType);
            }
          });
          
          setCampaigns(uniqueCampaigns);
          console.log("✅ Campaigns set (filtered):", uniqueCampaigns.length);
          console.log("📋 Campaign details:", uniqueCampaigns.map(c => ({ 
            type: c.vehicleType, 
            maxReward: c.maxReward || c.rewardAmount 
          })));
        } else {
          console.log("⚠️ No campaigns received from API");
          setCampaigns([]);
        }
      } catch (campaignError) {
        console.error(
          "⚠️ Campaign fetch failed:",
          campaignError
        );
        setCampaigns([]);
      }

      // Then fetch user's referral stats
      try {
        console.log("📊 Fetching user stats...");
        const statsResponse = await getCurrentUserReferralStats();
        console.log("📊 Stats response:", statsResponse);
        console.log("📊 Stats response data:", statsResponse?.data);
        console.log("📊 Total earnings:", statsResponse?.data?.totalEarnings);
        console.log("📊 Pending earnings:", statsResponse?.data?.pendingEarnings);

        if (statsResponse && statsResponse.success && statsResponse.data) {
          console.log("✅ Setting referral data with earnings:", {
            totalEarnings: statsResponse.data.totalEarnings,
            pendingEarnings: statsResponse.data.pendingEarnings,
            totalReferrals: statsResponse.data.totalReferrals
          });
          setReferralData(statsResponse.data);
          console.log("✅ Referral data set");
        } else {
          throw new Error("Invalid stats response");
        }
      } catch (statsError) {
        console.log(
          "⚠️ User stats not available, using defaults:",
          statsError.message
        );
        // Set default empty data if user doesn't exist
        setReferralData({
          user: {
            referralCode: "N/A",
          },
          totalReferrals: 0,
          completedReferrals: 0,
          pendingReferrals: 0,
          totalEarnings: 0,
          pendingEarnings: 0,
          referralsByType: {
            "2W": 0,
            "3W": 0,
            Truck: 0,
          },
        });
      }

      console.log("✅ Data fetch completed successfully");
    } catch (error) {
      console.error("❌ Critical error fetching referral data:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load referral data";
      setError(errorMessage);

      // Set empty campaigns on critical error
      setCampaigns([]);
      setReferralData({
        user: { referralCode: "N/A" },
        totalReferrals: 0,
        completedReferrals: 0,
        pendingReferrals: 0,
        totalEarnings: 0,
        pendingEarnings: 0,
        referralsByType: { "2W": 0, "3W": 0, Truck: 0 },
      });
    } finally {
      console.log("🏁 Fetch process finished");
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReferralData();
  };

  const handleShare = async () => {
    try {
      const referralCode =
        referralData?.user?.referralCode || referralData?.referralCode;

      if (
        !referralCode ||
        referralCode === "N/A" ||
        referralCode === "LOADING..."
      ) {
        Alert.alert(
          "Not Available",
          "Referral code is not available yet. Please contact support."
        );
        return;
      }

      const result = await Share.share({
        message: `🚚 Join RidoDrop and start earning! 💰\n\nUse my referral code: ${referralCode}\n\nGet amazing rewards on your first booking!\nDownload the app now and let's ride together! 🏍️`,
      });

      if (result.action === Share.sharedAction) {
        Alert.alert("Success", "Referral code shared successfully!");
      }
    } catch (error) {
      console.error("Error sharing:", error);
      Alert.alert("Error", "Failed to share referral code");
    }
  };

  const handleCopyCode = async () => {
    try {
      const referralCode =
        referralData?.user?.referralCode || referralData?.referralCode;

      if (
        !referralCode ||
        referralCode === "N/A" ||
        referralCode === "LOADING..."
      ) {
        Alert.alert(
          "Not Available",
          "Referral code is not available yet. Please contact support."
        );
        return;
      }

      await Clipboard.setString(referralCode);
      Alert.alert("Success", "Referral code copied to clipboard!");
    } catch (error) {
      console.error("Error copying:", error);
      Alert.alert("Error", "Failed to copy referral code");
    }
  };

  const handleBike = () => {
    try {
      const campaign = campaigns.find(c => c.vehicleType === "2W");
      navigation.navigate("ReferralBikeScreen", { 
        campaignData: campaign,
        referralCode: referralData?.user?.referralCode || referralData?.referralCode
      });
    } catch (error) {
      console.error("Navigation error:", error);
      Alert.alert("Info", "This feature is coming soon!");
    }
  };

  const handleAuto = () => {
    try {
      const campaign = campaigns.find(c => c.vehicleType === "3W");
      navigation.navigate("ReferralAutoScreen", { 
        campaignData: campaign,
        referralCode: referralData?.user?.referralCode || referralData?.referralCode
      });
    } catch (error) {
      console.error("Navigation error:", error);
      Alert.alert("Info", "This feature is coming soon!");
    }
  };

  const handleTruck = () => {
    try {
      const campaign = campaigns.find(c => c.vehicleType === "Truck");
      navigation.navigate("ReferralTruckScreen", { 
        campaignData: campaign,
        referralCode: referralData?.user?.referralCode || referralData?.referralCode
      });
    } catch (error) {
      console.error("Navigation error:", error);
      Alert.alert("Info", "This feature is coming soon!");
    }
  };

  const handleKnowMore = (vehicleType) => {
    const campaign = campaigns.find(c => c.vehicleType === vehicleType);
    
    switch (vehicleType) {
      case "2W":
        handleBike();
        break;
      case "3W":
        handleAuto();
        break;
      case "Truck":
        handleTruck();
        break;
      default:
        Alert.alert("Info", "This feature is coming soon!");
    }
  };

  const getCampaignImage = (vehicleType) => {
    switch (vehicleType) {
      case "2W":
        return require("../assets/bike3.png");
      case "3W":
        return require("../assets/Auto1.png");
      case "Truck":
        return require("../assets/truck1.png");
      default:
        return require("../assets/bike3.png");
    }
  };

  // Get max reward for a vehicle type from campaigns
  const getMaxRewardForVehicleType = (vehicleType) => {
    const campaign = campaigns.find((c) => c.vehicleType === vehicleType);
    if (campaign) {
      return (
        campaign.maxReward ||
        campaign.rewardAmount ||
        (campaign.milestones &&
          campaign.milestones.reduce((sum, m) => sum + (m.reward || 0), 0)) ||
        0
      );
    }
    // Fallback to default values if campaign not found
    switch (vehicleType) {
      case "2W":
        return 1500;
      case "3W":
        return 2000;
      case "Truck":
        return 2500;
      default:
        return 0;
    }
  };

  // Show loading spinner while fetching data
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#EC4D4A" />
        <Text style={styles.loadingText}>Loading referral data...</Text>
      </View>
    );
  }

  // Show error state
  if (error && !referralData) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF5252" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchReferralData}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={["#7C4DFF"]}
        />
      }
    >
      {/* Header with Gradient Background */}
      <LinearGradient
        colors={["#EC4D4A", "#EC4D4A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refer & Earn</Text>
        <TouchableOpacity style={styles.helpButton}>
          {/* <Ionicons name="help-circle-outline" size={24} color="#fff" /> */}
        </TouchableOpacity>
      </LinearGradient>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Illustration with Floating Effect */}
        <View style={styles.illustrationContainer}>
          <Image
            source={require("../assets/Rafer.png")}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.mainTitle}>Invite Friends & Earn Money</Text>
        <Text style={styles.subTitle}>
          Share your referral code and earn when they join
        </Text>

        {/* Earnings Card with Shadow */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsContent}>
            <View style={styles.earningsIcon}>
              <MaterialIcons name="payments" size={24} color="#4CAF50" />
            </View>
            <View>
              <Text style={styles.earningsLabel}>Total Earnings</Text>
              <Text style={styles.earningsAmount}>
                ₹{(referralData?.totalEarnings || 0).toLocaleString("en-IN")}
              </Text>
              {(referralData?.pendingEarnings || 0) > 0 && (
                <Text style={styles.pendingText}>
                  ₹{referralData.pendingEarnings.toLocaleString("en-IN")}{" "}
                  pending
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.historyButton}>
            <Text style={styles.historyButtonText}>
              {referralData?.totalReferrals || 0} Referrals
            </Text>
          </TouchableOpacity>
        </View>

        {/* Earnings Breakdown by Vehicle Type */}
        {referralData &&
          (referralData.referralsByType?.["2W"] > 0 ||
            referralData.referralsByType?.["3W"] > 0 ||
            referralData.referralsByType?.Truck > 0) && (
            <View style={styles.breakdownSection}>
              <Text style={styles.breakdownTitle}>Earnings Breakdown</Text>
              <View style={styles.breakdownContainer}>
                {referralData.referralsByType?.["2W"] > 0 && (
                  <TouchableOpacity
                    style={styles.breakdownCard}
                    onPress={() => handleKnowMore("2W")}
                  >
                    <Image
                      source={require("../assets/bike3.png")}
                      style={styles.breakdownIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.breakdownLabel}>2 Wheeler</Text>
                    <Text style={styles.breakdownCount}>
                      {referralData.referralsByType["2W"]} referrals
                    </Text>
                    <Text style={styles.breakdownAmount}>
                      ≈ ₹
                      {(
                        referralData.referralsByType["2W"] *
                        getMaxRewardForVehicleType("2W")
                      ).toLocaleString("en-IN")}
                    </Text>
                  </TouchableOpacity>
                )}
                {referralData.referralsByType?.["3W"] > 0 && (
                  <TouchableOpacity
                    style={styles.breakdownCard}
                    onPress={() => handleKnowMore("3W")}
                  >
                    <Image
                      source={require("../assets/Auto1.png")}
                      style={styles.breakdownIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.breakdownLabel}>3 Wheeler</Text>
                    <Text style={styles.breakdownCount}>
                      {referralData.referralsByType["3W"]} referrals
                    </Text>
                    <Text style={styles.breakdownAmount}>
                      ≈ ₹
                      {(
                        referralData.referralsByType["3W"] *
                        getMaxRewardForVehicleType("3W")
                      ).toLocaleString("en-IN")}
                    </Text>
                  </TouchableOpacity>
                )}
                {referralData.referralsByType?.Truck > 0 && (
                  <TouchableOpacity
                    style={styles.breakdownCard}
                    onPress={() => handleKnowMore("Truck")}
                  >
                    <Image
                      source={require("../assets/truck1.png")}
                      style={styles.breakdownIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.breakdownLabel}>Truck</Text>
                    <Text style={styles.breakdownCount}>
                      {referralData.referralsByType.Truck} referrals
                    </Text>
                    <Text style={styles.breakdownAmount}>
                      ≈ ₹
                      {(
                        referralData.referralsByType.Truck *
                        getMaxRewardForVehicleType("Truck")
                      ).toLocaleString("en-IN")}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

        {/* Active Campaigns Section */}
        <Text style={styles.sectionTitle}>Active Campaigns</Text>

        <View style={styles.campaignCard}>
          {campaigns && campaigns.length > 0 ? (
            campaigns.map((campaign, index) => (
              <React.Fragment key={campaign._id || campaign.id || `campaign-${campaign.vehicleType}-${index}`}>
                {index > 0 && <View style={styles.divider} />}
                <View style={styles.campaignItem}>
                  <Image
                    source={getCampaignImage(campaign.vehicleType)}
                    style={styles.vehicleIcon}
                    resizeMode="contain"
                  />
                  <View style={styles.campaignDetails}>
                    <Text style={styles.campaignText}>{campaign.name}</Text>
                    <Text style={styles.campaignAmount}>
                      Up to ₹
                      {(
                        campaign.maxReward ||
                        campaign.rewardAmount ||
                        (campaign.milestones &&
                          campaign.milestones.reduce(
                            (sum, m) => sum + (m.reward || 0),
                            0
                          )) ||
                        0
                      ).toLocaleString("en-IN")}
                    </Text>
                    {campaign.milestones && campaign.milestones.length > 0 && (
                      <Text style={styles.milestonesText}>
                        {campaign.milestones.length} milestones
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.knowMoreButton}
                    onPress={() => handleKnowMore(campaign.vehicleType)}
                  >
                    <Text style={styles.knowMoreText}>Know more</Text>
                  </TouchableOpacity>
                </View>
              </React.Fragment>
            ))
          ) : (
            <View style={styles.campaignItem}>
              <Text style={styles.campaignText}>
                No active campaigns available
              </Text>
            </View>
          )}
        </View>

        {/* Referral Code Section */}
        <LinearGradient
          colors={["#EC4D4A", "#EC4D4A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.referralCard}
        >
          <Text style={styles.referralLabel}>Your unique referral code</Text>
          <View style={styles.codeContainer}>
            <Text style={styles.codeText}>
              {referralData?.user?.referralCode ||
                referralData?.referralCode ||
                "N/A"}
            </Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyCode}
            >
              <FontAwesome name="copy" size={16} color="#EC4D4A" />
              <Text style={styles.copyText}>Copy</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.referralNote}>
            Share this code with friends or copy the referral link
          </Text>
        </LinearGradient>

        {/* Social Sharing Options */}
        {/* <View style={styles.sharingOptions}>
          <Text style={styles.sharingTitle}>Share via</Text>
          <View style={styles.sharingIcons}>
            <TouchableOpacity
              style={[styles.shareButton, { backgroundColor: "#25D366" }]}
            >
              <Ionicons name="logo-whatsapp" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shareButton, { backgroundColor: "#1877F2" }]}
            >
              <Ionicons name="logo-facebook" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shareButton, { backgroundColor: "#1DA1F2" }]}
            >
              <Ionicons name="logo-twitter" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shareButton, { backgroundColor: "#FF4500" }]}
            >
              <Ionicons name="logo-reddit" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View> */}

        {/* Main CTA Button */}
        <TouchableOpacity style={styles.referButton} onPress={handleShare}>
          <Text style={styles.referButtonText}>Invite Friends Now</Text>
          <MaterialIcons
            name="arrow-forward"
            size={20}
            color="#fff"
            style={styles.buttonIcon}
          />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F8F9FA",
    flexGrow: 1,
  },
  centerContent: {
    flex: 1,
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
  errorText: {
    marginTop: 15,
    fontSize: 16,
    color: "#FF5252",
    textAlign: "center",
    fontWeight: "500",
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#7C4DFF",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  helpButton: {
    padding: 5,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  illustrationContainer: {
    alignItems: "center",
    marginVertical: 10,
  },
  illustration: {
    height: 180,
    width: width * 0.8,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 25,
  },
  earningsCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  earningsContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  earningsIcon: {
    backgroundColor: "#E8F5E9",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  earningsLabel: {
    fontSize: 14,
    color: "#666",
  },
  earningsAmount: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  pendingText: {
    fontSize: 12,
    color: "#FF9800",
    marginTop: 2,
    fontWeight: "500",
  },
  historyButton: {
    // backgroundColor: '#F1F8E9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
  },
  historyButtonText: {
    color: "#4CAF50",
    fontSize: 12,
    fontWeight: "500",
  },
  // Earnings Breakdown Styles
  breakdownSection: {
    marginBottom: 25,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  breakdownContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  breakdownCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    width: "31%",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    marginBottom: 10,
  },
  breakdownIcon: {
    width: 32,
    height: 32,
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    textAlign: "center",
  },
  breakdownCount: {
    fontSize: 11,
    color: "#999",
    marginBottom: 6,
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#EC4D4A",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  campaignCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 25,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  campaignItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
  },
  vehicleIcon: {
    width: 40,
    height: 40,
    marginRight: 15,
  },
  campaignDetails: {
    flex: 1,
  },
  campaignText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  campaignAmount: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "bold",
    marginTop: 3,
  },
  milestonesText: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  referralCount: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  knowMoreButton: {
    // backgroundColor: '#E3F2FD',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
  },
  knowMoreText: {
    color: "#1976D2",
    fontSize: 12,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
  },
  referralCard: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  referralLabel: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 5,
  },
  codeContainer: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  codeText: {
    color: "#fff",
    fontSize: 32, // Increased for better visibility as requested
    fontWeight: "bold",
    letterSpacing: 2,
    textAlign: "center",
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginTop: 6,
  },
  copyText: {
    color: "#EC4D4A",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 5,
  },
  referralNote: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
  },
  sharingOptions: {
    marginBottom: 25,
  },
  sharingTitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 10,
    textAlign: "center",
  },
  sharingIcons: {
    flexDirection: "row",
    justifyContent: "center",
  },
  shareButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 8,
    elevation: 3,
  },
  referButton: {
    // backgroundColor: '#FF9800',
    backgroundColor: "#EC4D4A",
    paddingVertical: 16,
    borderRadius: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#FF9800",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  referButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  buttonIcon: {
    marginLeft: 10,
  },
});

export default ReferAndEarnScreen;
