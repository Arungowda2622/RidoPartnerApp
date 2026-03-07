/**
 * Global Rider Data Manager - Singleton
 * Ensures only ONE API call happens at a time across the entire app
 * All components share the same cached data
 */

import { getRiderByPhone as apiGetRiderByPhone } from './AuthApi';

class RiderDataManager {
  constructor() {
    this.cache = null;
    this.cacheTimestamp = 0;
    this.cacheDuration = 10000; // 10 seconds
    this.pendingRequest = null; // Track in-flight request
    this.listeners = new Set(); // Components that want updates
  }

  /**
   * Subscribe to rider data updates
   * @param {Function} callback - Called when rider data updates
   * @returns {Function} unsubscribe function
   */
  subscribe(callback) {
    this.listeners.add(callback);
    // Immediately call with cached data if available
    if (this.cache) {
      callback(this.cache);
    }
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all subscribers of data change
   */
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.cache);
      } catch (error) {
        console.error('[RiderDataManager] Error notifying listener:', error);
      }
    });
  }

  /**
   * Check if cache is valid
   */
  isCacheValid() {
    if (!this.cache) return false;
    const now = Date.now();
    const isValid = (now - this.cacheTimestamp) < this.cacheDuration;
    console.log(`[RiderDataManager] Cache check: ${isValid ? '✅ VALID' : '❌ EXPIRED'} (age: ${now - this.cacheTimestamp}ms)`);
    return isValid;
  }

  /**
   * Get rider data - returns cached or fetches new
   * @param {boolean} forceRefresh - Force fetch from API
   * @returns {Promise<Object>} Rider data
   */
  async getRiderData(forceRefresh = false) {
    // Return cache if valid and not forcing refresh
    if (!forceRefresh && this.isCacheValid()) {
      console.log('[RiderDataManager] 📦 Returning cached data');
      return this.cache;
    }

    // If there's already a pending request, wait for it
    if (this.pendingRequest) {
      console.log('[RiderDataManager] ⏳ Request in-flight, waiting for existing call...');
      return this.pendingRequest;
    }

    console.log('[RiderDataManager] 🌐 Fetching fresh data from API...');
    
    // Create new request
    this.pendingRequest = apiGetRiderByPhone()
      .then(data => {
        console.log('[RiderDataManager] ✅ API call successful');
        this.cache = data;
        this.cacheTimestamp = Date.now();
        this.notifyListeners();
        return data;
      })
      .catch(error => {
        console.error('[RiderDataManager] ❌ API call failed:', error);
        throw error;
      })
      .finally(() => {
        this.pendingRequest = null;
      });

    return this.pendingRequest;
  }

  /**
   * Invalidate cache - next call will fetch fresh data
   */
  invalidateCache() {
    console.log('[RiderDataManager] 🗑️ Cache invalidated');
    this.cache = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Update cache directly (useful after status changes)
   */
  updateCache(newData) {
    console.log('[RiderDataManager] 🔄 Cache updated directly');
    this.cache = newData;
    this.cacheTimestamp = Date.now();
    this.notifyListeners();
  }

  /**
   * Get cached data without triggering fetch
   */
  getCachedDataOnly() {
    return this.isCacheValid() ? this.cache : null;
  }

  /**
   * Clear all data and listeners (for logout)
   */
  clear() {
    console.log('[RiderDataManager] 🧹 Clearing all data and listeners');
    this.cache = null;
    this.cacheTimestamp = 0;
    this.pendingRequest = null;
    this.listeners.clear();
  }
}

// Export singleton instance
export const riderDataManager = new RiderDataManager();

// Export convenience function that matches existing API
export const getCachedRiderData = (forceRefresh = false) => {
  return riderDataManager.getRiderData(forceRefresh);
};

// Export for components that want to subscribe to updates
export default riderDataManager;
