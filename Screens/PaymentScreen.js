 import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Modal,
  Image,
  StatusBar,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collectCash, getBookingDetailsById } from "../utils/BookingApi";
// import QRCode from "react-native-qrcode-svg";

const { width, height } = Dimensions.get("window");

const PaymentScreen = ({ navigation, route }) => {
  const { order } = route.params || {};
  const [qrGenerated, setQrGenerated] = useState(false);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [freshBooking, setFreshBooking] = useState(order); // Track fresh booking data

  // Calculate amount to collect (for split payments, show remaining amount only)
  const orderAmount = freshBooking?.partialWalletPayment 
    ? freshBooking?.remainingAmountToPay 
    : (freshBooking?.price || freshBooking?.amountPay || "52.0");
  const qrData = `UPI://pay?pa=merchant@upi&pn=RidoDrop&am=${orderAmount}&cu=INR&tn=Order Payment`;

  // Check payment configuration and status
  const payFromRaw = freshBooking?.payFrom || "";
  const payFrom = payFromRaw.toLowerCase().trim();
  const paymentMethod = freshBooking?.paymentMethod || 'cash';
  const paymentStatus = freshBooking?.paymentStatus || 'pending';
  
  // Check if payment is online (pre-paid)
  const isOnlinePayment = paymentMethod === 'online' || payFrom.includes('online');
  const isPaymentCompleted = paymentStatus === 'completed';
  
  const isPickupPayment = payFrom.includes("pickup");
  const isDropPayment = payFrom.includes("drop") || payFrom.includes("delivery");
  const cashAlreadyCollected = freshBooking?.cashCollected || false;

  console.log("💰 PaymentScreen - Payment Analysis:");
  console.log("📋 PayFrom raw:", payFromRaw);
  console.log("📋 PayFrom normalized:", payFrom);
  console.log("💳 Payment Method:", paymentMethod);
  console.log("✅ Payment Status:", paymentStatus);
  console.log("🌐 Is online payment:", isOnlinePayment);
  console.log("✔️ Is payment completed:", isPaymentCompleted);
  console.log("🏠 Is pickup payment:", isPickupPayment);
  console.log("📦 Is drop payment:", isDropPayment);
  console.log("💵 Cash already collected:", cashAlreadyCollected);

  // ✅ Fetch fresh booking data on mount to check latest payment status
  React.useEffect(() => {
    const fetchFreshBookingData = async () => {
      try {
        if (order && (order._id || order.bookingId)) {
          const bookingId = order._id || order.bookingId;
          console.log("🔄 PaymentScreen: Fetching fresh booking data for:", bookingId);
          
          const latestBooking = await getBookingDetailsById(bookingId);
          
          if (latestBooking) {
            console.log("✅ PaymentScreen: Fresh booking data received:", {
              cashCollected: latestBooking.cashCollected,
              currentStep: latestBooking.currentStep,
              currentDropIndex: latestBooking.currentDropIndex
            });
            setFreshBooking(latestBooking);
          }
        }
      } catch (error) {
        console.error("❌ PaymentScreen: Error fetching fresh booking:", error);
        // Keep using original order if fetch fails
      }
    };
    
    fetchFreshBookingData();
  }, []);

  // Auto-navigate if cash already collected, online payment, or wrong payment location
  React.useEffect(() => {
    // FIRST CHECK: Online payment (pre-paid)
    if (isOnlinePayment || isPaymentCompleted) {
      console.log("💳 Online payment detected - navigating to MapProgress");
      // Navigate silently without alert for better UX
      setTimeout(() => {
        navigation.replace("mapProgress", { order: freshBooking });
      }, 500);
      return;
    }

    // Only show alert and redirect if cash was already collected AND we're somehow back here
    // This prevents the alert from showing in the normal pickup payment flow
    if (cashAlreadyCollected) {
      console.log("✅ Cash already collected - navigating to MapProgress");
      // Navigate silently without alert since this is the expected flow
      setTimeout(() => {
        navigation.replace("mapProgress", { order: freshBooking });
      }, 500);
      return;
    }

    // If payment location is at drop, redirect to MapProgress
    if (isDropPayment) {
      console.log("📦 Payment is at drop location - redirecting to MapProgress");
      // Navigate silently without alert
      setTimeout(() => {
        navigation.replace("mapProgress", { order: freshBooking });
      }, 500);
      return;
    }

    // If payment location is unknown, default to MapProgress
    if (!isPickupPayment) {
      console.log("⚠️ Unknown payment location - defaulting to MapProgress");
      setTimeout(() => {
        navigation.replace("mapProgress", { order: freshBooking });
      }, 500);
      return;
    }
  }, [isOnlinePayment, isPaymentCompleted, cashAlreadyCollected, isPickupPayment, isDropPayment, freshBooking]);

  const handleGenerateQR = () => {
    setQrGenerated(true);
  };

  const handleCollectCash = () => {
    setShowCollectModal(true);
  };

  const handleCollected = async () => {
    try {
      setShowCollectModal(false);
      
      // Mark cash as collected in backend using PATCH API
      if (freshBooking && freshBooking._id) {
        console.log("💰 Calling collectCash API for order:", freshBooking._id);
        console.log("📋 Order payFrom:", freshBooking.payFrom);
        
        const response = await collectCash(freshBooking._id);
        
        console.log("✅ collectCash API response:", response);
        
        // Use the updated booking from API response if available
        let updatedOrder;
        if (response && response.booking) {
          console.log("📦 Using updated booking from API response");
          updatedOrder = { ...response.booking };
        } else {
          console.log("📦 Using local order with cashCollected flag");
          updatedOrder = { ...freshBooking, cashCollected: true };
        }
        
        console.log("✅ Cash marked as collected in backend, cashCollected:", updatedOrder.cashCollected);
        console.log("🚀 Navigating to MapProgress with updated order");
        
        // Update freshBooking state
        setFreshBooking(updatedOrder);
        
        // Navigate to MapProgress with updated order
        navigation.navigate("mapProgress", { order: updatedOrder });
      } else {
        console.error("❌ No order ID found - cannot mark cash as collected");
        Alert.alert(
          "Error", 
          "Order ID not found. Cannot mark cash as collected.",
          [
            {
              text: "OK",
              onPress: () => setShowCollectModal(true)
            }
          ]
        );
      }
    } catch (error) {
      console.error("❌ Error calling collectCash API:", error);
      console.error("❌ Error details:", {
        message: error?.message || "Unknown error message",
        stack: error?.stack || "No stack trace available",
        response: error?.response?.data || "No response data available"
      });
      
      Alert.alert(
        "Payment Status Error",
        "Failed to update payment status in the system. This may cause issues with payment collection at delivery.",
        [
          {
            text: "Retry",
            style: "default",
            onPress: () => setShowCollectModal(true)
          },
          {
            text: "Continue Anyway",
            style: "destructive",
            onPress: () => {
              console.warn("⚠️ Continuing without API confirmation - cash may not be marked as collected");
              const fallbackOrder = { ...order, cashCollected: true };
              navigation.navigate("mapProgress", { order: fallbackOrder });
            }
          }
        ]
      );
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
        {/* Payment Status Banner */}
        {isOnlinePayment || isPaymentCompleted ? (
          <View style={[styles.statusBanner, styles.statusBannerSuccess]}>
            <Ionicons name="card" size={24} color="#22C55E" />
            <Text style={styles.statusBannerText}>Paid Online - No Cash Collection</Text>
          </View>
        ) : cashAlreadyCollected ? (
          <View style={[styles.statusBanner, styles.statusBannerSuccess]}>
            <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
            <Text style={styles.statusBannerText}>Cash Already Collected</Text>
          </View>
        ) : !isPickupPayment ? (
          <View style={[styles.statusBanner, styles.statusBannerWarning]}>
            <Ionicons name="information-circle" size={24} color="#F59E0B" />
            <Text style={styles.statusBannerText}>
              Payment Location: {isDropPayment ? "At Delivery" : "Unknown"}
            </Text>
          </View>
        ) : null}

        {/* Payment Card */}
        <View style={styles.paymentCard}>
          <View style={styles.amountSection}>
            <Text style={styles.fareLabel}>
              {freshBooking?.partialWalletPayment ? "Amount to Collect" : "Order Fare"}
            </Text>
            <View style={styles.amountContainer}>
              <Text style={styles.rupeeSymbol}>₹</Text>
              <Text style={styles.fareAmount}>{orderAmount}</Text>
            </View>
            {freshBooking?.partialWalletPayment && freshBooking?.walletAmountUsed > 0 && (
              <View style={styles.walletInfoBadge}>
                <Ionicons name="wallet-outline" size={16} color="#1976D2" />
                <Text style={styles.walletInfoText}>
                  ₹{freshBooking.walletAmountUsed} already paid via Wallet
                </Text>
              </View>
            )}
            <View style={styles.badge}>
              <Ionicons 
                name={isOnlinePayment ? "card-outline" : "cash-outline"} 
                size={18} 
                color={isOnlinePayment ? "#22C55E" : "#EC4D4A"} 
              />
              <Text style={styles.badgeText}>
                {isOnlinePayment || isPaymentCompleted
                  ? "Pre-Paid Online"
                  : cashAlreadyCollected
                  ? "Cash Collected"
                  : "Cash Payment at Pickup"}
              </Text>
            </View>
          </View>
        </View>

        {/* Conditional Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons 
              name={cashAlreadyCollected ? "checkmark-circle-outline" : "information-circle-outline"} 
              size={22} 
              color={cashAlreadyCollected ? "#22C55E" : "#EC4D4A"} 
            />
            <Text style={styles.infoText}>
              {isOnlinePayment || isPaymentCompleted
                ? "This order has been paid online. No cash collection is required from the customer."
                : cashAlreadyCollected 
                  ? "Cash has been successfully collected for this order"
                  : isPickupPayment 
                    ? "Please collect the exact amount from the customer at pickup"
                    : "Payment will be collected at the delivery location"
              }
            </Text>
          </View>
        </View>
      </View>

      {/* Conditional Bottom Button */}
      <View style={styles.bottomContainer}>
        {isOnlinePayment || isPaymentCompleted ? (
          <TouchableOpacity 
            style={[styles.collectCashButton, styles.alreadyCollectedButton]}
            onPress={() => navigation.navigate("mapProgress", { order })}
            activeOpacity={0.8}
          >
            <Ionicons name="card" size={22} color="#fff" />
            <Text style={styles.collectCashText}>Continue to Trip (Pre-Paid)</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        ) : cashAlreadyCollected ? (
          <TouchableOpacity 
            style={[styles.collectCashButton, styles.alreadyCollectedButton]}
            onPress={() => navigation.navigate("mapProgress", { order })}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={styles.collectCashText}>Continue to Trip</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        ) : isPickupPayment ? (
          <TouchableOpacity 
            style={styles.collectCashButton}
            onPress={handleCollectCash}
            activeOpacity={0.8}
          >
            <Ionicons name="wallet-outline" size={22} color="#fff" />
            <Text style={styles.collectCashText}>Collect Cash</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.collectCashButton, styles.skipPaymentButton]}
            onPress={() => navigation.navigate("mapProgress", { order })}
            activeOpacity={0.8}
          >
            <Ionicons name="location" size={22} color="#fff" />
            <Text style={styles.collectCashText}>Continue to Trip</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        )}
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
                style={styles.collectedButton}
                onPress={handleCollected}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                <Text style={styles.collectedText}>Collected</Text>
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
  collectedText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  // New styles for status-based UI
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  statusBannerSuccess: {
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  statusBannerWarning: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  statusBannerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    flex: 1,
  },
  alreadyCollectedButton: {
    backgroundColor: "#22C55E",
    shadowColor: "#22C55E",
  },
  skipPaymentButton: {
    backgroundColor: "#6B7280",
    shadowColor: "#6B7280",
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

export default PaymentScreen;
