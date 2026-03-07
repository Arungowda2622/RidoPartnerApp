import { useEffect, useState } from 'react';
import { Platform, AppState } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';

// Store modal state globally
let showModalCallback = null;

export const setScreenshotModalCallback = (callback) => {
  showModalCallback = callback;
};

/**
 * Custom hook to prevent screenshots and show warning popup
 * Blocks screenshots for privacy and copyright protection
 */
export const useScreenshotPrevention = () => {
  useEffect(() => {
    let subscription = null;

    const setupScreenshotPrevention = async () => {
      try {
        // Prevent screenshots
        await ScreenCapture.preventScreenCaptureAsync();
        console.log('Screenshot protection enabled');

        // Add listener for screenshot attempts (Android)
        if (Platform.OS === 'android') {
          subscription = ScreenCapture.addScreenshotListener(() => {
            if (showModalCallback) {
              showModalCallback();
            }
          });
        }

        // For iOS, we show warning when app becomes active after screenshot
        const appStateListener = AppState.addEventListener('change', (nextAppState) => {
          if (nextAppState === 'active') {
            // Check if screenshot was taken (iOS doesn't provide direct detection)
            // This is a fallback approach
          }
        });

        return () => {
          if (subscription) {
            subscription.remove();
          }
          appStateListener.remove();
        };
      } catch (error) {
        console.error('Error setting up screenshot prevention:', error);
      }
    };

    setupScreenshotPrevention();

    return () => {
      // Clean up on unmount
      ScreenCapture.allowScreenCaptureAsync().catch(console.error);
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);
};

/**
 * Manually trigger screenshot prevention (for specific screens)
 */
export const enableScreenshotProtection = async () => {
  try {
    await ScreenCapture.preventScreenCaptureAsync();
  } catch (error) {
    console.error('Error enabling screenshot protection:', error);
  }
};

/**
 * Disable screenshot prevention (use cautiously)
 */
export const disableScreenshotProtection = async () => {
  try {
    await ScreenCapture.allowScreenCaptureAsync();
  } catch (error) {
    console.error('Error disabling screenshot protection:', error);
  }
};
