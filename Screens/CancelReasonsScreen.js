import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const reasons = [
  'Customer not available',
  'Wrong address',
  'Vehicle issue',
  'Personal emergency',
  'Order assigned by mistake',
  'Other',
];

const CancelReasonsScreen = () => {
  const navigation = useNavigation();
  const [selectedReason, setSelectedReason] = useState(null);
  const [otherReason, setOtherReason] = useState('');

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#EC4D4A" />
      </TouchableOpacity>
      <Text style={styles.reasonTitle}>Reason for Cancel</Text>
      <View style={styles.reasonsList}>
        {reasons.map((reason, idx) => (
          <View key={idx}>
            <TouchableOpacity
              style={[styles.reasonItem, selectedReason === idx && styles.reasonItemSelected]}
              onPress={() => setSelectedReason(idx)}
            >
              <Ionicons
                name={selectedReason === idx ? 'radio-button-on' : 'radio-button-off'}
                size={18}
                color={selectedReason === idx ? '#EC4D4A' : '#aaa'}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.reasonText, selectedReason === idx && styles.reasonTextSelected]}>{reason}</Text>
            </TouchableOpacity>
            {reason === 'Other' && selectedReason === idx && (
              <TextInput
                style={styles.otherReasonInput}
                placeholder="Enter your reason"
                value={otherReason}
                onChangeText={setOtherReason}
                multiline
              />
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  backButton: {
    marginBottom: 16,
  },
  reasonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EC4D4A',
    marginBottom: 10,
    marginTop: 6,
  },
  reasonsList: {
    gap: 10,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#eee',
  },
  reasonItemSelected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EC4D4A',
  },
  reasonText: {
    fontSize: 14,
    color: '#1f2937',
  },
  reasonTextSelected: {
    color: '#EC4D4A',
    fontWeight: '700',
  },
  otherReasonInput: {
    borderWidth: 1,
    borderColor: '#EC4D4A',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    marginBottom: 8,
    minHeight: 40,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#1f2937',
  },
});

export default CancelReasonsScreen; 