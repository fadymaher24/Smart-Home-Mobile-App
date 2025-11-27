// Socket.IO Service for real-time device updates from backend
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../utils/api';
import { DeviceTelemetry } from './deviceService';

type MessageHandler = (data: any) => void;
type EventType = 'telemetry' | 'device-status' | 'notification' | 'alert' | 'connection';

class RealtimeService {
  private socket: Socket | null = null;
  private token: string | null = null;
  private handlers: Map<EventType, Set<MessageHandler>> = new Map();
  private deviceHandlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    // Initialize handler maps
    this.handlers.set('telemetry', new Set());
    this.handlers.set('device-status', new Set());
    this.handlers.set('notification', new Set());
    this.handlers.set('alert', new Set());
    this.handlers.set('connection', new Set());
  }

  // Connect to Socket.IO server
  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.token = token;

      // Get base URL without /api
      const baseUrl = API_BASE_URL.replace('/api', '');
      console.log(`[Socket.IO] Connecting to: ${baseUrl}`);

      try {
        this.socket = io(baseUrl, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: 3000,
        });

        this.socket.on('connect', () => {
          console.log('[Socket.IO] Connected successfully');
          this.reconnectAttempts = 0;
          this.notifyHandlers('connection', { connected: true });
          resolve();
        });

        this.socket.on('connected', (data) => {
          console.log('[Socket.IO] Server confirmed connection:', data);
        });

        this.socket.on('authenticated', (data) => {
          console.log('[Socket.IO] Authentication result:', data);
          if (data.success) {
            // Subscribe to all devices after auth
            this.socket?.emit('subscribeAllDevices');
          }
        });

        // Listen for telemetry updates
        this.socket.on('telemetry', (data) => {
          console.log(`[Socket.IO] Telemetry for ${data.deviceName || data.deviceId}:`, data.power, 'W');
          this.notifyHandlers('telemetry', data);
          if (data.deviceId) {
            this.notifyDeviceHandlers(data.deviceId.toString(), data);
          }
          if (data.serialNumber) {
            this.notifyDeviceHandlers(data.serialNumber, data);
          }
        });

        // Listen for device status changes
        this.socket.on('device-status', (data) => {
          console.log(`[Socket.IO] Device status: ${data.deviceName} is ${data.isOnline ? 'online' : 'offline'}`);
          this.notifyHandlers('device-status', data);
          if (data.deviceId) {
            this.notifyDeviceHandlers(data.deviceId.toString(), data);
          }
        });

        // Listen for notifications
        this.socket.on('notification', (data) => {
          console.log('[Socket.IO] Notification:', data.title);
          this.notifyHandlers('notification', data);
        });

        // Listen for alerts
        this.socket.on('alert', (data) => {
          console.log('[Socket.IO] Alert:', data.alertType, data.message);
          this.notifyHandlers('alert', data);
        });

        this.socket.on('subscribed', (data) => {
          console.log(`[Socket.IO] Subscribed to device: ${data.deviceName}`);
        });

        this.socket.on('connect_error', (error) => {
          console.error('[Socket.IO] Connection error:', error.message);
          this.notifyHandlers('connection', { connected: false, error: error.message });
        });

        this.socket.on('disconnect', (reason) => {
          console.log(`[Socket.IO] Disconnected: ${reason}`);
          this.notifyHandlers('connection', { connected: false, reason });
        });

        this.socket.on('error', (error) => {
          console.error('[Socket.IO] Error:', error);
        });

      } catch (error) {
        console.error('[Socket.IO] Failed to create connection:', error);
        reject(error);
      }
    });
  }

  // Disconnect from server
  disconnect(): void {
    this.token = null;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    console.log('[Socket.IO] Disconnected');
  }

  // Subscribe to event type
  subscribe(eventType: EventType, handler: MessageHandler): () => void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.add(handler);
    }

    // Return unsubscribe function
    return () => {
      handlers?.delete(handler);
    };
  }

  // Subscribe to specific device updates
  subscribeToDevice(deviceId: string | number, handler: MessageHandler): () => void {
    const id = deviceId.toString();
    if (!this.deviceHandlers.has(id)) {
      this.deviceHandlers.set(id, new Set());
    }
    
    this.deviceHandlers.get(id)!.add(handler);

    // Send subscription message to server
    this.socket?.emit('subscribeDevice', id);

    // Return unsubscribe function
    return () => {
      this.deviceHandlers.get(id)?.delete(handler);
      if (this.deviceHandlers.get(id)?.size === 0) {
        this.socket?.emit('unsubscribeDevice', id);
      }
    };
  }

  // Subscribe to all user's devices
  subscribeToAllDevices(): void {
    this.socket?.emit('subscribeAllDevices');
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Ping server
  ping(): void {
    this.socket?.emit('ping');
  }

  // Notify handlers of a specific event type
  private notifyHandlers(eventType: EventType, data: any): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[Socket.IO] Handler error for ${eventType}:`, error);
        }
      });
    }
  }

  // Notify device-specific handlers
  private notifyDeviceHandlers(deviceId: string, data: any): void {
    const handlers = this.deviceHandlers.get(deviceId);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[Socket.IO] Device handler error for ${deviceId}:`, error);
        }
      });
    }
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService();
export default realtimeService;
