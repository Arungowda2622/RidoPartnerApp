import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getRiderByPhone } from "./AuthApi";
import { API_CONFIG } from "../config/api.js";

const API_BASE_URL = API_CONFIG.BASE_URL + "/api/v1";
export const getBookings = async (latitude, longitude, phoneNumber) => {
  try {
    // Add parameter validation
    console.log("🔍 getBookings called with params:", {
      latitude,
      longitude,
      phoneNumber,
    });

    if (!latitude || !longitude || !phoneNumber) {
      const missing = [];
      if (!latitude) missing.push("latitude");
      if (!longitude) missing.push("longitude");
      if (!phoneNumber) missing.push("phoneNumber");
      throw new Error(`Missing required parameters: ${missing.join(", ")}`);
    }

    const requestBody = {
      latitude,
      longitude,
      number: phoneNumber, // Backend expects 'number' field
    };

    console.log("📤 API Request Body:", JSON.stringify(requestBody, null, 2));
    console.log("📤 API URL:", `${API_BASE_URL}/get/bookings`);

    const response = await fetch(`${API_BASE_URL}/get/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("📥 Response Status:", response.status);
    console.log("📥 Response OK:", response.ok);

    const data = await response.json();
    console.log("📥 getBookings API response:", JSON.stringify(data, null, 2));

    if (!response.ok) {
      // Check if the error is about having an active booking - this is not a real error
      if (data.message && data.message.includes("already have an active booking")) {
        console.log("ℹ️ Driver has active booking - returning empty booking list");
        return {
          success: true,
          bookings: [],
          message: data.message,
          hasActiveBooking: true
        };
      }
      throw new Error(data.message || "Failed to fetch bookings");
    }

    return data;
  } catch (error) {
    console.error("❌ getBookings error:", error);
    console.error("❌ Error details:", {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

export const getRiderDetails = async (vehicleType) => {
  try {
    // const response = await axios.get(
    //   "https://ridodrop-backend-24-10-2025.onrender.com/api/v1/riders/get/rider",
    //   {
    //     vehicleType,
    //   }
    // );
    const response = await axios.get(
      API_CONFIG.getEndpoint("riders/get/rider"),
      {
        vehicleType,
      }
    );
    return response.data;
  } catch (err) {
    throw err;
  }
};

export const assignOrder = async (
  bookingId,
  driverId,
  status,
  latitude,
  longitude
) => {
  try {
    console.log("📤 assignOrder called with:", {
      bookingId,
      driverId,
      status,
      latitude,
      longitude,
    });

    const requestBody = {
      bookingId,
      driverId,
      status,
    };

    // Add location if available for distance calculation
    if (latitude && longitude) {
      requestBody.latitude = latitude;
      requestBody.longitude = longitude;
      console.log("📍 Including driver location for distance calculation");
    }

    const response = await axios.post(
      `${API_BASE_URL}/assign-order`,
      requestBody
    );

    console.log("📥 assignOrder response:", response.data);
    return response.data;
  } catch (err) {
    console.error("❌ assignOrder error:", err);

    if (err.response) {
      // Server responded with error
      console.error("Response status:", err.response.status);
      console.error("Response data:", err.response.data);
      throw new Error(
        err.response.data?.message ||
          err.response.data?.error ||
          `Server error: ${err.response.status}`
      );
    } else if (err.request) {
      // Request made but no response
      console.error("No response received:", err.request);
      throw new Error("No response from server. Please check your connection.");
    } else {
      // Error in request setup
      console.error("Request setup error:", err.message);
      throw new Error(err.message || "Failed to assign order");
    }
  }
};

// ✅ DECLINE BOOKING: Rider rejects/declines a booking
export const declineBooking = async (bookingId, riderId, reason = null) => {
  try {
    console.log("🚫 declineBooking called with:", {
      bookingId,
      riderId,
      reason,
    });

    const requestBody = {
      bookingId,
      riderId,
    };

    // Add optional decline reason
    if (reason) {
      requestBody.reason = reason;
    }

    const response = await axios.post(
      `${API_BASE_URL}/decline-booking`,
      requestBody
    );

    console.log("📥 declineBooking response:", response.data);
    return response.data;
  } catch (err) {
    console.error("❌ declineBooking error:", err);

    if (err.response) {
      console.error("Response status:", err.response.status);
      console.error("Response data:", err.response.data);
      throw new Error(
        err.response.data?.message ||
          err.response.data?.error ||
          `Server error: ${err.response.status}`
      );
    } else if (err.request) {
      console.error("No response received:", err.request);
      throw new Error("No response from server. Please check your connection.");
    } else {
      console.error("Request setup error:", err.message);
      throw new Error(err.message || "Failed to decline booking");
    }
  }
};

export const getOngoingBookingForRider = async ({ riderId } = {}) => {
  try {
    console.log("🔍 getOngoingBookingForRider called with riderId:", riderId);

    const phone = await AsyncStorage.getItem("number");
    console.log("📞 Phone from storage:", phone);

    // If riderId is not provided, get it from the rider data
    let finalRiderId = riderId;
    if (!finalRiderId) {
      console.log("🔍 No riderId provided, fetching from rider data...");
      try {
        const riderData = await getRiderByPhone();
        finalRiderId = riderData?._id || riderData?.id || riderData?.rider?._id;
        console.log("👤 Retrieved riderId from rider data:", finalRiderId);
      } catch (riderErr) {
        console.log("❌ Error getting rider data:", riderErr.message);
      }
    }

    let query = "";
    if (finalRiderId) {
      query = `?riderId=${encodeURIComponent(finalRiderId)}`;
      console.log("🔗 Using riderId query:", query);
    } else if (phone) {
      query = `?phone=${encodeURIComponent(phone)}`;
      console.log("🔗 Using phone query:", query);
    } else {
      throw new Error("No rider ID or phone available");
    }

    const url = `${API_BASE_URL}/ongoing-booking${query}`;
    console.log("📤 Making request to:", url);

    // Use fetch instead of axios for better error handling
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("📥 Response status:", response.status);
    console.log("📥 Response ok:", response.ok);

    if (response.status === 404) {
      console.log("ℹ️ No ongoing booking found (404)");
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API error response:", errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Handle different API response formats
    let bookingData = data;
    
    // If the response is wrapped (has success flag and booking property)
    if (data.success && data.booking) {
      bookingData = data.booking;
      console.log("📋 Using wrapped booking data from API response");
    } else if (data.success === false) {
      console.log("❌ API returned success=false:", data.message || data.error);
      return null;
    }
    
    // Validate status before returning
    const validStatuses = ['accepted', 'in_progress', 'picked_up', 'on_way'];
    const isValidStatus = bookingData?.status && validStatuses.includes(bookingData.status);
    
    console.log("✅ Ongoing booking response data:", {
      hasData: !!bookingData,
      bookingId: bookingData._id || bookingData.bookingId,
      status: bookingData.status,
      isValidStatus,
      validStatuses,
      activeBookingsCount: bookingData.activeBookingsCount || data.activeBookingsCount || 1,
      rider: bookingData.rider,
      hasCustomer: !!bookingData.customer,
      customerName: bookingData.customer?.name || "No name",
      customerPhone: bookingData.customer?.phone || "No phone",
      fromAddress: bookingData.fromAddress?.street || bookingData.fromAddress?.address || bookingData.from?.address || "No address",
      dropLocation: bookingData.dropLocation?.[0]?.street || bookingData.dropLocation?.[0]?.address || bookingData.to?.address || "No drop",
    });
    
    // Warn if multiple active bookings exist
    const activeCount = bookingData.activeBookingsCount || data.activeBookingsCount;
    if (activeCount > 1) {
      console.log("⚠️ WARNING: Rider has", activeCount, "active bookings!");
    }

    // Validate that we have essential data
    if (!bookingData._id && !bookingData.bookingId) {
      console.log("⚠️ Warning: Booking response missing ID");
      return null;
    }
    if (!bookingData.status) {
      console.log("⚠️ Warning: Booking response missing status");
      return null;
    }
    if (!isValidStatus) {
      console.log("⚠️ Warning: Booking has invalid status for ongoing:", bookingData.status);
      return null; // Don't return completed/cancelled bookings
    }

    return bookingData;
  } catch (err) {
    console.error("❌ Error getting ongoing booking:", err);

    // More detailed error logging
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      console.error("📡 Network error - check internet connection");
    } else if (err.message.includes("JSON")) {
      console.error("� JSON parsing error - API returned non-JSON response");
    } else if (err.message.includes("API error")) {
      console.error("🚫 API returned error status");
    } else {
      console.error("⚙️ Unexpected error:", err.message);
    }

    throw err;
  }
};

export const updateBookingStep = async (bookingId, currentStep, currentDropIndex = null, tripState = null) => {
  console.log(`📊 Updating booking: bookingId=${bookingId}, step=${currentStep}, dropIndex=${currentDropIndex}, tripState=${tripState}`);
  
  const updatePayload = { currentStep };
  
  // Include currentDropIndex if provided (for multi-drop orders)
  if (currentDropIndex !== null && currentDropIndex !== undefined) {
    updatePayload.currentDropIndex = currentDropIndex;
  }
  
  // Include tripState if provided
  if (tripState) {
    updatePayload.tripState = tripState;
  }
  
  const res = await axios.patch(
    `${API_BASE_URL}/update-step/${bookingId}`,
    updatePayload,
    {
      timeout: 8000, // 8 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  console.log("✅ Backend response:", res.data);
  return res.data;
};

// ✅ GET FULL BOOKING DETAILS: Fetch complete booking with coordinates
export const getBookingDetailsById = async (bookingId) => {
  try {
    console.log("🔍 Fetching full booking details for ID:", bookingId);
    
    const response = await fetch(`${API_BASE_URL}/booking/${bookingId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("📥 Booking details response status:", response.status);

    if (response.status === 404) {
      console.log("ℹ️ Booking not found (404)");
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API error response:", errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("✅ Full booking details received:", {
      hasFromCoords: !!(data.fromAddress?.latitude && data.fromAddress?.longitude),
      hasDropCoords: !!(data.dropLocation?.[0]?.latitude && data.dropLocation?.[0]?.longitude),
      fromLat: data.fromAddress?.latitude,
      fromLng: data.fromAddress?.longitude,
      dropLat: data.dropLocation?.[0]?.latitude,
      dropLng: data.dropLocation?.[0]?.longitude,
      status: data.status,
    });
    
    // Debug: Log receiver details in dropLocation array
    console.log("🔍 RECEIVER DETAILS IN BOOKING:", {
      customerPhone: data.customer?.phone,
      dropLocationCount: data.dropLocation?.length || 0,
      dropLocations: data.dropLocation?.map((drop, idx) => ({
        index: idx,
        ReciversName: drop.ReciversName,
        ReciversMobileNum: drop.ReciversMobileNum,
        receiverName: drop.receiverName,
        receiverMobile: drop.receiverMobile,
        address: drop.address?.substring(0, 40) + "..."
      }))
    });

    return data;
  } catch (error) {
    console.error("❌ Error fetching booking details:", error);
    throw error;
  }
};

export const completeBooking = async (bookingId, latitude, longitude) => {
  try {
    console.log("📋 Completing booking:", bookingId);
    console.log("📍 Sending rider location:", { latitude, longitude });

    const res = await axios.patch(
      `${API_BASE_URL}/complete/${bookingId}`,
      { latitude, longitude }, // Send current location to get next bookings
      {
        timeout: 15000, // 15 second timeout - backend completes in ~1s
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log("✅ Booking completed:", res.data);
    console.log(
      "📦 Next bookings available:",
      res.data.nextBookings?.length || 0
    );

    return res.data;
  } catch (error) {
    console.error("❌ Error completing booking:", error);
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout - please check your connection');
    }
    throw error;
  }
};

// ✅ COLLECT CASH: Mark cash as collected for a booking
export const collectCash = async (bookingId) => {
  try {
    console.log("💰 Marking cash as collected for booking:", bookingId);

    const response = await axios.patch(
      `${API_BASE_URL}/collect-cash/${bookingId}`,
      {},
      {
        timeout: 8000, // 8 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log("✅ Cash collected successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error marking cash as collected:", error);
    throw error;
  }
};
