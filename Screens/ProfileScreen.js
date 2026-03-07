import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  SafeAreaView,
} from "react-native";
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getRiderByPhone } from "../utils/AuthApi";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import HeaderWithBackButton from "../components/HeaderWithBackButton";
import { API_CONFIG } from '../config/api';

const { width, height } = Dimensions.get("window");
// const API_BASE_URL = "https://ridodrop-backend-24-10-2025.onrender.com";
const API_BASE_URL = API_CONFIG.BASE_URL;

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const navigation = useNavigation();
  
  // Track component mount status
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      console.log("🧹 ProfileScreen cleanup: component unmounted");
    };
  }, []);

  // Helper function to construct full image URL - Only accept Cloudinary URLs
  const getFullImageUrl = (imagePath) => {
    if (!imagePath) return null;

    // Only return if it's a valid Cloudinary URL
    if (imagePath.startsWith("http")) {
      return imagePath;
    }

    // Don't return local paths - they won't work
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

  // Open camera for document upload
  const openCamera = async (fieldName, label) => {
    try {
      if (!isMountedRef.current) return;
      
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Ridodrop Partner needs camera access to capture documents. Please enable permission in settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
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
      
      if (!isMountedRef.current) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
      
      if (!isMountedRef.current) return;

      if (!result.canceled && result.assets[0]) {
        await uploadDocument(fieldName, result.assets[0].uri, label);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  // Pick from gallery for document upload
  const pickFromGallery = async (fieldName, label) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to upload documents.');
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

  // Upload document to backend
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

      console.log('📤 Uploading document:', { fieldName, phone, label });

      const response = await fetch(`${API_BASE_URL}/api/v1/riders/upload-rider-document`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = await response.json();
      console.log('📥 Upload response:', data);

      if (response.ok && data.success) {
        Alert.alert('Success', `${label} uploaded successfully and pending admin verification.`);
        await fetchRider();
      } else {
        Alert.alert('Error', data.message || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      Alert.alert('Error', 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const fetchRider = useCallback(async () => {
    try {
      setLoading(true);
      console.log("🔍 Starting to fetch rider profile...");
      
      const response = await getRiderByPhone();
      console.log("📱 Raw API Response:", JSON.stringify(response, null, 2));

      // Handle the API response format: {success: true, data: userData}
      const data = response.data || response.rider || response;
      console.log("📊 Processed data:", JSON.stringify(data, null, 2));

      setUser(data);
      setError(null);

      // Debug: Log document approvals
      console.log("Profile data loaded:", {
        name: data?.name,
        phone: data?.phone,
        documentApprovals: data?.documentApprovals,
        documentRejectionReasons: data?.documentRejectionReasons,
      });
    } catch (err) {
      console.error("❌ Profile fetch error:", err);
      console.error("❌ Error details:", err.response?.data);
      setError(`Failed to load profile: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchRider();
    }, [fetchRider])
  );

  const handleImagePress = (imageUri, title) => {
    const fullImageUrl = getFullImageUrl(imageUri);
    if (fullImageUrl) {
      setSelectedImage({ uri: fullImageUrl, title });
      setImageModalVisible(true);
    } else {
      Alert.alert(
        "Document Not Available",
        "This document has not been uploaded yet."
      );
    }
  };

  const handleEdit = (field) => {
    Alert.alert("Edit", `Edit ${field} not implemented in demo.`);
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: () => console.log("Logged out") },
    ]);
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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4c669f" />
      </View>
    );
  }
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>{error}</Text>
      </View>
    );
  }
  if (!user) {
    return null;
  }

  return (
    <View style={styles.safeArea}>
      <HeaderWithBackButton title="Profile" />
      <ScrollView style={styles.container}>
        {/* Compact Profile Header */}
        <View style={styles.compactHeader}>
          <TouchableOpacity
            onPress={() =>
              handleImagePress(user.images?.profilePhoto, "Profile Photo")
            }
            style={styles.compactAvatarContainer}
          >
            <Image
              source={{
                uri:
                  getFullImageUrl(user.images?.profilePhoto) ||
                  "https://i.pravatar.cc/100?img=12",
              }}
              style={styles.compactAvatar}
            />
            <View style={styles.compactAvatarBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            </View>
          </TouchableOpacity>
          
          <View style={styles.compactProfileInfo}>
            <Text style={styles.compactName}>{user.name || user.driverName || "N/A"}</Text>
            <Text style={styles.compactPhone}>{user.phone || "N/A"}</Text>
            <View style={styles.compactVehicleBadge}>
              <Ionicons name="car-sport" size={12} color="#EC4D4A" />
              <Text style={styles.compactVehicleText}>{user.vehicleType || "Vehicle"}</Text>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="wallet" size={24} color="#EC4D4A" />
            </View>
            <Text style={styles.statValue}>₹{user.walletBalance != null ? user.walletBalance : "0"}</Text>
            <Text style={styles.statLabel}>Wallet Balance</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="shield-checkmark" size={24} color="#EC4D4A" />
            </View>
            <Text style={styles.statValue}>Verified</Text>
            <Text style={styles.statLabel}>Account Status</Text>
          </View>
        </View>

      {/* Basic Info - Minimalistic */}
      <View style={styles.infoGrid}>
        <View style={styles.infoCard}>
          <Ionicons name="mail-outline" size={20} color="#EC4D4A" />
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{user.email || "Not provided"}</Text>
        </View>
        <View style={styles.infoCard}>
          <Ionicons name="location-outline" size={20} color="#EC4D4A" />
          <Text style={styles.infoLabel}>City</Text>
          <Text style={styles.infoValue}>{user.selectCity || "N/A"}</Text>
        </View>
      </View>

      {/* Vehicle Info - Minimalistic */}
      <View style={styles.vehicleCard}>
        <View style={styles.vehicleHeader}>
          <Ionicons name="car-sport" size={24} color="#EC4D4A" />
          <Text style={styles.vehicleTitle}>Vehicle Details</Text>
        </View>
        <View style={styles.vehicleDetails}>
          <View style={styles.vehicleRow}>
            <Text style={styles.vehicleLabel}>Type</Text>
            <Text style={styles.vehicleValue}>{user.vehicleType || "N/A"}</Text>
          </View>
          <View style={styles.vehicleRow}>
            <Text style={styles.vehicleLabel}>Number</Text>
            <Text style={styles.vehicleValue}>{user.vehicleregisterNumber || "N/A"}</Text>
          </View>
          <View style={styles.vehicleRow}>
            <Text style={styles.vehicleLabel}>Fuel</Text>
            <Text style={styles.vehicleValue}>{user.fueltype || "Petrol"}</Text>
          </View>
        </View>
      </View>

      {/* Documents Section - Consolidated */}
      <TouchableOpacity 
        style={styles.docsCard}
        onPress={() => navigation.navigate('DocumentsScreen', { user })}
        activeOpacity={0.7}
      >
        <View style={styles.docsHeader}>
          <View style={styles.docsLeft}>
            <View style={styles.docsIconContainer}>
              <Ionicons name="documents" size={24} color="#EC4D4A" />
            </View>
            <View>
              <Text style={styles.docsTitle}>Documents</Text>
              <Text style={styles.docsSubtitle}>View & manage all documents</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
        </View>
        
        {/* Document Status Summary */}
        <View style={styles.docsSummary}>
          <View style={styles.summaryItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.summaryText}>
              {Object.values(user.documentApprovals || {}).filter(s => s === 'approved').length} Approved
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="time" size={16} color="#F59E0B" />
            <Text style={styles.summaryText}>
              {Object.values(user.documentApprovals || {}).filter(s => s === 'pending').length} Pending
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="close-circle" size={16} color="#EF4444" />
            <Text style={styles.summaryText}>
              {Object.values(user.documentApprovals || {}).filter(s => s === 'rejected').length} Rejected
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {renderImageModal()}

      {/* Upload Loading Overlay */}
      {uploading && (
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadCard}>
            <ActivityIndicator size="large" color="#EC4D4A" />
            <Text style={styles.uploadText}>Uploading document...</Text>
          </View>
        </View>
      )}
      </ScrollView>
    </View>
  );
}

const Section = ({ title, children, onEdit, icon }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleContainer}>
        {icon && (
          <View style={styles.sectionIconContainer}>
            <Ionicons name={icon} size={20} color="#EC4D4A" />
          </View>
        )}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {onEdit && (
        <TouchableOpacity onPress={onEdit} style={styles.editButton}>
          <Ionicons name="create-outline" size={18} color="#EC4D4A" />
        </TouchableOpacity>
      )}
    </View>
    {children}
  </View>
);

const Item = ({ label, value }) => (
  <View style={styles.item}>
    <Text style={styles.label}>{label}:</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

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
          text: "Pending Review",
          textColor: "#F59E0B"
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <View style={styles.documentItemWrapper}>
      <TouchableOpacity style={styles.documentItem} onPress={onPress}>
        <View style={styles.documentLeft}>
          <View style={[styles.documentIconContainer, { backgroundColor: statusConfig.bgColor }]}>
            <Ionicons name={imageUri ? "document-text" : "document-outline"} size={18} color={statusConfig.iconColor} />
          </View>
          <View style={styles.documentInfo}>
            <Text style={styles.documentLabel}>{label}</Text>
            {rejectionReason && (
              <Text style={styles.rejectionReason} numberOfLines={1}>⚠️ {rejectionReason}</Text>
            )}
          </View>
        </View>
        <View style={styles.documentRight}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <Ionicons name={statusConfig.iconName} size={14} color={statusConfig.iconColor} />
            <Text style={[styles.statusText, { color: statusConfig.textColor }]}>
              {statusConfig.text}
            </Text>
          </View>
          {imageUri && <Ionicons name="eye" size={16} color="#EC4D4A" style={styles.viewIcon} />}
        </View>
      </TouchableOpacity>
      {status === 'rejected' && (
        <TouchableOpacity 
          style={styles.reuploadButton}
          onPress={() => onReupload(fieldName, label)}
        >
          <Ionicons name="cloud-upload" size={16} color="#fff" />
          <Text style={styles.reuploadButtonText}>Re-upload Document</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  // Compact Header Design
  compactHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 15,
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  compactAvatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  compactAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: "#EC4D4A",
  },
  compactAvatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  compactProfileInfo: {
    flex: 1,
  },
  compactName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  compactPhone: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  compactVehicleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
    gap: 6,
  },
  compactVehicleText: {
    color: "#EC4D4A",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  header: {
    alignItems: "center",
    paddingVertical: 30,
    paddingTop: 20,
    marginBottom: 15,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  avatarBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 2,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  phone: {
    fontSize: 15,
    color: "#E0F2FE",
    marginBottom: 10,
  },
  vehicleTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  vehicleTypeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    marginBottom: 15,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  // Info Grid - Minimalistic
  infoGrid: {
    flexDirection: "row",
    paddingHorizontal: 15,
    marginBottom: 15,
    gap: 10,
  },
  infoCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  infoLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "600",
    textAlign: "center",
  },
  // Vehicle Card - Minimalistic
  vehicleCard: {
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 18,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  vehicleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  vehicleTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1F2937",
  },
  vehicleDetails: {
    gap: 12,
  },
  vehicleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  vehicleLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  vehicleValue: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "600",
  },
  // Documents Card - Minimalistic & Clickable
  docsCard: {
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 18,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  docsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  docsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  docsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  docsTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
  },
  docsSubtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  docsSummary: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryText: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "500",
  },
  section: {
    backgroundColor: "#fff",
    padding: 18,
    marginBottom: 12,
    borderRadius: 16,
    marginHorizontal: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1F2937",
  },
  editButton: {
    padding: 6,
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
  },
  label: {
    fontWeight: "600",
    color: "#4B5563",
    fontSize: 14,
  },
  value: {
    color: "#1F2937",
    fontSize: 14,
    fontWeight: "500",
  },
  documentItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  documentItemWrapper: {
    marginBottom: 8,
  },
  documentLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  documentInfo: {
    flex: 1,
  },
  documentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  documentLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  rejectionReason: {
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  reuploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EC4D4A",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 8,
    gap: 8,
    shadowColor: "#EC4D4A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  reuploadButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  viewIcon: {
    marginLeft: 4,
  },
  documentStatus: {
    alignItems: "flex-end",
  },
  viewText: {
    fontSize: 12,
    color: "#EC4D4A",
    fontStyle: "italic",
    marginTop: 2,
  },
  logoutWrapper: {
    alignItems: "center",
    marginVertical: 25,
    marginBottom: 35,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutText: {
    fontSize: 16,
    color: "#DC2626",
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
    backgroundColor: "#007bff",
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
  backBtn: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 10,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
});
