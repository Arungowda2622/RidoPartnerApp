// import React, { useState, useEffect } from "react";
// import { useNavigation } from "@react-navigation/native";
// import {
//   View,
//   Text,
//   TextInput,
//   Image,
//   TouchableOpacity,
//   StyleSheet,
//   SafeAreaView,
//   Linking,
//   ScrollView,
//   Dimensions,
// } from "react-native";
// import { sendOtp } from "../utils/AuthApi";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// const { width, height } = Dimensions.get("window");

// const MobileNumberScreen = () => {
//   const [phoneNumber, setPhoneNumber] = useState("");
//   const [termsChecked, setTermsChecked] = useState(false);
//   const [privacyChecked, setPrivacyChecked] = useState(false);
//   const navigation = useNavigation();

//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const checkRegistrationProgress = async () => {
//       const complete = await AsyncStorage.getItem("complete");
//       if (complete === "20") {
//         navigation.replace("Vehicleregister");
//       } else if (complete === "50") {
//         navigation.replace("Driver Details");
//       } else if (complete === "70") {
//         navigation.replace("My Vehicle");
//       } else {
//         setLoading(false);
//       }
//     };
//     checkRegistrationProgress();
//   }, []);

//   const handleContinue = async () => {
//     // navigation.replace('DriverRegister')
//     try {
//       const res = await sendOtp(phoneNumber);
//       await AsyncStorage.setItem("number", phoneNumber);
//       if (res.status === 200) {
//         navigation.navigate("Otp", { phoneNumber });
//       }
//     } catch (err) {
//       console.log(err);
//       Alert.alert("Error", err.response?.data?.message || "Failed to send OTP");
//     }
//   };

//   const openLink = (url) => {
//     Linking.openURL(url);
//   };

//   if (loading) return null;

//   return (
//     <SafeAreaView style={styles.container}>
//       {/* <ImageBackground
//         source={require("../assets/2.jpg")}
//         style={styles.backgroundImage}
//         resizeMode="cover"
//       > */}
//       {/* Top-left logo with gap */}
//       <View style={styles.topLeftLogoContainer}>
//         <Image
//           source={require("../assets/Ridodrop.png")}
//           style={styles.topLeftLogo}
//         />
//       </View>

//       <View style={styles.imageContainer}>
//         <Image
//           source={require("../assets/2.jpg")}
//           style={styles.image}
//           // resizeMode="cover"
//         />
//       </View>

//       <ScrollView contentContainerStyle={styles.scrollContainer}>
//         {/* Phone input section */}
//         <View style={styles.card}>
//           {/* Remove the old image here */}
//           <View style={styles.inputRow}>
//             <View style={styles.countryCodeBox}>
//               <Text style={styles.flagText}>🇮🇳</Text>
//               <View style={styles.verticalLine} />
//               <Text style={styles.codeText}>+91</Text>
//             </View>
//             <TextInput
//               style={styles.mobileInputBox}
//               placeholder="Enter Mobile Number"
//               placeholderTextColor="#999"
//               keyboardType="phone-pad"
//               maxLength={10}
//               value={phoneNumber}
//               onChangeText={setPhoneNumber}
//               textAlignVertical="center"
//             />
//           </View>

//           {/* Checkboxes section */}
//           <View style={styles.checkboxesContainer}>
//             <TouchableOpacity
//               style={styles.checkboxRow}
//               onPress={() => setTermsChecked(!termsChecked)}
//             >
//               <View
//                 style={[styles.checkbox, termsChecked && styles.checkedBox]}
//               >
//                 {termsChecked && <Text style={styles.checkmark}>✓</Text>}
//               </View>
//               <Text style={styles.label}>
//                 I have read and agreed to{" "}
//                 <Text
//                   style={styles.linkText}
//                   onPress={() => openLink("https://example.com/terms")}
//                 >
//                   Terms & Conditions
//                 </Text>{" "}
//                 and{" "}
//                 <Text
//                   style={styles.linkText}
//                   onPress={() => openLink("https://example.com/terms")}
//                 >
//                   Privacy Policy
//                 </Text>
//               </Text>
//             </TouchableOpacity>
//           </View>

