import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getRiderByPhone } from "./AuthApi";
import { API_CONFIG } from "../config/api.js";

// const API_BASE_URL = "https://ridodrop-backend-24-10-2025.onrender.com/api/v1";
const API_BASE_URL = API_CONFIG.BASE_URL + "/api/v1";

/**
 * Get rider's order history with earnings data
 * @param {string} riderId - The rider's ID (optional, will fetch from AsyncStorage if not provided)
 * @param {object} filters - Optional filters for the API call
 * @returns {Promise<object>} Order history data with earnings
 */
export const getOrderHistory = async (riderId = null, filters = {}) => {
  try {
    console.log("📊 getOrderHistory called with:", { riderId, filters });

    // Get rider ID if not provided
    let finalRiderId = riderId;
    if (!finalRiderId) {
      try {
        const riderData = await getRiderByPhone();
        console.log("🔍 Full rider data structure:", JSON.stringify(riderData, null, 2));
        
        // Try multiple possible field locations for rider ID
        finalRiderId = riderData?._id || 
                      riderData?.id || 
                      riderData?.rider?._id || 
                      riderData?.rider?.id ||
                      riderData?.data?._id ||
                      riderData?.data?.id ||
                      riderData?.riderId;
        
        console.log("👤 Retrieved riderId from rider data:", finalRiderId);
        console.log("🔍 Available fields in riderData:", Object.keys(riderData || {}));
      } catch (riderErr) {
        console.log("❌ Error getting rider data:", riderErr.message);
        throw new Error("Could not get rider information. Please login again.");
      }
    }

    if (!finalRiderId) {
      console.log("❌ No rider ID found in any expected field");
      throw new Error("Rider ID not found. Please login again.");
    }

    // Build query parameters - try with rider ID first
    let queryParams = new URLSearchParams({
      rider: finalRiderId,
      ...filters
    });

    let url = `${API_BASE_URL}/order-history?${queryParams.toString()}`;
    console.log("📤 Making request to:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("📥 Response status:", response.status);
    
    if (!response.ok) {
      // If rider ID approach fails, try with phone number
      console.log("⚠️ Rider ID approach failed, trying with phone number...");
      
      try {
        const phoneNumber = await AsyncStorage.getItem("number");
        if (phoneNumber) {
          console.log("📞 Retrying with phone number:", phoneNumber);
          
          // Try using the comprehensive bookings API with phone as riderId filter
          const phoneQueryParams = new URLSearchParams({
            riderId: phoneNumber,
            ...filters
          });
          
          const phoneUrl = `${API_BASE_URL}/all?${phoneQueryParams.toString()}`;
          console.log("📤 Making phone-based request to:", phoneUrl);
          
          const phoneResponse = await fetch(phoneUrl, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });
          
          if (phoneResponse.ok) {
            const phoneData = await phoneResponse.json();
            console.log("✅ Phone-based response success:", {
              success: phoneData.success,
              count: phoneData.bookings?.length || 0
            });
            
            // Transform the response to match expected format
            return {
              count: phoneData.bookings?.length || 0,
              bookings: phoneData.bookings || []
            };
          }
        }
      } catch (phoneErr) {
        console.log("❌ Phone number fallback also failed:", phoneErr.message);
      }
      
      const errorText = await response.text();
      console.error("❌ API error response:", errorText);
      throw new Error(`Failed to fetch order history: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Order history response:", {
      count: data.count || 0,
      hasBookings: !!(data.bookings && data.bookings.length > 0)
    });

    return data;
  } catch (error) {
    console.error("❌ getOrderHistory error:", error);
    throw error;
  }
};

/**
 * Get comprehensive rider earnings with filtering and pagination
 * @param {string} riderId - The rider's ID (optional)
 * @param {object} options - Filtering and pagination options
 * @returns {Promise<object>} Comprehensive earnings data
 */
export const getRiderEarnings = async (riderId = null, options = {}) => {
  try {
    console.log("💰 getRiderEarnings called with:", { riderId, options });

    // Get rider ID if not provided
    let finalRiderId = riderId;
    if (!finalRiderId) {
      try {
        const riderData = await getRiderByPhone();
        console.log("🔍 Full rider data structure:", JSON.stringify(riderData, null, 2));
        
        // Try multiple possible field locations for rider ID
        finalRiderId = riderData?._id || 
                      riderData?.id || 
                      riderData?.rider?._id || 
                      riderData?.rider?.id ||
                      riderData?.data?._id ||
                      riderData?.data?.id ||
                      riderData?.riderId;
        
        console.log("👤 Retrieved riderId from rider data:", finalRiderId);
        console.log("🔍 Available fields in riderData:", Object.keys(riderData || {}));
      } catch (riderErr) {
        console.log("❌ Error getting rider data:", riderErr.message);
        throw new Error("Could not get rider information. Please login again.");
      }
    }

    if (!finalRiderId) {
      console.log("❌ No rider ID found in any expected field");
      throw new Error("Rider ID not found. Please login again.");
    }

    // Build query parameters
    const queryParams = new URLSearchParams({
      riderId: finalRiderId,
      page: options.page || 1,
      limit: options.limit || 50,
      ...options.filters
    });

    const url = `${API_BASE_URL}/all?${queryParams.toString()}`;
    console.log("📤 Making comprehensive earnings request to:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("📥 Response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API error response:", errorText);
      throw new Error(`Failed to fetch rider earnings: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Comprehensive earnings response:", {
      success: data.success,
      totalBookings: data.bookings?.length || 0,
      pagination: data.pagination
    });

    return data;
  } catch (error) {
    console.error("❌ getRiderEarnings error:", error);
    throw error;
  }
};

