import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { API_CONFIG } from '../config/api';

/**
 * Rider Wallet API Utility
 * 
 * This utility handles wallet operations for RIDERS (partners/drivers).
 * For CUSTOMER wallet operations, see New-Customer-App/utils/AuthApi.js
 * 
 * Endpoints:
 * - GET  /api/v1/rider-wallet/balance   - Get rider wallet balance
 * - POST /api/v1/rider-wallet/add       - Add money to rider wallet
 * - POST /api/v1/rider-wallet/credit    - Credit rider wallet
 * - POST /api/v1/rider-wallet/debit     - Debit rider wallet
 * - GET  /api/v1/rider-wallet/history   - Get rider transaction history
 */

// Get rider wallet balance
export const getRiderWalletBalance = async () => {
  try {
    const phone = await AsyncStorage.getItem('number');
    if (!phone) throw new Error('No phone number found');

    const response = await axios.get(
      API_CONFIG.getEndpoint('rider-wallet/balance'), 
      { params: { phone } }
    );
    
    if (response.data && typeof response.data.balance !== 'undefined') {
      return { balance: response.data.balance || 0, riderId: response.data.riderId };
    }

    return { balance: 0 };
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return { balance: 0 };
  }
};

// Add money to rider wallet (requires payment gateway integration)
export const addMoneyToRiderWallet = async (amount, riderId) => {
  try {
    if (!riderId) throw new Error('Rider ID is required');
    if (!amount || amount <= 0) throw new Error('Invalid amount');

    // Credit wallet via backend
    const response = await axios.post(
      API_CONFIG.getEndpoint('rider-wallet/add'),
      {
        riderId: riderId,
        amount: amount
      }
    );

    if (response.data) {
      return { success: true, data: response.data };
    }
    
    throw new Error('Failed to add money');
  } catch (error) {
    console.error('Error adding money to wallet:', error);
    throw error;
  }
};

// Get rider wallet transactions
export const getRiderWalletTransactions = async (riderId) => {
  try {
    if (!riderId) throw new Error('Rider ID is required');

    const response = await axios.get(
      API_CONFIG.getEndpoint('rider-wallet/history'),
      { params: { riderId } }
    );

    if (response.data && Array.isArray(response.data)) {
      const transactions = response.data.map((txn) => ({
        _id: txn._id,
        transactionId: `TXN${txn._id.slice(-8).toUpperCase()}`,
        amount: Number(txn.amount) || 0,
        type: txn.type,
        createdAt: txn.createdAt,
        description: txn.description || 'Wallet transaction',
        bookingId: txn.bookingId
      }));
      
      return { transactions };
    }
    
    return { transactions: [] };
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return { transactions: [] };
  }
};
