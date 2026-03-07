// // import { DrawerActions } from '@react-navigation/native';
// // import { useNavigation, useRouter } from 'expo-router';
// // import { Bell, ChevronRight, Headphones, Menu } from 'lucide-react-native';
// // import React from 'react';
// // import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// // export default function HomePage() {
// //   const navigation = useNavigation();
// //   // const router = useRouter();

// //   const toggleDrawer = () => {
// //     navigation.dispatch(DrawerActions.openDrawer())
// //   };

// import { DrawerActions, useNavigation } from '@react-navigation/native';
// import { Bell, ChevronRight, Headphones, Menu } from 'lucide-react-native';
// import React from 'react';
// import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// export default function HomePage() {
//   const navigation = useNavigation();

//   const toggleDrawer = () => {
//     navigation.dispatch(DrawerActions.openDrawer());
//   };

//   const goToExplore = () => {
//     navigation.navigate('Explore'); // Make sure 'Explore' is registered in your Stack.Navigator or Drawer.Navigator
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       {/* Header */}
//       <View style={styles.header}>
//         {/* <TouchableOpacity onPress={toggleDrawer}>
//           <Menu color="white" size={24} />
//         </TouchableOpacity> */}
        
//         <View style={styles.logoContainer}>
//           <Text style={styles.logoNumber}>10</Text>
//           <View style={styles.logoText}>
//             <Text style={styles.logoLine1}>YEARS OF</Text>
//             <Text style={styles.logoLine2}>PORTER<Text style={styles.superscript}>®</Text></Text>
//           </View>
//         </View>
        
//         <View style={styles.headerIcons}>
//           <TouchableOpacity 
//              style={styles.iconButton} 
//   onPress={goToExplore}
//           >
//             <Bell color="#1f2937" size={20} />
//           </TouchableOpacity>
//           <TouchableOpacity 
//         style={styles.iconButton} 
//   onPress={goToExplore}
//           >
//             <Headphones color="#1f2937" size={20} />
//           </TouchableOpacity>
//         </View>
//       </View>


//       <ScrollView>
//         {/* Reward Program */}
//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>Porter Reward Program</Text>
//           <ChevronRight color="#3b82f6" size={24} />
//         </View>

//         {/* Noticeboard */}
//         <View style={styles.noticeboard}>
//           <Text style={styles.noticeboardTitle}>Noticeboard</Text>
//           <View style={styles.noticeboardCard}>
//             <View style={styles.primeCard}>
//               <View style={styles.primeLeft}>
//                 <Text style={styles.primeSmallText}>PORTER<Text style={styles.superscript}>®</Text></Text>
//                 <Text style={styles.primeBigText}>PRIME<Text style={styles.superscript}>+</Text></Text>
//                 <Text style={styles.primeSubText}>Prime Plus</Text>
//               </View>
//               <View style={styles.primeRight}>
//                 <Text style={styles.primeLocation}>Bangalore</Text>
//                 <View style={styles.targetIcon}>
//                 </View>
//                 <Text style={styles.targetTitle}>Your Daily Target</Text>
//                 <Text style={styles.targetPrimePlus}>PRIME<Text style={styles.superscript}>+</Text></Text>
//                 <Text style={styles.targetText}>
//                   Complete <Text style={styles.targetHighlight}>6</Text> orders daily
//                 </Text>
//               </View>
//             </View>
//           </View>
//         </View>

//         {/* Performance */}
//         <View style={styles.section}>
//           <Text style={styles.performanceTitle}>Your Performance</Text>
//           <ChevronRight color="#3b82f6" size={24} />
//         </View>

//         {/* Referral */}
//         <View style={styles.referralSection}>
//           <Text style={styles.referralText}>Click here to refer friends, customers and earn referral bonus</Text>
//           <ChevronRight color="#3b82f6" size={24} />
//         </View>

//         {/* Delay Time */}
//         <View style={styles.delaySection}>
//           <View style={styles.delayCircle}>
//             <View style={styles.delayTextContainer}>
//               <Text style={styles.delayNumber}>140</Text>
//               <Text style={styles.delayLabel}>Mins</Text>
//             </View>
//           </View>
//           <Text style={styles.delayMessage}>Delay time will resume when you come online</Text>
//         </View>

