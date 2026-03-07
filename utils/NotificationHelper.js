import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Check if we're running in a development build (not Expo Go)
 * In Expo Go, expo-notifications doesn't work on Android for SDK 53+
 */
const isInDevelopmentBuild = () => {
  // Check if we're in a standalone/development build
  const appOwnership = Constants.appOwnership;
  return appOwnership === 'standalone' || appOwnership === 'expo';
};

/**
 * Safely schedule a notification only if in a development build
 * Falls back gracefully in Expo Go
 */
export const scheduleNotificationSafely = async (notificationContent) => {
  // Skip notifications in Expo Go on Android (SDK 53+)
  if (Platform.OS === 'android' && !isInDevelopmentBuild()) {
    console.log('[NotificationHelper] Skipping notification in Expo Go (Android)');
    return null;
  }

  try {
    return await Notifications.scheduleNotificationAsync(notificationContent);
  } catch (error) {
    console.log('[NotificationHelper] Notification error:', error.message);
    return null;
  }
};

/**
 * Check if notifications are supported in current environment
 */
export const areNotificationsSupported = () => {
  if (Platform.OS === 'android' && !isInDevelopmentBuild()) {
    return false;
  }
  return true;
};

export default {
  scheduleNotificationSafely,
  areNotificationsSupported,
};
