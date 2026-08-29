// React hooks for device data and real-time updates
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import deviceService, { Device, DeviceTelemetry, PowerUsageStats } from '../services/deviceService';
import realtimeService from '../services/realtimeService';

function telemetryEnergyKwh(message: Partial<DeviceTelemetry>): number {
  if (message.energyTotal != null) return message.energyTotal;
  if (message.energyWh != null) return message.energyWh / 1000;
  // Legacy backend websocket payloads used `energy` for a kWh value.
  return message.energy ?? 0;
}

// Hook for managing devices list with real-time status updates
export function useDevices() {
  const { token } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    if (!token) {
      setDevices([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const deviceList = await deviceService.getDevices(token);
      setDevices(deviceList);
      return deviceList;
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
      setDevices(prev => prev.map(device => 
        (device.id === message.deviceId || device.serialNumber === message.serialNumber)
          ? { 
              ...device, 
              isOnline: message.isOnline,
              powerState: message.powerState ?? device.powerState,
            }
          : device
      ));
    });

    // Subscribe to telemetry updates - this has the actual relay state
    const unsubscribeTelemetry = realtimeService.subscribe('telemetry', (message) => {
      setDevices(prev => prev.map(device => 
        (device.id === message.deviceId || device.serialNumber === message.serialNumber)
          ? { 
              ...device, 
              lastTelemetry: {
                ...device.lastTelemetry,
                power: message.power,
                voltage: message.voltage,
                current: message.current,
                energyWh: message.energyWh,
                energyTotal: telemetryEnergyKwh(message),
                relay: message.relay,
              } as DeviceTelemetry,
              powerState: message.relay ?? device.powerState,
              controlPending: false,
              desiredPowerState: undefined,
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

    const expectedState = action === 'turnOn';
    setDevices(prev => prev.map(d =>
      (d.id === deviceId || d.serialNumber === deviceId)
        ? { ...d, controlPending: true, desiredPowerState: expectedState }
        : d
    ));

    try {
      await deviceService.controlDevice(deviceId, action, token);

      // A publish acknowledgement is not a device acknowledgement. Stop showing
      // pending after a bounded wait, but keep reported state unchanged.
      setTimeout(() => {
        setDevices(prev => prev.map(d =>
          (d.id === deviceId || d.serialNumber === deviceId) && d.desiredPowerState === expectedState
            ? { ...d, controlPending: false, desiredPowerState: undefined }
            : d
        ));
      }, 10000);
      
      return true;
    } catch (err: any) {
      setDevices(prev => prev.map(d =>
        (d.id === deviceId || d.serialNumber === deviceId)
          ? { ...d, controlPending: false, desiredPowerState: undefined }
          : d
      ));
      console.error('Failed to control device:', err);
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

  const updateDevice = useCallback(
    async (deviceId: string | number, data: { name?: string; roomId?: number | null }) => {
      if (!token) return;

      try {
        const updatedDevice = await deviceService.updateDevice(deviceId, data, token);
        setDevices(prev => prev.map(d =>
          (d.id === deviceId || d.serialNumber === deviceId)
            ? { ...d, ...updatedDevice }
            : d
        ));
        return updatedDevice;
      } catch (err: any) {
        console.error('Failed to update device:', err);
        throw err;
      }
    },
    [token]
  );

  return {
    devices,
    loading,
    error,
    refresh: loadDevices,
    controlDevice,
    removeDevice,
    updateDevice,
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
          energyWh: message.energyWh,
          energyTotal: telemetryEnergyKwh(message),
          relay: message.relay,
        } as DeviceTelemetry);
        setDevice(prev => prev ? {
          ...prev,
          powerState: message.relay ?? prev.powerState,
          controlPending: false,
          desiredPowerState: undefined,
        } : null);
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

    const expectedState = action === 'turnOn';
    setDevice(prev => prev ? {
      ...prev,
      controlPending: true,
      desiredPowerState: expectedState,
    } : null);

    try {
      await deviceService.controlDevice(deviceId, action, token);
      setTimeout(() => {
        setDevice(prev => prev?.desiredPowerState === expectedState ? {
          ...prev,
          controlPending: false,
          desiredPowerState: undefined,
        } : prev);
      }, 10000);
      return true;
    } catch (err: any) {
      setDevice(prev => prev ? {
        ...prev,
        controlPending: false,
        desiredPowerState: undefined,
      } : null);
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

export interface DailyPowerData {
  date: string;
  hourlyData: { hour: number; label: string; avgPower: number; readings: number }[];
  peakHour: number;
  peakPower: number;
}

export interface ChartDataSet {
  labels: string[];
  data: number[];
}

// Hook for power usage dashboard
export function usePowerUsage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<PowerUsageStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<ChartDataSet>({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    data: [0, 0, 0, 0, 0, 0, 0],
  });
  const [dailyData, setDailyData] = useState<DailyPowerData | null>(null);
  const [monthlyData, setMonthlyData] = useState<ChartDataSet>({
    labels: ['W1', 'W2', 'W3', 'W4'],
    data: [0, 0, 0, 0],
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

  const loadDailyData = useCallback(async () => {
    if (!token) return;
    try {
      const daily = await deviceService.getDailyPowerUsage(token);
      setDailyData(daily);
    } catch (err: any) {
      console.error('Failed to load daily power data:', err);
    }
  }, [token]);

  const loadMonthlyData = useCallback(async () => {
    if (!token) return;
    try {
      const monthly = await deviceService.getMonthlyPowerUsage(token);
      setMonthlyData({
        labels: monthly.weeklyData.map((_, index) => `Week ${index + 1}`),
        data: monthly.weeklyData,
      });
    } catch (err: any) {
      console.error('Failed to load monthly power data:', err);
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

    let refreshTimeout: ReturnType<typeof setTimeout>;
    const unsubscribe = realtimeService.subscribe('telemetry', () => {
      clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        loadPowerUsage();
      }, 5000);
    });

    return () => {
      unsubscribe();
      clearTimeout(refreshTimeout);
    };
  }, [token, loadPowerUsage]);

  // Periodic refresh (every 60 seconds)
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(loadPowerUsage, 60000);
    return () => clearInterval(interval);
  }, [token, loadPowerUsage]);

  return {
    stats,
    weeklyData,
    dailyData,
    monthlyData,
    loading,
    error,
    refresh: loadPowerUsage,
    loadDailyData,
    loadMonthlyData,
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
