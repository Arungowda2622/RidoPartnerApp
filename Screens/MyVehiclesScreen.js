import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getRiderByPhone } from "../utils/AuthApi";
import { SafeAreaView } from "react-native-safe-area-context";

const MyVehiclesScreen = () => {
  const navigation = useNavigation();

  const [driverName, setDriverName] = useState("");
  const [driverMobile, setDriverMobile] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [loading, setLoading] = useState(true);
  const [riderData, setRiderData] = useState(null);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Helper function to get document verification status
  const getDocumentStatus = (rider) => {
    if (!rider) return 'Pending';
    
    // Check if all documents are uploaded
    const allDocsUploaded = 
      rider.images?.FrontaadharCard &&
      rider.images?.BackaadharCard &&
      rider.images?.panCard &&
      rider.images?.profilePhoto &&
      rider.images?.vehicleRcFront &&
      rider.images?.vehicleRcBack &&
      rider.images?.drivingLicenseFront &&
      rider.images?.drivingLicenseBack;
    
    if (!allDocsUploaded) return 'Pending';
    
    // Check individual document approvals if available
    if (rider.documentApprovals) {
      // Required documents that must be approved
      const requiredDocFields = [
        'FrontaadharCard', 'BackaadharCard', 'panCard', 'profilePhoto',
        'vehicleRcFront', 'vehicleRcBack', 'drivingLicenseFront', 'drivingLicenseBack'
      ];
      
      // Optional documents (may or may not be present)
      const optionalDocFields = ['vehicleimageFront', 'vehicleimageBack', 'vehicleInsurence'];
      
      let hasRejected = false;
      let hasPending = false;
      let requiredApprovedCount = 0;
      
      // Check all documents (required + optional)
      [...requiredDocFields, ...optionalDocFields].forEach(field => {
        const status = rider.documentApprovals[field];
        if (status === 'rejected') hasRejected = true;
        else if (status === 'pending') hasPending = true;
        else if (status === 'approved' && requiredDocFields.includes(field)) {
          requiredApprovedCount++;
        }
      });
      
      // If any document is rejected, show as Rejected
      if (hasRejected) return 'Rejected';
      // If any document is pending (including reuploaded docs), show as Pending
      if (hasPending) return 'Pending';
      // If all REQUIRED documents are approved, show as Approved
      if (requiredApprovedCount === requiredDocFields.length) return 'Approved';
    }
    
    // Fallback to backend documentStatus
    return rider.documentStatus || 'Pending';
  };

  const handleSubmit = () => {
    // Check if payment is completed
    if (paymentCompleted) {
      Alert.alert(
        "Payment Already Completed",
        "Your registration fee has been paid. Please wait for document verification to complete.",
        [{ text: "OK" }]
      );
      return;
    }
    navigation.replace("Driver Checkout");
  };

  const fetchRiderData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Log what phone number we're using
      const storedPhone = await AsyncStorage.getItem("number");
      const storedName = await AsyncStorage.getItem("name");
      const registrationComplete = await AsyncStorage.getItem("registrationComplete");
      const registrationStep = await AsyncStorage.getItem("registrationStep");
      
      console.log("📱 Stored data in AsyncStorage:", {
        phone: storedPhone,
        name: storedName,
        registrationComplete,
        registrationStep
      });
      
      // Check if phone number exists
      if (!storedPhone) {
        throw new Error("Phone number not found. Please login again.");
      }
      
      const response = await getRiderByPhone();
      
      // Handle backend response format: {success: true, data: rider}
      const rider = response.data || response.rider || response;
      
      if (rider) {
        setRiderData(rider);
        
        // Set driver name - prioritize name, fallback to driverName
        const displayName = rider.name || rider.driverName || "Not Set";
        setDriverName(displayName);
        
        // Set driver mobile - prioritize phone, fallback to driverPhone
        const displayPhone = rider.phone || rider.driverPhone || "Not Set";
        setDriverMobile(displayPhone);
        
        // Set vehicle details
        setVehicleNumber(rider.vehicleregisterNumber || "Not Registered");
        setVehicleType(rider.vehicleType || "Not Set");
        
        console.log("✅ Rider data loaded successfully:", {
          name: displayName,
          phone: displayPhone,
          vehicleNumber: rider.vehicleregisterNumber,
          vehicleType: rider.vehicleType,
          documentStatus: rider.documentStatus,
          documentApprovals: rider.documentApprovals
        });
        
        // Check and navigate immediately after fetching data
        const navigated = await checkAndNavigateIfApproved(rider);
        if (navigated) {
          return; // Exit early if navigating
        }
      } else {
        throw new Error("No rider data found in response");
      }
    } catch (error) {
      console.error("❌ Error fetching rider data:", error);
      console.error("❌ Error response:", error.response?.data);
      
      const storedPhone = await AsyncStorage.getItem("number");
      const errorMessage = error.response?.data?.message || error.message;
      
      // If rider not found, it means registration was not completed
      if (error.response?.status === 404 || errorMessage?.includes("Rider not found")) {
        Alert.alert(
          "Registration Incomplete", 
          `No rider account found for phone: ${storedPhone}\n\nIt seems your registration was not completed. Please complete the registration process.`,
          [
            { 
              text: "Complete Registration", 
              onPress: () => navigation.replace("DriverRegister")
            },
            { 
              text: "Logout", 
              onPress: async () => {
                await AsyncStorage.clear();
                navigation.replace("MobileNumber");
              }
            }
          ]
        );
      } else {
        Alert.alert(
          "Data Loading Error", 
          `Could not load rider information.\n\nPhone: ${storedPhone}\nError: ${errorMessage}`,
          [{ text: "OK" }]
        );
      }
      
      // Fallback to AsyncStorage data
      const phone = await AsyncStorage.getItem("number");
      const name = await AsyncStorage.getItem("name");
      setDriverName(name || "Not Set");
      setDriverMobile(phone || "Not Set");
      setVehicleNumber("Not Registered");
      setVehicleType("Not Set");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Check payment completion status
  const checkPaymentStatus = async () => {
    const paymentStatus = await AsyncStorage.getItem("paymentCompleted");
    setPaymentCompleted(paymentStatus === "true");
    return paymentStatus === "true";
  };

  // Auto-navigate to Home when documents are approved
  const checkAndNavigateIfApproved = async (rider) => {
    // Use the passed rider data instead of state to avoid timing issues
    const docStatus = getDocumentStatus(rider || riderData);
    const isPaid = await checkPaymentStatus();
    
    console.log("🔍 Checking navigation conditions:", {
      isPaid,
      docStatus,
      allDocsUploaded: rider?.images?.FrontaadharCard && rider?.images?.BackaadharCard && 
                       rider?.images?.panCard && rider?.images?.profilePhoto &&
                       rider?.images?.vehicleRcFront && rider?.images?.vehicleRcBack &&
                       rider?.images?.drivingLicenseFront && rider?.images?.drivingLicenseBack
    });
    
    if (isPaid && docStatus === 'Approved') {
      console.log("✅ Documents approved! Navigating to Home...");
      // Clear payment flag
      await AsyncStorage.setItem("paymentCompleted", "false");
      // Navigate directly to Home without popup
      navigation.replace("Home");
      return true;
    }
    return false;
  };

  // Handle manual refresh
  const handleRefresh = async () => {
    console.log("🔄 Manual refresh triggered");
    await fetchRiderData(true);
    // Check with a small delay to ensure state is updated
    setTimeout(async () => {
      await checkAndNavigateIfApproved(riderData);
    }, 300);
  };

  // Handle document reupload - Navigate to DocumentsScreen
  const handleReupload = () => {
    console.log("📤 Redirecting to Documents page for reupload");
    // Navigate to DocumentsScreen where partner can see all docs and reupload rejected ones
    navigation.navigate("DocumentsScreen", { user: riderData });
  };

  useEffect(() => {
    fetchRiderData();
    checkPaymentStatus();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const refreshOnFocus = async () => {
        console.log("📱 MyVehiclesScreen focused - refreshing data");
        await fetchRiderData();
        // fetchRiderData now handles navigation check internally
      };
      
      refreshOnFocus();
    }, [])
  );

  // Show loading spinner while fetching data
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EC4D4A" />
          <Text style={styles.loadingText}>Loading vehicle information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="car-sport" size={28} color="#fff" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>My Vehicles</Text>
            <Text style={styles.headerSubtitle}>
              Manage your registered vehicles
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={fetchRiderData}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Alert Banner */}
        <View style={styles.alertBanner}>
          <Ionicons name="alert-circle" size={24} color="#fff" />
          <View style={styles.alertTextContainer}>
            <Text style={styles.alertText}>
              After paying joining fees,{" "}
              <Text style={styles.boldText}>document verification</Text> might
              take up to <Text style={styles.boldText}>2 DAYS!</Text>
            </Text>
          </View>
        </View>

        {/* Vehicle Card */}
        <View style={styles.vehicleCard}>
          <View style={styles.vehicleCardHeader}>
            <View style={styles.vehicleIconContainer}>
              <Ionicons name="car" size={24} color="#EC4D4A" />
            </View>
            <View style={styles.vehicleInfoContainer}>
              <Text style={styles.vehicleNumber}>{vehicleNumber}</Text>
              <View style={styles.statusBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={styles.statusText}>
                  {vehicleNumber !== "Not Registered" ? "Active" : "Pending"}
                </Text>
              </View>
              {vehicleType && vehicleType !== "Not Set" && (
                <Text style={styles.vehicleTypeText}>Type: {vehicleType}</Text>
              )}
              {riderData?.selectCity && (
                <Text style={styles.vehicleTypeText}>City: {riderData.selectCity}</Text>
              )}
              {riderData?.fueltype && (
                <Text style={styles.vehicleTypeText}>Fuel: {riderData.fueltype}</Text>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.driverInfoSection}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="person" size={20} color="#EC4D4A" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Driver Name</Text>
                <Text style={styles.infoText}>{driverName}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="call" size={20} color="#EC4D4A" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoText}>{driverMobile}</Text>
              </View>
            </View>
            {riderData?.selfDriving && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="car-outline" size={20} color="#EC4D4A" />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Self Driving</Text>
                  <Text style={styles.infoText}>
                    {riderData.selfDriving === "yes" ? "Yes" : "No"}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Document Verification Status Section */}
        <View style={styles.verificationSection}>
          <View style={styles.verificationHeader}>
            <Ionicons name="shield-checkmark" size={24} color="#EC4D4A" />
            <Text style={styles.verificationTitle}>Document Verification Status</Text>
            <TouchableOpacity 
              style={styles.refreshIconButton} 
              onPress={handleRefresh}
              disabled={isRefreshing}
            >
              <Ionicons 
                name="refresh" 
                size={20} 
                color={isRefreshing ? "#9CA3AF" : "#EC4D4A"} 
              />
            </TouchableOpacity>
          </View>
          
          {/* Overall Status */}
          {(() => {
            const docStatus = getDocumentStatus(riderData);
            return (
              <View style={styles.overallStatusContainer}>
                <View style={[styles.overallStatusBadge,
                  docStatus === 'Approved' ? styles.approvedBadge :
                  docStatus === 'Rejected' ? styles.rejectedBadge :
                  styles.pendingBadge]}>
                  <Ionicons 
                    name={
                      docStatus === 'Approved' ? "checkmark-circle" :
                      docStatus === 'Rejected' ? "close-circle" :
                      "time"
                    } 
                    size={24} 
                    color={
                      docStatus === 'Approved' ? "#10B981" :
                      docStatus === 'Rejected' ? "#EF4444" :
                      "#F59E0B"
                    } 
                  />
                  <Text style={[styles.overallStatusText,
                    docStatus === 'Approved' ? styles.approvedText :
                    docStatus === 'Rejected' ? styles.rejectedText :
                    styles.pendingText]}>
                    Overall Status: {docStatus}
                  </Text>
                </View>
                {docStatus === 'Pending' && (
                  <Text style={styles.pendingMessage}>
                    ⏳ Your documents are being reviewed by admin. You'll be notified once verified.
                  </Text>
                )}
                {docStatus === 'Rejected' && riderData?.rejectionReason && (
                  <Text style={styles.rejectionReason}>
                    ❌ Rejection Reason: {riderData.rejectionReason}
                  </Text>
                )}
                {docStatus === 'Approved' && (
                  <Text style={styles.approvedMessage}>
                    ✅ All documents verified! You can now go online and accept orders.
                  </Text>
                )}
                {docStatus === 'Rejected' && (
                  <TouchableOpacity 
                    style={styles.reuploadButton}
                    onPress={handleReupload}
                  >
                    <Ionicons name="cloud-upload" size={20} color="#fff" />
                    <Text style={styles.reuploadButtonText}>Reupload Documents</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })()}

          {/* Waiting Message for Pending Status */}
          {paymentCompleted && getDocumentStatus(riderData) === 'Pending' && (
            <View style={styles.waitingCard}>
              <Ionicons name="hourglass-outline" size={40} color="#F59E0B" />
              <Text style={styles.waitingTitle}>Verification in Progress</Text>
              <Text style={styles.waitingMessage}>
                Your documents are being reviewed by our admin team. This usually takes up to 2 days.
              </Text>
              <Text style={styles.waitingSubMessage}>
                We'll automatically take you to the Home screen once approved. Use the refresh button above to check status anytime.
              </Text>
            </View>
          )}

          <View style={styles.verificationList}>
            <View style={styles.verificationItem}>
              <View style={styles.verificationInfo}>
                <View style={styles.verificationIconContainer}>
                  <Ionicons name="id-card" size={24} color="#EC4D4A" />
                </View>
                <Text style={styles.verificationText}>ID Information</Text>
              </View>
              <View style={[styles.statusContainer, 
                riderData?.images?.FrontaadharCard && riderData?.images?.BackaadharCard ? 
                styles.uploadedContainer : styles.notUploadedContainer]}>
                <Ionicons 
                  name={riderData?.images?.FrontaadharCard && riderData?.images?.BackaadharCard ? 
                    "checkmark-circle" : "time"} 
                  size={18} 
                  color={riderData?.images?.FrontaadharCard && riderData?.images?.BackaadharCard ? 
                    "#10B981" : "#9CA3AF"} 
                />
                <Text style={[styles.statusText, 
                  !(riderData?.images?.FrontaadharCard && riderData?.images?.BackaadharCard) && 
                  styles.notUploadedText]}>
                  {riderData?.images?.FrontaadharCard && riderData?.images?.BackaadharCard ? 
                    "Uploaded" : "Not Uploaded"}
                </Text>
              </View>
            </View>

            <View style={styles.verificationItem}>
              <View style={styles.verificationInfo}>
                <View style={styles.verificationIconContainer}>
                  <Ionicons name="car" size={24} color="#EC4D4A" />
                </View>
                <Text style={styles.verificationText}>Vehicle Information</Text>
              </View>
              <View style={[styles.statusContainer, 
                riderData?.vehicleregisterNumber ? styles.uploadedContainer : styles.notUploadedContainer]}>
                <Ionicons 
                  name={riderData?.vehicleregisterNumber ? "checkmark-circle" : "time"} 
                  size={18} 
                  color={riderData?.vehicleregisterNumber ? "#10B981" : "#9CA3AF"} 
                />
                <Text style={[styles.statusText, 
                  riderData?.vehicleregisterNumber ? styles.uploadedText : styles.notUploadedText]}>
                  {riderData?.vehicleregisterNumber ? "Uploaded" : "Not Uploaded"}
                </Text>
              </View>
            </View>

            <View style={styles.verificationItem}>
              <View style={styles.verificationInfo}>
                <View style={styles.verificationIconContainer}>
                  <Ionicons name="person" size={24} color="#EC4D4A" />
                </View>
                <Text style={styles.verificationText}>Driver Details</Text>
              </View>
              <View style={[styles.statusContainer, 
                riderData?.images?.drivingLicenseFront && riderData?.images?.drivingLicenseBack ? 
                styles.uploadedContainer : styles.notUploadedContainer]}>
                <Ionicons 
                  name={riderData?.images?.drivingLicenseFront && riderData?.images?.drivingLicenseBack ? 
                    "checkmark-circle" : "time"} 
                  size={18} 
                  color={riderData?.images?.drivingLicenseFront && riderData?.images?.drivingLicenseBack ? 
                    "#10B981" : "#9CA3AF"} 
                />
                <Text style={[styles.statusText, 
                  (riderData?.images?.drivingLicenseFront && riderData?.images?.drivingLicenseBack) ? 
                  styles.uploadedText : styles.notUploadedText]}>
                  {riderData?.images?.drivingLicenseFront && riderData?.images?.drivingLicenseBack ? 
                    "Uploaded" : "Not Uploaded"}
                </Text>
              </View>
            </View>

            <View style={styles.verificationItem}>
              <View style={styles.verificationInfo}>
                <View style={styles.verificationIconContainer}>
                  <Ionicons name="camera" size={24} color="#EC4D4A" />
                </View>
                <Text style={styles.verificationText}>Vehicle Photos</Text>
              </View>
              <View style={[styles.statusContainer, 
                riderData?.images?.vehicleimageFront && riderData?.images?.vehicleimageBack ? 
                styles.uploadedContainer : styles.notUploadedContainer]}>
                <Ionicons 
                  name={riderData?.images?.vehicleimageFront && riderData?.images?.vehicleimageBack ? 
                    "checkmark-circle" : "time"} 
                  size={18} 
                  color={riderData?.images?.vehicleimageFront && riderData?.images?.vehicleimageBack ? 
                    "#10B981" : "#9CA3AF"} 
                />
                <Text style={[styles.statusText, 
                  (riderData?.images?.vehicleimageFront && riderData?.images?.vehicleimageBack) ? 
                  styles.uploadedText : styles.notUploadedText]}>
                  {riderData?.images?.vehicleimageFront && riderData?.images?.vehicleimageBack ? 
                    "Uploaded" : "Not Uploaded"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Training Videos Button */}
        {/* <View style={styles.trainingSection}>
          <View style={styles.trainingCard}>
            <View style={styles.trainingHeader}>
              <View style={styles.trainingIconContainer}>
                <Ionicons name="play-circle" size={24} color="#EC4D4A" />
              </View>
              <View style={styles.trainingTextContainer}>
                <Text style={styles.trainingTitle}>Training Videos</Text>
                <Text style={styles.trainingSubtitle}>
                  15 videos series to get started
                </Text>
              </View>
              <View style={[styles.statusContainer, styles.pendingContainer]}>
                <Ionicons name="time" size={18} color="#F59E0B" />
                <Text style={[styles.statusText, styles.pendingText]}>
                  Pending
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.trainingButton}
              onPress={() => navigation.replace("TrainingVideos")}
              activeOpacity={0.8}
            >
              <Text style={styles.trainingButtonText}>Start Training</Text>
              <Ionicons
                name="arrow-forward"
                size={20}
                color="#fff"
                style={styles.buttonIcon}
              />
            </TouchableOpacity>
          </View>
        </View> */}

        {/* Footer Note */}
        <View style={styles.footerNoteContainer}>
          <Text style={styles.footerNote}>
            One time fees per vehicle for adding. If unable to onboard, you get
            full refund
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Action Button */}
      <View style={styles.bottomContainer}>
        {!paymentCompleted ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.buttonText}>Pay Fees | ₹29</Text>
              <Ionicons
                name="arrow-forward"
                size={20}
                color="white"
                style={styles.buttonIcon}
              />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.paidButtonContainer}>
            <View style={styles.paidButton}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={styles.paidButtonText}>Payment Completed ✓</Text>
            </View>
            {getDocumentStatus(riderData) === 'Rejected' && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleReupload}
                activeOpacity={0.8}
              >
                <Ionicons name="cloud-upload" size={20} color="#EC4D4A" />
                <Text style={styles.secondaryButtonText}>Reupload Documents</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: "#EC4D4A",
    paddingTop: Platform.OS === "ios" ? 0 : 20,
    paddingBottom: 10,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#EC4D4A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 30,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EC4D4A",
    padding: 16,
    borderRadius: 12,
    margin: 16,
    marginTop: 20,
    elevation: 2,
    shadowColor: "#EC4D4A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  alertTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  alertText: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
  },
  boldText: {
    fontWeight: "bold",
  },
  vehicleCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    margin: 16,
    marginTop: 0,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  vehicleCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  vehicleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  vehicleInfoContainer: {
    flex: 1,
  },
  vehicleNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 4,
  },
  uploadedText: {
    color: "#10B981",
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 16,
  },
  driverInfoSection: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
  },
  infoText: {
    fontSize: 16,
    color: "#4b5563",
    fontWeight: "500",
  },
  earningsSection: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 16,
  },
  earningsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  earningsIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  earningsText: {
    fontSize: 16,
    color: "#388E3C",
    fontWeight: "500",
  },
  verificationSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    margin: 16,
    marginTop: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  verificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  verificationTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginLeft: 12,
  },
  verificationList: {
    gap: 16,
  },
  verificationItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  verificationInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  verificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  verificationText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#4b5563",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  approvedContainer: {
    backgroundColor: "#DCFCE7",
  },
  pendingContainer: {
    backgroundColor: "#FEF3C7",
  },
  pendingText: {
    color: "#F59E0B",
  },
  uploadedContainer: {
    backgroundColor: "#D1FAE5",
  },
  notUploadedContainer: {
    backgroundColor: "#F3F4F6",
  },
  notUploadedText: {
    color: "#9CA3AF",
  },
  overallStatusContainer: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  overallStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  approvedBadge: {
    backgroundColor: '#D1FAE5',
  },
  rejectedBadge: {
    backgroundColor: '#FEE2E2',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
  },
  overallStatusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  approvedText: {
    color: '#10B981',
  },
  rejectedText: {
    color: '#EF4444',
  },
  rejectionReason: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 8,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
  pendingMessage: {
    fontSize: 14,
    color: '#F59E0B',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  approvedMessage: {
    fontSize: 14,
    color: '#10B981',
    marginTop: 8,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
  footerNoteContainer: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    margin: 16,
    marginTop: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  footerNote: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  bottomContainer: {
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 30 : 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  actionButton: {
    backgroundColor: "#EC4D4A",
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#EC4D4A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonIcon: {
    marginLeft: 8,
  },
  trainingSection: {
    padding: 16,
    paddingTop: 0,
  },
  trainingCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  trainingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  trainingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  trainingTextContainer: {
    flex: 1,
  },
  trainingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  trainingSubtitle: {
    fontSize: 13,
    color: "#6b7280",
  },
  trainingButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  trainingButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
  },
  vehicleTypeText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  refreshIconButton: {
    marginLeft: 'auto',
    padding: 8,
  },
  waitingCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  waitingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#92400E',
    marginTop: 12,
    marginBottom: 8,
  },
  waitingMessage: {
    fontSize: 14,
    color: '#78350F',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  waitingSubMessage: {
    fontSize: 12,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  pollingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#FEF3C7',
  },
  pollingText: {
    fontSize: 12,
    color: '#92400E',
    marginLeft: 8,
  },
  reuploadButton: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  reuploadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  paidButtonContainer: {
    gap: 12,
  },
  paidButton: {
    backgroundColor: '#F0FDF4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  paidButtonText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#EC4D4A',
  },
  secondaryButtonText: {
    color: '#EC4D4A',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default MyVehiclesScreen;
