// import React, { useState, useEffect } from "react";
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
//   Platform,
//   Alert,
//   ScrollView,
// } from "react-native";
// import * as ImagePicker from "expo-image-picker";
// import { Ionicons } from "@expo/vector-icons";
// import { useNavigation } from "@react-navigation/native";
// import { getRiderByPhone, updateVehicleRegistration } from "../utils/AuthApi";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// const DriverDetailsScreen = () => {
//   const navigation = useNavigation();

//   const [drivingSelf, setDrivingSelf] = useState(null);
//   const [driverName, setDriverName] = useState("");
//   const [driverMobile, setDriverMobile] = useState("");
//   // const [licenseFront, setLicenseFront] = useState(null);
//   // const [licenseBack, setLicenseBack] = useState(null);
//   // const [previewImage, setPreviewImage] = useState(null);
//   // const [currentSetFile, setCurrentSetFile] = useState(null);

//   const [licenseFront, setLicenseFront] = useState(null);
//   const [licenseBack, setLicenseBack] = useState(null);
//   const [previewImage, setPreviewImage] = useState(null);
//   const [currentSetFile, setCurrentSetFile] = useState(null);
//   const [imageSource, setImageSource] = useState("");

//   useEffect(() => {
//     const fetchFromStorage = async () => {
//       const phone = await AsyncStorage.getItem("number");
//       const name = await AsyncStorage.getItem("name");
//       setDriverName(name || "");
//       setDriverMobile(phone || "");
//     };
//     fetchFromStorage();
//   }, []);

//   const removeImage = (type) => {
//     switch (type) {
//       case "licenseFront":
//         setLicenseFront(null);
//         break;
//       case "licenseBack":
//         setLicenseBack(null);
//         break;
//     }
//   };

//   const DocumentButton = ({
//     icon,
//     label,
//     uploaded,
//     image,
//     onPress,
//     remove,
//   }) => (
//     <View style={styles.uploadButtonContainer}>
//       <TouchableOpacity
//         style={[styles.uploadButton, uploaded && styles.uploadedButton]}
//         onPress={onPress}
//       >
//         <Ionicons
//           name={icon}
//           size={24}
//           color={uploaded ? "#EC4A4D" : "#EC4A4D"}
//         />
//         <Text style={[styles.uploadText, uploaded && styles.uploadedText]}>
//           {uploaded ? label.replace("Upload", "Uploaded") : label}
//         </Text>
//         {uploaded && (
//           <Ionicons
//             name="checkmark-circle"
//             size={20}
//             color="#10B981"
//             style={{ marginLeft: 8 }}
//           />
//         )}
//       </TouchableOpacity>
//       {uploaded && (
//         <TouchableOpacity style={styles.removeButton} onPress={remove}>
//           <Ionicons name="close-circle" size={20} color="#EF4A4D" />
//         </TouchableOpacity>
//       )}
//     </View>
//   );

//   const handleSubmit = async () => {
//     // Validate required fields
//     if (drivingSelf === null) {
//       Alert.alert("Error", "Please select if you will be driving this vehicle.");
//       return;
//     }

//     if (!driverName || !driverMobile) {
//       Alert.alert("Error", "Please fill in driver name and mobile number.");
//       return;
//     }

//     if (!licenseFront || !licenseBack) {
//       Alert.alert("Error", "Please upload both front and back sides of the driving license.");
//       return;
//     }

//     // Prepare payload for backend
//     const payload = {
//       driverName,
//       driverPhone: driverMobile,
//       selfDriving: drivingSelf ? "yes" : "no",
//       licenseFront,
//       licenseBack,
//     };

//     // Debug: log state before submit
//     console.log("Submitting driver details:", {
//       driverName,
//       driverPhone: driverMobile,
//       selfDriving: drivingSelf ? "yes" : "no",
//       hasLicenseFront: !!licenseFront,
//       hasLicenseBack: !!licenseBack,
//     });