//         {/* Footer */}
//         <View style={styles.footer}>
//           <TouchableOpacity style={styles.onlineButton}>
//             <Text style={styles.onlineButtonText}>GO ONLINE {'>>>'}</Text>
//           </TouchableOpacity>
//           <Text style={styles.footerText}>Ready to start earning</Text>
//         </View>
//       </ScrollView>

//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f3f4f6',
//   },
//   statusBar: {
//     backgroundColor: '#6b7280',
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 8,
//   },
//   statusText: {
//     color: 'white',
//     fontSize: 14,
//   },
//   timerContainer: {
//     backgroundColor: '#10b981',
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 12,
//     paddingVertical: 4,
//     borderRadius: 999,
//   },
//   timerDot: {
//     width: 6,
//     height: 6,
//     backgroundColor: 'white',
//     borderRadius: 3,
//     marginRight: 4,
//   },
//   timerText: {
//     color: 'white',
//     fontSize: 14,
//   },
//   statusIcons: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   statusIcon: {
//     width: 20,
//     height: 20,
//     tintColor: 'white',
//     marginHorizontal: 4,
//   },
//   batteryContainer: {
//     width: 24,
//     height: 12,
//     borderWidth: 1,
//     borderColor: 'white',
//     borderRadius: 2,
//     padding: 1,
//     marginLeft: 4,
//   },
//   batteryLevel: {
//     height: '100%',
//     backgroundColor: 'white',
//     borderRadius: 1,
//   },
//   batteryText: {
//     color: 'white',
//     fontSize: 10,
//     marginLeft: 2,
//   },
//   header: {
//     backgroundColor: '#1f2937',
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 16,
//   },
//   logoContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   logoNumber: {
//     color: 'white',
//     fontSize: 36,
//     fontWeight: 'bold',
//   },
//   logoText: {
//     marginLeft: 4,
//   },
//   logoLine1: {
//     color: 'white',
//     fontSize: 10,
//     lineHeight: 12,
//   },
//   logoLine2: {
//     color: 'white',
//     fontSize: 10,
//     lineHeight: 12,
//   },
//   superscript: {
//     fontSize: 8,
//     lineHeight: 12,
//   },
//   headerIcons: {
//     flexDirection: 'row',
//     gap: 8,
//   },
//   iconButton: {
//     backgroundColor: 'white',
//     borderRadius: 999,
//     padding: 8,
//   },
//   section: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#e5e7eb',
//   },
//   sectionTitle: {
//     fontSize: 16,
//     fontWeight: '500',
//   },
//   performanceTitle: {
//     fontSize: 16,
//     fontWeight: '500',
//   },
//   noticeboard: {
//     backgroundColor: '#fffbeb',
//     padding: 16,
//   },
//   noticeboardTitle: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     marginBottom: 16,
//   },
//   noticeboardCard: {
//     borderRadius: 12,
//     overflow: 'hidden',
//   },
//   primeCard: {
//     backgroundColor: '#1e40af',
//     flexDirection: 'row',
//   },
//   primeLeft: {
//     width: '50%',
//     padding: 24,
//     justifyContent: 'center',
//   },
//   primeSmallText: {
//     color: 'white',
//     fontSize: 14,
//   },
//   primeBigText: {
//     color: '#fef08a',
//     fontSize: 32,
//     fontWeight: 'bold',
//     marginVertical: 4,
//   },
//   primeSubText: {
//     color: 'white',
//     fontSize: 16,
//   },
//   primeRight: {
//     width: '50%',
//     backgroundColor: '#2563eb',
//     padding: 16,
//     borderTopLeftRadius: 999,
//     borderBottomLeftRadius: 999,
//     alignItems: 'center',
//   },
//   primeLocation: {
//     color: 'white',
//     fontSize: 12,
//     alignSelf: 'flex-end',
//   },
//   targetIcon: {
//     marginVertical: 4,
//   },
//   targetImage: {
//     width: 64,
//     height: 64,
//   },
//   targetTitle: {
//     color: 'white',
//     fontSize: 16,
//     textAlign: 'center',
//   },
//   targetPrimePlus: {
//     color: '#fef08a',
//     fontSize: 18,
//     fontWeight: 'bold',
//     textAlign: 'center',
//     marginVertical: 4,
//   },
//   targetText: {
//     color: 'white',
//     fontSize: 16,
//     textAlign: 'center',
//   },
//   targetHighlight: {
//     color: '#fef08a',
//   },
//   orangeHighlight: {
//     color: '#fb923c',
//   },
//   targetPrime: {
//     color: '#fb923c',
//     marginTop: 8,
//     textAlign: 'center',
//   },
//   referralSection: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#e5e7eb',
//   },
//   referralText: {
//     fontSize: 16,
//     flex: 1,
//     marginRight: 8,
//   },
//   delaySection: {
//     // padding: 1,
//     paddingHorizontal: 16,
//     flexDirection: 'row',
//     alignItems: 'center',
//     borderBottomWidth: 1,
//     borderBottomColor: '#e5e7eb',
//   },
//   delayCircle: {
//     width: 96,
//     height: 96,
//     position: 'relative',
//     marginRight: 16,
//   },
//   delayImage: {
//     width: '100%',
//     height: '100%',
//   },
//   delayTextContainer: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   delayNumber: {
//     color: '#ef4444',
//     fontSize: 24,
//     fontWeight: 'bold',
//   },
//   delayLabel: {
//     color: '#ef4444',
//     fontSize: 14,
//   },
//   delayMessage: {
//     fontSize: 16,
//     flex: 1,
//   },
//   footer: {
//     backgroundColor: '#111827',
//     padding: 16,
//     alignItems: 'center',
//     marginTop: 'auto',
//   },
//   onlineButton: {
//     backgroundColor: '#10b981',
//     width: '100%',
//     paddingVertical: 16,
//     borderRadius: 8,
//     marginBottom: 16,
//   },
//   onlineButtonText: {
//     color: 'white',
//     fontSize: 24,
//     fontWeight: 'bold',
//     textAlign: 'center',
//   },
//   footerText: {
//     color: 'white',
//     fontSize: 20,
//     marginBottom: 16,
//   },

