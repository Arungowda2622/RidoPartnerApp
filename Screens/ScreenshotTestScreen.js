import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

/**
 * Test screen to demonstrate the screenshot warning popup
 */
const ScreenshotTestScreen = () => {
  
  // Function to show the screenshot warning popup
  const showScreenshotWarning = () => {
    Alert.alert(
      '🚫 Screenshot Not Allowed',
      'Screenshots are restricted for privacy and copyright protection. Please respect user confidentiality and intellectual property rights.',
      [
        {
          text: 'I Understand',
          style: 'default',
          onPress: () => console.log('User acknowledged warning'),
        },
      ],
      {
        cancelable: false,
      }
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Screenshot Prevention Test</Text>
        
        <Text style={styles.description}>
          Screenshots are blocked in this app for privacy and copyright protection.
        </Text>

        <Text style={styles.info}>
          When enabled, users cannot take screenshots or screen recordings.
          If they try, they'll see a warning popup.
        </Text>

        <TouchableOpacity 
          style={styles.button}
          onPress={showScreenshotWarning}
        >
          <Text style={styles.buttonText}>
            Preview Warning Popup
          </Text>
        </TouchableOpacity>

        <View style={styles.noteContainer}>
          <Text style={styles.noteTitle}>Note:</Text>
          <Text style={styles.noteText}>
            • The actual screenshot prevention is already active app-wide
          </Text>
          <Text style={styles.noteText}>
            • This button just shows you what the warning looks like
          </Text>
          <Text style={styles.noteText}>
            • Try taking a screenshot now - it won't work!
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 24,
  },
  info: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noteContainer: {
    marginTop: 40,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  noteText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    lineHeight: 20,
  },
});

export default ScreenshotTestScreen;
