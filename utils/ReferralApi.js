import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG } from "../config/api.js";

// Use the same API URL as other services
// const API_URL = "https://ridodrop-backend-24-10-2025.onrender.com/api/v1";
const API_URL = API_CONFIG.BASE_URL + "/api/v1";

// Create a safe axios-like fetch wrapper to avoid crashes
const safeFetch = async (url, options = {}) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    const contentType =
      (response.headers &&
        response.headers.get &&
        response.headers.get("content-type")) ||
      "";
    let parsedData;

    if (contentType.includes("application/json")) {
      try {
        parsedData = await response.json();
      } catch (parseErr) {
        // Server said JSON but body wasn't valid JSON
        let rawText = "";
        try {
          rawText = await response.text();
        } catch {}
        const err = new Error("Invalid JSON response from server");
        err.cause = parseErr;
        err.response = {
          status: response.status,
          data: rawText,
          contentType,
          url: response.url,
        };
        throw err;
      }
    } else {
      // Non-JSON response (likely HTML error page). Read text for diagnostics and throw.
      const rawText = await response.text();
      const err = new Error("Non-JSON response from server");
      err.response = {
        status: response.status,
        data: rawText,
        contentType,
        url: response.url,
      };
      throw err;
    }

    if (!response.ok) {
      // HTTP error with JSON body parsed
      throw {
        response: {
          status: response.status,
          data: parsedData,
          contentType,
          url: response.url,
        },
      };
    }

    return { data: parsedData };
  } catch (error) {
    const ct = error?.response?.contentType || "";
    const isParseIssue =
      error?.message?.includes("JSON") || error?.name === "SyntaxError";
    const where = error?.response?.url || url;
    // Downgrade to warning to avoid scary red logs for expected fallback cases
    console.warn(
      `${isParseIssue ? "Parse" : "Fetch"} error at ${where}: ${
        ct && ct.includes("text/html")
          ? "HTML was returned instead of JSON"
          : error.message
      }`
    );
    throw error;
  }
};

/**
 * Get referral statistics for a user by phone number
 * @param {string} phone - User's phone number
 * @returns {Promise} - Referral statistics
 */
export const getReferralStatsByPhone = async (phone) => {
  try {
    console.log("📊 Fetching referral stats for:", phone);

    const url = `${API_URL}/referrals/stats?phone=${encodeURIComponent(phone)}`;
    const response = await safeFetch(url);

    console.log("✅ Referral stats received:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Error fetching referral stats:",
      error.response?.data || error.message
    );

    // Provide more context for different error types
    if (error.name === "AbortError") {
      throw new Error(
        "Request timed out. Please check your internet connection."
      );
    } else if (error.response?.status === 404) {
      throw new Error("User not found in referral system");
    } else if (error.response?.status === 400) {
      throw new Error("Invalid phone number");
    } else if (error.message?.includes("Network request failed")) {
      throw new Error(
        "Cannot connect to server. Please check your internet connection."
      );
    }

    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to fetch referral statistics"
    );
  }
};

/**
 * Get current user's referral statistics from AsyncStorage
 * @returns {Promise} - Current user's referral statistics
 */
export const getCurrentUserReferralStats = async () => {
  try {
    const phone = await AsyncStorage.getItem("number");
    console.log("📱 Retrieved phone from AsyncStorage:", phone);

    if (!phone) {
      throw new Error("User phone number not found. Please login again.");
    }

    return await getReferralStatsByPhone(phone);
  } catch (error) {
    console.error(
      "❌ Error fetching current user referral stats:",
      error.message
    );
    // Re-throw with more context
    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      "Failed to fetch referral data";
    throw new Error(errorMessage);
  }
};

/**
 * Get referral campaigns information
 * @returns {Promise} - List of active campaigns
 */
export const getReferralCampaigns = async () => {
  try {
    console.log("📋 Fetching referral campaigns...");

    const url = `${API_URL}/referrals/campaigns`;
    const response = await safeFetch(url);

    console.log("✅ Raw response from safeFetch:", response);
    console.log("✅ Response.data:", response.data);
    
    // safeFetch returns { data: parsedData }
    // Backend returns { success: true, data: [...] }
    // So response.data = { success: true, data: [...] }
    const backendResponse = response.data;
    
    console.log("✅ Backend response:", backendResponse);
    console.log("✅ Campaigns array:", backendResponse?.data);
    
    return {
      success: backendResponse?.success || false,
      campaigns: backendResponse?.data || []
    };
  } catch (error) {
    console.error(
      "❌ Error fetching campaigns:",
      error.response?.data || error.message
    );

    // Return empty campaigns if API fails
    console.log("⚠️ Campaign fetch failed, returning empty array");
    return {
      success: false,
      campaigns: [],
      error: error.message
    };
  }
};

/**
 * Create a new referral when someone uses a referral code
 * @param {Object} referralData - { referralCode, referredUserPhone, vehicleType }
 * @returns {Promise} - Created referral
 */
