// React hooks for device data and real-time updates
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import deviceService, { Device, DeviceTelemetry, PowerUsageStats } from '../services/deviceService';
import realtimeService from '../services/realtimeService';

// Hook for managing devices list with real-time status updates
export function useDevices() {
  const { token } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Track devices with pending control commands (ignore status updates briefly)
  const pendingControlRef = useRef<Map<string | number, number>>(new Map());

  const loadDevices = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const deviceList = await deviceService.getDevices(token);
      setDevices(deviceList);
    } catch (err: any) {
      console.error('Failed to load devices:', err);
      setError(err.message || 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // Subscribe to real-time status updates
  useEffect(() => {
    if (!token) return;

    // Connect to Socket.IO
    realtimeService.connect(token).catch(err => {
      console.log('Socket.IO connection failed, using polling:', err);
    });

    // Subscribe to device status updates
    const unsubscribeStatus = realtimeService.subscribe('device-status', (message) => {
      // Check if device has pending command (within 2 seconds)
      const pendingTime = pendingControlRef.current.get(message.deviceId) || 
                          pendingControlRef.current.get(message.serialNumber);
      const hasPending = pendingTime && Date.now() - pendingTime < 2000;
      
      setDevices(prev => prev.map(device => 
        (device.id === message.deviceId || device.serialNumber === message.serialNumber)
          ? { 
              ...device, 
              isOnline: message.isOnline,
              // Only update powerState if no pending command
              powerState: hasPending ? device.powerState : (message.powerState ?? device.powerState),
            }
          : device
      ));
    });

    // Subscribe to telemetry updates - this has the actual relay state
    const unsubscribeTelemetry = realtimeService.subscribe('telemetry', (message) => {
      // Check if device has pending command (within 2 seconds)
      const pendingTime = pendingControlRef.current.get(message.deviceId) || 
                          pendingControlRef.current.get(message.serialNumber);
      const hasPending = pendingTime && Date.now() - pendingTime < 2000;
      
      setDevices(prev => prev.map(device => 
        (device.id === message.deviceId || device.serialNumber === message.serialNumber)
          ? { 
              ...device, 
              lastTelemetry: {
                ...device.lastTelemetry,
                power: message.power,
                voltage: message.voltage,
                current: message.current,
                energyTotal: message.energyTotal || message.energy,
                relay: message.relay,
              } as DeviceTelemetry,
              // Update powerState from relay if present and no pending command
              powerState: hasPending 
                ? device.powerState 
                : (message.relay !== undefined ? message.relay : device.powerState),
            }
          : device
      ));
    });

    return () => {
      unsubscribeStatus();
      unsubscribeTelemetry();
    };
  }, [token]);

  // Polling fallback for real-time updates (every 15 seconds)
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      if (!realtimeService.isConnected()) {
        loadDevices();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [token, loadDevices]);

  const controlDevice = useCallback(async (deviceId: string | number, action: 'turnOn' | 'turnOff') => {
    if (!token) return;

    // Find the device first
    const device = devices.find(d => d.id === deviceId || d.serialNumber === deviceId);
    
    // Optimistically update UI IMMEDIATELY (before API call)
    const expectedState = action === 'turnOn';
    setDevices(prev => prev.map(d =>
      (d.id === deviceId || d.serialNumber === deviceId)
        ? { ...d, powerState: expectedState }
        : d
    ));
    
    // Mark device as having pending command (ignore conflicting status updates for 2 seconds)
    const now = Date.now();
    pendingControlRef.current.set(deviceId, now);
    if (device) {
      pendingControlRef.current.set(device.id, now);
      pendingControlRef.current.set(device.serialNumber, now);
    }

    try {
      // Send command to server (don't block UI)
      await deviceService.controlDevice(deviceId, action, token);
      
      // Clear pending flag after 2 seconds to allow real telemetry through
      setTimeout(() => {
        const storedTime = pendingControlRef.current.get(deviceId);
        if (storedTime === now) {
          pendingControlRef.current.delete(deviceId);
          if (device) {
            pendingControlRef.current.delete(device.id);
            pendingControlRef.current.delete(device.serialNumber);
          }
        }
      }, 2000);
      
      return true;
    } catch (err: any) {
      // Revert optimistic update on error
      setDevices(prev => prev.map(d =>
        (d.id === deviceId || d.serialNumber === deviceId)
          ? { ...d, powerState: !expectedState }
          : d
      ));
      // Clear pending flag on error
      pendingControlRef.current.delete(deviceId);
      if (device) {
        pendingControlRef.current.delete(device.id);
        pendingControlRef.current.delete(device.serialNumber);
      }
      console.error('Failed to control device:', err);
      throw err;
    }
  }, [token, devices]);

  const addDevice = useCallback(async (deviceData: { serialNumber: string; name: string; type: string; roomId?: number }) => {
    if (!token) return;

    try {
      const newDevice = await deviceService.addDevice(deviceData, token);
      setDevices(prev => [...prev, newDevice]);
      return newDevice;
    } catch (err: any) {
      console.error('Failed to add device:', err);
      throw err;
    }
  }, [token]);

  const removeDevice = useCallback(async (deviceId: string | number) => {
    if (!token) return;

    try {
      await deviceService.deleteDevice(deviceId, token);
      setDevices(prev => prev.filter(d => d.id !== deviceId && d.serialNumber !== deviceId));
      return true;
    } catch (err: any) {
      console.error('Failed to remove device:', err);
      throw err;
    }
  }, [token]);

  return {
    devices,
    loading,
    error,
    refresh: loadDevices,
    controlDevice,
    addDevice,
    removeDevice,
  };
}

// Hook for fetching rooms
export function useRooms() {
  const { token } = useAuth();
  const [rooms, setRooms] = useState<{ roomId: number; name: string; icon?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadRooms = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const roomList = await deviceService.getRooms(token);
      setRooms(roomList);
    } catch (err) {
      console.log('Failed to load rooms:', err);
      // Silently fail - rooms are optional
    } finally {
      setLoading(false);
    }
  }, [token]);

  const createRoom = useCallback(async (name: string, icon?: string) => {
    if (!token) throw new Error('Not authenticated');

    try {
      setCreating(true);
      const newRoom = await deviceService.createRoom({ name, icon }, token);
      setRooms(prev => [...prev, newRoom]);
      return newRoom;
    } finally {
      setCreating(false);
    }
  }, [token]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  return { rooms, loading, creating, refresh: loadRooms, createRoom };
}

