// import React from 'react';
// import { View, Text, StyleSheet } from 'react-native';
// import HomeScreen from '../Screens/HomeScreen';
// import WalletScreen from '../Screens/WalletScreen';
// import EarnScreen from '../Screens/EarnScreen';
// import ProfileScreen from '../Screens/ProfileScreen';
// import IncentiveScreen from '../Screens/IncentiveScreen';
// import PrivacyPolicyScreen from '../Screens/PrivacyPolicyScreen';
// import HelpAndSupportScreen from '../Screens/HelpAndSupportScreen';
// import { createStackNavigator } from '@react-navigation/stack';

// export default function CustomDrawerContent() {

//     const Stack = createStackNavigator();
//     const Drawer = createDrawerNavigator();
//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Sidebar Menu</Text>

//       <Drawer.Navigator screenOptions={{ headerShown: false }} >
//          <Drawer.Screen name="Home" component={HomeScreen} />
//            {/* <Drawer.Screen name="Wallet" component={WalletScreen} />
//             <Drawer.Screen name="Earning" component={EarnScreen} />
//              <Drawer.Screen name="Profile" component={ProfileScreen} />
//              <Drawer.Screen name="Incentive" component={IncentiveScreen}/>
//               <Drawer.Screen name="Private Policy" component={PrivacyPolicyScreen} />
//               <Drawer.Screen name="Help & Support" component={HelpAndSupportScreen}/> */}

//       </Drawer.Navigator>

//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     paddingTop: 50,
//     paddingHorizontal: 20,
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//   },
// });

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCachedRiderData } from "../utils/RiderDataManager";
import { API_CONFIG } from '../config/api';

export default function CustomDrawerContent(props) {
  const [userName, setUserName] = useState("Loading...");
  const [userCity, setUserCity] = useState("Loading...");
  const [userImage, setUserImage] = useState(
    "https://i.pravatar.cc/100?img=12"
  );
  const [loading, setLoading] = useState(true);

  const fetchUserData = async () => {
    try {
      setLoading(true);

      // Use global singleton to prevent duplicate API calls
      const response = await getCachedRiderData();
      console.log("🔍 Drawer - Using cached/shared rider data");

      // Backend returns rider data directly (not wrapped in {rider: ...})
      // Check different possible response structures
      const rider = response?.data?.rider || response?.rider || response?.data || response;
      console.log("🔍 Drawer - Extracted rider data:", JSON.stringify(rider, null, 2));

      if (rider && (rider.name || rider.driverName || rider.selectCity)) {
        const extractedName = rider.name || rider.driverName || "User";
        const extractedCity = rider.selectCity || "Unknown City";
        
        console.log("✅ Drawer - Setting name:", extractedName);
        console.log("✅ Drawer - Setting city:", extractedCity);
        
        setUserName(extractedName);
        setUserCity(extractedCity);

        // Use profile photo if available
        if (rider.images?.profilePhoto) {
          // const baseURL = "https://ridodrop-backend-24-10-2025.onrender.com/";
          const baseURL = `${API_CONFIG.BASE_URL}/`;
          const imageUrl = rider.images.profilePhoto.startsWith("http")
            ? rider.images.profilePhoto
            : `${baseURL}${rider.images.profilePhoto}`;
          console.log("✅ Drawer - Setting image:", imageUrl);
          setUserImage(imageUrl);
        }
      } else {
        console.log("⚠️ Drawer - No rider data found, falling back to AsyncStorage");
        // Fallback to AsyncStorage data
        const storedName = await AsyncStorage.getItem("name");
        const storedCity = await AsyncStorage.getItem("city");

        console.log("📦 Drawer - AsyncStorage name:", storedName);
        console.log("📦 Drawer - AsyncStorage city:", storedCity);

        setUserName(storedName || "User");
        setUserCity(storedCity || "Unknown City");
      }
    } catch (error) {
      console.error("❌ Drawer - Error fetching user data:", error);
      console.error("❌ Drawer - Error details:", error.response?.data || error.message);

      // Final fallback to AsyncStorage
      try {
        const storedName = await AsyncStorage.getItem("name");
        const storedCity = await AsyncStorage.getItem("city");

        console.log("📦 Drawer - Fallback AsyncStorage name:", storedName);
        console.log("📦 Drawer - Fallback AsyncStorage city:", storedCity);

        setUserName(storedName || "User");
        setUserCity(storedCity || "Unknown City");
      } catch (storageError) {
        console.error("❌ Drawer - Error reading from AsyncStorage:", storageError);
        setUserName("User");
        setUserCity("Unknown City");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // Hide Home and Profile from sidebar
  const filteredRoutes = props.state.routes.filter(
    (route) => route.name !== "Home" && route.name !== "Profile"
  );

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={styles.scrollContainer}
    >
      <TouchableOpacity
        style={styles.header}
        onPress={() => props.navigation.navigate("Profile")}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#EC4D4A" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : (
          <>
            <Image
              source={{ uri: userImage }}
              style={styles.avatar}
              onError={() => setUserImage("https://i.pravatar.cc/100?img=12")}
            />
            <Text style={styles.name}>{userName}</Text>
            <Text style={styles.city}>{userCity}</Text>
          </>
        )}
      </TouchableOpacity>
      {/* Header Section */}
      {/* <TouchableOpacity
        style={styles.header}
        onPress={() => props.navigation.navigate('Profile')}
      >
        <Text style={styles.welcome}>Welcome</Text>
        <View style={styles.userRow}>
          <Text style={styles.name}>{userName}</Text>
          <Ionicons name="chevron-forward" size={24} color="#2d2d2d" />
        </View>
      </TouchableOpacity> */}

      {/* Drawer Items as Cards */}
      <View style={styles.cardContainer}>
        {filteredRoutes.map((route, index) => {
          const focused = index === props.state.index;
          const { name, key } = route;
          const options = props.descriptors[key].options;
          const label = options.drawerLabel ?? name;
          const Icon = options.drawerIcon;

          return (
            <TouchableOpacity
              key={key}
              style={[styles.cardItem, focused && styles.cardItemFocused]}
              onPress={() => props.navigation.navigate(name)}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconLabelRow}>
                  {Icon && Icon({ color: "#2d2d2d", size: 26 })}
                  <Text style={styles.label}>{label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#2d2d2d" />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingBottom: 20,
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 15,
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2d2d2d",
  },
  city: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  welcome: {
    fontSize: 16,
    color: "#666",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    justifyContent: "space-between",
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2d2d2d",
  },
  cardContainer: {
    padding: 16,
    gap: 12,
  },
  cardItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  // cardItemFocused: {
  //   backgroundColor: '#e6f0ff',
  // },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconLabelRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    fontSize: 16,
    marginLeft: 12,
    color: "#2d2d2d",
    fontWeight: "500",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
  },
});
