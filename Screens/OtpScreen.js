import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Dimensions,
  Keyboard,
  Animated,
  Platform,
  TouchableWithoutFeedback,
  ScrollView,
  Image,
} from "react-native";
import { verifyOtp, sendOtp } from "../utils/AuthApi";
import { useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import KeyboardAwareWrapper from "../components/KeyboardAwareWrapper";
const OtpScreen = ({ navigation }) => {
  // Get dimensions once at component level
  const { width, height } = Dimensions.get("window");
  const route = useRoute();
  const number = route.params?.phoneNumber;

  const [otp, setOtp] = useState(["", "", "", ""]);
  const [countdown, setCountdown] = useState(30);
  const [isResendDisabled, setIsResendDisabled] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const inputRefs = useRef([]);
  const [focusedIndex, setFocusedIndex] = useState(null);
  const blinkAnim = useRef(new Animated.Value(1)).current;

  // Countdown timer for resend OTP
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else {
      setIsResendDisabled(false);
    }
    return () => timer && clearTimeout(timer);
  }, [countdown]);

  // Blinking animation for custom caret
  useEffect(() => {
    if (focusedIndex !== null) {
      const blinkAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      blinkAnimation.start();
      return () => blinkAnimation.stop();
    }
  }, [focusedIndex]);

  const handleOtpChange = (text, index) => {
    // Only allow numeric input
    const numericText = text.replace(/[^0-9]/g, '');
    
    const newOtp = [...otp];
    newOtp[index] = numericText;
    setOtp(newOtp);

    // Auto focus to next input
    if (numericText && index < 3) {
      setTimeout(() => {
        if (inputRefs.current[index + 1]) {
          inputRefs.current[index + 1].focus();
          setFocusedIndex(index + 1);
        }
      }, 10);
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace") {
      if (!otp[index] && index > 0) {
        // Move to previous input if current is empty
        setTimeout(() => {
          if (inputRefs.current[index - 1]) {
            inputRefs.current[index - 1].focus();
            setFocusedIndex(index - 1);
          }
        }, 10);
      }
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const handleResendOTP = async () => {
    if (isResendDisabled) {
      Alert.alert("Please Wait", `You can resend OTP in ${countdown} seconds`);
      return;
    }

    try {
      console.log("📤 Resending OTP to:", number);
      setOtp(["", "", "", ""]);
      setIsResendDisabled(true);
      setCountdown(30);
      
      await sendOtp(number);
      
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
      
      Alert.alert("OTP Resent", "A new OTP has been sent to your mobile number");
    } catch (error) {
      console.error("❌ Resend OTP Error:", error);
      setIsResendDisabled(false);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to resend OTP. Please try again."
      );
    }
  };

  const handleVerify = async () => {
    // Prevent multiple submissions
    if (verifying) {
      console.log("⚠️ Already verifying OTP, please wait...");
      return;
    }

    const enteredOtp = otp.join("");
    
    if (enteredOtp.length !== 4) {
      Alert.alert("Incomplete OTP", "Please enter the 4-digit OTP.");
      return;
    }

    setVerifying(true);
    
    try {
      console.log("🔐 Verifying OTP for:", number);
      const res = await verifyOtp(number, enteredOtp);
      console.log("✅ Verification response status:", res.status);
      console.log("📦 Full response data:", JSON.stringify(res.data, null, 2));

      await AsyncStorage.setItem("number", number);
      
      if (res.status === 200) {
        if (res.data.isNewUser) {
          console.log("👤 New user - navigating to registration");
          // New user - no registration status needed yet
          await AsyncStorage.setItem("registrationComplete", "false");
          await AsyncStorage.setItem("registrationStep", "personal");
          setTimeout(() => {
            setVerifying(false);
            navigation.reset({
              index: 0,
              routes: [{ name: 'DriverRegister' }],
            });
          }, 100);
        } else if (res.data.token) {
          console.log("✅ Existing user - processing backend registration status");
          await AsyncStorage.setItem("token", res.data.token);
          
          // CRITICAL: Store registration status exactly as backend sends it
          const regComplete = res.data.registrationComplete === true ? "true" : "false";
          const regStep = res.data.registrationStep || "complete";
          const documentStatus = res.data.documentStatus || 'Pending';
          const isDocumentApproved = res.data.isDocumentApproved === true;
          
          await AsyncStorage.setItem("registrationComplete", regComplete);
          await AsyncStorage.setItem("registrationStep", regStep);
          
          // Check if payment was completed (for returning users)
          const paymentCompleted = await AsyncStorage.getItem("paymentCompleted");
          
          console.log("💾 Stored in AsyncStorage:", {
            registrationComplete: regComplete,
            registrationStep: regStep,
            documentStatus,
            isDocumentApproved,
            paymentCompleted
          });
          
          // Verify what was actually stored
          const storedComplete = await AsyncStorage.getItem("registrationComplete");
          const storedStep = await AsyncStorage.getItem("registrationStep");
          console.log("✅ Verified stored values:", {
            storedComplete,
            storedStep
          });
          
          if (res.data.registrationComplete === false || regComplete === "false") {
            console.log("⚠️ Registration INCOMPLETE detected");
            console.log("📍 Backend says step:", res.data.registrationStep);
            console.log("📍 Will redirect to:", res.data.registrationStep);
            
            setTimeout(() => {
              setVerifying(false);
              // Navigate to appropriate registration screen
              if (res.data.registrationStep === 'vehicle') {
                console.log("➡️ Navigating to Vehicle Registration");
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Vehicleregister' }],
                });
              } else if (res.data.registrationStep === 'driver') {
                console.log("➡️ Navigating to Driver Details");
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Driver Details' }],
                });
              } else if (res.data.registrationStep === 'personal') {
                console.log("➡️ Navigating to Driver Registration");
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'DriverRegister' }],
                });
              } else {
                // Unknown step but incomplete - go to vehicle registration
                console.log("⚠️ Unknown step, defaulting to Vehicle Registration");
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Vehicleregister' }],
                });
              }
            }, 100);
          } else if (!isDocumentApproved && (paymentCompleted === "true" || regComplete === "true")) {
            // Registration complete but documents not approved yet
            console.log("⏳ Registration COMPLETE but documents NOT APPROVED");
            console.log("📋 Document Status:", documentStatus);
            console.log("➡️ Redirecting to My Vehicle screen to wait for approval");
            
            // Mark payment as completed if registration is complete
            if (regComplete === "true" && paymentCompleted !== "true") {
              await AsyncStorage.setItem("paymentCompleted", "true");
            }
            
            setTimeout(() => {
              setVerifying(false);
              navigation.reset({
                index: 0,
                routes: [{ name: 'My Vehicle' }],
              });
            }, 100);
          } else if (isDocumentApproved) {
            console.log("✅ Registration COMPLETE and documents APPROVED - navigating to Home");
            // Clear payment flag since we're approved
            await AsyncStorage.setItem("paymentCompleted", "false");
            setTimeout(() => {
              setVerifying(false);
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
            }, 100);
          } else {
            // Fallback: Registration complete, no payment info, assume can go to Home
            console.log("✅ Registration COMPLETE - navigating to Home (legacy fallback)");
            setTimeout(() => {
              setVerifying(false);
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
            }, 100);
          }
        } else {
          setVerifying(false);
          Alert.alert(
            "Invalid Response",
            res.data.message || "Unexpected response from server."
          );
        }
      } else {
        setVerifying(false);
        Alert.alert(
          "Invalid OTP",
          res.data.message || "Please enter the correct OTP!"
        );
      }
    } catch (err) {
      console.error("❌ OTP Verification Error:", err);
      setVerifying(false);
      Alert.alert(
        "Invalid OTP",
        err.response?.data?.message || err.message || "Please enter the correct OTP!!!"
      );
    }
  };

  // Define styles inside component to access width/height
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#FFFFFF",
    },
    scrollContent: {
      flexGrow: 1,
    },
    content: {
      flex: 1,
      alignItems: "center",
      paddingTop: height * 0.05,
      paddingHorizontal: width * 0.05,
    },
    progressContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: height * 0.04,
    },
    progressStep: {
      flexDirection: "row",
      alignItems: "center",
    },
    progressDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: "#000",
    },
    progressDotActive: {
      backgroundColor: "#000",
    },
    progressDotInactive: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: "#E0E0E0",
    },
    progressLine: {
      width: width * 0.15,
      height: 2,
      backgroundColor: "#000",
      marginHorizontal: 5,
    },
    progressLineInactive: {
      width: width * 0.15,
      height: 2,
      backgroundColor: "#E0E0E0",
      marginHorizontal: 5,
    },
    illustrationContainer: {
      width: width * 0.5,
      height: width * 0.5,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: height * 0.03,
    },
    illustrationPlaceholder: {
      fontSize: 80,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      marginBottom: height * 0.015,
      color: "#000",
    },
    subtitleContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: height * 0.03,
    },
    subtitle: {
      color: "#999",
      fontSize: 14,
      fontWeight: "400",
    },
    phoneNumber: {
      color: "#000",
      fontWeight: "600",
    },
    editIcon: {
      fontSize: 16,
      marginLeft: 8,
    },
    otpContainer: {
      flexDirection: "row",
      justifyContent: "center",
      marginBottom: 10,
      paddingHorizontal: 10,
      gap: 12,
    },
    otpBox: {
      width: 48,
      height: 56,
      backgroundColor: "#fff",
      borderRadius: 12,
      borderWidth: 2,
      borderColor: "#E0E0E0",
      position: "relative",
      overflow: "hidden",
      justifyContent: "center",
      alignItems: "center",
    },

    otpInput: {
      width: "100%",
      height: "100%",
      fontSize: 24,
      textAlign: "center",
      color: "#666",
      fontWeight: "600",
      textAlignVertical: "center",
      includeFontPadding: false,
      padding: 0,
    },

    otpInputFilled: {
      borderColor: "#EC4D4A",
      borderWidth: 2,
    },

    otpInputFocused: {
      borderColor: "#EC4D4A",
      borderWidth: 2,
    },

    customCaret: {
      position: "absolute",
      width: 2,
      height: 28,
      backgroundColor: "#EC4D4A",
      top: 14,
      left: 23,
      borderRadius: 1,
    },
    smsButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#FFFFFF",
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 50,
      alignSelf: "center",
      marginBottom: 10,
      borderWidth: 1.5,
      borderColor: "#E0E0E0",
    },
    smsButtonIcon: {
      fontSize: 18,
      marginRight: 10,
    },
    smsButtonText: {
      fontSize: 15,
      color: "#000",
      fontWeight: "700",
    },
    whatsappButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#FFFFFF",
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 50,
      alignSelf: "center",
      marginBottom: 10,
      borderWidth: 1.5,
      borderColor: "#E0E0E0",
    },
    whatsappButtonIcon: {
      fontSize: 18,
      marginRight: 10,
    },
    whatsappButtonText: {
      fontSize: 15,
      color: "#000",
      fontWeight: "700",
    },
    resendContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 10,
      marginTop: 10,
      marginBottom: 20,
    },
    resendText: {
      fontSize: 15,
      color: "#999",
    },
    countdownText: {
      fontSize: 15,
      color: "#EC4D4A",
      fontWeight: "600",
    },

    verifyButton: {
      backgroundColor: "#EC4D4A",
      paddingVertical: 16,
      borderRadius: 30,
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    disabledButton: {
      backgroundColor: "#E0E0E0",
      elevation: 0,
      shadowOpacity: 0,
    },
    verifyText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: 1,
    },
    bottomContainer: {
      paddingHorizontal: width * 0.05,
      paddingBottom: 20,
    },
  });

  return (
    <KeyboardAwareWrapper 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      enableOnAndroid={true}
      keyboardShouldPersistTaps="handled"
    >
      <SafeAreaView style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <View style={styles.content}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressStep}>
            <View style={styles.progressDot} />
            <View style={styles.progressLine} />
          </View>
          <View style={styles.progressStep}>
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressLineInactive} />
          </View>
          <View style={styles.progressStep}>
            <View style={styles.progressDotInactive} />
          </View>
        </View>

        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <Text style={styles.illustrationPlaceholder}>🔐</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Let's Verify Your Number</Text>
        
        {/* Subtitle with phone number */}
        <View style={styles.subtitleContainer}>
          <Text style={styles.subtitle}>
            OTP has been sent to{" "}
            <Text style={styles.phoneNumber}>+91 {number}</Text>
          </Text>
          <TouchableOpacity>
            <Text style={styles.editIcon}>✏️</Text>
          </TouchableOpacity>
        </View>

        {/* OTP Input Boxes */}
        <View style={styles.otpContainer}>
          {[0, 1, 2, 3].map((index) => (
            <View
              key={index}
              style={[
                styles.otpBox, 
                focusedIndex === index ? styles.otpInputFocused : (otp[index] && styles.otpInputFilled)
              ]}
            >
              <TextInput
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={styles.otpInput}
                placeholder=""
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={1}
                value={otp[index]}
                onChangeText={(text) => handleOtpChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => setFocusedIndex(null)}
                selectionColor="#EC4D4A"
                caretHidden={true}
                underlineColorAndroid="transparent"
                autoCorrect={false}
                autoCapitalize="none"
                autoComplete="off"
                textAlign="center"
              />
              {focusedIndex === index && !otp[index] && (
                <Animated.View 
                  pointerEvents="none" 
                  style={[
                    styles.customCaret,
                    { opacity: blinkAnim }
                  ]} 
                />
              )}
            </View>
          ))}
        </View>

        {/* Send via SMS Button */}
        <TouchableOpacity style={styles.smsButton} onPress={handleResendOTP}>
          <Text style={styles.smsButtonIcon}>💬</Text>
          <Text style={styles.smsButtonText}>Send via SMS</Text>
        </TouchableOpacity>

        {/* Resend via WhatsApp Button */}
        <TouchableOpacity style={styles.whatsappButton} onPress={handleResendOTP}>
          <Text style={styles.whatsappButtonIcon}>📱</Text>
          <Text style={styles.whatsappButtonText}>Resend via WhatsApp</Text>
        </TouchableOpacity>

        {/* Didn't receive and countdown */}
        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive one?</Text>
          <Text style={styles.countdownText}>
            {countdown > 0 ? `00:${countdown.toString().padStart(2, '0')}` : '00:00'}
          </Text>
        </View>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>

        {/* Verify Button at Bottom */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[
              styles.verifyButton,
              (verifying || otp.join("").length !== 4) && styles.disabledButton,
            ]}
            onPress={handleVerify}
            activeOpacity={0.8}
            disabled={verifying || otp.join("").length !== 4}
          >
            <Text style={styles.verifyText}>
              {verifying ? "VERIFYING..." : "VERIFY"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAwareWrapper>
  );
};

export default OtpScreen;
