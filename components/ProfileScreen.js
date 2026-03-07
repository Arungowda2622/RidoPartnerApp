// import { useRouter } from 'expo-router';
// import { ChevronLeft, ChevronRight, MoreVertical, Star } from 'lucide-react-native';
// import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// export default function ProfileScreen() {
//   const router = useRouter();
//   return (
//     <SafeAreaView>

//       {/* Header */}
//       <View style={styles.header}>
//           <TouchableOpacity onPress={() => {router.back()}}>
//           <View style={styles.headerLeft}>
//           <ChevronLeft color="white" size={24} />
//           <Text style={styles.headerTitle}>Profile</Text>
//           </View>
//           </TouchableOpacity>
//         <MoreVertical color="white" size={24} />
//       </View>
//       <ScrollView>

//         {/* Profile Info */}
//         <View style={styles.profileInfo}>
//           <View style={styles.avatarContainer}>
//             <View style={styles.avatar}>
//             <Image
//                   source={require('../Profile.jpg')}
//                   style={styles.targetImage}
//                 /> 
//             </View>
//             <View style={styles.statusIndicator} />
//           </View>
//           <View style={styles.profileDetails}>
//             <View style={styles.nameContainer}>
//               <Text style={styles.name}>Lokesh Godewar</Text>
//               <Text style={styles.dot}>•</Text>
//               <View style={styles.ratingContainer}>
//                 <Star color="black" size={16} fill="black" />
//                 <Text style={styles.rating}>4.9</Text>
//               </View>
//             </View>
//             <View style={styles.vehicleInfo}>
//               <Text style={styles.vehicleText}>2 Wheeler</Text>
//               <Text style={styles.dot}>•</Text>
//               <Text style={styles.vehicleText}>KA-51-EQ-3702</Text>
//             </View>
//           </View>
//         </View>

//         {/* Home Address */}
//         <View style={styles.infoSection}>
//           <Text style={styles.infoLabel}>Home Address</Text>
//           <Text style={styles.infoValue}>--</Text>
//         </View>

//         {/* Mobile Number */}
//         <View style={styles.infoSection}>
//           <Text style={styles.infoLabel}>Mobile number</Text>
//           <Text style={styles.infoValue}>6362016344</Text>
//         </View>

//         {/* Bank Details */}
//         <View style={styles.infoSection}>
//           <View style={styles.bankHeader}>
//             <Text style={styles.bankTitle}>Current Bank Details</Text>
//             <Text style={styles.editText}>EDIT DETAILS</Text>
//           </View>
//           <View style={styles.bankDetail}>
//             <Text style={styles.bankLabel}>Account number</Text>
//             <Text style={styles.bankSeparator}>:</Text>
//             <Text style={styles.bankValue}>2401246257468262</Text>
//           </View>
//           <View style={styles.bankDetail}>
//             <Text style={styles.bankLabel}>IFSC Code</Text>
//             <Text style={styles.bankSeparator}>:</Text>
//             <Text style={styles.bankValue}>aubl0002462</Text>
//           </View>
//         </View>

//         {/* My Vehicles */}
//         <View style={styles.sectionWithChevron}>
//           <Text style={styles.sectionTitle}>My Vehicles</Text>
//           <ChevronRight color="black" size={24} />
//         </View>

//         {/* App Language */}
//         <View style={styles.languageSection}>
//           <View>
//             <Text style={styles.infoLabel}>Preferred app language</Text>
//             <Text style={styles.infoValue}>English</Text>
//           </View>
//           <TouchableOpacity style={styles.changeButton}>
//             <Text style={styles.changeButtonText}>Change</Text>
//           </TouchableOpacity>
//         </View>

//         {/* Training Language */}
//         <View style={styles.languageSection}>
//           <View>
//             <Text style={styles.infoLabel}>Change Training Language</Text>
//             <Text style={styles.infoValue}>हिंदी</Text>
//           </View>
//           <TouchableOpacity style={styles.changeButton}>
//             <Text style={styles.changeButtonText}>Change</Text>
//           </TouchableOpacity>
//         </View>

//         {/* App Version */}
//         <View style={styles.versionSection}>
//           <Text style={styles.versionText}>App Version 5.122.4</Text>
//         </View>
//       </ScrollView>

