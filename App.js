import React, { useState, useEffect, useRef } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createStackNavigator } from "@react-navigation/stack";
import { TailwindProvider } from "nativewind";
import { AppState, Platform } from "react-native";
import * as Notifications from 'expo-notifications';
import { useScreenshotPrevention, setScreenshotModalCallback } from "./utils/ScreenshotPrevention";
import ScreenshotWarningModal from "./components/ScreenshotWarningModal";
import pushNotificationManager from "./utils/PushNotificationManager";

import ProfileScreen from "./Screens/ProfileScreen";
//  import LocationScreen from './components/LocationScreen';
import BottomTabNavigator from "./navigation/BottamTabNavigator";
import LocationScreen from "./Screens/LocationScreen";
import DriverRegistrationScreen from "./Screens/DriverRegistrationScreen";
import VehicleRegistrationScreen from "./Screens/VehicleRegistrationScreen";
import IncentiveScreen from "./Screens/IncentiveScreen";
import PayoutScreen from "./Screens/PayoutScreen";
import PrivacyPolicyScreen from "./Screens/PrivacyPolicyScreen";
import HelpAndSupportScreen from "./Screens/HelpAndSupportScreen";
import LanguageSelectorScreen from "./Screens/LanguageSelectorScreen";
import MobileNumberScreen from "./Screens/MobileNumberScreen";
import OtpScreen from "./Screens/OtpScreen";
import WalletScreen from "./Screens/WalletScreen";
import EarnScreen from "./Screens/EarnScreen";
import DriverDetailsScreen from "./Screens/DriverDetailsScreen";
import MyVehiclesScreen from "./Screens/MyVehiclesScreen";
import DriverCheckoutScreen from "./Screens/DriverCheckoutScreen";
import DriverPaymentMethodsScreen from "./Screens/DriverPaymentMethodScreen";
import HomeScreen from "./Screens/HomeScreen";
import GoToAreaScreen from "./Screens/GoToAreaScreen";
import CustomDrawerContent from "./navigation/CustomDrawerContent";
import LanguageSidebar from "./Screens/LanguageSidebar";
import LogoutScreen from "./Screens/LogoutScreen";
import ReferAndEarnScreen from "./Screens/ReferAndEarnScreen";
import OrderFareCheckoutScreen from "./Screens/OrderFareCheckoutScreen";
import OrderReviewScreen from "./Screens/OrderReviewScreen";

const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const [modalVisible, setModalVisible] = useState(false);
  const navigationRef = React.useRef();
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);

  // Enable screenshot prevention across the entire app
  // useScreenshotPrevention(); // DISABLED

  // Set callback for showing modal
  // React.useEffect(() => {
  //   setScreenshotModalCallback(() => {
  //     setModalVisible(true);
  //   });
  // }, []);

  // Initialize GlobalOrderManager when navigation is ready
  useEffect(() => {
    const initializeGlobalOrders = async () => {
      if (navigationRef.current) {
        const globalOrderManager = require('./utils/GlobalOrderManager').default;
        await globalOrderManager.initialize(navigationRef.current);
      }
    };
    
    // Small delay to ensure navigation is fully ready
    setTimeout(initializeGlobalOrders, 1000);
  }, []);

  // Handle AppState changes (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('[App] 📱 App has come to the foreground!');
      } else if (nextAppState.match(/inactive|background/)) {
        console.log('[App] 📵 App has gone to the background!');
      }

      appState.current = nextAppState;
      setAppStateVisible(appState.current);
      console.log('[App] AppState:', appState.current);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Set up push notification listeners
  useEffect(() => {
    // Handler for notifications received while app is foregrounded
    const handleNotificationReceived = (notification) => {
      console.log('[App] 📥 Notification received in foreground:', notification);
      
      // Extract booking data from notification
      const data = notification.request.content.data;
      if (data.type === 'new_booking' && data.bookingId) {
        console.log('[App] 🚀 New booking notification in foreground, GlobalOrderManager will handle it');
        // GlobalOrderManager already handles this via WebSocket in foreground
      }
    };

    // Handler for user tapping on notification
    const handleNotificationTapped = (response) => {
      console.log('[App] 👆 Notification tapped:', response);
      
      const data = response.notification.request.content.data;
      
      if (data.type === 'new_booking' && navigationRef.current) {
        console.log('[App] 🎯 Navigating to OrderPopup from notification tap');
        
        // Format booking data from notification
        const booking = {
          bookingId: data.bookingId,
          from: data.from,
          to: data.to,
          driverToFromKm: data.distance,
          fromToDropKm: data.fromToDropKm,
          totalFare: data.price,
          price: data.price,
          amountPay: data.price,
          totalDriverEarnings: data.totalDriverEarnings || data.price,
          platformFee: data.platformFee || 0,
          gst: data.gst || 0,
          baseFare: data.baseFare || data.price,
          quickFee: data.quickFee || 0,
          tipAmount: data.quickFee || 0,
          status: data.status || 'pending',
          vehicleType: data.vehicleType,
        };

        // Navigate to OrderPopup
        try {
          navigationRef.current.navigate('OrderPopup', { orders: [booking] });
        } catch (error) {
          console.error('[App] ❌ Navigation error:', error);
        }
      }
    };

    // Set up listeners using PushNotificationManager
    pushNotificationManager.setupNotificationListeners(
      handleNotificationReceived,
      handleNotificationTapped
    );

    // Cleanup listeners on unmount
    return () => {
      pushNotificationManager.removeNotificationListeners();
    };
  }, []);

  return (
    <>
      <NavigationContainer ref={navigationRef}>
        <BottomTabNavigator />
      </NavigationContainer>
      <ScreenshotWarningModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
      />
    </>
  );
}
