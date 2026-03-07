import React, { useEffect, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { createStackNavigator } from "@react-navigation/stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "react-native";
import axios from "axios";
import { API_CONFIG } from "../config/api";

import HomeScreen from "../Screens/HomeScreen"; //
import WalletScreen from "../Screens/WalletScreen";
import BankDetailsScreen from "../Screens/BankDetailsScreen";
import WithdrawalScreen from "../Screens/WithdrawalScreen";
import BalanceDetailsScreen from "../Screens/BalanceDetailsScreen";
import ProfileScreen from "../Screens/ProfileScreen";
import OrdersScreen from "../Screens/OrdersScreenNew";
import BookingRequestsScreen from "../Screens/OrdersScreen";
import IncentiveScreen from "../Screens/IncentiveScreen";
import OrderHistoryScreen from "../Screens/OrderHistoryScreen";
import PrivacyPolicyScreen from "../Screens/PrivacyPolicyScreen";
import HelpAndSupportScreen from "../Screens/HelpAndSupportScreen";
import LanguageSidebar from "../Screens/LanguageSidebar";
import ReferAndEarnScreen from "../Screens/ReferAndEarnScreen";
import { createDrawerNavigator } from "@react-navigation/drawer";
import CustomDrawerContent from "./CustomDrawerContent";
import LogoutScreen from "../Screens/LogoutScreen";
import LanguageSelectorScreen from "../Screens/LanguageSelectorScreen";
import MobileNumberScreen from "../Screens/MobileNumberScreen";
import LocationScreen from "../Screens/LocationScreen";
import DriverRegistrationScreen from "../Screens/DriverRegistrationScreen";
import VehicleRegistrationScreen from "../Screens/VehicleRegistrationScreen";
import DriverDetailsScreen from "../Screens/DriverDetailsScreen";
import MyVehiclesScreen from "../Screens/MyVehiclesScreen";
import DriverCheckoutScreen from "../Screens/DriverCheckoutScreen";
import DriverPaymentMethodsScreen from "../Screens/DriverPaymentMethodScreen";
import GoToAreaScreen from "../Screens/GoToAreaScreen";
import MapPickerScreen from "../Screens/MapPickerScreen";
import OtpScreen from "../Screens/OtpScreen";
import ReferralBikeScreen from "../Screens/ReferralBikeScreen";
import ReferralAutoScreen from "../Screens/ReferralAutoScreen";
import ReferralTruckScreen from "../Screens/ReferralTruckScreen";
import TrainingVideosScreen from "../Screens/TrainingVideosScreen";
import OrderDetailsScreen from "../Screens/OrderDetailsScreen";
import CancelReasonsScreen from "../Screens/CancelReasonsScreen";
import SupportOptionsScreen from "../Screens/SupportOptionsScreen";
import OrderFareCheckoutScreen from "../Screens/OrderFareCheckoutScreen";
import OrderReviewScreen from "../Screens/OrderReviewScreen";
import LiveTrackingScreen from "../Screens/LiveTrackingScreen";
import MapProgress from "../Screens/MapProgress";
import CompletedRideScreen from "../Screens/CompleteRiderScreen";
import Bill from "../Screens/Bill";
import OrderMenuScreen from "../Screens/OrderMenuScreen";
import RaiseTicketScreen from "../Screens/RaiseTicketScreen";
import MyTicketsScreen from "../Screens/MyTicketsScreen";
import TicketDetailsScreen from "../Screens/TicketDetailsScreen";
import PaymentScreen from "../Screens/PaymentScreen";
import DropPaymentScreen from "../Screens/DropPaymentScreen";
import NotificationCenterScreen from "../Screens/NotificationCenterScreen";
import ScreenshotTestScreen from "../Screens/ScreenshotTestScreen";
import ScreenshotDemoScreen from "../Screens/ScreenshotDemoScreen";
import OrderPopupScreen from "../Screens/OrderPopupScreen";
import BookingImagesScreen from "../Screens/BookingImagesScreen";
import TripDetailScreen from "../Screens/TripDetailScreen";
import DocumentsScreen from "../Screens/DocumentsScreen";
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

export default function BottomTabNavigator() {
  const [initialRoute, setInitialRoute] = useState(null);

  // Helper function to verify registration status from backend
  const verifyRegistrationFromBackend = async (phoneNumber) => {
    try {
      console.log("🔍 Verifying registration status from backend for:", phoneNumber);
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/riders/get/rider?number=${encodeURIComponent(phoneNumber)}`
      );
      
      console.log("📦 Backend verification response:", response.status);
      
      if (response.data && response.data.data) {
        const rider = response.data.data;
        console.log("📦 Backend rider data received");
        
        // Check registration completion based on actual data
        const hasPersonalDocs = !!(rider.name && rider.images?.FrontaadharCard && rider.images?.BackaadharCard);
        const hasVehicleDetails = !!(rider.vehicleregisterNumber && rider.vehicleType && rider.images?.vehicleRcFront);
        const hasDriverDetails = !!(rider.driverName && rider.images?.drivingLicenseFront);
        
        // Check payment and document approval status
        const paymentCompleted = await AsyncStorage.getItem("paymentCompleted");
        const documentStatus = rider.documentStatus || 'Pending';
        const isDocumentApproved = documentStatus === 'Approved';
        
        console.log("✅ Backend Registration Check:", {
          hasPersonalDocs,
          hasVehicleDetails,
          hasDriverDetails,
          paymentCompleted,
          documentStatus,
          isDocumentApproved
        });
        
        let registrationStep = 'complete';
        let isComplete = false;
        
        if (!hasPersonalDocs) {
          registrationStep = 'personal';
        } else if (!hasVehicleDetails) {
          registrationStep = 'vehicle';
        } else if (!hasDriverDetails) {
          registrationStep = 'driver';
        } else {
          isComplete = true;
          registrationStep = 'complete';
        }
        
        // If registration complete but payment done and docs not approved, redirect to MyVehicle
        const shouldWaitForApproval = isComplete && paymentCompleted === "true" && !isDocumentApproved;
        
        console.log("💾 Updating AsyncStorage with backend verification:", {
          registrationComplete: isComplete ? "true" : "false",
          registrationStep,
          shouldWaitForApproval,
          reason: !hasPersonalDocs ? "Missing personal docs" :
                  !hasVehicleDetails ? "Missing vehicle details" :
                  !hasDriverDetails ? "Missing driver details" :
                  shouldWaitForApproval ? "Waiting for document approval" : "Complete"
        });
        
        // FORCE update AsyncStorage with verified values from backend
        await AsyncStorage.setItem("registrationComplete", isComplete ? "true" : "false");
        await AsyncStorage.setItem("registrationStep", registrationStep);
        
        // Verify it was set correctly
        const verifyComplete = await AsyncStorage.getItem("registrationComplete");
        const verifyStep = await AsyncStorage.getItem("registrationStep");
        console.log("✅ AsyncStorage updated and verified:", {
          registrationComplete: verifyComplete,
          registrationStep: verifyStep
        });
        
        return { isComplete, registrationStep, shouldWaitForApproval };
      }
    } catch (error) {
      console.error("❌ Backend verification error:", error.message);
      return null;
    }
  };

  useEffect(() => {
    const checkToken = async () => {
      try {
        console.log("\n🔍 ===== APP LAUNCH CHECK =====");
        
        // Get ALL relevant keys from AsyncStorage
        const token = await AsyncStorage.getItem("token");
        const registrationComplete = await AsyncStorage.getItem("registrationComplete");
        const registrationStep = await AsyncStorage.getItem("registrationStep");
        const phoneNumber = await AsyncStorage.getItem("number");
        const name = await AsyncStorage.getItem("name");
        const complete = await AsyncStorage.getItem("complete");
        
        // Log EVERYTHING for debugging
        console.log("📦 ALL AsyncStorage Values:");
        console.log("  - token:", token ? "EXISTS (length: " + token.length + ")" : "NULL");
        console.log("  - registrationComplete:", `"${registrationComplete}"`, "(type:", typeof registrationComplete + ")");
        console.log("  - registrationStep:", `"${registrationStep}"`, "(type:", typeof registrationStep + ")");
        console.log("  - phoneNumber:", phoneNumber);
        console.log("  - name:", name);
        console.log("  - complete:", complete);
        
        // If we have a token and phone, verify registration status from backend
        if (token && phoneNumber) {
          console.log("\n🔍 Verifying registration status from backend...");
          const backendStatus = await verifyRegistrationFromBackend(phoneNumber);
          
          if (backendStatus) {
            console.log("✅ Using BACKEND verified status:", backendStatus);
            
            // Check if should wait for document approval
            if (backendStatus.shouldWaitForApproval) {
              console.log("⏳ Registration complete but waiting for document approval");
              console.log("➡️ Redirecting to My Vehicle screen");
              setInitialRoute("My Vehicle");
              console.log("===== END APP LAUNCH CHECK =====\n");
              return; // Exit early
            }
            
            if (!backendStatus.isComplete) {
              console.log("⚠️ Backend confirms INCOMPLETE registration");
              
              if (backendStatus.registrationStep === "vehicle") {
                console.log("➡️ Redirecting to Vehicle Registration");
                setInitialRoute("Vehicleregister");
              } else if (backendStatus.registrationStep === "driver") {
                console.log("➡️ Redirecting to Driver Details");
                setInitialRoute("Driver Details");
              } else if (backendStatus.registrationStep === "personal") {
                console.log("➡️ Redirecting to Driver Registration");
                setInitialRoute("DriverRegister");
              } else {
                setInitialRoute("Vehicleregister");
              }
              console.log("===== END APP LAUNCH CHECK =====\n");
              return; // Exit early
            } else {
              console.log("✅ Backend confirms COMPLETE registration and documents approved - going to Home");
              setInitialRoute("Home");
              console.log("===== END APP LAUNCH CHECK =====\n");
              return; // Exit early
            }
          } else {
            console.log("⚠️ Backend verification failed, falling back to AsyncStorage");
          }
        }
        
        // Fallback to AsyncStorage if backend check failed or no phone number
        console.log("\n🎯 Decision Logic (AsyncStorage fallback):");
        console.log("  - Has token?", !!token);
        console.log("  - registrationComplete === 'false'?", registrationComplete === "false");
        console.log("  - registrationComplete === 'true'?", registrationComplete === "true");
        console.log("  - registrationComplete === null?", registrationComplete === null);

        if (!token) {
          // No token - go to login
          console.log("❌ No token - redirecting to login");
          setInitialRoute("MobileNumber");
        } else if (registrationComplete === "false") {
          // User has token but registration is EXPLICITLY incomplete
          console.log("⚠️ Registration INCOMPLETE (explicit) - redirecting to step:", registrationStep);
          
          if (registrationStep === "vehicle") {
            console.log("➡️ Redirecting to Vehicle Registration");
            setInitialRoute("Vehicleregister");
          } else if (registrationStep === "driver") {
            console.log("➡️ Redirecting to Driver Details");
            setInitialRoute("Driver Details");
          } else if (registrationStep === "personal") {
            console.log("➡️ Redirecting to Driver Registration");
            setInitialRoute("DriverRegister");
          } else {
            // Fallback to Vehicle registration if step is unclear but has token
            console.log("⚠️ Unclear step - defaulting to Vehicle Registration");
            setInitialRoute("Vehicleregister");
          }
        } else if (registrationComplete === "true") {
          // Registration EXPLICITLY complete - go to Home
          console.log("✅ Registration COMPLETE (explicit) - redirecting to Home");
          setInitialRoute("Home");
        } else if (registrationComplete === null || registrationComplete === undefined) {
          // registrationComplete not set - could be OLD user OR incomplete new user
          // Check if registrationStep is set to determine
          console.log("⚠️ registrationComplete is NULL/UNDEFINED");
          
          if (registrationStep && registrationStep !== "complete") {
            // Has a step set but not complete - must be incomplete registration
            console.log("📍 Has registrationStep:", registrationStep, "- treating as INCOMPLETE");
            if (registrationStep === "vehicle") {
              setInitialRoute("Vehicleregister");
            } else if (registrationStep === "driver") {
              setInitialRoute("Driver Details");
            } else if (registrationStep === "personal") {
              setInitialRoute("DriverRegister");
            } else {
              setInitialRoute("Vehicleregister");
            }
          } else {
            // No step or step is "complete" - assume complete (legacy user)
            console.log("ℹ️ No step or step=complete - assuming complete (legacy user)");
            setInitialRoute("Home");
          }
        } else {
          // Unknown state - safer to check registration
          console.log("⚠️ Unknown registration state - redirecting to Vehicle Registration");
          console.log("  - registrationComplete value:", registrationComplete);
          setInitialRoute("Vehicleregister");
        }
        
        console.log("\n✅ FINAL DECISION: Will initialize route to:", 
          !token ? "MobileNumber" :
          registrationComplete === "false" ? 
            (registrationStep === "vehicle" ? "Vehicleregister" : 
             registrationStep === "driver" ? "Driver Details" : 
             registrationStep === "personal" ? "DriverRegister" : "Vehicleregister") :
          "Home"
        );
        console.log("===== END APP LAUNCH CHECK =====\n");
        
      } catch (e) {
        console.error("❌ Navigation check error:", e);
        setInitialRoute("MobileNumber");
      }
    };
    checkToken();
  }, []);

  if (!initialRoute) {
    // Show a loading indicator while checking token
    return null;
  }

  const DrawerNavigator = () => (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {/* Drawer links to Bottom Tabs via Stack */}
      <Drawer.Screen
        name="HomeDrawer"
        component={Tabs}
        options={{
          drawerItemStyle: { height: 0 },
          drawerIcon: () => null,
        }}
      />
      {/* <Drawer.Screen name="Home" component={TabStackNavigator} /> */}

      {/* Direct screens */}
      <Drawer.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          drawerItemStyle: { height: 0 },
          drawerIcon: () => null,
        }}
      />

      <Drawer.Screen
        name="Wallet"
        component={WalletScreen}
        options={{
          drawerIcon: ({ size }) => (
            <Image
              source={require("../assets/wallet.png")}
              style={{
                width: size * 1.3,
                height: size * 1.3,
                resizeMode: "contain",
              }}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="Incentive"
        component={IncentiveScreen}
        options={{
          drawerIcon: ({ size }) => (
            <Image
              source={require("../assets/incentive.png")}
              style={{
                width: size * 1.3,
                height: size * 1.3,
                resizeMode: "contain",
              }}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="Earning"
        component={OrderHistoryScreen}
        options={{
          drawerIcon: ({ size }) => (
            <Image
              source={require("../assets/earning.png")}
              style={{
                width: size * 1.3,
                height: size * 1.3,
                resizeMode: "contain",
              }}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="Refer And Earn"
        component={ReferAndEarnScreen}
        options={{
          drawerIcon: ({ size }) => (
            <Image
              source={require("../assets/REFER AND EARN.png")}
              style={{
                width: size * 1.3,
                height: size * 1.3,
                resizeMode: "contain",
              }}
            />
          ),
        }}
      />

      {/* <Drawer.Screen name="Language " component={LanguageSidebar} /> */}

      <Drawer.Screen
        name="Privacy & Policy"
        component={PrivacyPolicyScreen}
        options={{
          drawerIcon: ({ size }) => (
            <Image
              source={require("../assets/policy.png")}
              style={{
                width: size * 1.3,
                height: size * 1.3,
                resizeMode: "contain",
              }}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="Help And Sopport"
        component={HelpAndSupportScreen}
        options={{
          drawerIcon: ({ size }) => (
            <Image
              source={require("../assets/help and support (1).png")}
              style={{
                width: size * 1.3,
                height: size * 1.3,
                resizeMode: "contain",
              }}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="Logout"
        component={LogoutScreen}
        options={{
          drawerIcon: ({ size }) => (
            <Image
              source={require("../assets/logout.png")}
              style={{
                width: size * 1.3,
                height: size * 1.3,
                resizeMode: "contain",
              }}
            />
          ),
        }}
      />
    </Drawer.Navigator>
  );

  // 🟢 Bottom Tabs (inside Drawer)
  const Tabs = () => (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="cart-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Earn"
        component={OrderHistoryScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="trending-up" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={WalletScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons
              name="account-balance-wallet"
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRoute}
    >
        <Stack.Screen
          name="LanguageSelector"
          screenOptions={{ headerShown: false }}
          component={LanguageSelectorScreen}
        />
        <Stack.Screen
          name="MobileNumber"
          screenOptions={{ headerShown: false }}
          component={MobileNumberScreen}
        />
        <Stack.Screen name="Otp" component={OtpScreen} />
        <Stack.Screen name="LocationScreen" component={LocationScreen} />
        <Stack.Screen
          name="DriverRegister"
          component={DriverRegistrationScreen}
        />
        <Stack.Screen
          name="Vehicleregister"
          component={VehicleRegistrationScreen}
        />
        <Stack.Screen name="Driver Details" component={DriverDetailsScreen} />
        <Stack.Screen name="My Vehicle" component={MyVehiclesScreen} />
        <Stack.Screen name="Driver Checkout" component={DriverCheckoutScreen} />
        <Stack.Screen
          name="Driver Payment Method"
          component={DriverPaymentMethodsScreen}
        />
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="GoToAreaScreen" component={GoToAreaScreen} />
        <Stack.Screen name="MapPicker" component={MapPickerScreen} options={{ headerShown: false }} />
        <Stack.Screen
          name="ReferralBikeScreen"
          component={ReferralBikeScreen}
        />
        <Stack.Screen
          name="ReferralAutoScreen"
          component={ReferralAutoScreen}
        />
        <Stack.Screen
          name="ReferralTruckScreen"
          component={ReferralTruckScreen}
        />
        <Stack.Screen name="TrainingVideos" component={TrainingVideosScreen} />
        <Stack.Screen
          name="OrderDetailsScreen"
          component={OrderDetailsScreen}
        />
        <Stack.Screen
          name="OrderMenuScreen"
          component={OrderMenuScreen}
        />
        <Stack.Screen
          name="PaymentScreen"
          component={PaymentScreen}
        />
        <Stack.Screen
          name="DropPaymentScreen"
          component={DropPaymentScreen}
        />
        <Stack.Screen
          name="CancelReasonsScreen"
          component={CancelReasonsScreen}
        />
        <Stack.Screen
          name="SupportOptionsScreen"
          component={SupportOptionsScreen}
        />
        <Stack.Screen name="RaiseTicket" component={RaiseTicketScreen} />
        <Stack.Screen name="MyTickets" component={MyTicketsScreen} />
        <Stack.Screen name="TicketDetails" component={TicketDetailsScreen} />
        <Stack.Screen
          name="OrderFareCheckout"
          component={OrderFareCheckoutScreen}
        />
        <Stack.Screen name="OrderReviewScreen" component={OrderReviewScreen} />
        <Stack.Screen name="Home" component={DrawerNavigator} />
        <Stack.Screen
          name="LiveTrackingScreen"
          component={LiveTrackingScreen}
        />

        {/* progresss */}
        <Stack.Screen name="mapProgress" component={MapProgress} />
        <Stack.Screen name="Bill" component={Bill} />
        <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} />
        <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
        <Stack.Screen name="BookingRequests" component={BookingRequestsScreen} />
        <Stack.Screen name="ScreenshotTest" component={ScreenshotTestScreen} />
        <Stack.Screen name="ScreenshotDemo" component={ScreenshotDemoScreen} />
        <Stack.Screen 
          name="OrderPopup" 
          component={OrderPopupScreen}
          options={{
            presentation: 'fullScreenModal',
            gestureEnabled: false,
            headerShown: false,
          }}
        />
        <Stack.Screen name="BookingImages" component={BookingImagesScreen} />
        <Stack.Screen name="TripDetailScreen" component={TripDetailScreen} />
        <Stack.Screen name="DocumentsScreen" component={DocumentsScreen} options={{ headerShown: false }} />
        
        {/* Wallet Screens */}
        <Stack.Screen name="BankDetailsScreen" component={BankDetailsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="WithdrawalScreen" component={WithdrawalScreen} options={{ headerShown: false }} />
        <Stack.Screen name="BalanceDetailsScreen" component={BalanceDetailsScreen} options={{ headerShown: false }} />
        {/* <Stack.Screen name="" component={MapProgress} /> */}
      </Stack.Navigator>
  );
}
