import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRoute, useNavigation } from "@react-navigation/native";
import HeaderWithBackButton from "../components/HeaderWithBackButton";

const TripDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { trip } = route.params;

  // Get real-time earnings breakdown from booking data
  const getEarningsBreakdown = (booking) => {
    const feeBreakdown = booking?.feeBreakdown || {};
    
    return {
      tripFare: parseFloat(booking?.price || 0),
      platformFee: parseFloat(feeBreakdown.platformFee || 0),
      platformFeePercentage: parseFloat(feeBreakdown.platformFeePercentage || 0),
      gstAmount: parseFloat(feeBreakdown.gstAmount || 0),
      gstPercentage: parseFloat(feeBreakdown.gstPercentage || 0),
      riderEarnings: parseFloat(feeBreakdown.riderEarnings || booking?.totalDriverEarnings || booking?.price || 0),
      quickFee: parseFloat(booking?.quickFee || 0)
    };
  };

  const breakdown = getEarningsBreakdown(trip);

  // Check if images are available
  const pickupImageCount = trip.pickupImages?.length || 0;
  const dropImageCount = trip.dropImages?.length || 0;
  const totalImages = pickupImageCount + dropImageCount;
  const hasImages = totalImages > 0;

  const handleViewImages = () => {
    navigation.navigate('BookingImages', { booking: trip });
  };

  return (
    <View style={styles.safeArea}>
      <HeaderWithBackButton title="Trip Details" />
      
      <ScrollView style={styles.container}>
        {/* Trip ID and Date */}
        <View style={styles.headerSection}>
          <Text style={styles.tripIdText}>
            {trip?._id ? `#${trip._id.slice(-8).toUpperCase()}` : 'Trip ID'}
          </Text>
          <Text style={styles.tripDateText}>
            {trip?.createdAt ? 
              new Date(trip.createdAt).toLocaleDateString('en-GB') + ', ' +
              new Date(trip.createdAt).toLocaleTimeString('en-IN', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              }) : 'Trip Date'
            }
          </Text>
          {trip?.completedAt && (
            <View style={styles.completionTimeContainer}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.completionTimeText}>
                Completed at {new Date(trip.completedAt).toLocaleTimeString('en-IN', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </Text>
            </View>
          )}
        </View>

        {/* Trip Route */}
        <View style={styles.tripRouteCard}>
          <View style={styles.tripRouteHeader}>
            <Ionicons name="location-outline" size={20} color="#666" />
            <Text style={styles.tripRouteTitle}>Trip Route</Text>
          </View>

          <View style={styles.routeContainer}>
            {/* Pickup Point */}
            <View style={styles.routeItemRow}>
              <View style={styles.leftIndicator}>
                <View style={styles.pickupDot} />
                <View style={styles.routeLine} />
              </View>
              <View style={styles.routeContent}>
                <Text style={styles.routeLabel}>Pickup</Text>
                <View style={styles.routeAddressContainer}>
                  <Text style={styles.routeTime}>
                    {trip.createdAt ? 
                      new Date(trip.createdAt).toLocaleTimeString('en-IN', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true 
                      }) : 'N/A'
                    }
                  </Text>
                  <Text style={styles.routeAddress}>
                    {trip.fromAddress?.address || 'Pickup location'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Drop Points */}
            {trip.dropLocation && trip.dropLocation.length > 0 ? (
              trip.dropLocation.map((dropPoint, index) => (
                <View key={index} style={styles.routeItemRow}>
                  <View style={styles.leftIndicator}>
                    {index < trip.dropLocation.length - 1 ? (
                      <>
                        <View style={styles.stopDot} />
                        <View style={styles.routeLine} />
                      </>
                    ) : (
                      <View style={styles.dropDot} />
                    )}
                  </View>
                  <View style={styles.routeContent}>
                    <Text style={styles.routeLabel}>
                      {index === trip.dropLocation.length - 1 ? 'Drop-off' : `Stop ${index + 1}`}
                    </Text>
                    <View style={styles.routeAddressContainer}>
                      <Text style={styles.routeTime}>
                        {trip.createdAt ? 
                          (() => {
                            const estimatedTime = new Date(trip.createdAt);
                            // Add estimated delivery time based on drop sequence
                            estimatedTime.setMinutes(estimatedTime.getMinutes() + (30 + (index * 15)));
                            return estimatedTime.toLocaleTimeString('en-IN', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: true 
                            });
                          })() : 'N/A'
                        }
                      </Text>
                      <Text style={styles.routeAddress}>
                        {dropPoint?.Address || dropPoint?.address || 'Drop location'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.routeItemRow}>
                <View style={styles.leftIndicator}>
                  <View style={styles.dropDot} />
                </View>
                <View style={styles.routeContent}>
                  <Text style={styles.routeLabel}>Drop-off</Text>
                  <View style={styles.routeAddressContainer}>
                    <Text style={styles.routeTime}>
                      {trip.createdAt ? 
                        (() => {
                          const estimatedTime = new Date(trip.createdAt);
                          estimatedTime.setMinutes(estimatedTime.getMinutes() + 30);
                          return estimatedTime.toLocaleTimeString('en-IN', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: true 
                          });
                        })() : 'N/A'
                      }
                    </Text>
                    <Text style={styles.routeAddress}>Drop location</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Earnings Breakdown */}
        <View style={styles.earningsBreakdownContainer}>
          <Text style={styles.breakdownTitle}>Your Earning</Text>
          <Text style={styles.totalEarning}>
            ₹{breakdown.riderEarnings.toFixed(2)}
          </Text>

          {/* Detailed Breakdown */}
          <View style={styles.detailBreakdown}>
            <Text style={styles.breakdownSectionTitle}>Earning Details</Text>
            
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Trip Fare</Text>
              <Text style={styles.breakdownValue}>
                + ₹{breakdown.tripFare.toFixed(2)}
              </Text>
            </View>

            {breakdown.quickFee > 0 && (
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Quick Fee</Text>
                <Text style={styles.breakdownValue}>
                  + ₹{breakdown.quickFee.toFixed(2)}
                </Text>
              </View>
            )}

            {breakdown.platformFee > 0 && (
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>
                  Platform Fee ({breakdown.platformFeePercentage.toFixed(0)}%)
                </Text>
                <Text style={styles.breakdownDebit}>- ₹{breakdown.platformFee.toFixed(2)}</Text>
              </View>
            )}

            {breakdown.gstAmount > 0 && (
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>
                  GST ({breakdown.gstPercentage.toFixed(0)}%)
                </Text>
                <Text style={styles.breakdownDebit}>- ₹{breakdown.gstAmount.toFixed(2)}</Text>
              </View>
            )}

            <View style={[styles.breakdownItem, styles.totalBreakdownItem]}>
              <Text style={styles.partnerEarningLabel}>Partner Earning</Text>
              <Text style={styles.partnerEarningValue}>
                ₹{breakdown.riderEarnings.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Collection Information */}
        <View style={styles.paymentCollectionCard}>
          <View style={styles.paymentCollectionHeader}>
            <Ionicons 
              name={trip.payFrom?.toLowerCase().includes('pickup') ? "location" : 
                    trip.payFrom?.toLowerCase().includes('drop') || trip.payFrom?.toLowerCase().includes('delivery') ? "flag" : 
                    "wallet"} 
              size={20} 
              color="#EC4D4A" 
            />
            <Text style={styles.paymentCollectionTitle}>Payment Information</Text>
          </View>
          <View style={styles.paymentCollectionContent}>
            <View style={styles.paymentInfoRow}>
              <Text style={styles.paymentInfoLabel}>Payment Method:</Text>
              <View style={styles.paymentMethodBadge}>
                <Text style={styles.paymentMethodText}>
                  {trip.payFrom?.toLowerCase().includes('pickup') ? '📍 Cash at Pickup' :
                   trip.payFrom?.toLowerCase().includes('drop') || trip.payFrom?.toLowerCase().includes('delivery') ? '🏁 Cash at Drop' :
                   trip.payFrom?.toLowerCase().includes('wallet') || trip.payFrom?.toLowerCase().includes('online') ? '💳 Paid Online' :
                   trip.payFrom || 'Not specified'}
                </Text>
              </View>
            </View>
            {trip.payFrom?.toLowerCase().includes('wallet') || trip.payFrom?.toLowerCase().includes('online') ? (
              <View style={styles.paidOnlineBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.paidOnlineText}>Already Paid Online</Text>
              </View>
            ) : (
              trip.cashCollected ? (
                <View style={styles.collectedStatusBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                  <Text style={styles.collectedStatusText}>Cash Collected</Text>
                </View>
              ) : (
                <View style={styles.pendingStatusBadge}>
                  <Ionicons name="alert-circle" size={16} color="#f59e0b" />
                  <Text style={styles.pendingStatusText}>Cash Not Collected</Text>
                </View>
              )
            )}
          </View>
        </View>

        {/* View Images Button */}
        {hasImages && (
          <TouchableOpacity 
            style={styles.viewImagesButton}
            onPress={handleViewImages}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#EC4D4A', '#D43D3A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.viewImagesGradient}
            >
              <View style={styles.viewImagesContent}>
                <Ionicons name="images" size={20} color="#fff" />
                <Text style={styles.viewImagesText}>
                  View Booking Images ({totalImages})
                </Text>
                <View style={styles.imageBadge}>
                  <Text style={styles.imageBadgeText}>{pickupImageCount}</Text>
                  <Ionicons name="arrow-up" size={12} color="#fff" style={styles.badgeIcon} />
                  <Text style={styles.imageBadgeText}>{dropImageCount}</Text>
                  <Ionicons name="arrow-down" size={12} color="#fff" style={styles.badgeIcon} />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 20,
  },
  headerSection: {
    paddingVertical: 16,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  tripIdText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4285F4",
    marginBottom: 4,
  },
  tripDateText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  completionTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 6,
  },
  completionTimeText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#4CAF50",
  },

  // Trip Route
  tripRouteCard: {
    backgroundColor: "#fff",
    marginVertical: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tripRouteHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  tripRouteTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  routeContainer: {
    paddingLeft: 4,
  },
  routeItemRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  leftIndicator: {
    width: 24,
    alignItems: "center",
    marginRight: 16,
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4CAF50",
    marginTop: 6,
  },
  stopDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF9800",
    marginTop: 6,
  },
  dropDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E53935",
    marginTop: 6,
  },
  routeLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 4,
    minHeight: 40,
  },
  routeContent: {
    flex: 1,
    paddingBottom: 12,
  },
  routeLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  routeAddressContainer: {
    marginLeft: 0,
  },
  routeTime: {
    fontSize: 13,
    color: "#999",
    marginBottom: 4,
  },
  routeAddress: {
    fontSize: 15,
    color: "#333",
    lineHeight: 20,
  },

  // Payment Collection Card
  paymentCollectionCard: {
    backgroundColor: "#fff",
    marginVertical: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  paymentCollectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  paymentCollectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  paymentCollectionContent: {
    paddingTop: 12,
  },
  paymentInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  paymentInfoLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  paymentMethodBadge: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  paymentMethodText: {
    fontSize: 13,
    color: "#EC4D4A",
    fontWeight: "600",
  },
  paidOnlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#86efac",
  },
  paidOnlineText: {
    fontSize: 13,
    color: "#10b981",
    fontWeight: "600",
    marginLeft: 6,
  },
  collectedStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#86efac",
  },
  collectedStatusText: {
    fontSize: 13,
    color: "#10b981",
    fontWeight: "600",
    marginLeft: 6,
  },
  pendingStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  pendingStatusText: {
    fontSize: 13,
    color: "#f59e0b",
    fontWeight: "600",
    marginLeft: 6,
  },

  // Earnings Breakdown
  earningsBreakdownContainer: {
    backgroundColor: "#fff",
    padding: 16,
    marginVertical: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  breakdownTitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  totalEarning: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },

  // Settlement Section
  settlementSection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  settlementTitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    fontWeight: "600",
  },
  settlementItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  paymentMethod: {
    flexDirection: "row",
    alignItems: "center",
  },
  cashIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cashIconText: {
    fontSize: 14,
  },
  walletIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  paymentLabel: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  paymentAmount: {
    fontSize: 15,
    color: "#4CAF50",
    fontWeight: "600",
  },
  debitAmount: {
    fontSize: 15,
    color: "#F44336",
    fontWeight: "600",
  },

  // Detailed Breakdown
  detailBreakdown: {
    paddingTop: 4,
  },
  breakdownSectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  breakdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: "#666",
  },
  breakdownValue: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "500",
  },
  breakdownDebit: {
    fontSize: 14,
    color: "#F44336",
    fontWeight: "500",
  },
  totalBreakdownItem: {
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    marginTop: 8,
    paddingTop: 16,
  },
  partnerEarningLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  partnerEarningValue: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#4285F4",
  },

  // View Images Button
  viewImagesButton: {
    marginVertical: 16,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  viewImagesGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  viewImagesContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  viewImagesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  imageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  imageBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  badgeIcon: {
    marginHorizontal: 2,
  },
});

export default TripDetailScreen;
