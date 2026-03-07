import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const OrderCard = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>1 Order</Text>

      <View style={styles.card}>
        <Text style={styles.bikeLabel}>🏍️ Bike</Text>

        <Text style={styles.price}>
          ₹25 <Text style={styles.cash}>+ ₹12 (Cash)</Text>
        </Text>

        <View style={styles.locationBlock}>
          <Text style={styles.km}>• 1.4 Km</Text>
          <Text style={styles.placeTitle}>Whitefield Sri Sathya Sai Hospital</Text>
          <Text style={styles.address}>Gate 1, Forum Shantiniketan Mall, NEXUS SHANTINIKETAN, Whitefield Main Road, Thigalarapalya</Text>

          <Text style={styles.km}>⬇ 2 Km</Text>
          <Text style={styles.placeTitle}>Whitefield</Text>
          <Text style={styles.address}>Gopalan International School, Seetharampalya - Hoodi Road, Shivaji Nagar, Hoodi</Text>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.rejectBtn}>
            <Ionicons name="close" size={20} color="#f44336" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptBtn}>
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default OrderCard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fafafa',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  bikeLabel: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    borderRadius: 8,
    marginBottom: 8,
    fontWeight: '600',
  },
  price: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  cash: {
    color: '#4CAF50',
  },
  locationBlock: {
    marginTop: 12,
  },
  km: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },
  placeTitle: {
    fontWeight: '700',
    fontSize: 15,
  },
  address: {
    fontSize: 13,
    color: '#555',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  rejectBtn: {
    backgroundColor: '#fff',
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#f44336',
    padding: 10,
  },
  acceptBtn: {
    backgroundColor: '#FFC107',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  acceptText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
