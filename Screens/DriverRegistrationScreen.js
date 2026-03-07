import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Image,
  TextInput,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { submitRiderRegistration, getRiderByPhone } from "../utils/AuthApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_CONFIG } from "../config/api";

const { width, height } = Dimensions.get("window");

const BASE_URL = API_CONFIG.BASE_URL;

const DriverRegistrationScreen = () => {
  const [name, setName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [aadhaarFront, setAadhaarFront] = useState(null);
  const [aadhaarBack, setAadhaarBack] = useState(null);
  const [panCard, setPanCard] = useState(null);
  const [selfie, setSelfie] = useState(null);

  const [previewImage, setPreviewImage] = useState(null);
  const [currentUploadType, setCurrentUploadType] = useState("");
  const [imageSource, setImageSource] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const navigation = useNavigation();
  
  // Referral code validation states
  const [validatingReferral, setValidatingReferral] = useState(false);
  const [referralValid, setReferralValid] = useState(null);
  const [referralError, setReferralError] = useState("");
  const [referrerName, setReferrerName] = useState("");
  
  // Track component mount status to prevent state updates after unmount
  const isMountedRef = useRef(true);
  const [screenFocused, setScreenFocused] = useState(true);

  // Load existing rider data on mount
  useEffect(() => {
    const loadExistingRiderData = async () => {
      try {
        console.log("📥 Loading existing rider data for DriverRegistrationScreen...");
        const response = await getRiderByPhone();
        
        if (response?.data?.data) {
          const rider = response.data.data;
          console.log("✅ Found existing rider data:", rider);
          
          // Populate name and referral code if available
          if (rider.driverName) {
            setName(rider.driverName);
            console.log("✅ Set name:", rider.driverName);
          }
          
          if (rider.referralCode) {
            setReferralCode(rider.referralCode);
            console.log("✅ Set referral code:", rider.referralCode);
          }
          
          // Load existing images from backend
          if (rider.images) {
            console.log("📸 Loading existing images:", rider.images);
            
            // Aadhaar Front
            if (rider.images.FrontaadharCard) {
              setAadhaarFront({ 
                uri: rider.images.FrontaadharCard, 
                cloudinaryUrl: rider.images.FrontaadharCard 
              });
              console.log("✅ Loaded Aadhaar Front:", rider.images.FrontaadharCard);
            }
            
            // Aadhaar Back
            if (rider.images.BackaadharCard) {
              setAadhaarBack({ 
                uri: rider.images.BackaadharCard, 
                cloudinaryUrl: rider.images.BackaadharCard 
              });
              console.log("✅ Loaded Aadhaar Back:", rider.images.BackaadharCard);
            }
            
            // PAN Card
            if (rider.images.panCard) {
              setPanCard({ 
                uri: rider.images.panCard, 
                cloudinaryUrl: rider.images.panCard 
              });
              console.log("✅ Loaded PAN Card:", rider.images.panCard);
            }
            
            // Selfie
            if (rider.images.profilePhoto) {
              setSelfie({ 
                uri: rider.images.profilePhoto, 
                cloudinaryUrl: rider.images.profilePhoto 
              });
              console.log("✅ Loaded Selfie:", rider.images.profilePhoto);
            }
          }
        } else {
          console.log("ℹ️ No existing rider data found, starting fresh registration");
        }
      } catch (error) {
        console.log("ℹ️ No existing data to load:", error.message);
        // Don't show error to user, just continue with empty form
      }
    };
    
    loadExistingRiderData();
    
    // Add focus/blur listeners to track screen visibility
    const unsubscribeFocus = navigation.addListener('focus', () => {
      console.log("✅ DriverRegistrationScreen focused");
      setScreenFocused(true);
      isMountedRef.current = true;
    });

    const unsubscribeBlur = navigation.addListener('blur', () => {
      console.log("⚠️ DriverRegistrationScreen blurred (but not unmounted)");
      setScreenFocused(false);
      // Don't set isMountedRef to false here - screen is still in stack
    });
    
    // Cleanup function to prevent memory leaks and crashes
    return () => {
      isMountedRef.current = false;
      unsubscribeFocus();
      unsubscribeBlur();
      console.log("🧹 DriverRegistrationScreen unmounted, cleaning up...");
    };
  }, [navigation]);

  // ---------- Validate Referral Code ----------
  const validateReferralCode = async (code) => {
    if (!code || code.trim().length === 0) {
      setReferralValid(null);
      setReferralError("");
      setReferrerName("");
      return;
    }

    const trimmedCode = code.trim().toUpperCase();
    if (trimmedCode.length < 5) {
      setReferralValid(false);
      setReferralError("Code too short");
      setReferrerName("");
      return;
    }

    setValidatingReferral(true);
    setReferralError("");
    setReferrerName("");

    try {
      console.log("🔍 Validating referral code:", trimmedCode);
      const response = await axios.post(
        `${BASE_URL}/api/v1/validate-referral-code`,
        { referralCode: trimmedCode },
        {
          timeout: 10000,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ Referral validation response:", response.data);

      if (response.data && response.data.valid) {
        setReferralValid(true);
        setReferralError("");
        // Extract referrer name from response if available
        if (response.data.referrer && response.data.referrer.name) {
          setReferrerName(response.data.referrer.name);
        }
      } else {
        setReferralValid(false);
        setReferralError("Invalid referral code");
        setReferrerName("");
      }
    } catch (error) {
      console.error("❌ Referral validation failed:", error.message);
      setReferralValid(false);
      setReferralError(
        error.response?.data?.message || "Invalid referral code"
      );
      setReferrerName("");
    } finally {
      setValidatingReferral(false);
    }
  };

  // Handle referral code change with validation
  const handleReferralCodeChange = (code) => {
    setReferralCode(code);
    // Debounce validation
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    validationTimeoutRef.current = setTimeout(() => {
      validateReferralCode(code);
    }, 500);
  };

  // Add ref for validation timeout
  const validationTimeoutRef = useRef(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  // ---------- Upload Image to Cloudinary via Backend ----------
  const uploadImageToCloudinary = async (imageUri, documentType, phoneNumber) => {
    try {
      if (!isMountedRef.current) {
        console.log("⚠️ Component unmounted, canceling upload");
        return null;
      }
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
      if (isMountedRef.current) {
        setUploadingImage(false);
        setCurrentUploadType("");
      }
    }
  };

  // ---------- Image Upload Functions ----------
  const handleUpload = async (type) => {
    setCurrentUploadType(type);
    if (type === "selfie") {
      await openCamera(type);
      return;
    }

    Alert.alert("Upload Option", "Choose an option", [
      { text: "Camera", onPress: () => openCamera(type) },
      { text: "Gallery", onPress: () => pickFromGallery(type) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const pickFromGallery = async (uploadType) => {
    try {
      // Check if component is still mounted
      if (!isMountedRef.current) {
        console.log("⚠️ Component unmounted, canceling gallery operation");
        return;
      }
      
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Photo Library Permission Required",
          "Ridodrop Partner needs access to your photo library to upload registration documents. Please enable permission in your device settings.",
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
      
      // Check again after async permission request
      if (!isMountedRef.current) {
        console.log("⚠️ Component unmounted during permission request");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.5, // Reduced from 0.7 to prevent memory issues
        allowsEditing: false,
        allowsMultipleSelection: false,
        exif: false, // Disable EXIF to reduce memory usage
      });
      
      // Check if component is still mounted after gallery operation
      if (!isMountedRef.current) {
        console.log("⚠️ Component unmounted during gallery operation");
        return;
      }

      console.log("Gallery result:", result);

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        const imageUri = file.uri;
        
        console.log("Uploading image to Cloudinary...", uploadType);
        
        try {
          // Get phone number from AsyncStorage
          const phoneNumber = await AsyncStorage.getItem("number");
          if (!phoneNumber) {
            Alert.alert("Error", "Phone number not found. Please login again.");
            return;
          }
          
          // Upload to Cloudinary
          const uploadedFile = await uploadImageToCloudinary(imageUri, uploadType, phoneNumber);
          
          // Check if component is still mounted before updating state
          if (!isMountedRef.current) {
            console.log("⚠️ Component unmounted, skipping state update after upload");
            return;
          }
          
          if (uploadedFile) {
            switch (uploadType) {
              case "aadhaarFront":
                console.log("Setting aadhaarFront from Cloudinary:", uploadedFile.cloudinaryUrl);
                setAadhaarFront(uploadedFile);
                break;
              case "aadhaarBack":
                console.log("Setting aadhaarBack from Cloudinary:", uploadedFile.cloudinaryUrl);
                setAadhaarBack(uploadedFile);
                break;
              case "panCard":
                console.log("Setting panCard from Cloudinary:", uploadedFile.cloudinaryUrl);
                setPanCard(uploadedFile);
                break;
              case "selfie":
                console.log("Setting selfie from Cloudinary:", uploadedFile.cloudinaryUrl);
                setSelfie(uploadedFile);
                break;
              default:
                console.log("Unknown upload type:", uploadType);
            }
          }
          
        } catch (uploadError) {
          console.error("Cloudinary upload failed:", uploadError);
          // Store local file as fallback if component is still mounted
          if (isMountedRef.current && imageUri) {
            const fallbackFile = {
              uri: imageUri,
              name: `${uploadType}.jpg`,
              type: "image/jpeg",
              uploadError: uploadError.message
            };
            switch (uploadType) {
              case "aadhaarFront":
                setAadhaarFront(fallbackFile);
                break;
              case "aadhaarBack":
                setAadhaarBack(fallbackFile);
                break;
              case "panCard":
                setPanCard(fallbackFile);
                break;
              case "selfie":
                setSelfie(fallbackFile);
                break;
            }
            Alert.alert("Upload Issue", "Image selected but upload failed. It will be uploaded when you submit the form.");
          }
        }
      } else {
        console.log("Gallery selection was canceled");
      }
    } catch (error) {
      console.error("Gallery error:", error);
      if (isMountedRef.current) {
        const errorMessage = error.message?.includes('permission')
          ? "Gallery permission was denied. Please enable it in your device settings."
          : "Failed to access gallery. Please try again.";
        Alert.alert("Gallery Error", errorMessage);
      }
    }
  };

  const openCamera = async (uploadType) => {
    try {
      // Check if component is still mounted
      if (!isMountedRef.current) {
        console.log("⚠️ Component unmounted, canceling camera operation");
        console.log("⚠️ isMountedRef.current:", isMountedRef.current);
        console.log("⚠️ screenFocused:", screenFocused);
        return;
      }
      
      console.log("📸 Opening camera for:", uploadType);
      
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Camera Permission Required",
          "Ridodrop Partner needs camera access to capture registration documents. Please enable camera permission in your device settings.",
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
      
      // Check again after async permission request
      if (!isMountedRef.current) {
        console.log("⚠️ Component unmounted during permission request");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.5, // Reduced from 0.7 to prevent memory issues
        allowsEditing: false,
        allowsMultipleSelection: false,
        exif: false, // Disable EXIF to reduce memory usage and prevent crashes
      });
      
      // Check if component is still mounted after camera operation
      if (!isMountedRef.current) {
        console.log("⚠️ Component unmounted during camera operation");
        return;
      }

      console.log("Camera result:", result);

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        const imageUri = file.uri;
        
        console.log("Uploading camera image to Cloudinary...", uploadType);
        
        try {
          // Get phone number from AsyncStorage
          const phoneNumber = await AsyncStorage.getItem("number");
          if (!phoneNumber) {
            Alert.alert("Error", "Phone number not found. Please login again.");
            return;
          }
          
          // Upload to Cloudinary
          const uploadedFile = await uploadImageToCloudinary(imageUri, uploadType, phoneNumber);
          
          // Check if component is still mounted before updating state
          if (!isMountedRef.current) {
            console.log("⚠️ Component unmounted, skipping state update after upload");
            return;
          }
          
          if (uploadedFile) {
            switch (uploadType) {
              case "aadhaarFront":
                console.log("Setting aadhaarFront from Cloudinary:", uploadedFile.cloudinaryUrl);
                setAadhaarFront(uploadedFile);
                break;
              case "aadhaarBack":
                console.log("Setting aadhaarBack from Cloudinary:", uploadedFile.cloudinaryUrl);
                setAadhaarBack(uploadedFile);
                break;
              case "panCard":
                console.log("Setting panCard from Cloudinary:", uploadedFile.cloudinaryUrl);
                setPanCard(uploadedFile);
                break;
              case "selfie":
                console.log("Setting selfie from Cloudinary:", uploadedFile.cloudinaryUrl);
                setSelfie(uploadedFile);
                break;
              default:
                console.log("Unknown upload type:", uploadType);
            }
          }
          
        } catch (uploadError) {
          console.error("Cloudinary upload failed:", uploadError);
          // Store local file as fallback if component is still mounted
          if (isMountedRef.current && imageUri) {
            const fallbackFile = {
              uri: imageUri,
              name: `${uploadType}.jpg`,
              type: "image/jpeg",
              uploadError: uploadError.message
            };
            switch (uploadType) {
              case "aadhaarFront":
                setAadhaarFront(fallbackFile);
                break;
              case "aadhaarBack":
                setAadhaarBack(fallbackFile);
                break;
              case "panCard":
                setPanCard(fallbackFile);
                break;
              case "selfie":
                setSelfie(fallbackFile);
                break;
            }
            Alert.alert("Upload Issue", "Image captured but upload failed. It will be uploaded when you submit the form.");
          }
        }
      } else {
        console.log("Camera was canceled or no image selected");
      }
    } catch (error) {
      console.error("Camera error:", error);
      if (isMountedRef.current) {
        // More descriptive error messages based on error type
        const errorMessage = error.message?.includes('permission') 
          ? "Camera permission was denied. Please enable it in your device settings."
          : error.message?.includes('cancelled') || error.message?.includes('canceled')
          ? "Camera was closed"
          : "Failed to open camera. Please try again.";
        
        if (!error.message?.includes('cancelled') && !error.message?.includes('canceled')) {
          Alert.alert("Camera Error", errorMessage);
        }
      }
    }
  };

  const confirmImage = () => {
    if (!previewImage || !currentUploadType) return;

    switch (currentUploadType) {
      case "aadhaarFront":
        setAadhaarFront(previewImage);
        break;
      case "aadhaarBack":
        setAadhaarBack(previewImage);
        break;
      case "panCard":
        setPanCard(previewImage);
        break;
      case "selfie":
        setSelfie(previewImage);
        break;
    }

    setPreviewImage(null);
    setCurrentUploadType("");
    setImageSource("");
  };

  const removeImage = (type) => {
    switch (type) {
      case "aadhaarFront":
        setAadhaarFront(null);
        break;
      case "aadhaarBack":
        setAadhaarBack(null);
        break;
      case "panCard":
        setPanCard(null);
        break;
      case "selfie":
        setSelfie(null);
        break;
    }
  };

  const handleSubmit = async () => {
    if (!name) return Alert.alert("Error", "Please enter your name.");
    if (!aadhaarFront || !aadhaarBack || !panCard || !selfie)
      return Alert.alert("Error", "Please upload all required documents.");

    // Validate referral code if provided
    if (referralCode && referralCode.trim() && referralValid === false) {
      return Alert.alert(
        "Invalid Referral Code",
        "Please enter a valid referral code or leave it empty to continue."
      );
    }

    // Warn if referral code is being validated
    if (referralCode && referralCode.trim() && validatingReferral) {
      return Alert.alert(
        "Please Wait",
        "Referral code validation is in progress. Please wait a moment."
      );
    }

    try {
      await AsyncStorage.setItem("name", name);
      
      // Send Cloudinary URLs instead of image objects
      const registrationData = {
        name,
        aadhaarFrontUrl: aadhaarFront.cloudinaryUrl || aadhaarFront.uri,
        aadhaarBackUrl: aadhaarBack.cloudinaryUrl || aadhaarBack.uri,
        panCardUrl: panCard.cloudinaryUrl || panCard.uri,
        selfieUrl: selfie.cloudinaryUrl || selfie.uri,
        usedReferralCode: referralCode && referralValid ? referralCode.trim().toUpperCase() : undefined,
      };
      
      console.log("Submitting registration with Cloudinary URLs:", registrationData);
      
      const res = await submitRiderRegistration(registrationData);

      if (res.status === 201) {
        if (res.data.token) await AsyncStorage.setItem("token", res.data.token);
        
        // Check if this is a reupload
        const isReuploading = await AsyncStorage.getItem("isReuploading");
        
        if (isReuploading === "true") {
          // Reuploading - clear flag and return to MyVehicle
          await AsyncStorage.removeItem("isReuploading");
          console.log("✅ Personal documents reuploaded - returning to My Vehicle");
          Alert.alert("Success!", "Personal documents updated successfully. Please wait for admin verification.", [
            { text: "OK", onPress: () => navigation.replace("My Vehicle") }
          ]);
        } else {
          // Normal flow - continue to vehicle registration
          await AsyncStorage.setItem("registrationComplete", "false");
          await AsyncStorage.setItem("registrationStep", "vehicle");
          console.log("✅ Driver registration complete - status saved: vehicle step");
          navigation.navigate("Vehicleregister");
        }
      } else {
        Alert.alert("Error", "Registration failed. Please try again.");
      }
    } catch (err) {
      console.error("Registration error:", err);
      Alert.alert(
        "Error",
        err.response?.data?.error || "Registration failed. Please try again."
      );
    }
  };

  // Preview screen removed - images auto-confirm immediately

  // ---------- Document Button with Image Thumbnail ----------
  const DocumentButton = ({ type, icon, label, image }) => {
    console.log(`DocumentButton ${type}:`, { hasImage: !!image, imageUri: image?.uri });
    
    return (
    <View style={styles.uploadButtonContainer}>
      <TouchableOpacity
        style={[styles.uploadButton, image && styles.uploadedButton]}
        onPress={() => handleUpload(type)}
        disabled={uploadingImage}
      >
        {image ? (
          <>
            <Ionicons
              name="checkmark-circle"
              size={width * 0.055}
              color="#10B981"
            />
            <Text style={[styles.uploadText, styles.uploadedText]}>
              {label.replace("Upload", "Uploaded")}
            </Text>
          </>
        ) : (
          <>
            <Ionicons name={icon} size={width * 0.055} color="#EC4A4D" />
            <Text style={styles.uploadText}>{label}</Text>
          </>
        )}
      </TouchableOpacity>

      {image && image.uri && (
        <Image
          source={{ uri: image.uri }}
          style={{
            width: width * 0.38,
            height: width * 0.22,
            borderRadius: width * 0.02,
            marginTop: width * 0.015,
          }}
          resizeMode="cover"
        />
      )}

      {image && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeImage(type)}
        >
          <Ionicons name="close-circle" size={width * 0.06} color="#EC4D4A" />
        </TouchableOpacity>
      )}
    </View>
    );
  };

  return (
    <View style={styles.container}>
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
      
      <View style={styles.header}>
        <View style={styles.headerIconCircle}>
          <Ionicons name="person" size={width * 0.08} color="#fff" />
        </View>
        <Text style={styles.headerText}>Owner Details</Text>
        <Text style={styles.headerSubText}>
          Enter your details to get started
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.card}>
          <Text style={styles.inputLabel}>Full Name</Text>
          <View style={styles.inputWrapper}>
            <Ionicons
              name="person-outline"
              size={width * 0.05}
              color="#EC4A4D"
            />
            <TextInput
              style={styles.inputField}
              placeholder="Enter your full name"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <Text style={[styles.inputLabel, { marginTop: height * 0.02 }]}>
            Referral Code (Optional)
          </Text>
          <View style={[
            styles.inputWrapper,
            referralValid === true && styles.inputWrapperValid,
            referralValid === false && styles.inputWrapperInvalid,
          ]}>
            <Ionicons
              name="gift-outline"
              size={width * 0.05}
              color="#EC4A4D"
            />
            <TextInput
              style={styles.inputField}
              placeholder="Enter referral code if you have one"
              placeholderTextColor="#94a3b8"
              value={referralCode}
              onChangeText={handleReferralCodeChange}
              autoCapitalize="characters"
              maxLength={20}
            />
            {validatingReferral && (
              <ActivityIndicator
                size="small"
                color="#EC4A4D"
                style={styles.validationIcon}
              />
            )}
            {!validatingReferral && referralValid === true && (
              <Ionicons
                name="checkmark-circle"
                size={width * 0.06}
                color="#10B981"
                style={styles.validationIcon}
              />
            )}
            {!validatingReferral && referralValid === false && (
              <TouchableOpacity
                onPress={() => {
                  setReferralCode("");
                  setReferralValid(null);
                  setReferralError("");
                  setReferrerName("");
                }}
                style={styles.validationIcon}
              >
                <Ionicons
                  name="close-circle"
                  size={width * 0.06}
                  color="#EF4444"
                />
              </TouchableOpacity>
            )}
          </View>
          {referralValid === true && (
            <View style={styles.referralSuccessBox}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.referralSuccessText}>
                {referrerName ? `Valid! Referred by ${referrerName}` : "Valid referral code!"}
              </Text>
            </View>
          )}
          {referralValid === false && referralError && (
            <Text style={styles.referralErrorText}>{referralError}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Aadhaar Card</Text>
          {console.log("State check - aadhaarFront:", aadhaarFront, "aadhaarBack:", aadhaarBack)}
          <View style={styles.row}>
            <DocumentButton
              type="aadhaarFront"
              icon="camera"
              label="Upload Front"
              image={aadhaarFront}
            />
            <DocumentButton
              type="aadhaarBack"
              icon="camera"
              label="Upload Back"
              image={aadhaarBack}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>PAN Card</Text>
          {console.log("State check - panCard:", panCard)}
          <DocumentButton
            type="panCard"
            icon="camera"
            label="Upload PAN"
            image={panCard}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Owner Selfie</Text>
          {console.log("State check - selfie:", selfie)}
          <DocumentButton
            type="selfie"
            icon="camera"
            label="Take Selfie"
            image={selfie}
          />
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitText}>Submit Documents</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

// ---------- Styles ----------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  header: {
    backgroundColor: "#EC4D4A",
    borderBottomLeftRadius: width * 0.08,
    borderBottomRightRadius: width * 0.08,
    paddingTop: height * 0.04,
    paddingBottom: height * 0.02,
    alignItems: "center",
  },
  headerIconCircle: {
    backgroundColor: "#D43B38",
    borderRadius: width * 0.12,
    width: width * 0.18,
    height: width * 0.18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: height * 0.01,
  },
  headerText: {
    color: "#fff",
    fontSize: width * 0.065,
    fontWeight: "bold",
    fontFamily: "Poppins-Bold",
  },
  headerSubText: {
    color: "#FFE5E5",
    fontSize: width * 0.035,
    fontFamily: "Poppins-Regular",
  },
  scrollContent: { padding: width * 0.045, paddingBottom: height * 0.15 },
  card: {
    backgroundColor: "#fff",
    borderRadius: width * 0.04,
    padding: width * 0.045,
    marginBottom: height * 0.02,
  },
  inputLabel: {
    fontSize: width * 0.04,
    fontWeight: "700",
    marginBottom: height * 0.01,
    color: "#334155",
    fontFamily: "Poppins-Bold",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: width * 0.03,
    paddingHorizontal: width * 0.04,
    paddingVertical: height * 0.015,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontFamily: "Poppins-Regular",
  },
  inputWrapperValid: {
    borderColor: "#10B981",
    backgroundColor: "#ECFDF5",
  },
  inputWrapperInvalid: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  inputField: {
    flex: 1,
    fontSize: width * 0.04,
    color: "#1E293B",
    fontFamily: "Poppins-Regular",
    marginRight: 10,
  },
  label: {
    fontSize: width * 0.04,
    fontWeight: "700",
    marginBottom: height * 0.012,
    color: "#334155",
    fontFamily: "Poppins-Bold",
  },
  section: {
    marginBottom: height * 0.025,
    backgroundColor: "#fff",
    borderRadius: width * 0.03,
    padding: width * 0.04,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  uploadButtonContainer: {
    flex: 1,
    marginHorizontal: width * 0.01,
    position: "relative",
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    padding: width * 0.03,
    borderRadius: width * 0.02,
    borderWidth: 1,
    borderColor: "#dbeafe",
    justifyContent: "center",
  },
  uploadedButton: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981",
  },
  uploadText: {
    marginLeft: width * 0.02,
    color: "#EC4A4D",
    fontWeight: "500",
    fontSize: width * 0.035,
  },
  uploadedText: {
    color: "#10B981",
    fontWeight: "600",
    fontFamily: "Poppins-Bold",
  },
  removeButton: {
    position: "absolute",
    right: width * 0.01,
    top: width * 0.01,
    backgroundColor: "white",
    borderRadius: width * 0.03,
    padding: width * 0.005,
  },
  thumbnail: {
    width: width * 0.08,
    height: width * 0.08,
    borderRadius: 6,
  },
  submitButton: {
    backgroundColor: "#EC4A4D",
    paddingVertical: height * 0.02,
    borderRadius: width * 0.03,
    alignItems: "center",
    marginTop: height * 0.01,
  },
  submitText: {
    color: "white",
    fontWeight: "700",
    fontSize: width * 0.04,
    fontFamily: "Poppins-Bold",
  },
  previewContainer: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: { width: "100%", height: "80%" },
  previewButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    padding: 20,
  },
  button: { padding: 15, borderRadius: 8, width: "45%", alignItems: "center" },
  retakeButton: { backgroundColor: "#ef4444" },
  confirmButton: { backgroundColor: "#10b981" },
  buttonText: { color: "white", fontWeight: "600" },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadingBox: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    minWidth: 200,
  },
  uploadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#1f2937",
    fontWeight: "600",
  },
  validationIcon: {
    marginLeft: width * 0.02,
  },
  referralSuccessBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    padding: width * 0.03,
    borderRadius: width * 0.02,
    marginTop: height * 0.01,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  referralSuccessText: {
    marginLeft: width * 0.02,
    color: "#10B981",
    fontSize: width * 0.035,
    fontWeight: "600",
    flex: 1,
  },
  referralErrorText: {
    color: "#EF4444",
    fontSize: width * 0.035,
    marginTop: height * 0.01,
    marginLeft: width * 0.02,
  },
});

export default DriverRegistrationScreen;