//     try {
//       const res = await updateVehicleRegistration(payload);
//       if (res.status === 200 || res.status === 201) {
//         await AsyncStorage.setItem("complete", "70");
//         Alert.alert("Success", "Driver details submitted successfully!");
//         navigation.replace("My Vehicle");
//       } else {
//         Alert.alert("Error", "Failed to update driver details.");
//       }
//     } catch (err) {
//       console.error("Driver details submission error:", err);
//       Alert.alert(
//         "Error",
//         err.response?.data?.error || "Failed to update driver details."
//       );
//     }
//   };

//   const handleUpload = (setFile) => {
//     Alert.alert("Upload Option", "Choose an option", [
//       { text: "Camera", onPress: () => openCamera(setFile) },
//       { text: "Gallery", onPress: () => pickFromGallery(setFile) },
//       { text: "Cancel", style: "cancel" },
//     ]);
//   };

//   const pickFromGallery = async (setFile) => {
//     const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
//     if (!permission.granted) {
//       Alert.alert("Permission required", "Please allow media access.");
//       return;
//     }

//     const result = await ImagePicker.launchImageLibraryAsync({
//       mediaTypes: ImagePicker.MediaTypeOptions.Images,
//       quality: 0.7,
//     });

//     if (!result.canceled) {
//       const file = result.assets[0];
//       const image = {
//         uri: file.uri,
//         name: file.fileName || file.uri.split("/").pop(),
//         type: file.type || "image/jpeg",
//       };
//       // setFile(image); // Immediately set the image, no preview

//        setPreviewImage(image);
//        setCurrentSetFile(() => setFile);
//        setImageSource("gallery");
//     }
//   };

//   const openCamera = async (setFile) => {
//     const permission = await ImagePicker.requestCameraPermissionsAsync();
//     if (!permission.granted) {
//       Alert.alert("Permission required", "Please allow camera access.");
//       return;
//     }

//     const result = await ImagePicker.launchCameraAsync({
//       mediaTypes: ImagePicker.MediaTypeOptions.Images,
//       quality: 0.7,
//     });

//     if (!result.canceled) {
//       const file = result.assets[0];
//       const image = {
//         uri: file.uri,
//         name: file.fileName || file.uri.split("/").pop(),
//         type: file.type || "image/jpeg",
//       };
//       // setFile(image); // Immediately set the image, no preview

//        setPreviewImage(image);
//        setCurrentSetFile(() => setFile);
//        setImageSource("camera");
//     }
//   };

//   const handleDrivingSelfSelection = async (value) => {
//     setDrivingSelf(value);
//     if (value === true) {
//       // Auto-populate with current user's details
//       const phone = await AsyncStorage.getItem("number");
//       const name = await AsyncStorage.getItem("name");
//       setDriverName(name || "");
//       setDriverMobile(phone || "");
//     } else {
//       // Clear fields when selecting "No"
//       setDriverName("");
//       setDriverMobile("");
//     }
//   };

//   // if (previewImage) {
//   //   // Do not show preview UI, just return null
//   //   return null;
//   // }

//   if (previewImage) {
//     return (
//       <View style={{ flex: 1, backgroundColor: "#000" }}>
//         <View
//           style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
//         >
//           <Image
//             source={{ uri: previewImage.uri }}
//             style={{ width: "100%", height: "80%", resizeMode: "contain" }}
//           />
//         </View>
//         <View
//           style={{
//             flexDirection: "row",
//             justifyContent: "space-around",
//             marginBottom: 30,
//           }}
//         >
//           <TouchableOpacity
//             style={[
//               styles.submitButton,
//               styles.submitInactive,
//               { paddingHorizontal: 32 },
//             ]}
//             onPress={() => {
//               setPreviewImage(null);
//               setCurrentSetFile(null);
//             }}
//           >
//             <Text style={styles.submitTextInactive}>
//               {imageSource === "camera" ? "Retake" : "Re-upload"}
//             </Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={[
//               styles.submitButton,
//               styles.submitActive,
//               { paddingHorizontal: 32 },
//             ]}
//             onPress={() => {
//               if (currentSetFile) {
//                 currentSetFile(previewImage);
//                 setPreviewImage(null);
//                 setCurrentSetFile(null);
//               }
//             }}
//           >
//             <Text style={styles.submitTextActive}>Confirm</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.attractiveContainer}>
//       <View style={styles.attractiveHeader}>
//         <View style={styles.headerIconCircle}>
//           <Ionicons name="person" size={32} color="#fff" />
//         </View>
//         <Text style={styles.attractiveHeaderText}>Driver Details</Text>
//         <Text style={styles.attractiveHeaderSubText}>
//           Enter driver information to get started
//         </Text>
//       </View>

