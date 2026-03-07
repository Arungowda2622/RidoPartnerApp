import * as Location from 'expo-location';

export const getCurrentLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
        throw new Error('Permission to access location was denied');
    }
    let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
    });
    return location;
};
