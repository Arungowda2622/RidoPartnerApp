import * as Location from 'expo-location';

export const getCurrentAddress = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
        throw new Error('Permission to access location was denied');
    }
    let location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;
    let [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (!address) throw new Error('Unable to get address');
    return `${address.name || ''} ${address.street || ''}, ${address.city || ''}, ${address.region || ''}, ${address.postalCode || ''}, ${address.country || ''}`;
}; 