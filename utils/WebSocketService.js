import AsyncStorage from '@react-native-async-storage/async-storage';

class WebSocketService {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.onMessageCallback = null;
        this.onConnectionChangeCallback = null;
        this.heartbeatInterval = null;
        this.serverUrl = null;
    }

    // Initialize WebSocket connection
    async initialize(serverUrl, riderId) {
        this.serverUrl = serverUrl;
        this.riderId = riderId;

        try {
            await this.connect();
            return true;
        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
            return false;
        }
    }

    // Connect to WebSocket server
    async connect() {
        if (this.ws && this.isConnected) {
            console.log('[WS] Already connected, skipping...');
            return;
        }

        try {
            // Remove token requirement as backend doesn't verify it for riders
            const wsUrl = `${this.serverUrl}?riderId=${this.riderId}&role=rider`;
            console.log('[WS] 🔌 Attempting connection to:', wsUrl);
            console.log('[WS] 📅 Timestamp:', new Date().toISOString());

            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('[WS] ✅ WebSocket connected successfully!');
                console.log('[WS] 🕒 Connected at:', new Date().toLocaleTimeString());
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.startHeartbeat();

                if (this.onConnectionChangeCallback) {
                    this.onConnectionChangeCallback(true);
                }
            };

            this.ws.onmessage = (event) => {
                console.log('[WS] 📥 Raw message received:', event.data);
                try {
                    const data = JSON.parse(event.data);
                    console.log('[WS] 📦 Parsed message:', data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('[WS] ❌ Failed to parse message:', error);
                }
            };

            this.ws.onclose = (event) => {
                console.log('[WS] ❌ WebSocket disconnected');
                console.log('[WS] 📊 Close code:', event.code);
                console.log('[WS] 📝 Close reason:', event.reason);
                console.log('[WS] 🕒 Disconnected at:', new Date().toLocaleTimeString());
                
                this.isConnected = false;
                this.stopHeartbeat();

                if (this.onConnectionChangeCallback) {
                    this.onConnectionChangeCallback(false);
                }

                // Attempt to reconnect if not manually closed
                if (event.code !== 1000) {
                    console.log('[WS] 🔄 Attempting reconnection...');
                    this.attemptReconnect();
                }
            };

            this.ws.onerror = (error) => {
                console.error('[WS] 🚨 WebSocket error occurred:', error);
                console.error('[WS] 🚨 Error message:', error.message);
                console.error('[WS] 🚨 Error at:', new Date().toLocaleTimeString());
            };

        } catch (error) {
            console.error('Failed to connect to WebSocket:', error);
            throw error;
        }
    }

    // Send location update to server
    sendLocationUpdate(locationData) {
        if (!this.isConnected || !this.ws) {
            console.log('[WS] ⚠️ Cannot send location - WebSocket not connected');
            return false;
        }

        if (!this.riderId || this.riderId === 'undefined') {
            console.error('[WS] ❌ Cannot send location - riderId is undefined');
            return false;
        }

        try {
            const message = {
                type: 'location_update',
                riderId: this.riderId,
                data: {
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                    accuracy: locationData.accuracy,
                    speed: locationData.speed,
                    heading: locationData.heading,
                    timestamp: locationData.timestamp,
                    timestampISO: locationData.timestampISO,
                }
            };

            this.ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error('[WS] ❌ Failed to send location update:', error);
            return false;
        }
    }

    // Send status update
    sendStatusUpdate(status) {
        if (!this.isConnected || !this.ws) return false;

        try {
            const message = {
                type: 'status_update',
                riderId: this.riderId,
                data: {
                    status: status, // 'online', 'offline', 'busy', 'available'
                    timestamp: Date.now(),
                    timestampISO: new Date().toISOString(),
                }
            };

            this.ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error('Failed to send status update:', error);
            return false;
        }
    }

    // Send order update
    sendOrderUpdate(orderData) {
        if (!this.isConnected || !this.ws) return false;

        try {
            const message = {
                type: 'order_update',
                riderId: this.riderId,
                data: orderData
            };

            this.ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error('Failed to send order update:', error);
            return false;
        }
    }

    // Handle incoming messages
    handleMessage(data) {
        console.log('[WS] 📨 Processing message type:', data.type);
        console.log('[WS] 📨 Message data:', JSON.stringify(data, null, 2));

        if (this.onMessageCallback) {
            console.log('[WS] 📲 Forwarding to callback...');
            this.onMessageCallback(data);
        }

        switch (data.type) {
            case 'new_booking':
                console.log('[WS] 🆕 New booking received!');
                console.log('[WS] 🆕 Booking ID:', data.booking?.bookingId || data.bookingId);
                console.log('[WS] 🆕 Booking data:', data.booking);
                break;
            case 'booking_cancelled':
                console.log('[WS] ❌ Booking cancelled:', data.bookingId);
                break;
            case 'tip_added':
                console.log('[WS] 💰 TIP ADDED - Processing tip notification');
                console.log('[WS] 💰 Booking ID:', data.bookingId);
                console.log('[WS] 💰 Tip Amount:', data.tipAmount);
                console.log('[WS] 💰 New Total:', data.newTotal);
                this.handleTipAdded(data);
                break;
            case 'connection_established':
                console.log('[WS] 🤝 Connection established');
                console.log('[WS] 🤝 Rider ID:', data.riderId);
                break;
            case 'ping':
                console.log('[WS] 🏓 Ping received, sending pong');
                this.sendPong();
                break;
            case 'pong':
                // Heartbeat response - silently handle it
                console.log('[WS] 🏓 Pong received (heartbeat OK)');
                break;
            default:
                console.log('[WS] ❓ Unknown message type:', data.type);
                console.log('[WS] ❓ Full data:', JSON.stringify(data, null, 2));
        }
    }

    // Handle new booking notification
    handleNewBooking(data) {
        console.log('[WS] 🎉 New booking notification received:', data.booking?.bookingId);
        // This will be handled by the main app callback
    }

    // Handle new order
    handleNewOrder(data) {
        console.log('[WS] New order received:', data);
        // This will be handled by the main app
    }

    // Handle order update
    handleOrderUpdate(data) {
        console.log('[WS] Order update received:', data);
        // This will be handled by the main app
    }

    // Handle location broadcast (for customer tracking)
    handleLocationBroadcast(data) {
        console.log('[WS] Location broadcast received');
        // This will be handled by the main app
    }

    // Handle booking update
    handleBookingUpdate(data) {
        console.log('[WS] 💰 Booking update received:', data.bookingId, data.updates);
        // This will be handled by the main app callback
    }

    // Handle tip added
    handleTipAdded(data) {
        console.log('[WS] 💸 Tip added received:', data.bookingId, `₹${data.tipAmount}`);
        // This will be handled by the main app callback
    }

    // Handle notification
    handleNotification(data) {
        console.log('[WS] Notification received:', data);
        // This will be handled by the main app
    }

    // Send pong response
    sendPong() {
        if (!this.isConnected || !this.ws) return;

        try {
            const message = {
                type: 'pong',
                riderId: this.riderId,
                timestamp: Date.now()
            };

            this.ws.send(JSON.stringify(message));
        } catch (error) {
            console.error('Failed to send pong:', error);
        }
    }

    // Start heartbeat
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected && this.ws) {
                try {
                    const message = {
                        type: 'ping',
                        riderId: this.riderId,
                        timestamp: Date.now()
                    };
                    this.ws.send(JSON.stringify(message));
                } catch (error) {
                    console.error('Failed to send heartbeat:', error);
                }
            }
        }, 30000); // Send heartbeat every 30 seconds
    }

    // Stop heartbeat
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    // Attempt to reconnect
    async attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

        setTimeout(async () => {
            try {
                await this.connect();
            } catch (error) {
                console.error('Reconnection failed:', error);
                this.attemptReconnect();
            }
        }, delay);
    }

    // Disconnect WebSocket
    disconnect() {
        if (this.ws) {
            this.ws.close(1000, 'Manual disconnect');
            this.ws = null;
        }
        this.isConnected = false;
        this.stopHeartbeat();

    }

    // Set message callback
    setMessageCallback(callback) {
        this.onMessageCallback = callback;
    }

    // Set connection change callback
    setConnectionChangeCallback(callback) {
        this.onConnectionChangeCallback = callback;
    }

    // Get connection status
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            serverUrl: this.serverUrl,
            riderId: this.riderId,
        };
    }

    // Getter method for isConnected (in case it's being called as a function)
    getIsConnected() {
        return this.isConnected;
    }
}

// Create singleton instance
const webSocketService = new WebSocketService();

// Export both as default and named export for compatibility
export { webSocketService };
export default webSocketService; 