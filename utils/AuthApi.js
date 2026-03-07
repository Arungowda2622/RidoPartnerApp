import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG } from "../config/api.js";

// const API_URL = "https://ridodrop-backend-24-10-2025.onrender.com/api/v1";
const API_URL = API_CONFIG.BASE_URL + "/api/v1";

export const sendOtp = async (phoneNumber) => {
  try {
    console.log(`📤 [sendOtp] Attempting to send OTP to: ${phoneNumber}`);
    console.log(`🌐 [sendOtp] Using API_URL: ${API_URL}`);
    console.log(`🔗 [sendOtp] Full endpoint: ${API_URL}/send-otp`);
    console.log(`📦 [sendOtp] Payload:`, { number: phoneNumber });
    
    const response = await axios.post(`${API_URL}/send-otp`, { number: phoneNumber });
    
    console.log(`✅ [sendOtp] Success! Status: ${response.status}`);
    console.log(`✅ [sendOtp] Response data:`, response.data);
    
    return response;
  } catch (error) {
    console.error(`❌ [sendOtp] Error occurred:`);
    console.error(`❌ [sendOtp] Error message:`, error.message);
    console.error(`❌ [sendOtp] Error code:`, error.code);
    if (error.response) {
      console.error(`❌ [sendOtp] Response status:`, error.response.status);
      console.error(`❌ [sendOtp] Response data:`, error.response.data);
    } else if (error.request) {
      console.error(`❌ [sendOtp] No response received from server`);
      console.error(`❌ [sendOtp] Request details:`, error.request);
    }
    throw error;
  }
};

export const verifyOtp = async (number, otp) => {
  console.log(`🔐 [verifyOtp] Verifying OTP for: ${number}`);
  console.log(`🌐 [verifyOtp] Using API_URL: ${API_URL}`);
  console.log(`🔗 [verifyOtp] Full endpoint: ${API_URL}/verify-rider-otp`);
  console.log(`📦 [verifyOtp] Payload:`, { number, otp });
  return axios.post(`${API_URL}/verify-rider-otp`, { number, otp });
};

// Update rider's online status and location
export const updateOnlineStatus = async (
  phoneNumber,
  isOnline,
  latitude = null,
  longitude = null,
  expoPushToken = null
) => {
  try {
    console.log("📱 Updating online status:", {
      phoneNumber,
      isOnline,
      latitude,
      longitude,
      expoPushToken: expoPushToken ? 'provided' : 'null'
    });

    const payload = {
      phone: phoneNumber,
      isOnline: isOnline,
    };

    // Add location if provided
    if (latitude !== null && longitude !== null) {
      payload.latitude = latitude;
      payload.longitude = longitude;
    }

    // Add push token if provided
    if (expoPushToken) {
      payload.expoPushToken = expoPushToken;
      console.log("📲 Including push token in request");
    }

    const response = await axios.post(
      `${API_URL}/riders/update-online-status`,
      payload
    );
    console.log("✅ Online status updated:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Error updating online status:",
      error.response?.data || error.message
    );
    
    // If backend rejected with a structured response (403), return it instead of throwing
    if (error.response && error.response.data) {
      return error.response.data;
    }
    
    // For network errors or other issues, throw
    throw error;
  }
};

// Get rider data by phone number
export const getRiderByPhone = async () => {
  let phoneNumber;
  try {
    phoneNumber = await AsyncStorage.getItem("number");
    if (!phoneNumber) {
      throw new Error("Phone number not found in storage");
    }

    console.log("📱 Getting rider data for phone:", phoneNumber);
    console.log("🔗 Full API endpoint:", `${API_URL}/riders/get/rider?number=${phoneNumber}`);
    
    const response = await axios.get(`${API_URL}/riders/get/rider`, {
      params: { number: phoneNumber }
    });
    
    console.log("✅ Rider data fetched successfully");
    console.log("✅ Response status:", response.status);
    console.log("✅ Response data:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching rider data:");
    console.error("❌ Phone number used:", phoneNumber);
    console.error("❌ Error response:", error.response?.data || error.message);
    console.error("❌ Error status:", error.response?.status);
    
    // If it's a 404, the rider doesn't exist with this phone number
    if (error.response?.status === 404) {
      console.error("⚠️ CRITICAL: Rider not found in database with phone:", phoneNumber);
      console.error("⚠️ This means the phone number in AsyncStorage doesn't match any rider in the database");
      console.error("⚠️ Check if the rider was created successfully during registration");
    }
    
    throw error;
  }
};

