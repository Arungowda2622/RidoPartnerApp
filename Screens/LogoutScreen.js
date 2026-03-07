// // screens/LogoutScreen.js
// import React, { useEffect } from 'react';
// import { View, ActivityIndicator, StyleSheet } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const LogoutScreen = ({ navigation }) => {
//   useEffect(() => {
//     const logout = async () => {
//       await AsyncStorage.clear(); // or remove specific keys
//       navigation.replace('LanguageSelector'); // or your login screen
//     };
//     logout();
//   }, []);

//   return (
//     <View style={styles.container}>
//       <ActivityIndicator size="large" color="#0066FF" />
//     </View>
//   );
// };

// export default LogoutScreen;

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
// });


import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LogoutScreen = ({ navigation }) => {
  useEffect(() => {
    const confirmLogout = () => {
      Alert.alert(
        'Exit App',
        'Are you sure you want to exit this app?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => navigation.goBack(), // return to previous screen
          },
          {
            text: 'Yes, Logout',
            onPress: async () => {
              await AsyncStorage.clear(); // or remove specific keys
              navigation.replace('MobileNumber'); // go to login or landing screen
            },
            style: 'destructive',
          },
        ],
        { cancelable: false }
      );
    };

    confirmLogout();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0066FF" />
    </View>
  );
};

export default LogoutScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
