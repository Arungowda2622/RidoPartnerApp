import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Dimensions,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import * as ImagePicker from 'expo-image-picker';
import Ionicons from "react-native-vector-icons/Ionicons";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import HeaderWithBackButton from "../components/HeaderWithBackButton";
import { getRiderByPhone } from "../utils/AuthApi";
import { API_CONFIG } from '../config/api';

const { width, height } = Dimensions.get("window");
const API_BASE_URL = API_CONFIG.BASE_URL;

export default function DocumentsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const initialUser = route.params?.user;
  
  const [user, setUser] = useState(initialUser);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch latest rider data from backend
  const refreshUserData = async () => {
    try {
      setRefreshing(true);
      console.log("🔄 Refreshing rider data in DocumentsScreen...");
      
      const response = await getRiderByPhone();
      const data = response.data || response.rider || response;
      
      setUser(data);
      console.log("✅ Rider data refreshed successfully");
    } catch (error) {
      console.error("❌ Error refreshing rider data:", error);
      Alert.alert("Error", "Failed to refresh document status. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshUserData();
    }, [])
  );

  // Handle Android hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );

    return () => backHandler.remove();
  }, [user]); // Re-run when user data changes

  // Check if there are any rejected documents
  const hasRejectedDocuments = () => {
    if (!user?.documentApprovals) return false;
    
    const docFields = [
      'FrontaadharCard', 'BackaadharCard', 'panCard', 'profilePhoto',
      'vehicleRcFront', 'vehicleRcBack', 'drivingLicenseFront', 'drivingLicenseBack',
      'vehicleimageFront', 'vehicleimageBack', 'vehicleInsurence'
    ];
    
    return docFields.some(field => user.documentApprovals[field] === 'rejected');
  };

  // Count rejected documents
  const getRejectedCount = () => {
    if (!user?.documentApprovals) return 0;
    
    const docFields = [
      'FrontaadharCard', 'BackaadharCard', 'panCard', 'profilePhoto',
      'vehicleRcFront', 'vehicleRcBack', 'drivingLicenseFront', 'drivingLicenseBack',
      'vehicleimageFront', 'vehicleimageBack', 'vehicleInsurence'
    ];
    
    return docFields.filter(field => user.documentApprovals[field] === 'rejected').length;
  };

  // Custom back button handler - block if rejected documents exist
  const handleBackPress = () => {
    if (hasRejectedDocuments()) {
      Alert.alert(
        "Upload Required",
        "You have rejected documents. Please reupload all rejected documents before going back.",
        [{ text: "OK" }]
      );
      return true; // Prevent default back action
    }
    navigation.goBack();
    return true;
  };

  // Helper function to construct full image URL
  const getFullImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) {
      return imagePath;
    }
    console.warn('⚠️ Non-Cloudinary image path detected:', imagePath);
    return null;
  };

  // Get document approval status
  const getDocumentStatus = (fieldName) => {
    if (!user?.documentApprovals) return 'pending';
    const status = user.documentApprovals[fieldName];
    return status || 'pending';
  };

  // Get rejection reason
  const getRejectionReason = (fieldName) => {
    if (!user?.documentRejectionReasons) return null;
    return user.documentRejectionReasons[fieldName];
  };

  // Handle document re-upload
  const handleReupload = async (fieldName, label) => {
    Alert.alert('Upload Option', 'Choose an option', [
      { 
        text: 'Camera', 
        onPress: () => openCamera(fieldName, label) 
      },
      { 
        text: 'Gallery', 
        onPress: () => pickFromGallery(fieldName, label) 
      },
      { 
        text: 'Cancel', 
        style: 'cancel' 
      },
    ]);
  };

  // Open camera
  const openCamera = async (fieldName, label) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera permissions.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadDocument(fieldName, result.assets[0].uri, label);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  // Pick from gallery
  const pickFromGallery = async (fieldName, label) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need gallery permissions.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadDocument(fieldName, result.assets[0].uri, label);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  // Upload document
  const uploadDocument = async (fieldName, uri, label) => {
    try {
      setUploading(true);

      const formData = new FormData();
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('image', {
        uri,
        name: filename,
        type,
      });

      const phone = await AsyncStorage.getItem('number');
      if (!phone) {
        Alert.alert('Error', 'Phone number not found. Please login again.');
        setUploading(false);
        return;
      }

      formData.append('phone', phone);
      formData.append('documentType', fieldName);

      const response = await fetch(`${API_BASE_URL}/api/v1/riders/upload-rider-document`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        console.log("✅ Document uploaded successfully, refreshing data...");
        // Refresh data to show updated status
        await refreshUserData();
        
        // Check if there are still rejected documents
        const stillHasRejected = hasRejectedDocuments();
        
        if (stillHasRejected) {
          Alert.alert(
            'Success', 
            `${label} uploaded successfully! Please upload remaining rejected documents.`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Success', 
            `${label} uploaded successfully! All rejected documents have been reuploaded. You can now go back.`,
            [
              { 
                text: 'Go Back to My Vehicle', 
                onPress: () => navigation.goBack()
              },
              {
                text: 'Stay Here',
                style: 'cancel'
              }
            ]
          );
        }
      } else {
        Alert.alert('Error', data.message || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleImagePress = (imageUri, title) => {
    const fullImageUrl = getFullImageUrl(imageUri);
    if (fullImageUrl) {
      setSelectedImage({ uri: fullImageUrl, title });
      setImageModalVisible(true);
    } else {
      Alert.alert("Document Not Available", "This document has not been uploaded yet.");
    }
  };

  const renderImageModal = () => (
    <Modal
      visible={imageModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setImageModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <TouchableOpacity
          style={styles.modalBackground}
          onPress={() => setImageModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedImage?.title}</Text>
            <Image
              source={{ uri: selectedImage?.uri }}
              style={styles.modalImage}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setImageModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    </Modal>
  );

  const documents = [
    {
      category: "Personal Documents",
      icon: "person",
      items: [
        { label: "Aadhaar Front", fieldName: "FrontaadharCard", imageUri: user.images?.FrontaadharCard },
        { label: "Aadhaar Back", fieldName: "BackaadharCard", imageUri: user.images?.BackaadharCard },
        { label: "PAN Card", fieldName: "panCard", imageUri: user.images?.panCard },
      ]
    },
    {
      category: "License Documents",
      icon: "card",
      items: [
        { label: "Driving License Front", fieldName: "drivingLicenseFront", imageUri: user.images?.drivingLicenseFront },
        { label: "Driving License Back", fieldName: "drivingLicenseBack", imageUri: user.images?.drivingLicenseBack },
      ]
    },
    {
      category: "Vehicle Documents",
      icon: "car",
      items: [
        { label: "RC Front", fieldName: "vehicleRcFront", imageUri: user.images?.vehicleRcFront },
        { label: "RC Back", fieldName: "vehicleRcBack", imageUri: user.images?.vehicleRcBack },
        { label: "Insurance", fieldName: "vehicleInsurence", imageUri: user.images?.vehicleInsurence },
        { label: "Vehicle Front Photo", fieldName: "vehicleimageFront", imageUri: user.images?.vehicleimageFront },
        { label: "Vehicle Back Photo", fieldName: "vehicleimageBack", imageUri: user.images?.vehicleimageBack },
      ]
    },
  ];

  return (
    <View style={styles.container}>
      <HeaderWithBackButton 
        title="Documents" 
        onBackPress={handleBackPress}
      />
      {refreshing && (
        <View style={styles.refreshingBanner}>
          <ActivityIndicator size="small" color="#EC4D4A" />
          <Text style={styles.refreshingText}>Refreshing document status...</Text>
        </View>
      )}
      
      {/* Show rejected documents count alert */}
      {hasRejectedDocuments() && (
        <View style={styles.rejectedAlert}>
          <Ionicons name="alert-circle" size={24} color="#EF4444" />
          <View style={styles.rejectedAlertContent}>
            <Text style={styles.rejectedAlertTitle}>
              {getRejectedCount()} Document{getRejectedCount() > 1 ? 's' : ''} Rejected
            </Text>
            <Text style={styles.rejectedAlertMessage}>
              Please reupload all rejected documents to continue
            </Text>
          </View>
        </View>
      )}
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {documents.map((section, index) => (
          <View key={index} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name={section.icon} size={20} color="#EC4D4A" />
              <Text style={styles.sectionTitle}>{section.category}</Text>
            </View>
            {section.items.map((doc, docIndex) => (
              <DocumentItem
                key={docIndex}
                label={doc.label}
                imageUri={doc.imageUri}
                status={getDocumentStatus(doc.fieldName)}
                rejectionReason={getRejectionReason(doc.fieldName)}
                fieldName={doc.fieldName}
                onPress={() => handleImagePress(doc.imageUri, doc.label)}
                onReupload={handleReupload}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      {renderImageModal()}

      {uploading && (
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadCard}>
            <ActivityIndicator size="large" color="#EC4D4A" />
            <Text style={styles.uploadText}>Uploading document...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const DocumentItem = ({ label, imageUri, onPress, status, rejectionReason, fieldName, onReupload }) => {
  const getStatusConfig = () => {
    if (!imageUri) {
      return {
        bgColor: "#FEE2E2",
        iconName: "close-circle",
        iconColor: "#EF4444",
        text: "Not Uploaded",
        textColor: "#EF4444"
      };
    }
    
    switch(status) {
      case 'approved':
        return {
          bgColor: "#D1FAE5",
          iconName: "checkmark-circle",
          iconColor: "#10B981",
          text: "Approved",
          textColor: "#10B981"
        };
      case 'rejected':
        return {
          bgColor: "#FEE2E2",
          iconName: "close-circle",
          iconColor: "#EF4444",
          text: "Rejected",
          textColor: "#EF4444"
        };
      case 'pending':
      default:
        return {
          bgColor: "#FEF3C7",
          iconName: "time",
          iconColor: "#F59E0B",
          text: "Pending",
          textColor: "#F59E0B"
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <View style={styles.documentWrapper}>
      <TouchableOpacity 
        style={styles.documentItem} 
        onPress={onPress}
        disabled={!imageUri}
      >
        <View style={styles.documentLeft}>
          <View style={[styles.documentIcon, { backgroundColor: statusConfig.bgColor }]}>
            <Ionicons 
              name={imageUri ? "document-text" : "document-outline"} 
              size={20} 
              color={statusConfig.iconColor} 
            />
          </View>
          <View style={styles.documentInfo}>
            <Text style={styles.documentLabel}>{label}</Text>
            {rejectionReason && (
              <Text style={styles.rejectionText} numberOfLines={1}>
                ⚠️ {rejectionReason}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.documentRight}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <Ionicons name={statusConfig.iconName} size={12} color={statusConfig.iconColor} />
            <Text style={[styles.statusText, { color: statusConfig.textColor }]}>
              {statusConfig.text}
            </Text>
          </View>
          {imageUri && <Ionicons name="eye" size={18} color="#EC4D4A" />}
        </View>
      </TouchableOpacity>
      {(status === 'rejected' || !imageUri) && (
        <TouchableOpacity 
          style={styles.uploadButton}
          onPress={() => onReupload(fieldName, label)}
        >
          <Ionicons name="cloud-upload" size={16} color="#fff" />
          <Text style={styles.uploadButtonText}>
            {imageUri ? 'Re-upload' : 'Upload'} Document
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  refreshingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  refreshingText: {
    fontSize: 12,
    color: "#EC4D4A",
    fontWeight: "600",
  },
  rejectedAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 5,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444",
    gap: 12,
  },
  rejectedAlertContent: {
    flex: 1,
  },
  rejectedAlertTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#EF4444",
    marginBottom: 4,
  },
  rejectedAlertMessage: {
    fontSize: 13,
    color: "#991B1B",
    lineHeight: 18,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginVertical: 8,
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  documentWrapper: {
    marginBottom: 12,
  },
  documentItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  documentLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  documentInfo: {
    flex: 1,
  },
  documentLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  rejectionText: {
    fontSize: 11,
    color: "#EF4444",
    marginTop: 2,
    fontStyle: "italic",
  },
  documentRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EC4D4A",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 8,
    gap: 8,
  },
  uploadButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackground: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    margin: 20,
    maxWidth: width * 0.9,
    maxHeight: height * 0.8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
    color: "#333",
  },
  modalImage: {
    width: width * 0.8,
    height: height * 0.6,
    borderRadius: 10,
  },
  closeButton: {
    backgroundColor: "#EC4D4A",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignSelf: "center",
    marginTop: 15,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  uploadOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  uploadCard: {
    backgroundColor: "#fff",
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
    gap: 15,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
});
