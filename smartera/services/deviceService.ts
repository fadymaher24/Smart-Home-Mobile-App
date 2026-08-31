// Device Service - Handles real-time device data from backend
import { apiRequest, ApiError } from '../utils/api';

// Types for telemetry data from backend
export interface DeviceTelemetry {
  id?: number;
  deviceId: string;
  timestamp?: number;
  relay?: boolean;
  voltage: number;
  current: number;
  power: number;
  energy?: number;
  energyWh?: number;
  energyTotal?: number;
  powerFactor?: number;
  frequency?: number;
  uptime?: number;
  freeHeap?: number;
  rssi?: number;
  measurementQuality?: 'estimated' | 'calibrated';
}

export interface Device {
  id: number;
  deviceId?: string;
  serialNumber: string;
  name: string;
  type: string;
  location?: string;
  roomId?: number;
  powerState?: boolean;
  isOnline?: boolean;
  status?: 'online' | 'offline' | 'unknown';
  relay?: boolean;
  attributes?: {
    rssi?: number;
    ip?: string;
  };
  lastTelemetry?: DeviceTelemetry;
  lastSeenAt?: string;
  createdAt?: string;
  updatedAt?: string;
  controlPending?: boolean;
  desiredPowerState?: boolean;
}

export interface PowerUsageStats {
  currentPower: number;
  todayUsage: number;
  weeklyUsage: number;
  monthlyUsage: number;
  totalDevices: number;
  activeDevices: number;
  onlineDevices: number;
  cost?: {
    today: number | null;
    weekly: number | null;
    monthly: number | null;
    currency: string | null;
    rate: number | null;
    configured: boolean;
  };
}

export interface SmartPlugSettings {
  autoOffEnabled?: boolean;
  autoOffDelaySeconds?: number;
  powerOnBehavior?: 'off' | 'on' | 'restore';
  childLock?: boolean;
  ledMode?: 'relay' | 'off';
  reportingIntervalSeconds?: number;
  weeklySchedule?: { days: number; minuteOfDay: number; relayOn: boolean }[];
  timeZoneRule?: string;
}

export interface DeviceShadow {
  schemaVersion: number;
  desired: { version: number; settings: SmartPlugSettings };
  reported: { version: number; settings: SmartPlugSettings };
  pending: boolean;
  deliveryState: 'pending' | 'synced' | 'rejected' | 'stale';
  lastResult: { status: 'applied' | 'rejected' | 'stale'; version: number; error: string | null } | null;
  updatedAt: string;
}