//       <ScrollView
//         contentContainerStyle={styles.attractiveScrollContent}
//         showsVerticalScrollIndicator={false}
//       >
//         <View style={styles.cardSection}>
//           <Text style={styles.question}>I will be driving this vehicle</Text>
//           <View style={styles.checkboxRow}>
//             <TouchableOpacity
//               style={[styles.checkbox, drivingSelf === true && styles.checked]}
//               onPress={() => handleDrivingSelfSelection(true)}
//             >
//               <Text style={styles.checkboxText}>Yes</Text>
//             </TouchableOpacity>
//             <TouchableOpacity
//               style={[styles.checkbox, drivingSelf === false && styles.checked]}
//               onPress={() => handleDrivingSelfSelection(false)}
//             >
//               <Text style={styles.checkboxText}>No</Text>
//             </TouchableOpacity>
//           </View>
//         </View>

//         {drivingSelf !== null && (
//           <>
//             <View style={styles.cardSection}>
//               <Text style={styles.inputLabel}>Driver Name</Text>
//               <View style={styles.inputWrapper}>
//                 <Ionicons
//                   name="person-outline"
//                   size={24}
//                   color="#EC4A4D"
//                   style={styles.inputIcon}
//                 />
//                 <TextInput
//                   style={styles.inputField}
//                   placeholder="Enter driver name"
//                   placeholderTextColor="#94a3b8"
//                   value={driverName}
//                   onChangeText={setDriverName}
//                   editable={drivingSelf === false} // Only editable when not self-driving
//                 />
//               </View>
//             </View>

//             <View style={styles.cardSection}>
//               <Text style={styles.inputLabel}>Mobile Number</Text>
//               <View style={styles.inputWrapper}>
//                 <Ionicons
//                   name="call-outline"
//                   size={24}
//                   color="#EC4A4D"
//                   style={styles.inputIcon}
//                 />
//                 <TextInput
//                   style={styles.inputField}
//                   placeholder="Enter mobile number"
//                   placeholderTextColor="#94a3b8"
//                   value={driverMobile}
//                   onChangeText={setDriverMobile}
//                   editable={drivingSelf === false} // Only editable when not self-driving
//                   keyboardType="numeric"
//                 />
//               </View>
//             </View>
//           </>
//         )}

//         {/* Driving License Section with Front/Back Upload */}
//         <View style={styles.section}>
//           <Text style={styles.sectionHeader}>Driving License</Text>
//           <View style={styles.uploadRow}>
//             <DocumentButton
//               icon="camera"
//               label={licenseFront ? "Front Uploaded " : "Upload Front"}
//               onPress={() => handleUpload(setLicenseFront)}
//               uploaded={!!licenseFront}
//               image={licenseFront}
//               remove={() => removeImage("licenseFront")}
//             />
//             <DocumentButton
//               icon="camera"
//               label={licenseBack ? "Back Uploaded " : "Upload Back"}
//               onPress={() => handleUpload(setLicenseBack)}
//               uploaded={!!licenseBack}
//               image={licenseBack}
//               remove={() => removeImage("licenseBack")}
//             />
//           </View>
//         </View>