//           {/* Continue button */}
//           <TouchableOpacity
//             style={styles.continueButton}
//             onPress={handleContinue}
//           >
//             <Text style={styles.continueText}>Continue</Text>
//           </TouchableOpacity>
//         </View>
//       </ScrollView>
//       {/* </ImageBackground> */}
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#F5F6FA",
//   },
//   backgroundImage: {
//     flex: 1,
//     width: "100%",
//     height: "100%",
//   },
//   scrollContainer: {
//     flexGrow: 1,
//     justifyContent: "center",
//   },
//   topLeftLogoContainer: {
//     position: "absolute",
//     top: 40,
//     left: 20,
//     zIndex: 1,
//   },
//   imageContainer: {
//     position: "absolute",
//     top: 0,
//     left: 0,
//     right: 0,
//     height: height * 1, // 60% of screen height
//     justifyContent: "center",
//     alignItems: "center",
//     paddingTop: height * 0.05,
//     position: "absolute",
//     height: height * 1, // 10% padding from top
//   },
//   image: {
//     width: "100%",
//     height: "100%",
//     objectFit: "fill",
//   },
//   topLeftLogo: {
//     width: 120,
//     height: 40,
//     resizeMode: "contain",
//   },
//   card: {
//     backgroundColor: "#fff",
//     borderRadius: 20,
//     padding: 25,
//     marginHorizontal: 20,
//     marginTop: 100,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 6,
//     elevation: 3,
//   },
//   inputRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     borderWidth: 1,
//     borderColor: "#E0E0E0",
//     marginBottom: 30,
//     height: 46,
//     overflow: "hidden",
//   },
//   countryCodeBox: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#fff",
//     height: 56,
//     paddingHorizontal: 10,
//     borderRightWidth: 1,
//     borderRightColor: "#E0E0E0",
//   },
//   flagText: {
//     fontSize: 20,
//     marginRight: 6,
//   },
//   codeText: {
//     fontSize: 16,
//     fontWeight: "bold",
//     color: "#333",
//   },
//   verticalLine: {
//     height: 25,
//     width: 1,
//     backgroundColor: "#999",
//     marginHorizontal: 8,
//   },
//   mobileInputBox: {
//     flex: 1,
//     height: 52,
//     fontSize: 16,
//     fontWeight: "bold",
//     color: "#333",
//     paddingHorizontal: 12,
//     backgroundColor: "#fff",
//   },
//   checkboxesContainer: {
//     marginBottom: 25,
//   },
//   checkboxRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 15,
//   },
//   checkbox: {
//     width: 20,
//     height: 20,
//     borderRadius: 4,
//     borderWidth: 1,
//     borderColor: "#999",
//     marginRight: 12,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   checkedBox: {
//     backgroundColor: "red",
//     borderColor: "red",
//   },
//   checkmark: {
//     color: "white",
//     fontSize: 12,
//     fontWeight: "bold",
//   },
//   label: {
//     fontSize: 14,
//     color: "#555",
//     flex: 1,
//   },
//   linkText: {
//     color: "red",
//     textDecorationLine: "none",
//   },
//   continueButton: {
//     backgroundColor: "red",
//     paddingVertical: 16,
//     borderRadius: 12,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   continueText: {
//     color: "white",
//     fontSize: 16,
//     fontWeight: "600",
//   },
// });

// export default MobileNumberScreen;

import React, { useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Linking,
  Platform,
  Keyboard,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
} from "react-native";
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sendOtp } from "../utils/AuthApi";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

