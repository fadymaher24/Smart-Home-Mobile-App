import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { useDevices, useRooms, useRealtimeConnection } from '../../hooks/useDeviceData';

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ token: 'test-token' }),
}));

jest.mock('../../utils/api', () => ({
  API_BASE_URL: 'http://localhost:3000/api',
}));

jest.mock('../../services/deviceService', () => ({
  __esModule: true,
  default: {
    getDevices: jest.fn(),
    getDevice: jest.fn(),
    getLatestTelemetry: jest.fn(),
    controlDevice: jest.fn(),
    addDevice: jest.fn(),
    deleteDevice: jest.fn(),
    getRooms: jest.fn(),
    createRoom: jest.fn(),
    getPowerUsage: jest.fn(),
    getWeeklyPowerUsage: jest.fn(),
  },
}));

jest.mock('../../services/realtimeService', () => ({
  __esModule: true,
  default: {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    subscribe: jest.fn().mockReturnValue(jest.fn()),
    subscribeToDevice: jest.fn().mockReturnValue(jest.fn()),
    isConnected: jest.fn().mockReturnValue(false),
  },
}));

import deviceService from '../../services/deviceService';
import realtimeService from '../../services/realtimeService';

const mockDeviceService = deviceService as jest.Mocked<typeof deviceService>;
const mockRealtimeService = realtimeService as jest.Mocked<typeof realtimeService>;

const wrapper = ({ children }: { children: React.ReactNode }) => <>{children}</>;

describe('useDevices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: { id: 1 }, token: 'test-token' }),
    });
  });

  it('starts with loading true', () => {
    mockDeviceService.getDevices.mockResolvedValue([]);
    const { result } = renderHook(() => useDevices(), { wrapper });
    expect(result.current.loading).toBe(true);
  });

  it('loads devices on mount', async () => {
    const mockDevices = [
      { id: 1, name: 'Plug 1', serialNumber: 'SN1', type: 'SMART_PLUG' },
    ];
    mockDeviceService.getDevices.mockResolvedValue(mockDevices);

    const { result } = renderHook(() => useDevices(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.devices).toEqual(mockDevices);
    expect(result.current.loading).toBe(false);
  });

  it('sets error on failure', async () => {
    mockDeviceService.getDevices.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useDevices(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.loading).toBe(false);
  });

  it('connects to realtime service', async () => {
    mockDeviceService.getDevices.mockResolvedValue([]);

    renderHook(() => useDevices(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(mockRealtimeService.connect).toHaveBeenCalled();
  });

  it('subscribes to device-status and telemetry events', async () => {
    mockDeviceService.getDevices.mockResolvedValue([]);

    renderHook(() => useDevices(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(mockRealtimeService.subscribe).toHaveBeenCalledWith('device-status', expect.any(Function));
    expect(mockRealtimeService.subscribe).toHaveBeenCalledWith('telemetry', expect.any(Function));
  });
});

describe('useRooms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads rooms on mount', async () => {
    const mockRooms = [{ roomId: 1, name: 'Living Room' }];
    mockDeviceService.getRooms.mockResolvedValue(mockRooms);

    const { result } = renderHook(() => useRooms(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.rooms).toEqual(mockRooms);
  });

  it('creates a new room', async () => {
    mockDeviceService.getRooms.mockResolvedValue([]);
    const newRoom = { roomId: 2, name: 'Kitchen', icon: 'chef' };
    mockDeviceService.createRoom.mockResolvedValue(newRoom);

    const { result } = renderHook(() => useRooms(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    await act(async () => {
      await result.current.createRoom('Kitchen', 'chef');
    });

    expect(mockDeviceService.createRoom).toHaveBeenCalledWith({ name: 'Kitchen', icon: 'chef' }, expect.any(String));
    expect(result.current.rooms).toContainEqual(newRoom);
  });
});

describe('useRealtimeConnection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns isConnected state', async () => {
    mockRealtimeService.isConnected.mockReturnValue(false);

    const { result } = renderHook(() => useRealtimeConnection(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current).toHaveProperty('isConnected');
  });
});
