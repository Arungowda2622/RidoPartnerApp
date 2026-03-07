import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

const payoutData = [
  {
    id: '1',
    date: '2025-05-12',
    amount: 1200,
    status: 'Completed',
  },
  {
    id: '2',
    date: '2025-05-08',
    amount: 950,
    status: 'Completed',
  },
  {
    id: '3',
    date: '2025-05-01',
    amount: 1300,
    status: 'Pending',
  },
];

export default function PayoutScreen() {
  const handlePayoutRequest = () => {
    // Implement request payout logic
    alert('Payout request submitted!');
  };

  const renderItem = ({ item }) => (
    <View style={styles.payoutItem}>
      <View>
        <Text style={styles.date}>{item.date}</Text>
        <Text style={styles.status(item.status)}>{item.status}</Text>
      </View>
      <Text style={styles.amount}>₹{item.amount}</Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Payouts</Text>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceAmount}>₹4,350</Text>
        <TouchableOpacity style={styles.payoutButton} onPress={handlePayoutRequest}>
          <MaterialIcons name="account-balance-wallet" size={20} color="#fff" />
          <Text style={styles.payoutButtonText}>Request Payout</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.recentLabel}>Recent Payouts</Text>

      <FlatList
        data={payoutData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f2f6fc',
    flexGrow: 1,
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
    color: '#222',
  },
  balanceCard: {
    backgroundColor: '#14519c',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceLabel: {
    color: '#cde2ff',
    fontSize: 16,
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  payoutButton: {
    flexDirection: 'row',
    backgroundColor: '#0d3b72',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  payoutButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  recentLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  listContainer: {
    gap: 12,
  },
  payoutItem: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  date: {
    fontSize: 14,
    color: '#555',
  },
  status: (status) => ({
    fontSize: 14,
    fontWeight: '600',
    color: status === 'Completed' ? '#4caf50' : '#ff9800',
    marginTop: 4,
  }),
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },
});
