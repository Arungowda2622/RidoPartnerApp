/**
 * Shared helper utilities for HomeScreen
 * Reduces code duplication and improves maintainability
 */

/**
 * Development-only console logging
 * Logs are stripped in production builds
 */
export const log = (...args) => {
  if (__DEV__) {
    console.log(...args);
  }
};

/**
 * Normalize rider data structure
 * Handles inconsistent API response formats
 * @param {Object} r - Rider data from API
 * @returns {Object|null} Normalized rider object or null
 */
export const normalizeRider = (r) => {
  return r?.data || r?.rider || r || null;
};

/**
 * Create a safe timeout manager that prevents memory leaks
 * Automatically clears all timeouts when component unmounts
 * @returns {Object} Object with set and clearAll methods
 */
export const createSafeTimeout = () => {
  const refs = [];

  const set = (fn, delay) => {
    const id = setTimeout(fn, delay);
    refs.push(id);
    return id;
  };

  const clearAll = () => {
    refs.forEach(clearTimeout);
    refs.length = 0;
  };

  return { set, clearAll };
};
