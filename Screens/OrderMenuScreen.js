import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  StatusBar,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  scale,
  moderateScale,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS,
  ICON_SIZES,
} from "../utils/responsive";

const OrderMenuScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const order = route.params?.order || {};
  
  const [expandedPickup, setExpandedPickup] = useState(false);
  const [expandedDrops, setExpandedDrops] = useState({});
  
  // Get all drop locations
  const dropLocations = order.dropLocation || [];
  const hasMultipleDrops = dropLocations.length > 1;
  
  const toggleDropExpanded = (index) => {
    setExpandedDrops(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };
  
  // Cancel modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState("");
  const [showReasonOptions, setShowReasonOptions] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customReason, setCustomReason] = useState("");

  const cancelReasons = [
    "Customer not available",
    "Wrong address",
    "Vehicle issue",
    "Personal emergency",
    "Order assigned by mistake",
    "Others"
  ];

  const handleCancelOrder = () => {
    setShowCancelModal(true);
  };

  const handleCloseCancelModal = () => {
    setShowCancelModal(false);
    setSelectedCancelReason("");
    setShowReasonOptions(false);
    setShowCustomInput(false);
    setCustomReason("");
  };

  const handleReasonSelect = (reason) => {
    if (reason === "Others") {
      setSelectedCancelReason(reason);
      setShowCustomInput(true);
      setShowReasonOptions(false);
    } else {
      setSelectedCancelReason(reason);
      setShowCustomInput(false);
      setCustomReason("");
    }
  };

  const handleConfirmCancel = () => {
    if (!selectedCancelReason) {
      Alert.alert("Please select a reason", "Please choose a reason for cancellation");
      return;
    }
    
    if (selectedCancelReason === "Others" && !customReason.trim()) {
      Alert.alert("Please enter a reason", "Please provide your reason for cancellation");
      return;
    }
    
    const finalReason = selectedCancelReason === "Others" ? customReason : selectedCancelReason;
    console.log("Order cancelled with reason:", finalReason);
    
    // TODO: Call API to cancel order
    
    handleCloseCancelModal();
    Alert.alert("Order Cancelled", "Your order has been cancelled successfully", [
      {
        text: "OK",
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  const handleGetHelp = () => {
    // Navigate to Raise Ticket screen with order context
    navigation.navigate("RaiseTicket", {
      orderId: order.orderId,
      orderData: order,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={ICON_SIZES.medium} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Order Request Amount Section */}
          <View style={styles.amountCard}>
            <View style={styles.amountContent}>
              <View style={styles.amountLeft}>
                <Text style={styles.amountLabel}>
                  {order.partialWalletPayment ? "Amount to Collect" : "Total Earnings"}
                </Text>
                <Text style={styles.amountPrice}>
                  ₹{order.partialWalletPayment ? order.remainingAmountToPay : (order.totalDriverEarnings || order.price || order.amountPay || "0")}
                </Text>
                {order.partialWalletPayment && order.walletAmountUsed > 0 && (
                  <View style={styles.walletBadge}>
                    <Text style={styles.walletBadgeText}>💳 ₹{order.walletAmountUsed} paid via Wallet</Text>
                  </View>
                )}
                {order.quickFee && order.quickFee > 0 && (
                  <View style={styles.tipBadge}>
                    <Text style={styles.tipText}>💰 Tip: ₹{order.quickFee}</Text>
                  </View>
                )}
              </View>
              <View style={styles.amountDivider} />
              <View style={styles.amountRight}>
                <View style={styles.infoRow}>
                  <Ionicons name="car-sport-outline" size={ICON_SIZES.small} color="#6b7280" style={{marginRight: SPACING.small}} />
                  <Text style={styles.infoText}>
                    {order.vehicleType || "N/A"}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="receipt-outline" size={ICON_SIZES.small} color="#6b7280" style={{marginRight: SPACING.small}} />
                  <Text style={styles.infoText}>
                    #{order.bookingId || order._id?.slice(-6) || "N/A"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Payment Collection Location */}
          <View style={styles.paymentCard}>
            <View style={styles.paymentHeader}>
              <Ionicons 
                name={order.payFrom?.toLowerCase().includes('pickup') ? "location" : 
                      order.payFrom?.toLowerCase().includes('drop') || order.payFrom?.toLowerCase().includes('delivery') ? "flag" : 
                      "wallet"} 
                size={ICON_SIZES.regular} 
                color="#EC4D4A" 
              />
              <Text style={styles.paymentTitle}>Payment Information</Text>
            </View>
            <View style={styles.paymentContent}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Payment Method:</Text>
                <View style={styles.paymentBadge}>
                  <Text style={styles.paymentBadgeText}>
                    {order.payFrom?.toLowerCase().includes('pickup') ? '📍 Cash at Pickup' :
                     order.payFrom?.toLowerCase().includes('drop') || order.payFrom?.toLowerCase().includes('delivery') ? '🏁 Cash at Drop' :
                     order.payFrom?.toLowerCase().includes('wallet') || order.payFrom?.toLowerCase().includes('online') ? '💳 Paid Online' :
                     order.payFrom || 'Not specified'}
                  </Text>
                </View>
              </View>
              {/* Show status based on payment method */}
              {order.payFrom?.toLowerCase().includes('wallet') || order.payFrom?.toLowerCase().includes('online') ? (
                <View style={styles.collectedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                  <Text style={styles.collectedText}>Already Paid Online</Text>
                </View>
              ) : (
                // For cash payments (pickup or drop)
                order.cashCollected ? (
                  <View style={styles.collectedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.collectedText}>Cash Collected</Text>
                  </View>
                ) : (
                  <View style={styles.pendingBadge}>
                    <Ionicons name="time-outline" size={16} color="#f59e0b" />
                    <Text style={styles.pendingText}>
                      {order.payFrom?.toLowerCase().includes('pickup') ? 'Collect at Pickup' : 'Collect at Drop'}
                    </Text>
                  </View>
                )
              )}
            </View>
          </View>

          {/* Fare Breakup Section */}
          <View style={styles.breakupCard}>
            <View style={styles.breakupHeader}>
              <Ionicons name="receipt" size={ICON_SIZES.regular} color="#EC4D4A" style={{marginRight: SPACING.small}} />
              <Text style={styles.breakupTitle}>Fare Breakup</Text>
            </View>
            
            <View style={styles.breakupContent}>
              <View style={styles.breakupRow}>
                <Text style={styles.breakupLabel}>Total Order Fare</Text>
                <Text style={styles.breakupValue}>
                  ₹{order.price || order.totalFare || order.amountPay || "0"}
                </Text>
              </View>
              
              {order.partialWalletPayment && order.walletAmountUsed > 0 && (
                <>
                  <View style={styles.splitPaymentSection}>
                    <Text style={styles.splitPaymentTitle}>💳 Split Payment</Text>
                    <View style={styles.breakupRow}>
                      <Text style={styles.breakupLabel}>• Wallet Payment</Text>
                      <Text style={[styles.breakupValue, styles.walletValue]}>
                        ₹{order.walletAmountUsed}
                      </Text>
                    </View>
                    <View style={styles.breakupRow}>
                      <Text style={styles.breakupLabel}>• Cash to Collect</Text>
                      <Text style={styles.breakupValue}>
                        ₹{order.remainingAmountToPay}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.breakupDivider} />
                </>
              )}
              
              <View style={styles.breakupRow}>
                <Text style={styles.breakupLabel}>Platform Fee {order.feeBreakdown?.platformFeePercentage ? `(${order.feeBreakdown.platformFeePercentage}%)` : ''}</Text>
                <Text style={[styles.breakupValue, styles.deductionValue]}>
                  - ₹{order.feeBreakdown?.platformFee || "0"}
                </Text>
              </View>
              
              <View style={styles.breakupRow}>
                <Text style={styles.breakupLabel}>GST {order.feeBreakdown?.gstPercentage ? `(${order.feeBreakdown.gstPercentage}%)` : ''}</Text>
                <Text style={[styles.breakupValue, styles.deductionValue]}>
                  - ₹{order.feeBreakdown?.gstAmount || "0"}
                </Text>
              </View>
              
              <View style={styles.breakupDivider} />
              
              <View style={styles.breakupRow}>
                <Text style={styles.breakupLabelBold}>Rider Earnings</Text>
                <Text style={styles.breakupValueBold}>
                  ₹{order.feeBreakdown?.riderEarnings || order.totalDriverEarnings || "0"}
                </Text>
              </View>
              
              {order.quickFee && order.quickFee > 0 && (
                <>
                  <View style={styles.breakupRow}>
                    <Text style={styles.breakupLabel}>Quick Delivery Tip</Text>
                    <Text style={[styles.breakupValue, styles.bonusValue]}>
                      + ₹{order.quickFee}
                    </Text>
                  </View>
                  
                  <View style={styles.breakupDivider} />
                  
                  <View style={styles.breakupRow}>
                    <Text style={styles.breakupLabelBold}>Total Earnings</Text>
                    <Text style={[styles.breakupValueBold, styles.totalEarnings]}>
                      ₹{(parseFloat(order.totalDriverEarnings || 0) + parseFloat(order.quickFee || 0)).toFixed(2)}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Pickup Point Section */}
          <TouchableOpacity 
            style={styles.card}
            onPress={() => setExpandedPickup(!expandedPickup)}
            activeOpacity={0.7}
          >
            <View style={styles.locationHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name="location" size={ICON_SIZES.regular} color="#4CAF50" />
              </View>
              <View style={styles.locationHeaderText}>
                <Text style={styles.locationTitle}>Pickup Point</Text>
                <Text style={styles.locationAddress} numberOfLines={1}>
                  {order.from?.address ||
                    order.fromAddress?.address ||
                    order.pickup ||
                    "Address not available"}
                </Text>
              </View>
              <Ionicons 
                name={expandedPickup ? "chevron-up" : "chevron-down"} 
                size={ICON_SIZES.regular} 
                color="#9ca3af" 
              />
            </View>
            
            {expandedPickup && (
              <View style={styles.expandedContent}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Receiver</Text>
                  <Text style={styles.detailValue}>
                    {order.from?.receiverName ||
                      order.fromAddress?.receiverName ||
                      order.customer?.name ||
                      "N/A"}
                  </Text>
                </View>
                {(order.from?.receiverMobile || order.fromAddress?.receiverMobile || order.customer?.phone) && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Phone</Text>
                    <Text style={styles.detailValue}>
                      {order.from?.receiverMobile || order.fromAddress?.receiverMobile || order.customer?.phone}
                    </Text>
                  </View>
                )}
                {(order.from?.house || order.fromAddress?.house) && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>House/Landmark</Text>
                    <Text style={styles.detailValue}>
                      {order.from?.house || order.fromAddress?.house}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>

          {/* Drop Point(s) Section */}
          {dropLocations.length > 0 ? (
            dropLocations.map((dropLocation, index) => (
              <TouchableOpacity 
                key={index}
                style={styles.card}
                onPress={() => toggleDropExpanded(index)}
                activeOpacity={0.7}
              >
                <View style={styles.locationHeader}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="location" size={ICON_SIZES.regular} color="#EC4D4A" />
                    {hasMultipleDrops && (
                      <View style={styles.dropBadge}>
                        <Text style={styles.dropBadgeText}>{index + 1}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.locationHeaderText}>
                    <Text style={styles.locationTitle}>
                      {hasMultipleDrops ? `Drop Point ${index + 1}` : 'Drop Point'}
                    </Text>
                    <Text style={styles.locationAddress} numberOfLines={1}>
                      {dropLocation?.Address ||
                        dropLocation?.address ||
                        "Address not available"}
                    </Text>
                  </View>
                  <Ionicons 
                    name={expandedDrops[index] ? "chevron-up" : "chevron-down"} 
                    size={ICON_SIZES.regular} 
                    color="#9ca3af" 
                  />
                </View>
                
                {expandedDrops[index] && (
                  <View style={styles.expandedContent}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Receiver</Text>
                      <Text style={styles.detailValue}>
                        {dropLocation?.ReciversName ||
                          dropLocation?.ReceiverName ||
                          dropLocation?.receiverName ||
                          order.customer?.name ||
                          "N/A"}
                      </Text>
                    </View>
                    {(dropLocation?.ReciversMobileNum || 
                      dropLocation?.ReceiverMobile ||
                      dropLocation?.ReceiverPhone ||
                      dropLocation?.receiverMobile ||
                      order.customer?.phone) && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Phone</Text>
                        <Text style={styles.detailValue}>
                          {dropLocation?.ReciversMobileNum || 
                           dropLocation?.ReceiverMobile ||
                           dropLocation?.ReceiverPhone ||
                           dropLocation?.receiverMobile ||
                           order.customer?.phone}
                        </Text>
                      </View>
                    )}
                    {(dropLocation?.Address1 || dropLocation?.landmark) && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>House/Landmark</Text>
                        <Text style={styles.detailValue}>
                          {dropLocation?.Address1 || dropLocation?.landmark}
                        </Text>
                      </View>
                    )}
                    {(dropLocation?.latitude && dropLocation?.longitude) && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Coordinates</Text>
                        <Text style={[styles.detailValue, styles.coordinatesText]}>
                          {dropLocation.latitude.toFixed(6)}, {dropLocation.longitude.toFixed(6)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.card}>
              <View style={styles.locationHeader}>
                <View style={styles.iconContainer}>
                  <Ionicons name="location" size={22} color="#EC4D4A" />
                </View>
                <View style={styles.locationHeaderText}>
                  <Text style={styles.locationTitle}>Drop Point</Text>
                  <Text style={styles.locationAddress}>
                    No drop location available
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleGetHelp}
              activeOpacity={0.7}
            >
              <Ionicons name="headset-outline" size={ICON_SIZES.regular} color="#1f2937" style={{marginRight: SPACING.small}} />
              <Text style={styles.actionButtonText}>Get Help</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancelOrder}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle-outline" size={ICON_SIZES.regular} color="#DC2626" style={{marginRight: SPACING.small}} />
              <Text style={[styles.actionButtonText, styles.cancelButtonText]}>Cancel Order</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Cancel Modal */}
      <Modal
        visible={showCancelModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseCancelModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={handleCloseCancelModal}
        >
          <TouchableOpacity 
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Select your reason</Text>

            {!showReasonOptions && (
              <TouchableOpacity
                style={styles.reasonSelector}
                onPress={() => setShowReasonOptions(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.reasonSelectorText, !selectedCancelReason && styles.placeholderText]}>
                  {selectedCancelReason || "Select your reason"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            )}

            {showReasonOptions && (
              <View style={styles.reasonList}>
                {cancelReasons.map((reason, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.reasonItem,
                      selectedCancelReason === reason && styles.selectedReasonItem
                    ]}
                    onPress={() => handleReasonSelect(reason)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.reasonItemContent}>
                      <View style={[
                        styles.radioCircle,
                        selectedCancelReason === reason && styles.radioCircleSelected
                      ]}>
                        {selectedCancelReason === reason && (
                          <View style={styles.radioDot} />
                        )}
                      </View>
                      <Text style={[
                        styles.reasonText,
                        selectedCancelReason === reason && styles.selectedReasonText
                      ]}>
                        {reason}
                      </Text>
                    </View>
                    {selectedCancelReason === reason && (
                      <Ionicons name="checkmark" size={ICON_SIZES.regular} color="#EC4D4A" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {showCustomInput && (
              <View style={styles.customInputWrapper}>
                <TextInput
                  style={styles.customInput}
                  placeholder="Enter your reason here..."
                  placeholderTextColor="#999"
                  value={customReason}
                  onChangeText={setCustomReason}
                  multiline={true}
                  numberOfLines={3}
                  textAlignVertical="top"
                  autoFocus={true}
                />
              </View>
            )}

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirmCancel}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle" size={ICON_SIZES.regular} color="#fff" style={{marginRight: SPACING.small}} />
              <Text style={styles.confirmButtonText}>CANCEL ORDER</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.medium,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + SPACING.medium : SPACING.medium,
    paddingBottom: SPACING.medium,
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  backButton: {
    padding: SPACING.tiny,
    width: scale(40),
  },
  headerTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: scale(40),
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.medium,
    paddingBottom: SPACING.xxlarge,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: BORDER_RADIUS.medium,
    marginBottom: SPACING.regular,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  amountCard: {
    backgroundColor: "#fff",
    borderRadius: BORDER_RADIUS.large,
    marginBottom: SPACING.medium,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#EC4D4A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  breakupCard: {
    backgroundColor: "#fff",
    borderRadius: BORDER_RADIUS.medium,
    marginBottom: SPACING.medium,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  breakupHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.medium,
    paddingBottom: SPACING.regular,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  breakupTitle: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "600",
    color: "#1f2937",
  },
  breakupContent: {
    padding: SPACING.medium,
    paddingTop: SPACING.regular,
  },
  breakupRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.regular,
  },
  breakupLabel: {
    fontSize: FONT_SIZES.regular,
    color: "#6b7280",
    fontWeight: "400",
  },
  breakupValue: {
    fontSize: FONT_SIZES.regular,
    color: "#1f2937",
    fontWeight: "500",
  },
  breakupLabelBold: {
    fontSize: FONT_SIZES.medium,
    color: "#1f2937",
    fontWeight: "600",
  },
  breakupValueBold: {
    fontSize: FONT_SIZES.medium,
    color: "#1f2937",
    fontWeight: "700",
  },
  deductionValue: {
    color: "#DC2626",
  },
  bonusValue: {
    color: "#22c55e",
  },
  totalEarnings: {
    color: "#EC4D4A",
    fontSize: FONT_SIZES.medium,
  },
  splitPaymentSection: {
    backgroundColor: "#F0F9FF",
    padding: SPACING.small,
    borderRadius: BORDER_RADIUS.medium,
    marginVertical: SPACING.small,
  },
  splitPaymentTitle: {
    fontSize: FONT_SIZES.small,
    fontWeight: "700",
    color: "#1976D2",
    marginBottom: SPACING.tiny,
  },
  walletValue: {
    color: "#1976D2",
    fontWeight: "600",
  },
  breakupDivider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: SPACING.small,
    marginBottom: SPACING.regular,
  },
  paymentCard: {
    backgroundColor: "#fff",
    borderRadius: BORDER_RADIUS.large,
    marginBottom: SPACING.medium,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  paymentHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.medium,
    backgroundColor: "#FEF2F2",
    borderBottomWidth: 1,
    borderBottomColor: "#FEE2E2",
  },
  paymentTitle: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "600",
    color: "#1f2937",
    marginLeft: SPACING.small,
  },
  paymentContent: {
    padding: SPACING.medium,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.small,
  },
  paymentLabel: {
    fontSize: FONT_SIZES.regular,
    color: "#6b7280",
    fontWeight: "500",
  },
  paymentBadge: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: SPACING.regular,
    paddingVertical: SPACING.tiny,
    borderRadius: BORDER_RADIUS.small,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  paymentBadgeText: {
    fontSize: FONT_SIZES.regular,
    color: "#EC4D4A",
    fontWeight: "600",
  },
  collectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dcfce7",
    paddingHorizontal: SPACING.regular,
    paddingVertical: SPACING.small,
    borderRadius: BORDER_RADIUS.small,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#86efac",
  },
  collectedText: {
    fontSize: FONT_SIZES.small,
    color: "#10b981",
    fontWeight: "600",
    marginLeft: SPACING.tiny,
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: SPACING.regular,
    paddingVertical: SPACING.small,
    borderRadius: BORDER_RADIUS.small,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  pendingText: {
    fontSize: FONT_SIZES.small,
    color: "#f59e0b",
    fontWeight: "600",
    marginLeft: SPACING.tiny,
  },
  amountContent: {
    flexDirection: "row",
    padding: SPACING.large,
  },
  amountLeft: {
    flex: 1,
  },
  amountLabel: {
    fontSize: FONT_SIZES.small,
    fontWeight: "600",
    color: "#9ca3af",
    marginBottom: SPACING.small,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  amountPrice: {
    fontSize: FONT_SIZES.huge,
    fontWeight: "800",
    color: "#EC4D4A",
    letterSpacing: -1,
  },
  tipBadge: {
    backgroundColor: "#22c55e",
    paddingHorizontal: SPACING.small,
    paddingVertical: SPACING.tiny,
    borderRadius: BORDER_RADIUS.medium,
    marginTop: moderateScale(6),
    alignSelf: "flex-start",
  },
  tipText: {
    color: "white",
    fontSize: FONT_SIZES.small,
    fontWeight: "600",
  },
  walletBadge: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: SPACING.small,
    paddingVertical: SPACING.tiny,
    borderRadius: BORDER_RADIUS.medium,
    marginTop: moderateScale(6),
    alignSelf: "flex-start",
  },
  walletBadgeText: {
    color: "#1976D2",
    fontSize: FONT_SIZES.small,
    fontWeight: "600",
  },
  amountDivider: {
    width: 1,
    backgroundColor: "#f3f4f6",
    marginHorizontal: SPACING.medium,
  },
  amountRight: {
    justifyContent: "center",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.small,
  },
  infoText: {
    fontSize: FONT_SIZES.regular,
    fontWeight: "500",
    color: "#4b5563",
  },
  amountHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.medium,
  },
  cardTitle: {
    fontSize: FONT_SIZES.small,
    fontWeight: "600",
    color: "#9ca3af",
    marginBottom: moderateScale(2),
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  vehicleType: {
    fontSize: FONT_SIZES.small,
    fontWeight: "500",
    color: "#6b7280",
    marginTop: SPACING.tiny,
  },
  amountValue: {
    fontSize: FONT_SIZES.xxlarge,
    fontWeight: "700",
    color: "#EC4D4A",
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.medium,
  },
  iconContainer: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.regular,
    position: "relative",
  },
  dropBadge: {
    position: "absolute",
    top: scale(-4),
    right: scale(-4),
    backgroundColor: "#EC4D4A",
    borderRadius: scale(10),
    width: scale(20),
    height: scale(20),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  dropBadgeText: {
    color: "#fff",
    fontSize: FONT_SIZES.tiny,
    fontWeight: "700",
  },
  locationHeaderText: {
    flex: 1,
  },
  locationTitle: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: moderateScale(2),
  },
  locationAddress: {
    fontSize: FONT_SIZES.small,
    color: "#6b7280",
    lineHeight: scale(18),
  },
  expandedContent: {
    paddingHorizontal: SPACING.medium,
    paddingBottom: SPACING.medium,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: moderateScale(10),
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  detailLabel: {
    fontSize: FONT_SIZES.small,
    fontWeight: "500",
    color: "#9ca3af",
    flex: 0.4,
  },
  detailValue: {
    fontSize: FONT_SIZES.regular,
    fontWeight: "500",
    color: "#1f2937",
    flex: 0.6,
    textAlign: "right",
  },
  coordinatesText: {
    fontSize: FONT_SIZES.tiny,
    color: "#6b7280",
    fontFamily: "monospace",
  },
  actionsContainer: {
    marginTop: SPACING.small,
  },
  actionButton: {
    backgroundColor: "#fff",
    borderRadius: BORDER_RADIUS.medium,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.medium,
    marginBottom: SPACING.regular,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "600",
    color: "#1f2937",
    marginLeft: SPACING.small,
  },
  cancelButton: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  cancelButtonText: {
    color: "#DC2626",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: BORDER_RADIUS.xlarge,
    borderTopRightRadius: BORDER_RADIUS.xlarge,
    padding: SPACING.xlarge,
    paddingBottom: SPACING.huge,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    maxHeight: "85%",
  },
  modalTitle: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: SPACING.medium,
    letterSpacing: -0.3,
  },
  reasonSelector: {
    backgroundColor: "#fff",
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.medium,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.medium,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reasonSelectorText: {
    fontSize: FONT_SIZES.medium,
    color: "#333",
    fontWeight: "500",
    flex: 1,
  },
  placeholderText: {
    color: "#999",
    fontWeight: "400",
  },
  reasonList: {
    marginBottom: SPACING.medium,
    backgroundColor: "#fff",
    borderRadius: BORDER_RADIUS.medium,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  reasonItem: {
    padding: SPACING.large,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },
  selectedReasonItem: {
    backgroundColor: "#FFF5F5",
  },
  reasonItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  radioCircle: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    borderWidth: 2,
    borderColor: "#D0D0D0",
    marginRight: SPACING.regular,
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: "#EC4D4A",
    borderWidth: 2,
  },
  radioDot: {
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    backgroundColor: "#EC4D4A",
  },
  reasonText: {
    fontSize: FONT_SIZES.medium,
    color: "#333",
    flex: 1,
  },
  selectedReasonText: {
    color: "#EC4D4A",
    fontWeight: "600",
  },
  customInputWrapper: {
    marginBottom: SPACING.medium,
  },
  customInput: {
    backgroundColor: "#fff",
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.medium,
    fontSize: FONT_SIZES.medium,
    color: "#333",
    borderWidth: 1.5,
    borderColor: "#EC4D4A",
    minHeight: scale(120),
    shadowColor: "#EC4D4A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  confirmButton: {
    backgroundColor: "#EC4D4A",
    borderRadius: BORDER_RADIUS.medium,
    paddingVertical: SPACING.medium,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EC4D4A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmButtonText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
});

export default OrderMenuScreen;
