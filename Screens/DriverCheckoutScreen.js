import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; 
import { useNavigation } from '@react-navigation/native';// for back arrow icon

const DriverCheckoutScreen = () => {
      const navigation = useNavigation();
  const totalAmount = 29;

  const handleSubmit = () => {
    
      // Alert.alert('Success', 'Driver details submitted successfully!');
     navigation.replace('Driver Payment Method');
    };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="arrow-back" size={24} color="black" />
        <Text style={styles.headerTitle}>Checkout</Text>
      </View>

      {/* Order Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Order Summary</Text>

        <View style={styles.itemRow}>
          <View>
            <Text style={styles.itemTitle}>Registration Fee</Text>
            <Text style={styles.itemSubtitle}>Fee for waitlisting</Text>
          </View>
          <Text style={styles.itemPrice}>₹{totalAmount}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.totalRow}>
          <Text style={styles.totalText}>Total</Text>
          <Text style={styles.totalAmount}>₹{totalAmount}</Text>
        </View>
      </View>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        {/* <View style={styles.secureBadge}> */}
          {/* <Ionicons name="shield-checkmark" size={16} color="green" /> */}
          {/* <Text style={styles.secureText}> 100% SECURE PAYMENTS</Text> */}
        {/* </View> */}

        <TouchableOpacity style={styles.payButton} onPress={handleSubmit}>
          <Text style={styles.payButtonText}>PAY ₹{totalAmount}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default DriverCheckoutScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
    marginTop:18
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  summaryContainer: {
    backgroundColor: 'white',
    padding: 16,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
    color: '#333',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111',
  },
  itemSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111',
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  totalAmount: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#F8F9FB',
    paddingVertical: 18,
    // paddingHorizontal: 16,
    padding:18
    // borderTopWidth: 1,
    // borderTopColor: '#ddd',
  },
  secureBadge: {
    backgroundColor: '#E8FFF1',
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  secureText: {
    color: 'green',
    fontSize: 12,
    fontWeight: '500',
  },
  payButton: {
    // backgroundColor: '#ef4444', // bright blue
    // paddingVertical: 14,
    // borderRadius: 8,
    // padding:12,
    // alignItems: 'center',
    
    backgroundColor: '#ef4444',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    // marginLeft:22
  },
  payButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
