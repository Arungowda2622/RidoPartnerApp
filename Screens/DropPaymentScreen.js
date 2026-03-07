import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  StatusBar,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import axios from "axios";
import { completeBooking, collectCash } from "../utils/BookingApi";

const { width, height } = Dimensions.get("window");

const DropPaymentScreen = ({ navigation, route }) => {
  const { order } = route.params || {};
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const orderAmount = order?.partialWalletPayment 
    ? order?.remainingAmountToPay 
    : (order?.price || order?.amountPay || "52.0");

  const handleCollectCash = () => {
    setShowCollectModal(true);
  };

  const handleCollected = async () => {
    if (isProcessing) return; // Prevent double-tap
    
    try {
      setIsProcessing(true);
      console.log('💰 Starting booking completion for order:', order?._id);
      
      if (!order || !order._id) {
        throw new Error('Invalid order data');
      }

      // Step 1: Mark cash as collected (fast operation)
      console.log('Step 1: Collecting cash...');
      await collectCash(order._id);
      console.log('✅ Cash collected');
      
      // Step 2: Get location (can be slow, timeout after 5s)
      console.log('Step 2: Getting location...');
      let currentLat = null;
      let currentLng = null;
      
      try {
        const location = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced, // Faster than High
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Location timeout')), 5000)
          )
        ]);
        currentLat = location?.coords?.latitude;
        currentLng = location?.coords?.longitude;
        console.log('✅ Location obtained:', { currentLat, currentLng });
      } catch (locError) {
        console.log('⚠️ Location fetch failed or timed out, continuing without location:', locError.message);
      }

      // Step 3: Complete the booking (backend is fast ~1s)
      console.log('Step 3: Completing booking...');
      const completionResponse = await completeBooking(
        order._id,
        currentLat,
        currentLng
      );
      console.log("✅ Booking completed successfully");
      
      // Clear trip progress in background (non-blocking)
      AsyncStorage.multiRemove([
        "TRIP_PROGRESS_STEP",
        "CURRENT_DROP_INDEX",
        "orderProgressStep"
      ]).catch(err => console.log("Note: AsyncStorage cleanup:", err.message));
      
      // Close modal and navigate
      setShowCollectModal(false);
      setIsProcessing(false);
      
      // Navigate to OrderReviewScreen
      navigation.reset({
        index: 1,
        routes: [
          { name: 'Home' },
          { 
            name: 'OrderReviewScreen',
            params: {
              booking: order,
              amount: order?.totalDriverEarnings || order?.amountPay || order?.price,
              nextBookings: completionResponse.nextBookings || [],
              hasNextBookings: completionResponse.hasNextBookings || false,
            }
          },
        ],
      });
    } catch (error) {
      console.error('❌ Error completing booking:', error);
      setIsProcessing(false);
      
      let errorMsg = 'Failed to complete the order. Please try again.';
      
      if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
        errorMsg = 'Request timed out. Please check your connection and try again.';
      } else if (error.message?.includes('Network')) {
        errorMsg = 'Network error. Please check your internet connection.';
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      }
      
      Alert.alert(
        "Error",
        errorMsg,
        [{ text: "OK" }]
      );
      // Keep modal open on error so user can retry
    }
  };

  const handleGoBack = () => {
    setShowCollectModal(false);
  };



  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Payment Card */}
        <View style={styles.paymentCard}>
          <View style={styles.amountSection}>
            {order?.partialWalletPayment && (
              <View style={styles.walletInfoBadge}>
                <Ionicons name="wallet-outline" size={16} color="#1E40AF" />
                <Text style={styles.walletInfoText}>
                  ₹{order?.walletAmountUsed || order?.walletAmount} already paid via Wallet
                </Text>
              </View>
            )}
            <Text style={styles.fareLabel}>
              {order?.partialWalletPayment ? "Amount to Collect" : "Order Fare"}
            </Text>
            <View style={styles.amountContainer}>
              <Text style={styles.rupeeSymbol}>₹</Text>
              <Text style={styles.fareAmount}>{orderAmount}</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="cash-outline" size={18} color="#EC4D4A" />
              <Text style={styles.badgeText}>
                {order?.partialWalletPayment ? "Cash to Collect" : "Cash Payment"}
              </Text>
            </View>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={22} color="#EC4D4A" />
            <Text style={styles.infoText}>
              Please collect the exact amount from the customer at drop location
            </Text>
          </View>
        </View>
      </View>

      {/* Collect Cash Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={styles.collectCashButton}
          onPress={handleCollectCash}
          activeOpacity={0.8}
        >
          <Ionicons name="wallet-outline" size={22} color="#fff" />
          <Text style={styles.collectCashText}>Collect Cash</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Collect Cash Confirmation Modal */}
      <Modal
        visible={showCollectModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleGoBack}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="cash" size={48} color="#EC4D4A" />
              </View>
            </View>

            {/* Title */}
            <Text style={styles.modalTitle}>
              Confirm Cash Collection
            </Text>
            
            <View style={styles.amountBadge}>
              <Text style={styles.amountBadgeText}>₹{orderAmount}</Text>
            </View>

            {/* Subtitle */}
            <Text style={styles.modalSubtitle}>
              Have you received the cash payment from the customer?
            </Text>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.goBackButton}
                onPress={handleGoBack}
                activeOpacity={0.7}
              >
                <Text style={styles.goBackText}>Go Back</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.collectedButton, isProcessing && styles.collectedButtonDisabled]}
                onPress={handleCollected}
                activeOpacity={0.8}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <ActivityIndicator size="small" color="#FFF" />
                    <Text style={styles.collectedText}>Processing...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                    <Text style={styles.collectedText}>Collected</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  paymentCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  amountSection: {
    alignItems: "center",
  },
  fareLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  rupeeSymbol: {
    fontSize: 32,
    fontWeight: "700",
    color: "#EC4D4A",
    marginTop: 6,
    marginRight: 4,
  },
  fareAmount: {
    fontSize: 52,
    fontWeight: "800",
    color: "#EC4D4A",
    letterSpacing: -1,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#EC4D4A",
  },
  infoSection: {
    marginBottom: 20,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
    lineHeight: 20,
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  collectCashButton: {
    backgroundColor: "#EC4D4A",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#EC4D4A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  collectCashText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FEE2E2",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000",
    marginBottom: 16,
    lineHeight: 30,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  amountBadge: {
    alignSelf: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#EC4D4A",
  },
  amountBadgeText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#EC4D4A",
    letterSpacing: 0.5,
  },
  modalSubtitle: {
    fontSize: 15,
    color: "#6b7280",
    marginBottom: 32,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  goBackButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
  },
  goBackText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6b7280",
    letterSpacing: 0.3,
  },
  collectedButton: {
    flex: 1,
    backgroundColor: "#EC4D4A",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#EC4D4A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  collectedButtonDisabled: {
    backgroundColor: "#ccc",
    opacity: 0.7,
  },
  collectedText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  walletInfoBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 12,
    gap: 6,
  },
  walletInfoText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E40AF",
  },
});

export default DropPaymentScreen;
