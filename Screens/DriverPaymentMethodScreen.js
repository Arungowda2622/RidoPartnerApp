import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
const DriverPaymentMethodsScreen = () => {

  const navigation = useNavigation();

  const handleSubmit = async () => {

    await AsyncStorage.removeItem("complete");
    // Mark payment as completed
    await AsyncStorage.setItem("paymentCompleted", "true");

    // console.log('Submitting:', { driverName, licenseImage, driverMobile });
    // Alert.alert('Success', 'Owner details submitted successfully!');
    // Navigate to MyVehiclesScreen to show verification status
    navigation.replace('My Vehicle');
  };
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Icon name="arrow-back" size={24} />
        <Text style={styles.headerTitle}>Payment Methods</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Payment Summary */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}> Payment</Text>
          <Text style={styles.summaryAmount}>₹29</Text>
        </View>

        {/* Coupons */}
        {/* <TouchableOpacity style={styles.couponBox}>
          <Text style={styles.couponText}>Coupons available</Text>
          <Icon name="chevron-forward" size={20} color="#555" />
        </TouchableOpacity> */}

        {/* UPI Section */}
        <Text style={styles.sectionTitle}>UPI</Text>
        <View style={styles.upiBox}>
          <View style={styles.upiRow}>
            <Image source={require('../assets/upi.png')} style={styles.upiIcon} />
            <Text style={styles.upiText}>Pay by Any UPI app</Text>
            <View style={styles.radioBtn} />
          </View>

          <View style={styles.upiAppsRow}>
            {['gpay', 'phonepe', 'cred', 'paytm', 'amazon'].map((app, index) => (
              <View style={styles.appItem} key={index}>
                <Image
                  source={{ uri: `https://your-cdn.com/icons/${app}.png` }} // Replace with actual URLs
                  style={styles.appIcon}
                />
                <Text style={styles.appLabel}>
                  {app === 'gpay' ? 'GPay' :
                    app === 'phonepe' ? 'PhonePe' :
                      app === 'cred' ? 'CRED UPI' :
                        app === 'paytm' ? 'Paytm' : 'Amazon Pay UPI'}
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity>
            <Text style={styles.linkText}>Other UPI Options</Text>
          </TouchableOpacity>
        </View>

        {/* Credit/Debit */}
        <TouchableOpacity style={styles.cardBox}>
          <Icon name="card-outline" size={24} color="#000" />
          <Text style={styles.cardText}>Credit / Debit Card</Text>
          <Icon name="chevron-forward" size={20} color="#555" />
        </TouchableOpacity>
      </ScrollView>

      {/* Proceed Button */}
      <TouchableOpacity style={styles.proceedBtn} onPress={handleSubmit}>
        <Text style={styles.proceedText}>Proceed to Pay ₹29</Text>
      </TouchableOpacity>
    </View>
  );
};

export default DriverPaymentMethodsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 16, marginTop: 18,
    borderBottomWidth: 1, borderColor: '#ddd',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 8 },

  scrollContainer: { padding: 16 },

  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12,
  },
  summaryText: { fontSize: 16 },
  summaryAmount: { fontSize: 16, fontWeight: 'bold' },

  couponBox: {
    backgroundColor: '#f7f7f7', padding: 12,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', borderRadius: 8, marginBottom: 20,
  },
  couponText: { fontSize: 14, color: '#000' },

  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },

  upiBox: {
    backgroundColor: '#f2f2f2', padding: 12,
    borderRadius: 10, marginBottom: 20,
  },
  upiRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 12,
  },
  upiIcon: { width: 24, height: 24, marginRight: 10 },
  upiText: { flex: 1, fontSize: 14 },
  radioBtn: {
    width: 18, height: 18, borderWidth: 1,
    borderColor: '#888', borderRadius: 9,
  },

  upiAppsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 10,
  },
  appItem: { alignItems: 'center', width: 60 },
  appIcon: { width: 36, height: 36, marginBottom: 4 },
  appLabel: { fontSize: 10, textAlign: 'center' },

  linkText: { color: '#1a73e8', fontSize: 12 },

  cardBox: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderWidth: 1, borderColor: '#ddd',
    borderRadius: 10, marginBottom: 20,
  },
  cardText: { flex: 1, fontSize: 14, marginLeft: 10 },

  proceedBtn: {
    backgroundColor: '#ef4444', padding: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderRadius: 12, margin: 16, padding: 16
  },
  proceedText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