/**
 * Calculate earnings summary from bookings data
 * @param {Array} bookings - Array of booking objects
 * @returns {object} Calculated earnings summary
 */
export const calculateEarnings = (bookings = []) => {
  try {
    console.log("🧮 calculateEarnings called with", bookings.length, "bookings");

    // Filter only completed bookings for earnings calculation
    const completedBookings = bookings.filter(booking => 
      booking.status === 'completed' || 
      booking.bookingStatus === 'Completed'
    );

    console.log("✅", completedBookings.length, "completed bookings found");

    // Calculate totals
    let totalEarnings = 0;
    let totalQuickFees = 0;
    let completedOrders = completedBookings.length;

    // Daily and weekly breakdowns
    const dailyEarnings = {};
    const weeklyEarnings = {};

    completedBookings.forEach(booking => {
      // Calculate individual earnings
      const bookingEarnings = parseFloat(booking.totalDriverEarnings || booking.price || 0);
      const quickFee = parseFloat(booking.quickFee || 0);
      
      totalEarnings += bookingEarnings;
      totalQuickFees += quickFee;

      // Group by date
      if (booking.createdAt) {
        const date = new Date(booking.createdAt);
        const dayKey = date.toDateString();
        const weekKey = getWeekKey(date);

        if (!dailyEarnings[dayKey]) {
          dailyEarnings[dayKey] = { amount: 0, orders: 0, date };
        }
        dailyEarnings[dayKey].amount += bookingEarnings;
        dailyEarnings[dayKey].orders += 1;

        if (!weeklyEarnings[weekKey]) {
          weeklyEarnings[weekKey] = { amount: 0, orders: 0, week: weekKey };
        }
        weeklyEarnings[weekKey].amount += bookingEarnings;
        weeklyEarnings[weekKey].orders += 1;
      }
    });

    // Convert to arrays and format for charts
    const weeklyData = Object.keys(dailyEarnings)
      .slice(-7) // Last 7 days
      .map((dayKey, index) => ({
        id: (index + 1).toString(),
        day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dailyEarnings[dayKey].date.getDay()],
        amount: dailyEarnings[dayKey].amount,
        orders: dailyEarnings[dayKey].orders
      }));

    const monthlyData = Object.values(weeklyEarnings)
      .slice(-4) // Last 4 weeks
      .map((week, index) => ({
        id: (index + 1).toString(),
        week: `Week ${index + 1}`,
        amount: week.amount,
        orders: week.orders
      }));

    const result = {
      totalEarnings: parseFloat(totalEarnings.toFixed(2)),
      totalQuickFees: parseFloat(totalQuickFees.toFixed(2)),
      completedOrders,
      weeklyEarnings: weeklyData,
      monthlyEarnings: monthlyData,
      averagePerOrder: completedOrders > 0 ? parseFloat((totalEarnings / completedOrders).toFixed(2)) : 0
    };

    console.log("🧮 Calculated earnings summary:", {
      totalEarnings: result.totalEarnings,
      completedOrders: result.completedOrders,
      weeklyDataPoints: result.weeklyEarnings.length,
      monthlyDataPoints: result.monthlyEarnings.length
    });

    return result;
  } catch (error) {
    console.error("❌ calculateEarnings error:", error);
    return {
      totalEarnings: 0,
      totalQuickFees: 0,
      completedOrders: 0,
      weeklyEarnings: [],
      monthlyEarnings: [],
      averagePerOrder: 0
    };
  }
};

/**
 * Get rider statistics (bonus, total trips, etc.)
 * @param {string} riderId - The rider's ID (optional)
 * @returns {Promise<object>} Rider statistics
 */
export const getRiderStats = async (riderId = null) => {
  try {
    console.log("📈 getRiderStats called");

    // For now, return mock data - can be enhanced with dedicated API later
    return {
      bonus: 850,
      totalTrips: 42,
      rating: 4.8,
      monthlyTarget: 100,
      completedThisMonth: 42
    };
  } catch (error) {
    console.error("❌ getRiderStats error:", error);
    return {
      bonus: 0,
      totalTrips: 0,
      rating: 0,
      monthlyTarget: 0,
      completedThisMonth: 0
    };
  }
};

/**
 * Helper function to get week key for grouping
 * @param {Date} date 
 * @returns {string} Week identifier
 */
const getWeekKey = (date) => {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  return `${year}-W${week}`;
};

/**
 * Helper function to get week number
 * @param {Date} date 
 * @returns {number} Week number
 */
const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};