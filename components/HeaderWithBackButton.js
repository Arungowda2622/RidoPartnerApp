import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const HeaderWithBackButton = ({ 
  title, 
  onBackPress, 
  rightComponent,
  style,
  titleStyle,
  backButtonColor = "#2d2d2d",
  backgroundColor = "#fff"
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      navigation.goBack();
    }
  };

  return (
    <>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor={backgroundColor} 
        translucent={false}
      />
      <View style={[styles.header, { backgroundColor, paddingTop: insets.top + 10 }, style]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Ionicons name="arrow-back" size={28} color={backButtonColor} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, titleStyle]}>{title}</Text>
        
        <View style={styles.rightContainer}>
          {rightComponent || <View style={{ width: 28 }} />}
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'center',
    flex: 1,
  },
  rightContainer: {
    alignItems: 'flex-end',
  },
});

export default HeaderWithBackButton;
