import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Image,
  Dimensions,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { updateVehicleRegistration, getCategories, getVehicleTypesByCategory, testConnection } from "../utils/AuthApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_CONFIG } from "../config/api";

const BASE_URL = API_CONFIG.BASE_URL;

const { width } = Dimensions.get("window");

const VehicleRegistrationScreen = () => {
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [rcFrontFile, setRcFrontFile] = useState(null);
  const [rcBackFile, setRcBackFile] = useState(null);
  const [insuranceFile, setInsuranceFile] = useState(null);
  const [vehicleFrontImage, setVehicleFrontImage] = useState(null);
  const [vehicleBackImage, setVehicleBackImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [currentSetFile, setCurrentSetFile] = useState(null);
  const [imageSource, setImageSource] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [currentUploadType, setCurrentUploadType] = useState("");
  
  // Dynamic category and vehicle type states
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingVehicleTypes, setLoadingVehicleTypes] = useState(false);
  
  // Dropdown modal states
  const [showCityModal, setShowCityModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showVehicleTypeModal, setShowVehicleTypeModal] = useState(false);
  const [showSubTypeModal, setShowSubTypeModal] = useState(false);
  const [showFuelTypeModal, setShowFuelTypeModal] = useState(false);
  
  // Legacy vehicle type states (for backward compatibility)
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleSubType, setVehicleSubType] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [truckSize, setTruckSize] = useState("");
  const [threeWType, setThreeWType] = useState("");
  const [truckBodyType, setTruckBodyType] = useState("");
  const navigation = useNavigation();
  const [loadingExistingData, setLoadingExistingData] = useState(true);
  
  // Track component mount status to prevent crashes
  const isMountedRef = useRef(true);

  // Function to load existing rider data from backend
  const loadExistingRiderData = async () => {
    try {
      setLoadingExistingData(true);
      const phoneNumber = await AsyncStorage.getItem("number");
      
      if (!phoneNumber) {
        console.log("⚠️ No phone number found, skipping data load");
        setLoadingExistingData(false);
        return;
      }

      console.log("🔄 Loading existing rider data for:", phoneNumber);
      
      const response = await axios.get(
        `${BASE_URL}/api/v1/riders/get/rider`,
        { params: { number: phoneNumber }, timeout: 10000 }
      );

      if (response.data && response.data.data) {
        const rider = response.data.data;
        console.log("✅ Existing rider data loaded:", {
          hasVehicleNumber: !!rider.vehicleregisterNumber,
          hasCity: !!rider.selectCity,
          hasCategory: !!rider.vehicleCategory,
          hasType: !!rider.vehicleType,
          images: Object.keys(rider.images || {})
        });

        // Populate text fields
        if (rider.vehicleregisterNumber) setVehicleNumber(rider.vehicleregisterNumber);
        if (rider.selectCity) setSelectedCity(rider.selectCity);
        if (rider.vehicleCategory) {
          setSelectedCategory(rider.vehicleCategory);
          // Load vehicle types for the category
          loadVehicleTypes(rider.vehicleCategory);
        }
        if (rider.vehicleType) setVehicleType(rider.vehicleType);
        if (rider.vehicleSubType) setVehicleSubType(rider.vehicleSubType);
        if (rider.fueltype) setFuelType(rider.fueltype);
        if (rider.truckSize) setTruckSize(rider.truckSize);
        if (rider.threeWType) setThreeWType(rider.threeWType);
        if (rider.truckBodyType) setTruckBodyType(rider.truckBodyType);

        // Populate image states from R2 URLs
        if (rider.images) {
          if (rider.images.vehicleRcFront) {
            console.log("✅ Loading RC Front image:", rider.images.vehicleRcFront);
            setRcFrontFile({
              uri: rider.images.vehicleRcFront,
              cloudinaryUrl: rider.images.vehicleRcFront,
              name: "rcFront.jpg",
              type: "image/jpeg",
              fromBackend: true
            });
          }
          
          if (rider.images.vehicleRcBack) {
            console.log("✅ Loading RC Back image:", rider.images.vehicleRcBack);
            setRcBackFile({
              uri: rider.images.vehicleRcBack,
              cloudinaryUrl: rider.images.vehicleRcBack,
              name: "rcBack.jpg",
              type: "image/jpeg",
              fromBackend: true
            });
          }
          
          if (rider.images.vehicleInsurence) {
            console.log("✅ Loading Insurance image:", rider.images.vehicleInsurence);
            setInsuranceFile({
              uri: rider.images.vehicleInsurence,
              cloudinaryUrl: rider.images.vehicleInsurence,
              name: "insurance.jpg",
              type: "image/jpeg",
              fromBackend: true
            });
          }
          
          if (rider.images.vehicleimageFront) {
            console.log("✅ Loading Vehicle Front image:", rider.images.vehicleimageFront);
            setVehicleFrontImage({
              uri: rider.images.vehicleimageFront,
              cloudinaryUrl: rider.images.vehicleimageFront,
              name: "vehicleFront.jpg",
              type: "image/jpeg",
              fromBackend: true
            });
          }
          
          if (rider.images.vehicleimageBack) {
            console.log("✅ Loading Vehicle Back image:", rider.images.vehicleimageBack);
            setVehicleBackImage({
              uri: rider.images.vehicleimageBack,
              cloudinaryUrl: rider.images.vehicleimageBack,
              name: "vehicleBack.jpg",
              type: "image/jpeg",
              fromBackend: true
            });
          }
        }

        console.log("✅ All existing data loaded successfully");
      }
    } catch (error) {
      console.error("❌ Error loading existing rider data:", error.message);
      // Don't show error alert, just log it - user might be new
      if (error.response?.status === 404) {
        console.log("ℹ️ No existing rider data found (new user)");
      }
    } finally {
      setLoadingExistingData(false);
    }
  };

  // Load categories when component mounts
  useEffect(() => {
    loadCategories();
    loadExistingRiderData(); // Load existing data from backend
    
    // Cleanup function
    return () => {
      isMountedRef.current = false;
      console.log("🧹 VehicleRegistrationScreen cleanup: component unmounted");
    };
  }, []);

  // Function to load vehicle categories
  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      console.log("🚗 Loading vehicle categories...");
      console.log("🌐 Using API URL:", API_CONFIG.BASE_URL);
      
      const response = await getCategories();
      console.log("📋 Full categories response:", JSON.stringify(response, null, 2));
      
      if (response && response.success && response.categories) {
        setCategories(response.categories);
        console.log("✅ Categories loaded:", response.categories.length);
        console.log("📋 Categories data:", response.categories.map(cat => ({ category: cat.category, name: cat.name })));
      } else if (response && response.categories) {
        // Handle case where success field might not exist
        setCategories(response.categories);
        console.log("✅ Categories loaded (no success field):", response.categories.length);
      } else {
        console.log("⚠️ No categories found in response:", response);
        Alert.alert("Info", "No vehicle categories available. Please check your connection and contact support.");
      }
    } catch (error) {
      console.error("❌ Error loading categories:", error);
      console.error("❌ Error details:", error.response?.data || error.message);
      console.error("❌ Error status:", error.response?.status);
      console.error("❌ Network Error:", error.code);
      
      let errorMessage = "Failed to load vehicle categories. ";
      if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        errorMessage += "Please check your internet connection and ensure the backend server is running.";
      } else if (error.response?.status === 404) {
        errorMessage += "API endpoint not found. Please contact support.";
      } else {
        errorMessage += `Error: ${error.message}`;
      }
      
      Alert.alert("Connection Error", errorMessage);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Function to load vehicle types for selected category
  const loadVehicleTypes = async (category) => {
    if (!category) {
      setVehicleTypes([]);
      return;
    }

    try {
      setLoadingVehicleTypes(true);
      console.log(`🚛 Loading vehicle types for category: ${category}`);
      console.log("🌐 Using API URL:", `${API_CONFIG.BASE_URL}/api/v1/dynamic-pricing/categories/${category}/types`);
      
      const response = await getVehicleTypesByCategory(category);
      console.log(`📋 Full vehicle types response for ${category}:`, JSON.stringify(response, null, 2));
      
      if (response && response.success && response.vehicleTypes) {
        setVehicleTypes(response.vehicleTypes);
        console.log("✅ Vehicle types loaded:", response.vehicleTypes.length);
        console.log("🚛 Vehicle types data:", response.vehicleTypes.map(type => ({ type: type.type, name: type.name })));
      } else if (response && response.vehicleTypes) {
        // Handle case where success field might not exist
        setVehicleTypes(response.vehicleTypes);
        console.log("✅ Vehicle types loaded (no success field):", response.vehicleTypes.length);
      } else {
        console.log("⚠️ No vehicle types found for category:", category, response);
        setVehicleTypes([]);
        Alert.alert("Info", `No vehicle types available for ${category}. Please contact support.`);
      }
    } catch (error) {
      console.error("❌ Error loading vehicle types:", error);
      console.error("❌ Error details:", error.response?.data || error.message);
      console.error("❌ Error status:", error.response?.status);
      
      let errorMessage = `Failed to load vehicle types for ${category}. `;
      if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        errorMessage += "Please check your internet connection.";
      } else {
        errorMessage += `Error: ${error.message}`;
      }
      
      Alert.alert("Error", errorMessage);
      setVehicleTypes([]);
    } finally {
      setLoadingVehicleTypes(false);
    }
  };

  // Handle category selection
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setVehicleType(""); // Clear vehicle type when category changes
    setVehicleSubType(""); // Clear sub type
    setFuelType(""); // Clear fuel type
    setTruckSize(""); // Clear truck size
    setThreeWType(""); // Clear three wheeler type
    setTruckBodyType(""); // Clear truck body type
    
    // Load vehicle types for the selected category
    if (category) {
      loadVehicleTypes(category);
    } else {
      setVehicleTypes([]);
    }
  };

  // ---------- Upload Image to Cloudinary via Backend ----------
  const uploadImageToCloudinary = async (imageUri, documentType, phoneNumber) => {
    try {
      setUploadingImage(true);
      setCurrentUploadType(documentType);
      console.log("📤 Uploading image to Cloudinary:", { 
        documentType, 
        phoneNumber, 
        serverUrl: BASE_URL,
        fullEndpoint: `${BASE_URL}/api/v1/riders/upload-rider-document`
      });

      // Test basic connectivity first (non-blocking)
      try {
        console.log("🔍 Testing server connectivity...");
        const connectTest = await axios.get(`${BASE_URL}/api/v1/test-connection`, { timeout: 3000 });
        console.log("✅ Server is reachable:", connectTest.status, connectTest.data);
      } catch (connectError) {
        console.log("⚠️ Server connectivity test failed:", connectError.message);
        // Don't throw error, just log warning and continue with upload attempt
        console.log("⚠️ Proceeding with upload attempt anyway...");
      }

      const formData = new FormData();
      formData.append("image", {
        uri: imageUri,
        type: "image/jpeg",
        name: `${documentType}_${phoneNumber}_${Date.now()}.jpg`,
      });
      formData.append("phone", phoneNumber);
      formData.append("documentType", documentType);

      console.log("📤 Sending upload request...");
      const uploadResponse = await axios.post(
        `${BASE_URL}/api/v1/riders/upload-rider-document`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 45000, // Increased timeout to 45 seconds
        }
      );

      console.log("✅ Upload response received:", {
        status: uploadResponse.status,
        success: uploadResponse.data.success,
        imagePath: uploadResponse.data.imagePath,
        imageData: uploadResponse.data.imageData,
        message: uploadResponse.data.message,
        fullResponse: uploadResponse.data
      });
      
      // Check for various possible URL fields in the response
      const cloudinaryUrl = uploadResponse.data.imagePath || 
                           uploadResponse.data.imageData?.url || 
                           uploadResponse.data.imageData?.secure_url ||
                           uploadResponse.data.url ||
                           uploadResponse.data.secure_url;
      
      if (uploadResponse.data.success !== false && cloudinaryUrl) {
        console.log("✅ Upload successful, using URL:", cloudinaryUrl);
        return {
          uri: imageUri,
          cloudinaryUrl: cloudinaryUrl,
          name: `${documentType}.jpg`,
          type: "image/jpeg",
        };
      } else {
        console.log("❌ Upload response analysis:", {
          success: uploadResponse.data.success,
          hasImagePath: !!uploadResponse.data.imagePath,
          hasImageData: !!uploadResponse.data.imageData,
          hasUrl: !!uploadResponse.data.url,
          allKeys: Object.keys(uploadResponse.data)
        });
        throw new Error(`Upload failed - no URL found in response. Response keys: ${Object.keys(uploadResponse.data).join(', ')}`);
      }
    } catch (error) {
      console.error("❌ Upload failed:", {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
        isNetworkError: error.message.includes('Network request failed'),
        isTimeout: error.code === 'ECONNABORTED'
      });
      
      let errorMessage = "Upload failed: ";
      
      if (error.message.includes('Network request failed')) {
        errorMessage += `Cannot connect to server at ${BASE_URL}. Please check your internet connection.`;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage += "Upload timed out. The server may be slow or overloaded.";
      } else if (error.response?.status === 404) {
        errorMessage += "Upload endpoint not found on server.";
      } else if (error.response?.status >= 500) {
        errorMessage += "Server error occurred during upload.";
      } else {
        errorMessage += error.message;
      }
      
      console.log("⚠️ " + errorMessage);
      console.log("⚠️ Falling back to local file storage");
      
      // Return local file info as fallback
      return {
        uri: imageUri,
        name: `${documentType}.jpg`,
        type: "image/jpeg",
        uploadError: errorMessage
      };
    } finally {
      setUploadingImage(false);
      setCurrentUploadType("");
    }
  };

  // Modified image upload handler
  const handleUpload = async (setFile, documentType) => {
    Alert.alert("Upload Option", "Choose an option", [
      { text: "Camera", onPress: () => openCamera(setFile, documentType) },
      { text: "Gallery", onPress: () => pickFromGallery(setFile, documentType) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // Modified camera function
  const openCamera = async (setFile, documentType) => {
    if (!isMountedRef.current) {
      console.log("⚠️ Component unmounted, canceling camera operation");
      return;
    }
    
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Camera Permission Required",
        "Ridodrop Partner needs camera access to capture vehicle documents. Please enable camera permission in your device settings.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          }}
        ]
      );
      return;
    }
    
    if (!isMountedRef.current) {
      console.log("⚠️ Component unmounted during permission request");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      allowsEditing: false,
      exif: false,
    });
    
    if (!isMountedRef.current) {
      console.log("⚠️ Component unmounted during camera operation");
      return;
    }

    if (!result.canceled) {
      const file = result.assets[0];
      try {
        const phoneNumber = await AsyncStorage.getItem("number");
        const uploadedFile = await uploadImageToCloudinary(
          file.uri,
          documentType,
          phoneNumber
        );
        if (isMountedRef.current) {
          setFile(uploadedFile);
        }
      } catch (error) {
        console.log("Upload failed, storing local file info:", error.message);
        if (isMountedRef.current) {
          setFile({
            uri: file.uri,
            name: `${documentType}.jpg`,
            type: "image/jpeg",
            uploadError: error.message
          });
          
          if (error.message.includes('Cannot connect to server')) {
            Alert.alert("Network Issue", "Image captured successfully but couldn't upload due to network issues. The image will be uploaded when you submit the form.");
          } else {
            Alert.alert("Upload Issue", "Image captured successfully but upload failed. The image will be uploaded when you submit the form.");
          }
        }
      }
    }
  };

  // Modified gallery function
  const pickFromGallery = async (setFile, documentType) => {
    if (!isMountedRef.current) {
      console.log("⚠️ Component unmounted, canceling gallery operation");
      return;
    }
    
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Photo Library Permission Required",
        "Ridodrop Partner needs access to your photo library to upload vehicle documents. Please enable permission in your device settings.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          }}
        ]
      );
      return;
    }
    
    if (!isMountedRef.current) {
      console.log("⚠️ Component unmounted during permission request");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      allowsEditing: false,
      exif: false,
    });
    
    if (!isMountedRef.current) {
      console.log("⚠️ Component unmounted during gallery operation");
      return;
    }

    if (!result.canceled) {
      const file = result.assets[0];
      try {
        const phoneNumber = await AsyncStorage.getItem("number");
        const uploadedFile = await uploadImageToCloudinary(
          file.uri,
          documentType,
          phoneNumber
        );
        if (isMountedRef.current) {
          setFile(uploadedFile);
        }
      } catch (error) {
        console.log("Upload failed, storing local file info:", error.message);
        if (isMountedRef.current) {
          setFile({
            uri: file.uri,
            name: `${documentType}.jpg`,
            type: "image/jpeg",
            uploadError: error.message
          });
          
          if (error.message.includes('Cannot connect to server')) {
            Alert.alert("Network Issue", "Image selected successfully but couldn't upload due to network issues. The image will be uploaded when you submit the form.");
          } else {
            Alert.alert("Upload Issue", "Image selected successfully but upload failed. The image will be uploaded when you submit the form.");
          }
        }
      }
    }
  };

  // Function to remove uploaded images
  const removeImage = (type) => {
    switch (type) {
      case "rcFront":
        setRcFrontFile(null);
        break;
      case "rcBack":
        setRcBackFile(null);
        break;
      case "insurance":
        setInsuranceFile(null);
        break;
      case "vehicleFront":
        setVehicleFrontImage(null);
        break;
      case "vehicleBack":
        setVehicleBackImage(null);
        break;
    }
  };

  // ✅ Document Upload Button
  const DocumentButton = ({ type, icon, label, uploaded, image, onPress }) => (
    <View style={styles.uploadButtonContainer}>
      <TouchableOpacity
        style={[styles.uploadButton, uploaded && styles.uploadedButton]}
        onPress={onPress}
      >
        {uploaded ? (
          <>
            <Ionicons name="checkmark-circle" size={22} color="#10B981" />
            <Text style={[styles.uploadText, styles.uploadedText]}>
              {label.replace("Upload", "Uploaded")}
            </Text>
          </>
        ) : (
          <>
            <Ionicons name={icon} size={22} color="#EC4A4D" />
            <Text style={styles.uploadText}>{label}</Text>
          </>
        )}
      </TouchableOpacity>

      {uploaded && image?.uri && (
        <Image
          source={{ uri: image.uri }}
          style={{
            width: width * 0.38,
            height: 80,
            borderRadius: 8,
            marginTop: 6,
          }}
          resizeMode="cover"
        />
      )}

      {uploaded && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeImage(type)}
        >
          <Ionicons name="close-circle" size={20} color="#EF4444" />
        </TouchableOpacity>
      )}
    </View>
  );

  // ✅ Submit Vehicle Details
  const handleSubmit = async () => {
    if (!vehicleNumber || !selectedCity || !selectedCategory || !vehicleType) {
      Alert.alert("Error", "Please fill in all required fields including vehicle category and type.");
      return;
    }
    
    // Check if all required images are uploaded
    if (!rcFrontFile || !rcBackFile || !insuranceFile) {
      Alert.alert("Error", "Please upload all required vehicle documents (RC Front, RC Back, and Insurance).");
      return;
    }
    
    try {
      // Since images are already uploaded to R2, we send the R2 URLs
      const phoneNumber = await AsyncStorage.getItem("number");
      
      const payload = {
        phone: phoneNumber,
        vehicleregisterNumber: vehicleNumber,
        selectCity: selectedCity,
        vehicleCategory: selectedCategory,
        vehicleType,
        vehicleSubType,
        fueltype: fuelType,
        truckSize,
        threeWType,
        truckBodyType,
        // Images should be in nested structure for JSON submission
        images: {
          vehicleimageFront: vehicleFrontImage?.cloudinaryUrl || vehicleFrontImage?.uri,
          vehicleimageBack: vehicleBackImage?.cloudinaryUrl || vehicleBackImage?.uri,
          vehicleRcFront: rcFrontFile?.cloudinaryUrl || rcFrontFile?.uri,
          vehicleRcBack: rcBackFile?.cloudinaryUrl || rcBackFile?.uri,
          vehicleInsurence: insuranceFile?.cloudinaryUrl || insuranceFile?.uri,
        }
      };
      
      console.log("📋 Submitting vehicle registration:", {
        ...payload,
        hasCloudinaryUrls: {
          rcFront: !!rcFrontFile?.cloudinaryUrl,
          rcBack: !!rcBackFile?.cloudinaryUrl,
          insurance: !!insuranceFile?.cloudinaryUrl,
          vehicleFront: !!vehicleFrontImage?.cloudinaryUrl,
          vehicleBack: !!vehicleBackImage?.cloudinaryUrl
        }
      });
      
      // Check if we have any local files that need to be uploaded
      const hasLocalFiles = [rcFrontFile, rcBackFile, insuranceFile, vehicleFrontImage, vehicleBackImage]
        .some(file => file && !file.cloudinaryUrl);
      
      console.log("🔍 Upload method:", hasLocalFiles ? "Multipart Form (with files)" : "JSON (with URLs only)");
      
      let res;
      if (hasLocalFiles) {
        // If we have local files, use multipart form submission
        console.log("Submitting with local files using multipart form");
        const formData = new FormData();
        
        // Add text fields
        formData.append("phone", phoneNumber);
        formData.append("vehicleregisterNumber", vehicleNumber);
        formData.append("selectCity", selectedCity);
        formData.append("vehicleCategory", selectedCategory);
        formData.append("vehicleType", vehicleType);
        if (vehicleSubType) formData.append("vehicleSubType", vehicleSubType);
        if (fuelType) formData.append("fueltype", fuelType);
        if (truckSize) formData.append("truckSize", truckSize);
        if (threeWType) formData.append("threeWType", threeWType);
        if (truckBodyType) formData.append("truckBodyType", truckBodyType);
        
        // Add files
        if (rcFrontFile) {
          formData.append("vehicleRcFront", {
            uri: rcFrontFile.uri,
            type: rcFrontFile.type || "image/jpeg",
            name: rcFrontFile.name || "rcFront.jpg",
          });
        }
        if (rcBackFile) {
          formData.append("vehicleRcBack", {
            uri: rcBackFile.uri,
            type: rcBackFile.type || "image/jpeg",
            name: rcBackFile.name || "rcBack.jpg",
          });
        }
        if (insuranceFile) {
          formData.append("vehicleInsurence", {
            uri: insuranceFile.uri,
            type: insuranceFile.type || "image/jpeg",
            name: insuranceFile.name || "insurance.jpg",
          });
        }
        if (vehicleFrontImage) {
          formData.append("vehicleimageFront", {
            uri: vehicleFrontImage.uri,
            type: vehicleFrontImage.type || "image/jpeg",
            name: vehicleFrontImage.name || "vehicleFront.jpg",
          });
        }
        if (vehicleBackImage) {
          formData.append("vehicleimageBack", {
            uri: vehicleBackImage.uri,
            type: vehicleBackImage.type || "image/jpeg",
            name: vehicleBackImage.name || "vehicleBack.jpg",
          });
        }
        
        res = await axios.put(
          API_CONFIG.getEndpoint('riders/update/rider'),
          formData,
          { 
            headers: { "Content-Type": "multipart/form-data" },
            timeout: 60000 // Longer timeout for file uploads
          }
        );
      } else {
        // If all files are already uploaded, use JSON submission
        res = await axios.put(
          API_CONFIG.getEndpoint('riders/update/rider'),
          payload,
          { headers: { "Content-Type": "application/json" } }
        );
      }
      
      if (res.status === 200 || res.status === 201) {
        // Check if this is a reupload
        const isReuploading = await AsyncStorage.getItem("isReuploading");
        
        if (isReuploading === "true") {
          // Reuploading - clear flag and return to MyVehicle
          await AsyncStorage.removeItem("isReuploading");
          console.log("✅ Vehicle documents reuploaded - returning to My Vehicle");
          Alert.alert("Success!", "Vehicle documents updated successfully. Please wait for admin verification.", [
            { text: "OK", onPress: () => navigation.replace("My Vehicle") }
          ]);
        } else {
          // Normal flow - continue to driver details
          await AsyncStorage.setItem("complete", "50");
          await AsyncStorage.setItem("registrationComplete", "false");
          await AsyncStorage.setItem("registrationStep", "driver");
          console.log("✅ Vehicle registration complete - status saved: driver step");
          Alert.alert("Success!", "Vehicle registration updated successfully.");
          navigation.navigate("Driver Details");
        }
      } else {
        Alert.alert("Error", "Failed to update vehicle registration.");
      }
    } catch (err) {
      console.error("Vehicle registration error:", err);
      Alert.alert("Error", "Failed to update vehicle registration.");
    }
  };

  return (
    <View style={styles.attractiveContainer}>
      {uploadingImage && (
        <View style={styles.uploadingOverlay}>
          <View style={styles.uploadingBox}>
            <ActivityIndicator size="large" color="#EC4A4D" />
            <Text style={styles.uploadingText}>
              Uploading {currentUploadType}...
            </Text>
          </View>
        </View>
      )}
      
      <View style={styles.attractiveHeader}>
        <View style={styles.headerIconCircle}>
          <Ionicons name="car-sport" size={32} color="#fff" />
        </View>
        <Text style={styles.attractiveHeaderText}>Vehicle Registration</Text>
        <Text style={styles.attractiveHeaderSubText}>
          Enter your vehicle details to get started
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.attractiveScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardSection}>
          <Text style={styles.inputLabel}>
            Vehicle Registration Number <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.attractiveInput}
            placeholder="Enter vehicle number"
            value={vehicleNumber}
            onChangeText={(text) => setVehicleNumber(text.toUpperCase())}
            placeholderTextColor="#94a3b8"
            autoCapitalize="characters"
          />
        </View>

        {/* ✅ Vehicle RC */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle RC</Text>
          <View style={styles.uploadRow}>
            <DocumentButton
              type="rcFront"
              icon="camera"
              label="Upload Front"
              uploaded={!!rcFrontFile}
              image={rcFrontFile}
              onPress={() => handleUpload(setRcFrontFile, "vehicleRcFront")}
            />
            <DocumentButton
              type="rcBack"
              icon="camera"
              label="Upload Back"
              uploaded={!!rcBackFile}
              image={rcBackFile}
              onPress={() => handleUpload(setRcBackFile, "vehicleRcBack")}
            />
          </View>
        </View>

        {/* ✅ Vehicle Images */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Images</Text>
          <View style={styles.uploadRow}>
            <DocumentButton
              type="vehicleFront"
              icon="camera"
              label="Upload Front"
              uploaded={!!vehicleFrontImage}
              image={vehicleFrontImage}
              onPress={() => handleUpload(setVehicleFrontImage, "vehicleFrontImage")}
            />
            <DocumentButton
              type="vehicleBack"
              icon="camera"
              label="Upload Back"
              uploaded={!!vehicleBackImage}
              image={vehicleBackImage}
              onPress={() => handleUpload(setVehicleBackImage, "vehicleBackImage")}
            />
          </View>
        </View>

        {/* ✅ Insurance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Insurance</Text>
          <DocumentButton
            type="insurance"
            icon="camera"
            label="Upload Insurance"
            uploaded={!!insuranceFile}
            image={insuranceFile}
            onPress={() => handleUpload(setInsuranceFile, "vehicleInsurance")}
          />
        </View>

        {/* ✅ City & Type Dropdowns */}
        <View style={styles.cardSection}>
          <Text style={styles.inputLabel}>Select Your City</Text>
          <TouchableOpacity 
            style={styles.dropdownButton}
            onPress={() => setShowCityModal(true)}
          >
            <Text style={selectedCity ? styles.dropdownTextSelected : styles.dropdownTextPlaceholder}>
              {selectedCity || "-- Select City --"}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* City Dropdown Modal */}
        <Modal
          visible={showCityModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCityModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowCityModal(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select City</Text>
                <TouchableOpacity onPress={() => setShowCityModal(false)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={[
                  { label: "Bangalore", value: "Bangalore" },
                  { label: "Hyderabad", value: "Hyderabad" },
                  { label: "Mumbai", value: "Mumbai" },
                  { label: "Delhi", value: "Delhi" },
                  { label: "Chennai", value: "Chennai" },
                ]}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      selectedCity === item.value && styles.modalItemSelected
                    ]}
                    onPress={() => {
                      setSelectedCity(item.value);
                      setShowCityModal(false);
                    }}
                  >
                    <Text style={[
                      styles.modalItemText,
                      selectedCity === item.value && styles.modalItemTextSelected
                    ]}>
                      {item.label}
                    </Text>
                    {selectedCity === item.value && (
                      <Ionicons name="checkmark" size={20} color="#EC4A4D" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Vehicle Category Selection */}
        <View style={styles.cardSection}>
          <Text style={styles.inputLabel}>
            Select Vehicle Category <Text style={styles.required}>*</Text>
            {loadingCategories && <Text style={{ color: '#0369a1', fontSize: 12 }}> (Loading...)</Text>}
          </Text>
          {loadingCategories ? (
            <View style={[styles.dropdownButton, { backgroundColor: '#f0f9ff', borderColor: '#0369a1' }]}>
              <ActivityIndicator size="small" color="#0369a1" />
              <Text style={{ marginLeft: 8, color: '#0369a1' }}>Loading categories...</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={[
                styles.dropdownButton,
                categories.length === 0 && { backgroundColor: '#fef2f2', borderColor: '#ef4444' }
              ]}
              onPress={() => categories.length > 0 && setShowCategoryModal(true)}
              disabled={categories.length === 0}
            >
              <Text style={selectedCategory ? styles.dropdownTextSelected : styles.dropdownTextPlaceholder}>
                {categories.length === 0 ? "❌ No categories available" : selectedCategory ? categories.find(c => c.category === selectedCategory)?.displayName || selectedCategory : "-- Select Vehicle Category --"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#94a3b8" />
            </TouchableOpacity>
          )}
          {categories.length === 0 && !loadingCategories && (
            <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>
              ❌ Categories failed to load. Please check your connection.
            </Text>
          )}
        </View>

        {/* Category Dropdown Modal */}
        <Modal
          visible={showCategoryModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCategoryModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowCategoryModal(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Vehicle Category</Text>
                <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={categories}
                keyExtractor={(item) => item._id || item.category}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      selectedCategory === item.category && styles.modalItemSelected
                    ]}
                    onPress={() => {
                      handleCategoryChange(item.category);
                      setShowCategoryModal(false);
                    }}
                  >
                    <Text style={[
                      styles.modalItemText,
                      selectedCategory === item.category && styles.modalItemTextSelected
                    ]}>
                      {item.displayName || item.name}
                    </Text>
                    {selectedCategory === item.category && (
                      <Ionicons name="checkmark" size={20} color="#EC4A4D" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Vehicle Type Selection */}
        {selectedCategory && (
          <View style={styles.cardSection}>
            <Text style={styles.inputLabel}>
              Type of Vehicle <Text style={styles.required}>*</Text>
              {loadingVehicleTypes && <Text style={{ color: '#0369a1', fontSize: 12 }}> (Loading...)</Text>}
            </Text>
            {loadingVehicleTypes ? (
              <View style={[styles.dropdownButton, { backgroundColor: '#f0f9ff', borderColor: '#0369a1' }]}>
                <ActivityIndicator size="small" color="#0369a1" />
                <Text style={{ marginLeft: 8, color: '#0369a1' }}>Loading vehicle types...</Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={[
                  styles.dropdownButton,
                  vehicleTypes.length === 0 && { backgroundColor: '#fef2f2', borderColor: '#ef4444' }
                ]}
                onPress={() => vehicleTypes.length > 0 && setShowVehicleTypeModal(true)}
                disabled={vehicleTypes.length === 0}
              >
                <Text style={vehicleType ? styles.dropdownTextSelected : styles.dropdownTextPlaceholder}>
                  {vehicleTypes.length === 0 ? "❌ No vehicle types available" : vehicleType ? vehicleTypes.find(t => t.type === vehicleType)?.name || vehicleType : "-- Select Vehicle Type --"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#94a3b8" />
              </TouchableOpacity>
            )}
            {vehicleTypes.length === 0 && !loadingVehicleTypes && selectedCategory && (
              <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>
                ❌ No vehicle types found for {selectedCategory}. Please contact support.
              </Text>
            )}
          </View>
        )}

        {/* Vehicle Type Dropdown Modal */}
        <Modal
          visible={showVehicleTypeModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowVehicleTypeModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowVehicleTypeModal(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Vehicle Type</Text>
                <TouchableOpacity onPress={() => setShowVehicleTypeModal(false)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={vehicleTypes}
                keyExtractor={(item) => item._id || item.type}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      vehicleType === item.type && styles.modalItemSelected
                    ]}
                    onPress={() => {
                      setVehicleType(item.type);
                      setShowVehicleTypeModal(false);
                    }}
                  >
                    <Text style={[
                      styles.modalItemText,
                      vehicleType === item.type && styles.modalItemTextSelected
                    ]}>
                      {item.name || item.type}
                    </Text>
                    {vehicleType === item.type && (
                      <Ionicons name="checkmark" size={20} color="#EC4A4D" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {vehicleType === "2W-Bikes" && (
          <View style={styles.cardSection}>
            <Text style={styles.inputLabel}>Select Vehicle Body Type</Text>
            <TouchableOpacity 
              style={styles.dropdownButton}
              onPress={() => setShowSubTypeModal(true)}
            >
              <Text style={vehicleSubType ? styles.dropdownTextSelected : styles.dropdownTextPlaceholder}>
                {vehicleSubType || "-- Select Type --"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#94a3b8" />
            </TouchableOpacity>

            {vehicleSubType !== "" && (
              <>
                <Text style={[styles.inputLabel, { marginTop: 16 }]}>Select Fuel Type</Text>
                <TouchableOpacity 
                  style={styles.dropdownButton}
                  onPress={() => setShowFuelTypeModal(true)}
                >
                  <Text style={fuelType ? styles.dropdownTextSelected : styles.dropdownTextPlaceholder}>
                    {fuelType || "-- Select Fuel Type --"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#94a3b8" />
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* SubType Dropdown Modal */}
        <Modal
          visible={showSubTypeModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSubTypeModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowSubTypeModal(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Vehicle Body Type</Text>
                <TouchableOpacity onPress={() => setShowSubTypeModal(false)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={[
                  { label: "Scooter", value: "Scooter" },
                  { label: "Bike", value: "Bike" },
                ]}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      vehicleSubType === item.value && styles.modalItemSelected
                    ]}
                    onPress={() => {
                      setVehicleSubType(item.value);
                      setFuelType("");
                      setShowSubTypeModal(false);
                    }}
                  >
                    <Text style={[
                      styles.modalItemText,
                      vehicleSubType === item.value && styles.modalItemTextSelected
                    ]}>
                      {item.label}
                    </Text>
                    {vehicleSubType === item.value && (
                      <Ionicons name="checkmark" size={20} color="#EC4A4D" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Fuel Type Dropdown Modal */}
        <Modal
          visible={showFuelTypeModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowFuelTypeModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowFuelTypeModal(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Fuel Type</Text>
                <TouchableOpacity onPress={() => setShowFuelTypeModal(false)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={[
                  { label: "EV", value: "EV" },
                  { label: "Petrol", value: "Petrol" },
                ]}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      fuelType === item.value && styles.modalItemSelected
                    ]}
                    onPress={() => {
                      setFuelType(item.value);
                      setShowFuelTypeModal(false);
                    }}
                  >
                    <Text style={[
                      styles.modalItemText,
                      fuelType === item.value && styles.modalItemTextSelected
                    ]}>
                      {item.label}
                    </Text>
                    {fuelType === item.value && (
                      <Ionicons name="checkmark" size={20} color="#EC4A4D" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitText}>Submit Documents</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  attractiveContainer: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  attractiveHeader: {
    backgroundColor: "#EC4D4A",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: 40,
    paddingBottom: 24,
    alignItems: "center",
    marginBottom: 10,
    shadowColor: "#EC4D4A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  headerIconCircle: {
    backgroundColor: "#D43B38",
    borderRadius: 32,
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  attractiveHeaderText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  attractiveHeaderSubText: {
    color: "#FFE5E5",
    fontSize: 14,
    marginBottom: 2,
  },
  attractiveScrollContent: {
    padding: 18,
    paddingBottom: 120,
  },
  cardSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  attractiveInput: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
    color: "#1e293b",
    fontSize: 16,
  },
  attractivePickerWrapper: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 8,
    marginBottom: 0,
    overflow: "hidden",
    height: 50,
    justifyContent: "center",
  },
  attractivePicker: {
    flex: 1,
    color: "#1e293b",
    fontSize: 16,
    fontFamily: "PoppinsRegular",
  },
  inputLabel: {
    color: "#1f2937",
    fontWeight: "700",
    fontSize: 16,
    fontFamily: "PoppinsBold",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 10,
    fontFamily: "PoppinsBold",
  },
  uploadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  uploadButtonContainer: { flex: 1, marginHorizontal: 5, position: "relative" },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  uploadedButton: { backgroundColor: "#ECFDF5", borderColor: "#10B981" },
  uploadText: { marginLeft: 8, color: "#EC4A4D", fontWeight: "500" },
  uploadedText: { color: "#10B981", fontWeight: "600" },
  removeButton: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "#fff",
    borderRadius: 20,
  },
  submitButton: {
    backgroundColor: "#EC4A4D",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  submitActive: { backgroundColor: "#10B981" },
  submitText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  required: {
    color: "#ef4444",
    fontWeight: "bold",
  },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadingBox: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  uploadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#333",
  },
  // Custom Dropdown Styles
  dropdownButton: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 50,
  },
  dropdownTextPlaceholder: {
    color: "#94a3b8",
    fontSize: 16,
  },
  dropdownTextSelected: {
    color: "#1e293b",
    fontSize: 16,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "100%",
    maxHeight: "70%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalItemSelected: {
    backgroundColor: "#fef2f2",
  },
  modalItemText: {
    fontSize: 16,
    color: "#334155",
  },
  modalItemTextSelected: {
    color: "#EC4A4D",
    fontWeight: "600",
  },
});

export default VehicleRegistrationScreen;