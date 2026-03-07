import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const languages = [
  { label: 'English', value: 'en', icon: 'A' },
  { label: 'हिन्दी', value: 'hi', icon: 'अ' },
  { label: 'ಕನ್ನಡ', value: 'kn', icon: 'ಅ' },
  { label: 'తెలుగు', value: 'te', icon: 'ఆ' },
  { label: 'தமிழ்', value: 'ta', icon: 'அ' },
];

const LanguageSelectorScreen = () => {
  const [selected, setSelected] = useState('en');
  const navigation = useNavigation();

  const handleContinue = () => {
    navigation.replace('MobileNumber');
  };

  return (
    <View style={styles.container}>
      <View style={styles.innerContent}>
        <Text style={styles.title}>Choose Language</Text>
        <Text style={styles.subtitle}>
          Your language preference can be changed anytime in settings
        </Text>

       <View style={styles.languageContainer}>
  {Array.from({ length: Math.ceil(languages.length / 2) }, (_, i) => (
    <View key={i} style={styles.row}>
      {languages.slice(i * 2, i * 2 + 2).map((lang) => (
        <TouchableOpacity
          key={lang.value}
          style={[
            styles.languageCard,
            selected === lang.value && styles.selectedCard,
          ]}
          onPress={() => setSelected(lang.value)}
        >
          <Text style={styles.langLabel}>{lang.label}</Text>
          <Text style={styles.langIcon}>{lang.icon}</Text>
          {selected === lang.value && (
            <Ionicons
              name="checkmark-circle"
              size={24}
              color="#fff"
              style={styles.checkIcon}
            />
          )}
        </TouchableOpacity>
      ))}
    </View>
  ))}
</View>
      </View>

      <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
};

export default LanguageSelectorScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    padding: 20,
    paddingTop: 80,
    justifyContent: 'space-between',
  },
  innerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#666',
    textAlign: 'center',
    marginVertical: 10,
  },
  languageContainer: {
    marginTop: 30,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 20,
  },
  rowCenter: {
    alignItems: 'center',
  },
  languageCard: {
    width: 130,
    height: 120,
    backgroundColor: '#50B8E7',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  selectedCard: {
    backgroundColor: '#0066FF',
  },
  langLabel: {
    color: 'white',
    fontSize: 16,
    marginBottom: 10,
  },
  langIcon: {
    color: 'white',
    fontSize: 36,
  },
  checkIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  continueButton: {
    backgroundColor: '#0066FF',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  continueText: {
    color: 'white',
    fontSize: 16,
    paddingHorizontal: 60,
  },
});


