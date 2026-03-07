import React from 'react';
import {
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  ScrollView,
  View,
} from 'react-native';

const KeyboardAwareWrapper = ({ 
  children, 
  behavior = Platform.OS === 'ios' ? 'padding' : 'height',
  keyboardVerticalOffset = Platform.OS === 'ios' ? 0 : 20,
  enableScrollView = false,
  style = { flex: 1 },
  contentContainerStyle = { flexGrow: 1 },
  showsVerticalScrollIndicator = false,
  keyboardShouldPersistTaps = "handled",
  bounces = false,
  enableOnAndroid = true,
}) => {
  
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  // For Android, sometimes we want to disable KeyboardAvoidingView
  // as it can cause issues with certain layouts
  const shouldUseKeyboardAvoidingView = Platform.OS === 'ios' || enableOnAndroid;

  const renderContent = () => {
    if (enableScrollView) {
      return (
        <ScrollView 
          contentContainerStyle={contentContainerStyle}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          bounces={bounces}
        >
          {children}
        </ScrollView>
      );
    }
    
    return (
      <View style={{ flex: 1 }}>
        {children}
      </View>
    );
  };

  if (shouldUseKeyboardAvoidingView) {
    return (
      <KeyboardAvoidingView 
        style={style}
        behavior={behavior}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          {renderContent()}
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    );
  }

  // For Android when KeyboardAvoidingView is disabled
  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={style}>
        {renderContent()}
      </View>
    </TouchableWithoutFeedback>
  );
};

export default KeyboardAwareWrapper;