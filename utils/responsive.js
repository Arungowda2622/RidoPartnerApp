import { Dimensions, Platform, StatusBar } from 'react-native';

// Get device dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 11 Pro / standard Android)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Responsive scaling utility for consistent UI across all device sizes
 * This ensures your app looks great on small phones like iPhone SE 
 * and large devices like iPad or Android tablets
 */

/**
 * Scale width relative to device screen width
 * @param {number} size - The size you want to scale
 * @returns {number} - Scaled size
 */
export const scaleWidth = (size) => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

/**
 * Scale height relative to device screen height
 * @param {number} size - The size you want to scale
 * @returns {number} - Scaled size
 */
export const scaleHeight = (size) => {
  return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
};

/**
 * Scale font size with a moderate factor
 * This prevents fonts from becoming too large on big screens
 * @param {number} size - The font size you want to scale
 * @returns {number} - Scaled font size
 */
export const scaleFontSize = (size) => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  
  // Apply limits to prevent extreme sizes
  if (Platform.OS === 'ios') {
    return Math.round(newSize);
  }
  // Android may need slightly different scaling
  return Math.round(newSize) - 1;
};

/**
 * Moderate scale - scales less aggressively
 * Good for padding, margins, and border radius
 * @param {number} size - The size you want to scale
 * @param {number} factor - Scaling factor (0-1), default 0.5
 * @returns {number} - Scaled size
 */
export const moderateScale = (size, factor = 0.5) => {
  return size + (scaleWidth(size) - size) * factor;
};

/**
 * Responsive size for both width and height
 * Uses the smaller of width/height scaling to maintain proportions
 * @param {number} size - The size you want to scale
 * @returns {number} - Scaled size
 */
export const scale = (size) => {
  const widthScale = SCREEN_WIDTH / BASE_WIDTH;
  const heightScale = SCREEN_HEIGHT / BASE_HEIGHT;
  const scale = Math.min(widthScale, heightScale);
  return Math.round(size * scale);
};

/**
 * Get responsive padding based on screen size
 * @returns {object} - Padding values for different screen sizes
 */
export const getResponsivePadding = () => {
  const isSmallDevice = SCREEN_WIDTH < 375;
  const isMediumDevice = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
  const isLargeDevice = SCREEN_WIDTH >= 414;

  if (isSmallDevice) {
    return { xs: 8, sm: 12, md: 16, lg: 20, xl: 24 };
  } else if (isMediumDevice) {
    return { xs: 10, sm: 14, md: 18, lg: 22, xl: 26 };
  } else {
    return { xs: 12, sm: 16, md: 20, lg: 24, xl: 28 };
  }
};

/**
 * Check if device is a small phone (e.g., iPhone SE, small Android)
 * @returns {boolean}
 */
export const isSmallDevice = () => {
  return SCREEN_WIDTH < 375 || SCREEN_HEIGHT < 667;
};

/**
 * Check if device is a tablet
 * @returns {boolean}
 */
export const isTablet = () => {
  return SCREEN_WIDTH >= 768;
};

/**
 * Get safe area heights for different platforms
 * @returns {object}
 */
export const getSafeAreaInsets = () => {
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;
  
  return {
    top: Platform.OS === 'ios' ? (SCREEN_HEIGHT >= 812 ? 44 : 20) : statusBarHeight,
    bottom: Platform.OS === 'ios' ? (SCREEN_HEIGHT >= 812 ? 34 : 0) : 0,
  };
};

/**
 * Get device type information
 * @returns {object}
 */
export const getDeviceType = () => {
  const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
  
  return {
    isSmall: SCREEN_WIDTH < 375,
    isMedium: SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414,
    isLarge: SCREEN_WIDTH >= 414 && SCREEN_WIDTH < 768,
    isTablet: SCREEN_WIDTH >= 768,
    isIphoneX: Platform.OS === 'ios' && SCREEN_HEIGHT >= 812,
    aspectRatio: aspectRatio,
  };
};

/**
 * Responsive font sizes - predefined sizes
 */
export const FONT_SIZES = {
  tiny: scaleFontSize(10),
  small: scaleFontSize(12),
  regular: scaleFontSize(14),
  medium: scaleFontSize(16),
  large: scaleFontSize(18),
  xlarge: scaleFontSize(20),
  xxlarge: scaleFontSize(24),
  huge: scaleFontSize(28),
  massive: scaleFontSize(32),
};

/**
 * Responsive spacing - predefined spacing
 */
export const SPACING = {
  tiny: scale(4),
  small: scale(8),
  regular: scale(12),
  medium: scale(16),
  large: scale(20),
  xlarge: scale(24),
  xxlarge: scale(32),
  huge: scale(40),
  massive: scale(48),
};

/**
 * Responsive border radius
 */
export const BORDER_RADIUS = {
  small: scale(4),
  regular: scale(8),
  medium: scale(12),
  large: scale(16),
  xlarge: scale(20),
  round: scale(100),
};

/**
 * Responsive icon sizes
 */
export const ICON_SIZES = {
  tiny: scale(12),
  small: scale(16),
  regular: scale(20),
  medium: scale(24),
  large: scale(28),
  xlarge: scale(32),
  xxlarge: scale(40),
  huge: scale(48),
};

// Export dimensions
export const DEVICE = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  aspectRatio: SCREEN_HEIGHT / SCREEN_WIDTH,
};

// Export all utilities
export default {
  scaleWidth,
  scaleHeight,
  scaleFontSize,
  moderateScale,
  scale,
  getResponsivePadding,
  isSmallDevice,
  isTablet,
  getSafeAreaInsets,
  getDeviceType,
  FONT_SIZES,
  SPACING,
  BORDER_RADIUS,
  ICON_SIZES,
  DEVICE,
};