//       {/* </View> */}
//     </SafeAreaView>

//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f3f4f6',
//   },
//     targetImage: {
//     width: 60,
//     height:60,
//   },
//   statusBar: {
//     backgroundColor: '#6b7280',
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//   },
//   statusBarText: {
//     color: 'white',
//     fontSize: 14,
//   },
//   batteryContainer: {
//     backgroundColor: '#10b981',
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 16,
//     paddingVertical: 4,
//     borderRadius: 999,
//   },
//   statusIcons: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 4,
//   },
//   iconContainer: {
//     padding: 4,
//   },
//   icon: {
//     width: 20,
//     height: 20,
//     tintColor: 'white',
//   },
//   batteryIndicator: {
//     width: 32,
//     height: 16,
//     borderWidth: 1,
//     borderColor: 'white',
//     borderRadius: 2,
//     padding: 2,
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   batteryLevel: {
//     height: 10,
//     backgroundColor: 'white',
//     borderRadius: 1,
//   },
//   header: {
//     backgroundColor: '#2563eb',
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 16,
//   },
//   headerLeft: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   headerTitle: {
//     color: 'white',
//     fontSize: 24,
//     marginLeft: 16,
//     fontWeight: 'normal',
//   },
//   profileInfo: {
//     backgroundColor: 'white',
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#ef4444',
//   },
//   avatarContainer: {
//     position: 'relative',
//     marginRight: 16,
//   },
//   avatar: {
//     width: 64,
//     height: 64,
//     borderRadius: 32,
//     backgroundColor: '#fef08a',
//     borderWidth: 2,
//     borderColor: '#2563eb',
//     overflow: 'hidden',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   avatarInner: {
//     width: 40,
//     height: 40,
//     backgroundColor: '#1e3a8a',
//     borderRadius: 20,
//     position: 'absolute',
//     top: 4,
//   },
//   statusIndicator: {
//     width: 16,
//     height: 16,
//     backgroundColor: '#ef4444',
//     borderRadius: 8,
//     position: 'absolute',
//     bottom: 0,
//     right: 0,
//   },
//   profileDetails: {
//     flex: 1,
//   },
//   nameContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 4,
//   },
//   name: {
//     fontSize: 20,
//     fontWeight: '500',
//   },
//   dot: {
//     marginHorizontal: 8,
//   },
//   ratingContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   rating: {
//     marginLeft: 4,
//   },
//   vehicleInfo: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     color: '#4b5563',
//   },
//   vehicleText: {
//     color: '#4b5563',
//   },
//   infoSection: {
//     backgroundColor: 'white',
//     padding: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#e5e7eb',
//   },
//   infoLabel: {
//     color: '#6b7280',
//     marginBottom: 4,
//   },
//   infoValue: {
//     fontSize: 20,
//   },
//   bankHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   bankTitle: {
//     fontSize: 20,
//     fontWeight: '500',
//   },
//   editText: {
//     color: '#2563eb',
//     fontWeight: '500',
//   },
//   bankDetail: {
//     flexDirection: 'row',
//     marginBottom: 8,
//   },
//   bankLabel: {
//     width: 160,
//   },
//   bankSeparator: {
//     marginHorizontal: 8,
//   },
//   bankValue: {
//     fontWeight: '500',
//   },
//   sectionWithChevron: {
//     backgroundColor: 'white',
//     padding: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#e5e7eb',
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   sectionTitle: {
//     fontSize: 20,
//     fontWeight: '500',
//   },
//   languageSection: {
//     backgroundColor: 'white',
//     padding: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#e5e7eb',
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   changeButton: {
//     borderWidth: 1,
//     borderColor: '#2563eb',
//     paddingHorizontal: 24,
//     paddingVertical: 8,
//     borderRadius: 6,
//   },
//   changeButtonText: {
//     color: '#2563eb',
//   },
//   versionSection: {
//     backgroundColor: 'white',
//     padding: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#e5e7eb',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   versionText: {
//     color: '#6b7280',
//   },
//   bottomNav: {
//     backgroundColor: 'black',
//     padding: 16,
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   navIcon: {
//     alignItems: 'center',
//   },
//   navLine: {
//     width: 24,
//     height: 2,
//     backgroundColor: 'white',
//     marginBottom: 4,
//   },
//   navSquare: {
//     width: 24,
//     height: 24,
//     borderWidth: 2,
//     borderColor: 'white',
//     borderRadius: 4,
//   },
// });

import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome, Entypo } from '@expo/vector-icons';

export default function ProfileScreen() {
  const driver = {
    name: 'Lokesh Godewar',
    phone: '+91 98765 43210',
    email: 'lokesh@example.com',
    address: '123 Main Street, City, State - 400001',
    vehicleType: 'SUV',
    vehicleModel: 'Toyota Fortuner',
    numberPlate: 'XYZ 1234',
    insuranceExpiry: '15/05/2025',
    bankName: 'State Bank of India',
    accountNumber: 'XXXXXX7890',
    ifscCode: 'SBIN0001234',
    avatar: 'https://i.pravatar.cc/150?img=3',
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: () => console.log('Logged out') },
    ]);
  };

  const handleEdit = (section) => {
    Alert.alert('Edit', `Edit ${section} details`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Continue', onPress: () => console.log(`Editing ${section}`) },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image source={{ uri: driver.avatar }} style={styles.avatar} />
        <Text style={styles.name}>{driver.name}</Text>
        <Text style={styles.phone}>{driver.phone}</Text>
      </View>

      {/* Personal Details Section */}
      <View style={styles.infoCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Personal Details</Text>
          <TouchableOpacity onPress={() => handleEdit('personal')}>
            <Ionicons name="create-outline" size={20} color="#4c669f" />
          </TouchableOpacity>
        </View>
        <View style={styles.infoRow}>
          <MaterialIcons name="email" size={20} color="#666" />
          <Text style={styles.infoText}>{driver.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Entypo name="location-pin" size={20} color="#666" />
          <Text style={styles.infoText}>{driver.address}</Text>
        </View>
      </View>

      {/* Vehicle Details Section */}
      <View style={styles.infoCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Vehicle Info</Text>
          <TouchableOpacity onPress={() => handleEdit('vehicle')}>
            <Ionicons name="create-outline" size={20} color="#4c669f" />
          </TouchableOpacity>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="car-outline" size={20} color="#666" />
          <Text style={styles.infoText}>{driver.vehicleType} ({driver.vehicleModel})</Text>
        </View>
        <View style={styles.infoRow}>
          <FontAwesome name="id-card" size={20} color="#666" />
          <Text style={styles.infoText}>{driver.numberPlate}</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialIcons name="date-range" size={20} color="#666" />
          <Text style={styles.infoText}>Insurance expires on: {driver.insuranceExpiry}</Text>
        </View>
      </View>

      {/* Bank Details Section */}
      <View style={styles.infoCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Bank Details</Text>
          <TouchableOpacity onPress={() => handleEdit('bank')}>
            <Ionicons name="create-outline" size={20} color="#4c669f" />
          </TouchableOpacity>
        </View>
        <View style={styles.infoRow}>
          <FontAwesome name="bank" size={20} color="#666" />
          <Text style={styles.infoText}>{driver.bankName}</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialIcons name="credit-card" size={20} color="#666" />
          <Text style={styles.infoText}>Account: {driver.accountNumber}</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialIcons name="code" size={20} color="#666" />
          <Text style={styles.infoText}>IFSC: {driver.ifscCode}</Text>
        </View>
      </View>

      {/* Action Items */}
      <View style={styles.actionList}>
        <TouchableOpacity 
          style={styles.actionItem}
          onPress={() => handleEdit('profile')}
        >
          <Ionicons name="create-outline" size={22} color="#4c669f" />
          <Text style={styles.actionText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem}>
          <Ionicons name="document-text-outline" size={22} color="#4c669f" />
          <Text style={styles.actionText}>Documents</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem}>
          <Ionicons name="help-circle-outline" size={22} color="#4c669f" />
          <Text style={styles.actionText}>Support</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={handleLogout}>
          <MaterialIcons name="logout" size={22} color="red" />
          <Text style={[styles.actionText, { color: 'red' }]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 10,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  phone: {
    fontSize: 16,
    color: '#666',
  },
  infoCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 16,
    borderRadius: 10,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  actionList: {
    marginTop: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  actionItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#4c669f',
    fontWeight: '500',
  },
});