export const updateProfile = async (formData) => {
  console.log(formData);
  return axios.post(`${API_URL}/add`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const submitRiderRegistration = async (data) => {
  const num = await AsyncStorage.getItem("number");

  // If Cloudinary URLs are provided, send as JSON instead of FormData
  if (data.aadhaarFrontUrl && data.aadhaarBackUrl && data.panCardUrl && data.selfieUrl) {
    const payload = {
      name: data.name,
      phone: num,
      aadhaarFrontUrl: data.aadhaarFrontUrl,
      aadhaarBackUrl: data.aadhaarBackUrl,
      panCardUrl: data.panCardUrl,
      selfieUrl: data.selfieUrl,
      usedReferralCode: data.usedReferralCode
    };

    console.log("Sending rider registration with Cloudinary URLs:", payload);

    try {
      const res = await axios.post(
        API_CONFIG.getEndpoint("riders/create/rider"),
        payload,
        { headers: { "Content-Type": "application/json" } }
      );
      return res;
    } catch (err) {
      console.log("AXIOS ERROR:", JSON.stringify(err, null, 2));
      throw err;
    }
  }

  // Legacy fallback: If FormData with file objects (for backward compatibility)
  const formData = new FormData();

  if (data.name) formData.append("name", data.name);
  formData.append("phone", num);

  // ----- files -----
  // each object MUST have uri • name • type
  if (data.profilePhoto)
    formData.append("profilePhoto", {
      uri: data.profilePhoto.uri,
      name: data.profilePhoto.name ?? "profile.jpg",
      type: data.profilePhoto.type || "image/jpeg",
    });

  if (data.selfie)
    formData.append("profilePhoto", {
      uri: data.selfie.uri,
      name: data.selfie.name ?? "selfie.jpg",
      type:
        data.selfie.type && data.selfie.type.startsWith("image/")
          ? data.selfie.type
          : "image/jpeg",
    });

  if (data.aadhaarFront)
    formData.append("FrontaadharCard", {
      uri: data.aadhaarFront.uri,
      name: data.aadhaarFront.name ?? "aadhaar_front.jpg",
      type:
        data.aadhaarFront.type && data.aadhaarFront.type.startsWith("image/")
          ? data.aadhaarFront.type
          : "image/jpeg",
    });

  if (data.aadhaarBack)
    formData.append("BackaadharCard", {
      uri: data.aadhaarBack.uri,
      name: data.aadhaarBack.name ?? "aadhaar_back.jpg",
      type:
        data.aadhaarBack.type && data.aadhaarBack.type.startsWith("image/")
          ? data.aadhaarBack.type
          : "image/jpeg",
    });

  if (data.panCard)
    formData.append("panCard", {
      uri: data.panCard.uri,
      name: data.panCard.name ?? "pan.jpg",
      type:
        data.panCard.type && data.panCard.type.startsWith("image/")
          ? data.panCard.type
          : "image/jpeg",
    });

  try {
    const res = await axios.post(
      API_CONFIG.getEndpoint("riders/create/rider"),
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return res;
  } catch (err) {
    console.log("AXIOS ERROR:", JSON.stringify(err, null, 2));
    throw err;
  }
};

// export const updateVehicleRegistration = async (data) => {
//   const formData = new FormData();
//   const num = await AsyncStorage.getItem("number");

//   // Text fields
//   if (data.vehicleNumber) formData.append("vehicleregisterNumber", data.vehicleNumber);
//   if (data.selectedCity) formData.append("selectCity", data.selectedCity);
//   if (data.vehicleType) formData.append("vehicleType", data.vehicleType);
//   if (data.fuelType) formData.append("fueltype", data.fuelType);
//   formData.append("phone", num || "2214567999");

//   // Files (must match multer field names exactly)
//   if (data.vehicleFrontImage)
//     formData.append("vehicleimageFront", {
//       uri: data.vehicleFrontImage.uri,
//       name: data.vehicleFrontImage.name ?? "vehicle_front.jpg",
//       type: data.vehicleFrontImage.type || "image/jpeg",
//     });
//   if (data.vehicleBackImage)
//     formData.append("vehicleimageBack", { // <-- note the space!
//       uri: data.vehicleBackImage.uri,
//       name: data.vehicleBackImage.name ?? "vehicle_back.jpg",
//       type: data.vehicleBackImage.type || "image/jpeg",
//     });
//   if (data.rcFrontFile)
//     formData.append("vehicleRcFront", {
//       uri: data.rcFrontFile.uri,
//       name: data.rcFrontFile.name ?? "rc_front.jpg",
//       type: data.rcFrontFile.type || "image/jpeg",
//     });
//   if (data.rcBackFile)
//     formData.append("vehicleRcBack", {
//       uri: data.rcBackFile.uri,
//       name: data.rcBackFile.name ?? "rc_back.jpg",
//       type: data.rcBackFile.type || "image/jpeg",
//     });
//   if (data.insuranceFile)
//     formData.append("vehicleInsurence", { // spelling matches backend
//       uri: data.insuranceFile.uri,
//       name: data.insuranceFile.name ?? "insurance.jpg",
//       type: data.insuranceFile.type || "image/jpeg",
//     });
//   // Add drivingLicense if you have it

//   try {
//     const res = await axios.put(
//       `http://192.168.1.50:3001/api/v1/riders/update/rider`,
//       formData,
//       // { headers: { "Content-Type": "multipart/form-data" } }
//     );
//     return res;
//   } catch (err) {
//     console.log('AXIOS ERROR:', JSON.stringify(err.response, null, 2));
//     throw err;
//   }
// };

export const updateVehicleRegistration = async (data) => {
  console.log(data.licenseFront, "dcdcdcdvdv");
  const formData = new FormData();
  const num = await AsyncStorage.getItem("number");

  // Text fields
  if (data.vehicleNumber)
    formData.append("vehicleregisterNumber", data.vehicleNumber);
  if (data.selectedCity) formData.append("selectCity", data.selectedCity);
  if (data.vehicleType) formData.append("vehicleType", data.vehicleType);
  if (data.vehicleSubType)
    formData.append("vehicleSubType", data.vehicleSubType);
  if (data.fuelType) formData.append("fueltype", data.fuelType);
  if (data.truckSize) formData.append("truckSize", data.truckSize);
  if (data.threeWType) formData.append("threeWType", data.threeWType);
  if (data.truckBodyType) formData.append("truckBodyType", data.truckBodyType);
  formData.append("phone", num || "2214567999"); // Use stored phone number first, fallback to default
  if (data.driverName) formData.append("driverName", data.driverName);
  if (data.driverPhone) formData.append("driverPhone", data.driverPhone);

  // Files (must match multer field names exactly)
  if (data.vehicleFrontImage)
    formData.append("vehicleimageFront", {
      uri: data.vehicleFrontImage.uri,
      name: data.vehicleFrontImage.name ?? "vehicle_front.jpg",
      type: "image/jpeg",
    });
  if (data.vehicleBackImage)
    formData.append("vehicleimageBack", {
      uri: data.vehicleBackImage.uri,
      name: data.vehicleBackImage.name ?? "vehicle_back.jpg",
      type: "image/jpeg",
    });
  if (data.rcFrontFile)
    formData.append("vehicleRcFront", {
      uri: data.rcFrontFile.uri,
      name: data.rcFrontFile.name ?? "rc_front.jpg",
      type: "image/jpeg",
    });
  if (data.rcBackFile)
    formData.append("vehicleRcBack", {
      uri: data.rcBackFile.uri,
      name: data.rcBackFile.name ?? "rc_back.jpg",
      type: "image/jpeg",
    });
  if (data.insuranceFile)
    formData.append("vehicleInsurence", {
      uri: data.insuranceFile.uri,
      name: data.insuranceFile.name ?? "insurance.jpg",
      type: "image/jpeg",
    });
  if (data.licenseFront)
    formData.append("drivingLicenseFront", {
      uri: data.licenseFront.uri,
      name: data.licenseFront.name ?? "license_front.jpg",
      type: "image/jpeg",
    });
  if (data.licenseBack)
    formData.append("drivingLicenseBack", {
      uri: data.licenseBack.uri,
      name: data.licenseBack.name ?? "license_back.jpg",
      type: "image/jpeg",
    });

  try {
    // const res = await axios.put(
    //   `https://ridodrop-backend-24-10-2025.onrender.com/api/v1/riders/update/rider`,
    //   formData,
    //   { headers: { "Content-Type": "multipart/form-data" } }
    // );
    const res = await axios.put(
      API_CONFIG.getEndpoint("riders/update/rider"),
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return res;
  } catch (err) {
    console.log("AXIOS ERROR:", JSON.stringify(err, null, 2));
    throw err;
  }
};

// Universal function to get stored phone number from AsyncStorage
export const getStoredPhoneNumber = async () => {
  try {
    const number = await AsyncStorage.getItem("number");
    return number;
  } catch (error) {
    console.log("Error getting phone number from AsyncStorage:", error);
    return null;
  }
};

// ===== VEHICLE CATEGORY & TYPE FUNCTIONS =====

// Test network connectivity
export const testConnection = async () => {
  try {
    console.log("🔍 [testConnection] Testing network connectivity...");
    console.log(`🔗 [testConnection] Using API_URL: ${API_URL}`);
    const response = await axios.get(`${API_URL}/health`, { timeout: 5000 });
    console.log("✅ [testConnection] Connection successful:", response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("❌ [testConnection] Connection failed:", error.message);
    console.error("❌ [testConnection] Full error:", JSON.stringify(error, null, 2));
    return { success: false, error: error.message };
  }
};

// Get all vehicle categories
export const getCategories = async () => {
  try {
    console.log("🚗 [getCategories] Fetching vehicle categories...");
    console.log(`🔗 [getCategories] Using endpoint: ${API_URL}/dynamic-pricing/categories-simple`);
    const response = await axios.get(`${API_URL}/dynamic-pricing/categories-simple`);
    console.log("✅ [getCategories] Raw response:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ [getCategories] Error:", error.response?.data || error.message);
    console.error("❌ [getCategories] Full error:", error);
    throw error;
  }
};

// Get vehicle types for a specific category
export const getVehicleTypesByCategory = async (category) => {
  try {
    console.log(`🚛 [getVehicleTypesByCategory] Fetching types for category: ${category}`);
    const response = await axios.get(`${API_URL}/dynamic-pricing/categories/${category}/types`);
    console.log("✅ [getVehicleTypesByCategory] Vehicle types fetched:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ [getVehicleTypesByCategory] Error:", error.response?.data || error.message);
    throw error;
  }
};
