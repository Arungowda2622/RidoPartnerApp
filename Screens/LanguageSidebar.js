import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी (Hindi)' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
  { code: 'tn', label: 'తెలుగు (Telugu)' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
];

export default function LanguageSidebar() {
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  const handleLanguageSelect = (code) => {
    setSelectedLanguage(code);
    // Add i18n language change logic here if needed
  };

  return (
    <LinearGradient colors={['#f0f4ff', '#ffffff']} style={styles.container}>
      <Text style={styles.title}>🌐 Choose Your Language</Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {languages.map((lang) => {
          const selected = selectedLanguage === lang.code;
          return (
            <TouchableOpacity
              key={lang.code}
              style={[styles.languageCard, selected && styles.selectedCard]}
              onPress={() => handleLanguageSelect(lang.code)}
              activeOpacity={0.8}
            >
              <Text style={[styles.languageText, selected && styles.selectedText]}>
                {lang.label}
              </Text>
              {selected && <Ionicons name="checkmark-circle" size={22} color="#EC4D4A" />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 50,
  },
  scroll: {
    paddingBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#1a1a1a',
  },
  languageCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  selectedCard: {
    backgroundColor: '#e6f0ff',
  },
  languageText: {
    fontSize: 18,
    color: '#333',
  },
  selectedText: {
    color: '#EC4D4A',
    fontWeight: 'bold',
  },
});