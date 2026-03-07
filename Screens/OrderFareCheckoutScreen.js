import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

const OrderFareCheckoutScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const booking = route?.params?.booking;
  const amount = route?.params?.amount || booking?.totalDriverEarnings || booking?.amountPay || booking?.price || '--';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="checkmark-circle" size={28} color="#EC4D4A" />
        <Text style={styles.headerTitle}>Order Checkout</Text>
      </View>

      {/* Fare Card */}
      <View style={styles.card}>
        <Text style={styles.label}>Fare</Text>
        <Text style={styles.value}>₹{amount}</Text>
        <View style={styles.divider} />
        <Text style={styles.label}>Total to be collect cash</Text>
        <Text style={styles.value}>₹{amount}</Text>
      </View>

      {/* Fare Breakdown Card */}
      {booking?.priceBreakdown && (
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Fare Breakdown</Text>
          
          {/* Trip Charges Section */}
          <View style={styles.breakdownSection}>
            <Text style={styles.sectionTitle}>Trip Charges</Text>
            
            {booking.priceBreakdown.baseFare > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Base Fare</Text>
                <Text style={styles.breakdownValue}>₹{booking.priceBreakdown.baseFare.toFixed(2)}</Text>
              </View>
            )}
            
            {booking.priceBreakdown.distanceCharge > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  Distance ({booking.distance ? booking.distance.toFixed(1) : '0'} km)
                </Text>
                <Text style={styles.breakdownValue}>₹{booking.priceBreakdown.distanceCharge.toFixed(2)}</Text>
              </View>
            )}
            
            {booking.priceBreakdown.trafficCharge > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Traffic Surcharge</Text>
                <Text style={styles.breakdownValue}>₹{booking.priceBreakdown.trafficCharge.toFixed(2)}</Text>
              </View>
            )}
            
            {booking.priceBreakdown.weatherCharge > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Weather Surcharge</Text>
                <Text style={styles.breakdownValue}>₹{booking.priceBreakdown.weatherCharge.toFixed(2)}</Text>
              </View>
            )}
            
            {booking.priceBreakdown.waitingCharge > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Waiting Charges</Text>
                <Text style={styles.breakdownValue}>₹{booking.priceBreakdown.waitingCharge.toFixed(2)}</Text>
              </View>
            )}
            
            {booking.priceBreakdown.loadCharge > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Load Charges</Text>
                <Text style={styles.breakdownValue}>₹{booking.priceBreakdown.loadCharge.toFixed(2)}</Text>
              </View>
            )}
            
            {booking.priceBreakdown.pickupComplexity > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Pickup Complexity</Text>
                <Text style={styles.breakdownValue}>₹{booking.priceBreakdown.pickupComplexity.toFixed(2)}</Text>
              </View>
            )}
          </View>

          {/* Surge Badge */}
          {booking.priceBreakdown.surgeMultiplier > 1 && (
            <View style={styles.surgeBadgeContainer}>
              <Ionicons name="flash" size={14} color="#FF6B6B" />
              <Text style={styles.surgeBadgeText}>
                {booking.priceBreakdown.surgeMultiplier.toFixed(1)}x Surge Applied
              </Text>
            </View>
          )}

          {/* Total & Deductions */}
          <View style={styles.divider} />
          
          <View style={styles.breakdownRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{amount}</Text>
          </View>
          
          {booking.platformFee > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.deductionLabel}>Platform Fee ({booking.platformFeePercentage || 10}%)</Text>
              <Text style={styles.deductionValue}>-₹{booking.platformFee.toFixed(2)}</Text>
            </View>
          )}

          {/* Earnings Highlight */}
          {booking.riderEarnings > 0 && (
            <View style={styles.earningsHighlight}>
              <View style={styles.earningsRow}>
                <Ionicons name="wallet" size={20} color="#4CAF50" />
                <Text style={styles.earningsLabel}>Your Earnings</Text>
              </View>
              <Text style={styles.earningsValue}>₹{booking.riderEarnings.toFixed(2)}</Text>
            </View>
          )}

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={16} color="#2196F3" />
            <Text style={styles.infoText}>
              Collect ₹{amount} from customer. Your earnings (₹{booking.riderEarnings?.toFixed(2) || amount}) will be added to your wallet.
            </Text>
          </View>
        </View>
      )}

      {/* Done Button */}
      <TouchableOpacity style={styles.doneButton} onPress={() => navigation.navigate('OrderReviewScreen')}>
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#EC4D4A',
    marginLeft: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    marginBottom: 40,
    width: '100%',
    shadowColor: '#EC4D4A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    color: '#EC4D4A',
    fontWeight: '600',
    marginBottom: 6,
  },
  value: {
    fontSize: 28,
    color: '#1f2937',
    fontWeight: '700',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    width: '80%',
    marginVertical: 12,
  },
  doneButton: {
    backgroundColor: '#EC4D4A',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 60,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  doneButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  breakdownCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  breakdownSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#4b5563',
    flex: 1,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  surgeBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginVertical: 8,
  },
  surgeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B6B',
    marginLeft: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EC4D4A',
  },
  deductionLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  deductionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  earningsHighlight: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  earningsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginLeft: 8,
  },
  earningsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4CAF50',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 12,
    color: '#1565C0',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
});

export default OrderFareCheckoutScreen; 