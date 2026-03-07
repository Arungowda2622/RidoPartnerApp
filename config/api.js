// API Configuration
// Central configuration for all API endpoints

// Production server (used in the app)
const PRODUCTION_API_URL = "https://firstapp.ridodrop.com";
const PRODUCTION_WS_URL = "wss://firstapp.ridodrop.com";

// Development server (for uploads and local testing)
// Use your local IP for testing on physical devices
const DEVELOPMENT_API_URL = "http://192.168.1.46:3001";
const DEVELOPMENT_WS_URL = "ws://192.168.1.46:3001";

// Configuration flags
const USE_PRODUCTION_FOR_GENERAL = true; // General API calls use production - SET TO false FOR LOCAL TESTING
const USE_PRODUCTION_FOR_UPLOADS = true; // Upload endpoints use production

// Export the current configuration
export const API_CONFIG = {
  BASE_URL: USE_PRODUCTION_FOR_GENERAL ? PRODUCTION_API_URL : DEVELOPMENT_API_URL,
  WS_URL: USE_PRODUCTION_FOR_GENERAL ? PRODUCTION_WS_URL : DEVELOPMENT_WS_URL,
  API_VERSION: "v1",
  
  // Helper to build API endpoints
  getEndpoint: (path, forceProduction = null) => {
    // Check if this is an upload endpoint
    const isUploadEndpoint = path.includes('upload-') || path.includes('/upload');
    
    // Use specific server based on endpoint type
    let useProduction;
    if (forceProduction !== null) {
      useProduction = forceProduction;
    } else if (isUploadEndpoint) {
      useProduction = USE_PRODUCTION_FOR_UPLOADS;
    } else {
      useProduction = USE_PRODUCTION_FOR_GENERAL;
    }
    
    const baseUrl = useProduction ? PRODUCTION_API_URL : DEVELOPMENT_API_URL;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${baseUrl}/api/v1/${cleanPath}`;
  },
  
  // Helper specifically for upload endpoints
  getUploadEndpoint: (path) => {
    const baseUrl = USE_PRODUCTION_FOR_UPLOADS ? PRODUCTION_API_URL : DEVELOPMENT_API_URL;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${baseUrl}/api/v1/${cleanPath}`;
  },
  
  // Common endpoints
  ENDPOINTS: {
    // Auth endpoints
    LOGIN: "/auth/login",
    REGISTER: "/riders/create/rider",
    UPDATE_RIDER: "/riders/update/rider",
    GET_RIDER: "/riders/get/rider",
    
    // Booking endpoints
    ONGOING_BOOKING: "/ongoing",
    ACCEPT_BOOKING: "/accept",
    COMPLETE_BOOKING: (bookingId) => `/complete/${bookingId}`,
    UPDATE_STEP: (bookingId) => `/update-step/${bookingId}`,
    COLLECT_CASH: (bookingId) => `/collect-cash/${bookingId}`,
    
    // Upload endpoints
    UPLOAD_PICKUP_IMAGE: (bookingId) => `/upload-pickup-image/${bookingId}`,
    UPLOAD_DROP_IMAGE: (bookingId) => `/upload-drop-image/${bookingId}`,
    GET_BOOKING_IMAGES: (bookingId) => `/images/${bookingId}`,
    
    // Notification endpoints
    SEND_STEP: "/notification/send-step",
    
    // Wallet endpoints (for customers)
    WALLET_HISTORY: "/wallet/history",
    WALLET_BALANCE: "/wallet/balance",
    WALLET_ADD: "/wallet/add",
    
    // Rider Wallet endpoints (for riders/partners)
    RIDER_WALLET_BALANCE: "/rider-wallet/balance",
    RIDER_WALLET_ADD: "/rider-wallet/add",
    RIDER_WALLET_CREDIT: "/rider-wallet/credit",
    RIDER_WALLET_DEBIT: "/rider-wallet/debit",
    RIDER_WALLET_HISTORY: "/rider-wallet/history",
  }
};

// Legacy support - export individual URLs for backward compatibility
export const API_URL = API_CONFIG.BASE_URL + "/api/v1";
export const WS_URL = API_CONFIG.WS_URL;

export default API_CONFIG;