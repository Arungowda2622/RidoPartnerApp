import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

export default function LocationScreen() {
  // Example coordinates
  const pickupLocation = {
    latitude: 12.9784,
    longitude: 77.6408,
    title: 'Pickup: Whitefield Hospital',
  };

  const dropLocation = {
    latitude: 12.9916,
    longitude: 77.7040,
    title: 'Drop: Gopalan International School',
  };

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: pickupLocation.latitude,
          longitude: pickupLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        <Marker
          coordinate={pickupLocation}
          title={pickupLocation.title}
          pinColor="green"
        />
        <Marker
          coordinate={dropLocation}
          title={dropLocation.title}
          pinColor="red"
        />
      </MapView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 16,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  map: {
    flex: 1,
  },
});