export const createReferral = async (referralData) => {
  try {
    console.log("➕ Creating referral:", referralData);

    const url = `${API_URL}/referrals/create`;
    const response = await safeFetch(url, {
      method: "POST",
      body: JSON.stringify(referralData),
    });

    console.log("✅ Referral created:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Error creating referral:",
      error.response?.data || error.message
    );
    throw error;
  }
};

/**
 * Get all referrals for admin view
 * @param {Object} params - { page, limit, status, vehicleType }
 * @returns {Promise} - List of referrals
 */
export const getAllReferrals = async (params = {}) => {
  try {
    console.log("📋 Fetching all referrals with params:", params);

    const queryString = new URLSearchParams(params).toString();
    const url = `${API_URL}/referrals/all${
      queryString ? "?" + queryString : ""
    }`;
    const response = await safeFetch(url);

    console.log("✅ All referrals received");
    return response.data;
  } catch (error) {
    console.error(
      "❌ Error fetching all referrals:",
      error.response?.data || error.message
    );
    throw error;
  }
};

/**
 * Share referral code via native share
 * @param {string} referralCode - User's referral code
 * @param {string} userName - User's name
 * @returns {Promise} - Share result
 */
export const shareReferralCode = async (referralCode, userName = "Friend") => {
  try {
    const { Share } = require("react-native");

    const message =
      `🚚 Join RidoDrop and start earning! 💰\n\n` +
      `Use my referral code: ${referralCode}\n\n` +
      `Get amazing rewards on your first booking!\n` +
      `Download the app now and let's ride together! 🏍️`;

    const result = await Share.share({
      message: message,
      title: "Join RidoDrop - Refer and Earn!",
    });

    if (result.action === Share.sharedAction) {
      console.log("✅ Referral code shared successfully");
      return { success: true, shared: true };
    } else if (result.action === Share.dismissedAction) {
      console.log("ℹ️ Share dismissed");
      return { success: true, shared: false };
    }
  } catch (error) {
    console.error("❌ Error sharing referral code:", error);
    throw error;
  }
};

/**
 * Copy referral code to clipboard
 * @param {string} referralCode - User's referral code
 * @returns {Promise} - Copy result
 */
export const copyReferralCode = async (referralCode) => {
  try {
    const { Clipboard } = require("react-native");
    await Clipboard.setString(referralCode);
    console.log("✅ Referral code copied to clipboard");
    return { success: true };
  } catch (error) {
    console.error("❌ Error copying referral code:", error);
    throw error;
  }
};

/**
 * Get vehicle-specific referral details and earnings
 * @param {string} vehicleType - '2W', '3W', or 'Truck'
 * @returns {Promise} - Vehicle-specific referral statistics
 */
export const getVehicleReferralDetails = async (vehicleType) => {
  try {
    console.log(`📊 Fetching ${vehicleType} referral details...`);
    const phone = await AsyncStorage.getItem("number");

    if (!phone) {
      throw new Error("User phone number not found. Please login again.");
    }

    // Get all user stats
    const statsResponse = await getReferralStatsByPhone(phone);

    if (statsResponse && statsResponse.success && statsResponse.data) {
      const data = statsResponse.data;

      // Filter referrals by vehicle type
      const vehicleReferrals =
        data.referrals?.filter((r) => r.vehicleType === vehicleType) || [];

      // Calculate vehicle-specific earnings
      const totalEarnings = vehicleReferrals
        .filter((r) => r.status === "paid")
        .reduce((sum, r) => sum + r.rewardAmount, 0);

      const pendingEarnings = vehicleReferrals
        .filter((r) => r.status === "completed")
        .reduce((sum, r) => sum + r.rewardAmount, 0);

      const totalReferrals = vehicleReferrals.length;
      const completedReferrals = vehicleReferrals.filter(
        (r) => r.status === "completed" || r.status === "paid"
      ).length;
      const pendingReferrals = vehicleReferrals.filter(
        (r) => r.status === "pending"
      ).length;

      console.log(`✅ ${vehicleType} referral details received`);

      return {
        success: true,
        data: {
          vehicleType,
          user: data.user,
          totalEarnings,
          pendingEarnings,
          totalReferrals,
          completedReferrals,
          pendingReferrals,
          referrals: vehicleReferrals,
          rewardAmount:
            vehicleType === "2W" ? 600 : vehicleType === "3W" ? 1200 : 1600,
        },
      };
    } else {
      // Return default empty data
      return {
        success: true,
        data: {
          vehicleType,
          user: { referralCode: "N/A" },
          totalEarnings: 0,
          pendingEarnings: 0,
          totalReferrals: 0,
          completedReferrals: 0,
          pendingReferrals: 0,
          referrals: [],
          rewardAmount:
            vehicleType === "2W" ? 600 : vehicleType === "3W" ? 1200 : 1600,
        },
      };
    }
  } catch (error) {
    console.error(
      `❌ Error fetching ${vehicleType} referral details:`,
      error.message
    );

    // Return default data on error
    return {
      success: true,
      data: {
        vehicleType,
        user: { referralCode: "N/A" },
        totalEarnings: 0,
        pendingEarnings: 0,
        totalReferrals: 0,
        completedReferrals: 0,
        pendingReferrals: 0,
        referrals: [],
        rewardAmount:
          vehicleType === "2W" ? 600 : vehicleType === "3W" ? 1200 : 1600,
      },
    };
  }
};