// });

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function HomeScreen() {
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [greeting, setGreeting] = useState('');

  // Driver mock data
  const driverInfo = {
    name: 'Lokesh Godewar',
    vehicleType: 'SUV',
    numberPlate: 'XYZ 1234'
  };

  useEffect(() => {
    updateGreeting();
  }, []);

  const updateGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Duty Toggle */}
        <TouchableOpacity 
          style={[styles.dutyToggle, isOnDuty ? styles.dutyOn : styles.dutyOff]}
          onPress={() => setIsOnDuty(!isOnDuty)}
        >
          <Text style={styles.dutyText}>
            {isOnDuty ? 'ON DUTY' : 'OFF DUTY'}
          </Text>
        </TouchableOpacity>

        {/* Driver Info Card */}
        <LinearGradient
          colors={['#4c669f', '#3b5998', '#192f6a']}
          style={styles.driverCard}
        >
          <Text style={styles.greeting}>{greeting}!</Text>
          <Text style={styles.name}>{driverInfo.name}</Text>
          <View style={styles.infoRow}>
            <MaterialIcons name="directions-car" size={20} color="white" />
            <Text style={styles.infoText}>{driverInfo.vehicleType}</Text>
          </View>
          <View style={styles.infoRow}>
            <FontAwesome5 name="license-plate" size={20} color="white" />
            <Text style={styles.infoText}>{driverInfo.numberPlate}</Text>
          </View>
          
          {!isOnDuty && (
            <TouchableOpacity style={styles.startButton} onPress={() => setIsOnDuty(true)}>
              <Text style={styles.startButtonText}>Go Online to Start</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={24} color="#4c669f" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <MaterialCommunityIcons name="cart-outline" size={24} color="#666" />
          <Text style={styles.navText}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <MaterialIcons name="account-balance-wallet" size={24} color="#666" />
          <Text style={styles.navText}>Wallet</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <MaterialIcons name="person-outline" size={24} color="#666" />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mainContent: {
    flex: 1,
    padding: 16,
  },
  dutyToggle: {
    padding: 12,
    borderRadius: 25,
    alignSelf: 'center',
    marginBottom: 20,
  
  },
  dutyOn: {
    backgroundColor: '#4CAF50',
  },
  dutyOff: {
    backgroundColor: '#FF5252',
  }, 
  dutyText: {
    color: 'white',
    fontWeight: 'bold',
    paddingHorizontal: 16,
  },
  driverCard: {
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  greeting: {
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  name: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 10,
  },
  startButton: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
  },
  startButtonText: {
    color: '#192f6a',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  navItem: {
    alignItems: 'center',
  },
  navText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
});