const MobileNumberScreen = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [error, setError] = useState("");
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const checkRegistrationProgress = async () => {
      const complete = await AsyncStorage.getItem("complete");
      if (complete === "20") navigation.replace("Vehicleregister");
      else if (complete === "50") navigation.replace("Driver Details");
      else if (complete === "70") navigation.replace("My Vehicle");
      else setLoading(false);
    };
    checkRegistrationProgress();
  }, []);

  // Validation function for Indian mobile numbers
  const validateMobileNumber = (number) => {
    // Remove any spaces or special characters
    const cleanNumber = number.replace(/\s+/g, '');
    
    // Check if empty
    if (!cleanNumber) {
      return "Mobile number is required";
    }
    
    // Check if contains only numbers
    if (!/^\d+$/.test(cleanNumber)) {
      return "Mobile number should contain only digits";
    }
    
    // Check exact length (10 digits)
    if (cleanNumber.length !== 10) {
      return "Mobile number must be exactly 10 digits";
    }
    
    // Check Indian mobile number pattern (starts with 6, 7, 8, or 9)
    if (!/^[6-9]/.test(cleanNumber)) {
      return "Please enter a valid Indian mobile number";
    }
    
    return "";
  };

  // Handle phone number input with validation
  const handlePhoneNumberChange = (text) => {
    // Only allow numbers
    const numericText = text.replace(/[^0-9]/g, '');
    setPhoneNumber(numericText);
    
    // Clear error when user starts typing
    if (error) {
      setError("");
    }
  };

  // const handleContinue = async () => {
  //   try {
  //     const res = await sendOtp(phoneNumber);
  //     await AsyncStorage.setItem("number", phoneNumber);
  //     if (res.status === 200) navigation.navigate("Otp", { phoneNumber });
  //   } catch (err) {
  //     console.log(err);
  //     Alert.alert("Error", err.response?.data?.message || "Failed to send OTP");
  //   }
  // };

  const handleContinue = async () => {
    // Dismiss keyboard first
    Keyboard.dismiss();
    
    // Prevent multiple submissions
    if (sendingOtp) {
      console.log("⚠️ OTP already being sent, please wait...");
      return;
    }

    // Validate mobile number
    const validationError = validateMobileNumber(phoneNumber);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!termsChecked) {
      setError("Please agree to Terms & Conditions and Privacy Policy");
      return;
    }

    setSendingOtp(true);
    setError("");
    
    try {
      console.log("📤 Sending OTP to:", phoneNumber);
      const res = await sendOtp(phoneNumber);
      console.log("✅ OTP Response:", res.status);
      
      await AsyncStorage.setItem("number", phoneNumber);
      
      if (res.status === 200) {
        console.log("✅ Navigating to OTP screen");
        navigation.navigate("Otp", { phoneNumber });
      } else {
        setError("Failed to send OTP. Please try again.");
      }
    } catch (err) {
      console.error("❌ OTP Error:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to send OTP. Please check your connection.";
      setError(errorMessage);
      Alert.alert("Error", errorMessage);
    }
    setSendingOtp(false);
  };

  const openLink = (url) => Linking.openURL(url);

  if (loading) return null;

  return (
    <View style={styles.container}>
      <StatusBar 
        translucent={true} 
        backgroundColor="transparent" 
        barStyle="light-content" 
      />
      
      {/* Image Section - Full Screen */}
      <View style={styles.imageContainer}>
        <Image source={require("../assets/2.jpg")} style={styles.image} />
      </View>

      {/* Card Section (Bottom Fixed) - Updated for keyboard handling */}
      <KeyboardAvoidingView 
        behavior='padding'
        style={styles.keyboardAvoidingContainer}
        keyboardVerticalOffset={0}
      >
        <View style={styles.card}>
            <View style={styles.dividerContainer}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>Log in or sign up</Text>
              <View style={styles.line} />
            </View>

            {/* Phone input row - Updated to match design */}
            <View style={styles.inputContainer}>
              {/* Country Code Selector */}
              <View style={styles.countryCodeBox}>
                <Text style={styles.flagText}>🇮🇳</Text>
                <Text style={styles.codeText}>+91</Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </View>
              
              {/* Mobile Number Input */}
              <View style={[styles.mobileInputBox, error ? styles.inputError : null]}>
                <TextInput
                  style={styles.mobileInput}
                  placeholder="Mobile Number"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phoneNumber}
                  onChangeText={handlePhoneNumberChange}
                />
              </View>
            </View>

            {/* Error message */}
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            {/* Checkbox */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setTermsChecked(!termsChecked)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, termsChecked && styles.checkedBox]}>
                {termsChecked && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.label}>
                I agree to{" "}
                <Text
                  style={styles.linkText}
                  onPress={() => openLink("https://example.com/terms")}
                >
                  Terms & Conditions
                </Text>{" "}
                and{" "}
                <Text
                  style={styles.linkText}
                  onPress={() => openLink("https://example.com/privacy")}
                >
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>

            {/* Continue Button */}
            <TouchableOpacity
              style={[
                styles.continueButton,
                (sendingOtp || !termsChecked || phoneNumber.length !== 10) && styles.continueButtonDisabled
              ]}
              onPress={handleContinue}
              activeOpacity={0.8}
              disabled={sendingOtp || !termsChecked || phoneNumber.length !== 10}
            >
              <Text style={styles.continueText}>
                {sendingOtp ? "Sending OTP..." : "Continue"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  };

export default MobileNumberScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  imageContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: height + (Platform.OS === 'ios' ? 50 : 25), // Extend beyond screen to cover status bar
    marginTop: Platform.OS === 'ios' ? -150 : -125, // Pull up to move image higher
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover", // Changed from objectFit for better compatibility
  },
  topLeftLogoContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 30,
    left: 20,
    zIndex: 1,
  },
  topLeftLogo: {
    width: 120,
    height: 40,
    resizeMode: "contain",
  },
  keyboardAvoidingContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    width: "100%",
    justifyContent: "flex-end",
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    alignItems: "center",
    paddingTop: 15,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  logoText: {
    fontSize: width > 400 ? 28 : 24,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    marginBottom: 15,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
    width: "80%",
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#ccc",
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 14,
    color: "#999",
    fontWeight: "bold",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "90%",
    marginTop: 10,
    gap: 12,
  },
  countryCodeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  flagText: {
    fontSize: 22,
  },
  codeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  dropdownArrow: {
    fontSize: 10,
    color: "#666",
    marginLeft: 2,
  },
  mobileInputBox: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  mobileInput: {
    fontSize: 16,
    color: "#000",
    fontWeight: "600",
    padding: 0,
    margin: 0,
  },
  inputError: {
    borderColor: "#FF6B6B",
    borderWidth: 2,
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    fontWeight: "500",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "90%",
    marginTop: 16,
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#D0D0D0",
    marginRight: 10,
    marginTop: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  checkedBox: {
    backgroundColor: "#EC4D4A",
    borderColor: "#EC4D4A",
  },
  checkmark: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  label: {
    fontSize: 13,
    color: "#666",
    flex: 1,
    lineHeight: 20,
  },
  linkText: {
    color: "#EC4D4A",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  continueButton: {
    backgroundColor: "#EC4D4A",
    paddingVertical: 16,
    borderRadius: 12,
    width: "90%",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#EC4D4A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  continueButtonDisabled: {
    backgroundColor: "#CCCCCC",
    shadowOpacity: 0,
    elevation: 0,
  },
  continueText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