// Device API calls - Updated to match backend API
export const deviceService = {
  async getDeviceShadow(deviceId: number, token: string): Promise<{ shadow: DeviceShadow }> {
    return apiRequest(`/device/${deviceId}/config`, 'GET', undefined, token);
  },

  async updateDeviceShadow(
    deviceId: number,
    expectedVersion: number,
    settings: SmartPlugSettings,
    token: string,
  ): Promise<{ shadow: DeviceShadow }> {
    return apiRequest(`/device/${deviceId}/config`, 'PATCH', { expectedVersion, settings }, token);
  },

  // Get all devices for the user (GET /api/device)
  async getDevices(token: string): Promise<Device[]> {
    const response = await apiRequest('/device', 'GET', undefined, token);
    return response.devices || [];
  },

  // Get single device with latest telemetry (GET /api/device/:id)
  async getDevice(deviceId: string | number, token: string): Promise<Device> {
    const response = await apiRequest(`/device/${deviceId}`, 'GET', undefined, token);
    return response.device || response;
  },

  // Get device telemetry history (GET /api/telemetry/:deviceId)
  async getDeviceTelemetry(
    deviceId: string | number, 
    token: string,
    params?: { limit?: number }
  ): Promise<DeviceTelemetry[]> {
    const query = params?.limit ? `?limit=${params.limit}` : '';
    const response = await apiRequest(`/telemetry/${deviceId}${query}`, 'GET', undefined, token);
    return response.data || response.telemetry || [];
  },

  // Get latest telemetry for a device (GET /api/telemetry/:deviceId/latest)
  async getLatestTelemetry(deviceId: string | number, token: string): Promise<DeviceTelemetry | null> {
    try {
      const response = await apiRequest(`/telemetry/${deviceId}/latest`, 'GET', undefined, token);
      return response.data || null;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  },

  // Control device (turn on/off) - POST /api/device/:id/control
  // Backend expects: turnOn, turnOff, toggle
  async controlDevice(deviceId: string | number, action: 'turnOn' | 'turnOff' | 'toggle', token: string): Promise<{ success: boolean }> {
    return apiRequest(`/device/${deviceId}/control`, 'POST', { action }, token);
  },

  // Get all rooms for the user (GET /api/rooms)
  async getRooms(token: string): Promise<{ roomId: number; name: string; icon?: string }[]> {
    const response = await apiRequest('/rooms', 'GET', undefined, token);
    const roomList = response.rooms || response || [];
    return roomList.map((room: any) => ({
      roomId: room.roomId ?? room.id,
      name: room.name,
      icon: room.icon,
    }));
  },

  // Create a new room (POST /api/rooms)
  async createRoom(
    roomData: { name: string; icon?: string },
    token: string
  ): Promise<{ roomId: number; name: string; icon?: string }> {
    const response = await apiRequest('/rooms', 'POST', roomData, token);
    const room = response.room || response;
    // Normalize - backend might return 'roomId' or 'id'
    return {
      roomId: room.roomId ?? room.id,
      name: room.name,
      icon: room.icon,
    };
  },

  // Delete device (DELETE /api/device/:id)
  async deleteDevice(deviceId: string | number, token: string): Promise<{ success: boolean }> {
    return apiRequest(`/device/${deviceId}`, 'DELETE', undefined, token);
  },

  // Update device metadata (PUT /api/device/:id)
  async updateDevice(
    deviceId: string | number,
    data: { name?: string; roomId?: number | null },
    token: string
  ): Promise<Device> {
    const response = await apiRequest(`/device/${deviceId}`, 'PUT', data, token);
    return response.device || response;
  },

  // Get total power usage statistics (GET /api/power-usage/total)
  async getPowerUsage(token: string): Promise<PowerUsageStats> {
    return apiRequest('/power-usage/total', 'GET', undefined, token);
  },

  // Get weekly power usage with daily breakdown (GET /api/power-usage/weekly)
  async getWeeklyPowerUsage(token: string): Promise<{
    totalUsage: number;
    dailyData: number[];
    labels: string[];
    peakUsage: number;
    avgUsage: number;
    cost: number | null;
  }> {
    return apiRequest('/power-usage/weekly', 'GET', undefined, token);
  },

  async getMonthlyPowerUsage(token: string): Promise<{
    month: string;
    totalUsage: number;
    weeklyData: number[];
    cost: number | null;
  }> {
    return apiRequest('/power-usage/monthly', 'GET', undefined, token);
  },

  async getCurrentTariff(token: string): Promise<{ tariff: { currency: string; pricePerKwh: number } | null }> {
    return apiRequest('/power-usage/tariff', 'GET', undefined, token);
  },

  async setCurrentTariff(
    data: { currency: string; pricePerKwh: number; effectiveFrom?: string },
    token: string,
  ): Promise<{ tariff: { currency: string; pricePerKwh: number; effectiveFrom: string } }> {
    return apiRequest('/power-usage/tariff', 'PUT', data, token);
  },

  // Get daily power usage (GET /api/power-usage/daily)
  async getDailyPowerUsage(token: string): Promise<{
    date: string;
    hourlyData: { hour: number; label: string; avgPower: number; readings: number }[];
    peakHour: number;
    peakPower: number;
  }> {
    return apiRequest('/power-usage/daily', 'GET', undefined, token);
  },

  // Get device power usage history (GET /api/power-usage/device/:deviceId)
  async getDevicePowerHistory(
    deviceId: string | number,
    token: string,
    period: 'day' | 'week' | 'month' = 'week'
  ): Promise<{ labels: string[]; data: number[]; unit: string }> {
    return apiRequest(`/power-usage/device/${deviceId}?period=${period}`, 'GET', undefined, token);
  },

  // Get power usage by room (GET /api/power-usage/by-room)
  async getPowerUsageByRoom(token: string): Promise<{
    rooms: { roomId: number; roomName: string; usage: number; deviceCount: number; currentPower: number }[];
    totalRooms: number;
  }> {
    return apiRequest('/power-usage/by-room', 'GET', undefined, token);
  },
};

export default deviceService;