/**
 * Get campaign details with milestones for a specific vehicle type
 * @param {string} vehicleType - '2W', '3W', or 'Truck'
 * @returns {Promise} - Campaign details with milestones
 */
export const getCampaignDetails = async (vehicleType) => {
  try {
    console.log(`📋 Fetching campaign details for ${vehicleType}...`);

    const url = `${API_URL}/referrals/campaigns/${vehicleType}`;
    const response = await safeFetch(url);

    console.log(
      `✅ Campaign details for ${vehicleType} received:`,
      response.data
    );
    return response.data;
  } catch (error) {
    console.warn(
      `⚠️ Falling back to default campaign for ${vehicleType}. Reason:`,
      error?.response?.contentType?.includes?.("text/html")
        ? "Server returned HTML instead of JSON (endpoint may be missing or misconfigured)"
        : error.response?.data || error.message
    );

    // Return default campaign data based on vehicle type
    console.log(`⚠️ Using default campaign data for ${vehicleType}`);

    const defaultMilestones = {
      "2W": [
        {
          id: 1,
          title: "Friend Activation",
          rides: 0,
          reward: 0,
          description: "Friend must activate before 31st May 2025",
          days: null,
        },
        {
          id: 2,
          title: "10 Rides Bonus",
          rides: 10,
          reward: 250,
          description: "Complete 10 rides in 3 days",
          days: 3,
        },
        {
          id: 3,
          title: "25 Rides Bonus",
          rides: 25,
          reward: 350,
          description: "Complete 25 rides in 6 days",
          days: 6,
        },
        {
          id: 4,
          title: "50 Rides Bonus",
          rides: 50,
          reward: 400,
          description: "Complete 50 rides in 10 days",
          days: 10,
        },
        {
          id: 5,
          title: "75 Rides Bonus",
          rides: 75,
          reward: 500,
          description: "Complete 75 rides in 13 days",
          days: 13,
        },
      ],
      "3W": [
        {
          id: 1,
          title: "Friend Activation",
          rides: 0,
          reward: 0,
          description: "Friend must activate before 31st May 2025",
          days: null,
        },
        {
          id: 2,
          title: "10 Rides Bonus",
          rides: 10,
          reward: 250,
          description: "Complete 10 rides in 3 days",
          days: 3,
        },
        {
          id: 3,
          title: "25 Rides Bonus",
          rides: 25,
          reward: 350,
          description: "Complete 25 rides in 6 days",
          days: 6,
        },
        {
          id: 4,
          title: "50 Rides Bonus",
          rides: 50,
          reward: 400,
          description: "Complete 50 rides in 10 days",
          days: 10,
        },
        {
          id: 5,
          title: "75 Rides Bonus",
          rides: 75,
          reward: 500,
          description: "Complete 75 rides in 13 days",
          days: 13,
        },
      ],
      Truck: [
        {
          id: 1,
          title: "Friend Activation",
          rides: 0,
          reward: 0,
          description: "Friend must activate before 31st May 2025",
          days: null,
        },
        {
          id: 2,
          title: "10 Rides Bonus",
          rides: 10,
          reward: 250,
          description: "Complete 10 rides in 3 days",
          days: 3,
        },
        {
          id: 3,
          title: "25 Rides Bonus",
          rides: 25,
          reward: 350,
          description: "Complete 25 rides in 6 days",
          days: 6,
        },
        {
          id: 4,
          title: "50 Rides Bonus",
          rides: 50,
          reward: 400,
          description: "Complete 50 rides in 10 days",
          days: 10,
        },
        {
          id: 5,
          title: "75 Rides Bonus",
          rides: 75,
          reward: 500,
          description: "Complete 75 rides in 13 days",
          days: 13,
        },
      ],
    };

    // Calculate max reward
    const milestones = defaultMilestones[vehicleType];
    const maxReward = milestones.reduce((sum, m) => sum + m.reward, 0);

    return {
      success: true,
      campaign: {
        id: vehicleType === "2W" ? 1 : vehicleType === "3W" ? 2 : 3,
        name: `${vehicleType} Referral Program`,
        vehicleType: vehicleType,
        maxReward: maxReward,
        startDate: "2025-05-08",
        endDate: "2025-05-31",
        status: "active",
        description: `Refer ${vehicleType} riders and earn up to ₹${maxReward.toLocaleString()} per referral`,
        milestones: milestones,
      },
    };
  }
};

export default {
  getReferralStatsByPhone,
  getCurrentUserReferralStats,
  getReferralCampaigns,
  createReferral,
  getAllReferrals,
  shareReferralCode,
  copyReferralCode,
  getVehicleReferralDetails,
  getCampaignDetails,
};
