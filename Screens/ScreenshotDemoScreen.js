import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenshotWarningModal from '../components/ScreenshotWarningModal';

/**
 * Demo Screen to Show Screenshot Warning Popup
 * This screen demonstrates the exact popup that appears when users try to take screenshots
 */
const ScreenshotDemoScreen = ({ navigation }) => {
  const [modalVisible, setModalVisible] = useState(false);
  
  /**
   * Show the custom screenshot warning modal
   */
  const showScreenshotWarning = () => {
    setModalVisible(true);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Screenshot Prevention Demo</Text>
      </View>

      <View style={styles.content}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={60} color="#007AFF" />
          <Text style={styles.mainTitle}>Privacy Protection Active</Text>
          <Text style={styles.subtitle}>
            Screenshots and screen recording are now blocked app-wide
          </Text>
        </View>

        {/* Demo Button */}
        <View style={styles.demoSection}>
          <Text style={styles.sectionTitle}>See the Warning Popup</Text>
          <Text style={styles.sectionDescription}>
            Click the button below to see exactly what users will see if they try to take a screenshot:
          </Text>
          
          <TouchableOpacity 
            style={styles.demoButton}
            onPress={showScreenshotWarning}
            activeOpacity={0.8}
          >
            <Ionicons name="eye" size={24} color="#fff" />
            <Text style={styles.demoButtonText}>Show Warning Popup</Text>
          </TouchableOpacity>
        </View>

        {/* How It Works */}
        <View style={styles.howItWorksCard}>
          <Text style={styles.cardTitle}>How It Works</Text>
          
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.featureText}>
              Screenshots are automatically blocked on all screens
            </Text>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.featureText}>
              Screen recording is also prevented
            </Text>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.featureText}>
              Works on both Android and iOS devices
            </Text>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.featureText}>
              Popup warning appears when screenshot is attempted (Android)
            </Text>
          </View>
        </View>

        {/* Test Instructions */}
        <View style={styles.testCard}>
          <Text style={styles.cardTitle}>🧪 Test It Now!</Text>
          <Text style={styles.testInstruction}>
            1. Try taking a screenshot of this screen right now
          </Text>
          <Text style={styles.testInstruction}>
            2. On Android: You'll see the warning popup
          </Text>
          <Text style={styles.testInstruction}>
            3. On iOS: Screenshot will be blocked (no warning, just prevention)
          </Text>
          <Text style={styles.testInstruction}>
            4. Either way, no screenshot will be saved! ✅
          </Text>
        </View>

        {/* Technical Details */}
        <View style={styles.techCard}>
          <Text style={styles.cardTitle}>📋 Implementation Details</Text>
          <Text style={styles.techText}>
            <Text style={styles.techBold}>File: </Text>
            utils/ScreenshotPrevention.js
          </Text>
          <Text style={styles.techText}>
            <Text style={styles.techBold}>Package: </Text>
            expo-screen-capture
          </Text>
          <Text style={styles.techText}>
            <Text style={styles.techBold}>Status: </Text>
            ✅ Active app-wide (via App.js)
          </Text>
        </View>
      </View>
      
      <ScreenshotWarningModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  content: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  demoSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  sectionDescription: {
    fontSize: 15,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  demoButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 10,
  },
  demoButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  howItWorksCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#555',
    flex: 1,
    lineHeight: 22,
  },
  testCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  testInstruction: {
    fontSize: 15,
    color: '#333',
    marginBottom: 10,
    lineHeight: 22,
  },
  techCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  techText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  techBold: {
    fontWeight: 'bold',
    color: '#1976D2',
  },
});

export default ScreenshotDemoScreen;