//         <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
//           <Text style={styles.submitText}>Submit</Text>
//         </TouchableOpacity>
//       </ScrollView>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   attractiveContainer: {
//     flex: 1,
//     backgroundColor: "#f1f5f9",
//   },
//   attractiveHeader: {
//     backgroundColor: "#EC4D4A",
//     borderBottomLeftRadius: 30,
//     borderBottomRightRadius: 30,
//     paddingTop: 40,
//     paddingBottom: 24,
//     alignItems: "center",
//     marginBottom: 10,
//     shadowColor: "#EC4D4A",
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.15,
//     shadowRadius: 8,
//     elevation: 4,
//   },
//   headerIconCircle: {
//     backgroundColor: "#D43B38",
//     borderRadius: 32,
//     width: 64,
//     height: 64,
//     alignItems: "center",
//     justifyContent: "center",
//     marginBottom: 10,
//   },
//   attractiveHeaderText: {
//     color: "#fff",
//     fontSize: 24,
//     fontWeight: "bold",
//     marginBottom: 4,
//   },
//   attractiveHeaderSubText: {
//     color: "#FFE5E5",
//     fontSize: 14,
//     marginBottom: 2,
//   },
//   attractiveScrollContent: {
//     padding: 18,
//     paddingBottom: 120,
//   },
//   cardSection: {
//     backgroundColor: "#fff",
//     borderRadius: 16,
//     padding: 18,
//     marginBottom: 18,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.07,
//     shadowRadius: 6,
//     elevation: 2,
//   },
//   question: {
//     fontSize: 16,
//     fontWeight: "600",
//     color: "#1f2937",
//     marginBottom: 12,
//   },
//   checkboxRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     marginTop: 8,
//   },
//   checkbox: {
//     flex: 1,
//     backgroundColor: "#f8fafc",
//     padding: 12,
//     borderRadius: 8,
//     alignItems: "center",
//     marginHorizontal: 6,
//     borderWidth: 1,
//     borderColor: "#E2E8F0",
//   },
//   checked: {
//     backgroundColor: "#FEF2F2",
//     borderColor: "#EC4A4D",
//   },
//   checkboxText: {
//     fontSize: 16,
//     color: "#1f2937",
//   },
//   inputLabel: {
//     fontSize: 16,
//     fontWeight: "600",
//     color: "#1f2937",
//     marginBottom: 8,
//   },
//   inputWrapper: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#f8fafc",
//     borderRadius: 8,
//     paddingHorizontal: 15,
//     paddingVertical: 12,
//     borderWidth: 1,
//     borderColor: "#E2E8F0",
//   },
//   inputIcon: {
//     marginRight: 10,
//   },
//   inputField: {
//     flex: 1,
//     fontSize: 16,
//     color: "#1E293B",
//     paddingVertical: 0,
//   },
//   submitButton: {
//     backgroundColor: "#EC4A4D",
//     padding: 15,
//     borderRadius: 12,
//     alignItems: "center",
//     marginTop: 20,
//   },
//   submitText: {
//     color: "white",
//     fontWeight: "600",
//     fontSize: 16,
//   },
//   section: {
//     backgroundColor: "white",
//     borderRadius: 10,
//     padding: 16,
//     marginBottom: 20,
//     borderWidth: 1,
//     borderColor: "#E2E8F0",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.05,
//     shadowRadius: 3,
//     elevation: 1,
//   },
//   sectionHeader: {
//     fontSize: 16,
//     fontWeight: "600",
//     color: "#1E293B",
//     marginBottom: 12,
//   },
//   uploadRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//   },
//   uploadButton: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#eff6ff",
//     paddingVertical: 14,
//     paddingHorizontal: 16,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: "#dbeafe",
//     flex: 1,
//     marginHorizontal: 5,
//     justifyContent: "center",
//   },
//   uploadedButton: {
//     backgroundColor: "#FEF2F2",
//     borderColor: "#EC4A4D",
//   },
//   uploadText: {
//     marginLeft: 8,
//     color: "#EC4A4D",
//     fontWeight: "500",
//     fontSize: 14,
//   },
//   uploadedText: {
//     color: "#EC4A4D",
//     backgroundColor: "#FEF2F2",
//     borderColor: "#EC4A4D",
//   },
//   uploadButtonContainer: {
//     flex: 1,
//     marginHorizontal: 5,
//     position: "relative",
//   },
//   removeButton: {
//     position: "absolute",
//     right: 5,
//     top: 5,
//     backgroundColor: "white",
//     borderRadius: 10,
//     padding: 2,
//   },
//   button: {
//     padding: 15,
//     borderRadius: 8,
//     width: "45%",
//     alignItems: "center",
//   },
//   retakeButton: {
//     backgroundColor: "#EF4444",
//   },
//   confirmButton: {
//     backgroundColor: "#10B981",
//   },
//   buttonText: {
//     color: "white",
//     fontWeight: "600",
//   },
// });