// Hook for single device with real-time telemetry
export function useDevice(deviceId: string | number) {
  const { token } = useAuth();
  const [device, setDevice] = useState<Device | null>(null);
  const [telemetry, setTelemetry] = useState<DeviceTelemetry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load device details
  const loadDevice = useCallback(async () => {
    if (!token || !deviceId) return;

    try {
      setLoading(true);
      setError(null);
      
      const [deviceData, latestTelemetry] = await Promise.all([
        deviceService.getDevice(deviceId, token),
        deviceService.getLatestTelemetry(deviceId, token),
      ]);

      setDevice(deviceData);
      setTelemetry(latestTelemetry);
    } catch (err: any) {
      console.error('Failed to load device:', err);
      setError(err.message || 'Failed to load device');
    } finally {
      setLoading(false);
    }
  }, [token, deviceId]);

  // Initial load
  useEffect(() => {
    loadDevice();
  }, [loadDevice]);

  // Subscribe to real-time updates for this device
  useEffect(() => {
    if (!token || !deviceId) return;

    // Connect to Socket.IO
    realtimeService.connect(token).catch(console.error);

    // Subscribe to telemetry updates
    const unsubscribeTelemetry = realtimeService.subscribe('telemetry', (message) => {
      if (message.deviceId === deviceId || message.serialNumber === deviceId) {
        setTelemetry({
          deviceId: message.deviceId,
          voltage: message.voltage,
          current: message.current,
          power: message.power,
          energyTotal: message.energyTotal || message.energy,
          relay: message.relay,
        } as DeviceTelemetry);
      }
    });

    // Subscribe to status updates
    const unsubscribeStatus = realtimeService.subscribe('device-status', (message) => {
      if (message.deviceId === deviceId || message.serialNumber === deviceId) {
        setDevice(prev => prev ? { ...prev, isOnline: message.isOnline, powerState: message.powerState } : null);
      }
    });

    return () => {
      unsubscribeTelemetry();
      unsubscribeStatus();
    };
  }, [token, deviceId]);

  // Polling fallback for telemetry (every 5 seconds)
  useEffect(() => {
    if (!token || !deviceId) return;

    const interval = setInterval(async () => {
      if (!realtimeService.isConnected()) {
        try {
          const latestTelemetry = await deviceService.getLatestTelemetry(deviceId, token);
          if (latestTelemetry) {
            setTelemetry(latestTelemetry);
          }
        } catch (err) {
          console.log('Failed to poll telemetry:', err);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [token, deviceId]);

  const control = useCallback(async (action: 'turnOn' | 'turnOff') => {
    if (!token || !deviceId) return;

    try {
      await deviceService.controlDevice(deviceId, action, token);
      setDevice(prev => prev ? { ...prev, powerState: action === 'turnOn' } : null);
      return true;
    } catch (err: any) {
      console.error('Failed to control device:', err);
      throw err;
    }
  }, [token, deviceId]);

  return {
    device,
    telemetry,
    loading,
    error,
    refresh: loadDevice,
    control,
  };
}

// Hook for power usage dashboard
export function usePowerUsage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<PowerUsageStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<{ labels: string[]; data: number[] }>({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    data: [0, 0, 0, 0, 0, 0, 0],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPowerUsage = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const [totalStats, weekly] = await Promise.all([
        deviceService.getPowerUsage(token),
        deviceService.getWeeklyPowerUsage(token),
      ]);

      setStats(totalStats);
      setWeeklyData({
        labels: weekly.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        data: weekly.dailyData || [0, 0, 0, 0, 0, 0, 0],
      });
    } catch (err: any) {
      console.error('Failed to load power usage:', err);
      setError(err.message || 'Failed to load power usage');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    loadPowerUsage();
  }, [loadPowerUsage]);

  // Subscribe to telemetry updates to refresh power stats
  useEffect(() => {
    if (!token) return;

    realtimeService.connect(token).catch(console.error);

    // Refresh stats when telemetry is received (debounced)
    let refreshTimeout: ReturnType<typeof setTimeout>;
    const unsubscribe = realtimeService.subscribe('telemetry', () => {
      clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        // Update current power from devices instead of full refresh
      }, 5000);
    });

    return () => {
      unsubscribe();
      clearTimeout(refreshTimeout);
    };
  }, [token]);

  // Periodic refresh (every 60 seconds)
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(loadPowerUsage, 60000);
    return () => clearInterval(interval);
  }, [token, loadPowerUsage]);

  return {
    stats,
    weeklyData,
    loading,
    error,
    refresh: loadPowerUsage,
  };
}

// Hook for real-time connection status
export function useRealtimeConnection() {
  const { token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      setIsConnected(false);
      return;
    }

    // Try to connect
    realtimeService.connect(token).catch(console.error);

    // Subscribe to connection status
    const unsubscribe = realtimeService.subscribe('connection', (data) => {
      setIsConnected(data.connected);
    });

    // Check initial status
    setIsConnected(realtimeService.isConnected());

    return () => {
      unsubscribe();
    };
  }, [token]);

  return { isConnected };
}
