import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const SupportOptionsScreen = () => {
  const navigation = useNavigation();
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#EC4D4A" />
      </TouchableOpacity>
      <Text style={styles.title}>Support Options</Text>
      <TouchableOpacity style={styles.supportOptionButton}>
        <Text style={styles.supportOptionText}>Call Back Request</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.supportOptionButton}>
        <Text style={styles.supportOptionText}>Live Chat</Text>
      </TouchableOpacity>
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
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EC4D4A',
    marginBottom: 20,
  },
  supportOptionButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#EC4D4A',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    alignSelf: 'center',
    elevation: 2,
  },
  supportOptionText: {
    color: '#EC4D4A',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default SupportOptionsScreen; 