// export default DriverDetailsScreen;

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { getRiderByPhone, updateVehicleRegistration } from "../utils/AuthApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_CONFIG } from "../config/api";

const BASE_URL = API_CONFIG.BASE_URL;

const DriverDetailsScreen = () => {
  const navigation = useNavigation();

  const [drivingSelf, setDrivingSelf] = useState(null);
  const [driverName, setDriverName] = useState("");
  const [driverMobile, setDriverMobile] = useState("");

  const [licenseFront, setLicenseFront] = useState(null);
  const [licenseBack, setLicenseBack] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [currentSetFile, setCurrentSetFile] = useState(null);
  const [imageSource, setImageSource] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [currentUploadType, setCurrentUploadType] = useState("");

  useEffect(() => {
    const fetchFromStorage = async () => {
      console.log("🚀 Initial fetch from storage...");
      
      const phone = await AsyncStorage.getItem("number");
      let name = await AsyncStorage.getItem("name");
      
      // Try alternative keys if name is not found
      if (!name) {
        name = await AsyncStorage.getItem("userName") ||
               await AsyncStorage.getItem("driverName") ||
               await AsyncStorage.getItem("fullName") ||
               await AsyncStorage.getItem("user_name");
      }
      
      console.log("📱 Initial phone:", phone);
      console.log("👤 Initial name:", name);
      
      setDriverName(name || "");
      setDriverMobile(phone || "");
    };
    fetchFromStorage();
  }, []);

  // Load existing driver license images on mount
  useEffect(() => {
    const loadExistingLicenseImages = async () => {
      try {
        console.log("📥 Loading existing driver license images...");
        const response = await getRiderByPhone();
        
        if (response?.data?.data) {
          const rider = response.data.data;
          console.log("✅ Found existing rider data for license images:", rider);
          
          // Load existing license images from backend
          if (rider.images) {
            console.log("📸 Loading existing license images:", rider.images);
            
            // Driving License Front
            if (rider.images.drivingLicenseFront) {
              setLicenseFront({ 
                uri: rider.images.drivingLicenseFront, 
                cloudinaryUrl: rider.images.drivingLicenseFront 
              });
              console.log("✅ Loaded License Front:", rider.images.drivingLicenseFront);
            }
            
            // Driving License Back
            if (rider.images.drivingLicenseBack) {
              setLicenseBack({ 
                uri: rider.images.drivingLicenseBack, 
                cloudinaryUrl: rider.images.drivingLicenseBack 
              });
              console.log("✅ Loaded License Back:", rider.images.drivingLicenseBack);
            }
          }
          
          // Also check if selfDriving status is stored
          if (rider.selfDriving !== undefined) {
            const isSelfDriving = rider.selfDriving === "yes" || rider.selfDriving === true;
            setDrivingSelf(isSelfDriving);
            console.log("✅ Loaded self-driving status:", isSelfDriving);
          }
        } else {
          console.log("ℹ️ No existing license images found, starting fresh");
        }
      } catch (error) {
        console.log("ℹ️ No existing license data to load:", error.message);
        // Don't show error to user, just continue with empty form
      }
    };
    
    loadExistingLicenseImages();
  }, []);

  const removeImage = (type) => {
    switch (type) {
      case "licenseFront":
        setLicenseFront(null);
        break;
      case "licenseBack":
        setLicenseBack(null);
        break;
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

  const handleUpload = (setFile, documentType) => {
    Alert.alert("Upload Option", "Choose an option", [
      { text: "Camera", onPress: () => openCamera(setFile, documentType) },
      { text: "Gallery", onPress: () => pickFromGallery(setFile, documentType) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const pickFromGallery = async (setFile, documentType) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow media access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      const file = result.assets[0];
      try {
        const phoneNumber = await AsyncStorage.getItem("number");
        if (!phoneNumber) {
          Alert.alert("Error", "Phone number not found. Please login again.");
          return;
        }
        
        const uploadedFile = await uploadImageToCloudinary(
          file.uri,
          documentType,
          phoneNumber
        );
        setFile(uploadedFile);
      } catch (error) {
        // Fallback: store local file info if upload fails
        console.log("Upload failed, storing local file info:", error.message);
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
  };

  const openCamera = async (setFile, documentType) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow camera access.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      const file = result.assets[0];
      try {
        const phoneNumber = await AsyncStorage.getItem("number");
        if (!phoneNumber) {
          Alert.alert("Error", "Phone number not found. Please login again.");
          return;
        }
        
        const uploadedFile = await uploadImageToCloudinary(
          file.uri,
          documentType,
          phoneNumber
        );
        setFile(uploadedFile);
      } catch (error) {
        // Fallback: store local file info if upload fails
        console.log("Upload failed, storing local file info:", error.message);
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
  };

  const handleDrivingSelfSelection = async (value) => {
    setDrivingSelf(value);
    if (value === true) {
      console.log("🔍 Fetching driver details from storage...");
      
      // Try multiple possible keys for name
      const phone = await AsyncStorage.getItem("number");
      let name = await AsyncStorage.getItem("name");
      
      // Try alternative keys if name is not found
      if (!name) {
        name = await AsyncStorage.getItem("userName") ||
               await AsyncStorage.getItem("driverName") ||
               await AsyncStorage.getItem("fullName") ||
               await AsyncStorage.getItem("user_name");
      }
      
      console.log("📱 Phone from storage:", phone);
      console.log("👤 Name from storage:", name);
      
      // If name is not found in AsyncStorage, try fetching from server
      if (!name && phone) {
        try {
          console.log("🌐 Name not in storage, fetching from server...");
          console.log("📱 Attempting to fetch rider data for phone:", phone);
          const riderData = await getRiderByPhone();
          console.log("📦 Rider data from server:", JSON.stringify(riderData, null, 2));
          
          // Extract name from server response using multiple possible paths
          const serverName = riderData?.rider?.name || 
                           riderData?.name || 
                           riderData?.fullName ||
                           riderData?.data?.name ||
                           riderData?.data?.rider?.name;
          
          if (serverName) {
            name = serverName;
            console.log("✅ Name found on server:", name);
            // Optionally store it in AsyncStorage for future use
            await AsyncStorage.setItem("name", name);
          } else {
            console.log("⚠️ Name not found in server response either");
          }
        } catch (serverError) {
          console.log("❌ Error fetching data from server:", serverError.message);
          console.log("📱 Phone number being searched:", phone);
          
          if (serverError.response?.status === 404) {
            console.log("⚠️ Rider not found in database - phone number mismatch possible");
            Alert.alert(
              "Registration Issue",
              `Phone number ${phone} not found in database. Please ensure you've completed the registration process with this number, or contact support if this is incorrect.`,
              [
                { 
                  text: "Clear Data & Re-register", 
                  onPress: async () => {
                    try {
                      await AsyncStorage.multiRemove(['number', 'name', 'token']);
                      console.log("🗑️ Cleared AsyncStorage data");
                      // Navigate back to registration or login
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'MobileNumber' }],
                      });
                    } catch (clearError) {
                      console.log("Error clearing storage:", clearError);
                    }
                  }
                },
                { text: "Continue Anyway" }
              ]
            );
          }
        }
      }
      
      // Debug: Show all AsyncStorage keys and values
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        console.log("🔑 All AsyncStorage keys:", allKeys);
        
        // Try to get values for all keys to see what's available
        const allValues = await AsyncStorage.multiGet(allKeys);
        console.log("💾 All stored values:", allValues);
        
        // Look for any phone-related keys
        const phoneKeys = allKeys.filter(key => 
          key.includes('phone') || key.includes('number') || key.includes('mobile')
        );
        console.log("📱 Phone-related keys found:", phoneKeys);
        
        // Check if there are any keys that might contain the correct phone number (7095911484)
        const correctPhone = "7095911484";
        const keysWithCorrectPhone = [];
        for (const [key, value] of allValues) {
          if (value && value.includes && value.includes(correctPhone)) {
            keysWithCorrectPhone.push({ key, value });
          }
        }
        console.log("🎯 Keys containing correct phone number (7095911484):", keysWithCorrectPhone);
        
      } catch (debugError) {
        console.log("Debug error:", debugError);
      }
      
      setDriverName(name || "");
      setDriverMobile(phone || "");
      
      // Show alert if name is still not found after trying all sources
      if (!name && phone) {
        Alert.alert(
          "Name Not Found",
          "Phone number retrieved but name is not available in storage or server. Please enter your name manually.",
          [{ text: "OK" }]
        );
      }
    } else {
      setDriverName("");
      setDriverMobile("");
    }
  };

  const handleSubmit = async () => {
    if (drivingSelf === null) {
      Alert.alert(
        "Error",
        "Please select if you will be driving this vehicle."
      );
      return;
    }

    if (!driverName || !driverMobile) {
      Alert.alert("Error", "Please fill in driver name and mobile number.");
      return;
    }

    if (!licenseFront || !licenseBack) {
      Alert.alert("Error", "Please upload both sides of the license.");
      return;
    }

    try {
      const phoneNumber = await AsyncStorage.getItem("number");
      
      // Since images are already uploaded to Cloudinary, we send the URLs in nested images object
      const payload = {
        phone: phoneNumber,
        driverName,
        driverPhone: driverMobile,
        selfDriving: drivingSelf ? "yes" : "no",
        // Images should be in nested structure for JSON submission
        images: {
          drivingLicenseFront: licenseFront?.cloudinaryUrl || licenseFront?.uri,
          drivingLicenseBack: licenseBack?.cloudinaryUrl || licenseBack?.uri,
        }
      };

      console.log("📋 Submitting driver details:", {
        ...payload,
        hasCloudinaryUrls: {
          licenseFront: !!licenseFront?.cloudinaryUrl,
          licenseBack: !!licenseBack?.cloudinaryUrl
        }
      });

      const res = await axios.put(
        API_CONFIG.getEndpoint('riders/update/rider'),
        payload,
        { headers: { "Content-Type": "application/json" } }
      );
      
      if (res.status === 200 || res.status === 201) {
        // Check if this is a reupload
        const isReuploading = await AsyncStorage.getItem("isReuploading");
        
        // Clear reupload flag if set
        if (isReuploading === "true") {
          await AsyncStorage.removeItem("isReuploading");
          console.log("✅ Driver details reuploaded - returning to My Vehicle");
        }
        
        // Mark registration as complete
        await AsyncStorage.setItem("registrationComplete", "true");
        await AsyncStorage.setItem("registrationStep", "complete");
        await AsyncStorage.setItem("complete", "100");
        
        // Keep payment status if it was already set
        const paymentStatus = await AsyncStorage.getItem("paymentCompleted");
        if (!paymentStatus) {
          // First time completing registration - will need to pay
          console.log("💰 First time registration - payment required");
        } else {
          console.log("💰 Payment status preserved:", paymentStatus);
        }
        
        console.log("✅ Registration completed successfully!");
        const message = isReuploading === "true" 
          ? "Driver details updated successfully. Please wait for admin verification."
          : "Driver details submitted successfully!";
        Alert.alert("Success", message);
        navigation.replace("My Vehicle");
      } else {
        Alert.alert("Error", "Failed to update driver details.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert(
        "Error",
        err.response?.data?.error || "Failed to update driver details."
      );
    }
  };



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
          style={styles.uploadedImagePreview}
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
          <Ionicons name="person" size={32} color="#fff" />
        </View>
        <Text style={styles.attractiveHeaderText}>Driver Details</Text>
        <Text style={styles.attractiveHeaderSubText}>
          Enter driver information to get started
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.attractiveScrollContent}>
        <View style={styles.cardSection}>
          <Text style={styles.question}>I will be driving this vehicle</Text>
          <View style={styles.checkboxRow}>
            <TouchableOpacity
              style={[styles.checkbox, drivingSelf === true && styles.checked]}
              onPress={() => handleDrivingSelfSelection(true)}
            >
              <Text style={styles.checkboxText}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.checkbox, drivingSelf === false && styles.checked]}
              onPress={() => handleDrivingSelfSelection(false)}
            >
              <Text style={styles.checkboxText}>No</Text>
            </TouchableOpacity>
          </View>
        </View>

        {drivingSelf !== null && (
          <>
            <View style={styles.cardSection}>
              <Text style={styles.inputLabel}>Driver Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#EC4A4D"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.inputField}
                  placeholder="Enter driver name"
                  placeholderTextColor="#94a3b8"
                  value={driverName}
                  onChangeText={setDriverName}
                  editable={drivingSelf === false}
                />
              </View>
            </View>

            <View style={styles.cardSection}>
              <Text style={styles.inputLabel}>Mobile Number</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="call-outline"
                  size={20}
                  color="#EC4A4D"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.inputField}
                  placeholder="Enter mobile number"
                  placeholderTextColor="#94a3b8"
                  value={driverMobile}
                  onChangeText={setDriverMobile}
                  editable={drivingSelf === false}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Driving License</Text>
          <View style={styles.uploadRow}>
            <DocumentButton
              type="licenseFront"
              icon="camera"
              label="Upload Front"
              uploaded={!!licenseFront}
              image={licenseFront}
              onPress={() => handleUpload(setLicenseFront, "drivingLicenseFront")}
            />
            <DocumentButton
              type="licenseBack"
              icon="camera"
              label="Upload Back"
              uploaded={!!licenseBack}
              image={licenseBack}
              onPress={() => handleUpload(setLicenseBack, "drivingLicenseBack")}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitText}>Submit</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  attractiveContainer: { flex: 1, backgroundColor: "#f1f5f9" },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  uploadingBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minWidth: 200,
  },
  uploadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '600',
  },
  attractiveHeader: {
    backgroundColor: "#EC4D4A",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: 40,
    paddingBottom: 24,
    alignItems: "center",
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
    fontFamily: "PoppinsBold",
  },
  attractiveHeaderSubText: {
    color: "#FFE5E5",
    fontSize: 14,
    fontFamily: "PoppinsRegular",
  },
  attractiveScrollContent: { padding: 18, paddingBottom: 120 },
  cardSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    elevation: 2,
  },
  question: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  checkboxRow: { flexDirection: "row", justifyContent: "space-between" },
  checkbox: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  checked: { backgroundColor: "#FEF2F2", borderColor: "#EC4A4D" },
  checkboxText: { fontSize: 16, color: "#1f2937" },
  inputLabel: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    fontFamily: "PoppinsBold",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontFamily: "PoppinsRegular",
  },
  inputIcon: { marginRight: 5 },
  inputField: { flex: 1, fontSize: 16, color: "#1E293B" },
  section: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionHeader: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  uploadRow: { flexDirection: "row", justifyContent: "space-between" },
  uploadButtonContainer: { flex: 1, marginHorizontal: 5, position: "relative" },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dbeafe",
    flex: 1,
    marginHorizontal: 5,
    justifyContent: "center",
  },
  uploadText: { marginLeft: 8, color: "#EC4A4D", fontWeight: "500" },
  uploadedImagePreview: {
    width: "100%",
    height: 80,
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  uploadedButton: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981",
    borderWidth: 1,
  },
  uploadedText: {
    color: "#10B981",
    fontWeight: "600",
  },
  removeButton: {
    position: "absolute",
    right: 4,
    top: 4,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 2,
  },
  submitButton: {
    backgroundColor: "#EC4A4D",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  submitText: { color: "white", fontWeight: "600", fontSize: 16 },
});

export default DriverDetailsScreen;
