// import React, { useState } from 'react';
// import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
// import { useNavigation } from '@react-navigation/native';
// import { Ionicons } from '@expo/vector-icons';

// const languages = [
//   { label: 'English', value: 'en' },
//   { label: 'हिन्दी', value: 'hi' },
//   { label: 'ಕನ್ನಡ', value: 'kn' },
//   { label: 'తెలుగు', value: 'te' },
//   { label: 'தமிழ்', value: 'ta' },
// ];

// const LanguageSelectorScreen = () => {
//   const [selected, setSelected] = useState('en');
//   const navigation = useNavigation();

//   const handleContinue = () => {
//     navigation.replace('MobileNumber');
//   };

//   return (
//     <View style={styles.container}>
//       <View style={styles.innerContent}>
//         <Text style={styles.title}>Choose Language</Text>
//         <Text style={styles.subtitle}>
//           Your language preference can be changed anytime in settings
//         </Text>

//         <View style={styles.languageContainer}>
//           {Array.from({ length: Math.ceil(languages.length / 2) }, (_, i) => (
//             <View key={i} style={styles.row}>
//               {languages.slice(i * 2, i * 2 + 2).map((lang) => (
//                 <TouchableOpacity
//                   key={lang.value}
//                   style={[
//                     styles.languageCard,
//                     selected === lang.value && styles.selectedCard,
//                   ]}
//                   onPress={() => setSelected(lang.value)}
//                 >
//                   <Text style={styles.langLabel}>{lang.label}</Text>
//                   {selected === lang.value && (
//                     <Ionicons
//                       name="checkmark-circle"
//                       size={24}
//                       color="#fff"
//                       style={styles.checkIcon}
//                     />
//                   )}
//                 </TouchableOpacity>
//               ))}
//             </View>
//           ))}
//         </View>
//       </View>

//       <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
//         <Text style={styles.continueText}>Continue</Text>
//       </TouchableOpacity>
//     </View>
//   );
// };

// export default LanguageSelectorScreen;

// const CIRCLE_SIZE = 110;

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#FAFAFA',
//     padding: 20,
//     paddingTop: 80,
//     justifyContent: 'space-between',
//   },
//   innerContent: {
//     alignItems: 'center',
//   },
//   title: {
//     fontSize: 22,
//     fontWeight: 'bold',
//     color: '#222',
//   },
//   subtitle: {
//     color: '#666',
//     textAlign: 'center',
//     marginVertical: 10,
//     fontSize: 14,
//     maxWidth: 280,
//   },
//   languageContainer: {
//     marginTop: 30,
//   },
//   row: {
//     flexDirection: 'row',
//     justifyContent: 'space-evenly',
//     marginBottom: 20,
//     gap: 20,
//   },
//   languageCard: {
//     width: CIRCLE_SIZE,
//     height: CIRCLE_SIZE,
//     backgroundColor: '#50B8E7',
//     borderRadius: CIRCLE_SIZE / 2,
//     justifyContent: 'center',
//     alignItems: 'center',
//     position: 'relative',
//     shadowColor: '#000',
//     shadowOpacity: 0.1,
//     shadowOffset: { width: 0, height: 3 },
//     shadowRadius: 4,
//     elevation: 4,
//   },
//   selectedCard: {
//     backgroundColor: '#0066FF',
//   },
//   langLabel: {
//     color: 'white',
//     fontSize: 16,
//     textAlign: 'center',
//     fontWeight: '600',
//   },
//   checkIcon: {
//     position: 'absolute',
//     top: 10,
//     right: 10,
//   },
//   continueButton: {
//     backgroundColor: '#0066FF',
//     paddingVertical: 14,
//     borderRadius: 10,
//     alignItems: 'center',
    
//   },
//   continueText: {
//     color: 'white',
//     fontSize: 16,
//     paddingHorizontal: 60,
//     fontWeight: '600',
//   },
// });

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const languages = [
  { label: 'English', value: 'en' },
  { label: 'हिन्दी', value: 'hi' },
  { label: 'ಕನ್ನಡ', value: 'kn' },
  { label: 'తెలుగు', value: 'te' },
  { label: 'தமிழ்', value: 'ta' },
];

const LanguageSelectorScreen = () => {
  const [selected, setSelected] = useState('en');
  const navigation = useNavigation();

  const handleContinue = () => {
    navigation.replace('MobileNumber');
  };

  return (
    <View style={styles.container}>
      <View style={styles.innerContent}>
        <Text style={styles.title}>Choose Language</Text>
        <Text style={styles.subtitle}>
          Your language preference can be changed anytime in settings
        </Text>

        <View style={styles.languageContainer}>
          {Array.from({ length: Math.ceil(languages.length / 2) }, (_, i) => (
            <View key={i} style={styles.row}>
              {languages.slice(i * 2, i * 2 + 2).map((lang) => (
                <TouchableOpacity
                  key={lang.value}
                  style={[
                    styles.languageCard,
                    selected === lang.value && styles.selectedCard,
                  ]}
                  onPress={() => setSelected(lang.value)}
                >
                  {/* <Text style={styles.langLabel}>{lang.label}</Text> */}
                  <Text
  style={[
    styles.langLabel,
    selected === lang.value && styles.selectedLabel,
  ]}
>
  {lang.label}
</Text>
                
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
};

export default LanguageSelectorScreen;

const CIRCLE_SIZE = 110;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingTop: 80,
    justifyContent: 'space-between',
  },
  innerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
  },
  subtitle: {
    color: '#666',
    textAlign: 'center',
    marginVertical: 10,
    fontSize: 14,
    maxWidth: 280,
  },
  languageContainer: {
    marginTop: 30,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 20,
    gap: 20,
  },
  languageCard: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    // backgroundColor: '#50B8E7',
    backgroundColor: 'white',
    borderRadius: CIRCLE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
    elevation: 4,
  },
  selectedCard: {
    // backgroundColor: '#0066FF',
     backgroundColor: '#EC4D4A',
     color:'white',
     
  },
  langLabel: {
    color: '2d2d2d',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
    
    
  },
  // checkIcon: {
  //   position: 'absolute',
  //   top: 10,
  //   right: 10,
  // },
  continueButton: {
    // backgroundColor: '#0066FF',
      backgroundColor: '#EC4D4A',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    
  },
  selectedLabel: {
  color: 'white',
},
  continueText: {
    color: 'white',
    fontSize: 16,
    paddingHorizontal: 60,
    fontWeight: '600',
  },
});