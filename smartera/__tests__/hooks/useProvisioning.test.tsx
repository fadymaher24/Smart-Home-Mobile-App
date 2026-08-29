import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { useProvisioning } from '../../hooks/useProvisioning';
import {
  ProvisioningProvider,
  useProvisioningContext,
} from '../../context/ProvisioningContext';

jest.mock('../../services/bleProvisioningService', () => ({
  __esModule: true,
  default: {
    discoverPlugs: jest.fn().mockResolvedValue([
      { id: 'dev-1', name: 'plug_1001585321', serialNumber: 'SP-B0A732', rssi: -42 },
    ]),
    scanWifiNetworks: jest.fn().mockResolvedValue([
      { ssid: 'Home24', rssi: -45, band: '2.4GHz' },
    ]),
    provisionDevice: jest.fn().mockResolvedValue({
      deviceName: 'plug_1001585321',
      serialNumber: 'SP-B0A732',
    }),
  },
}));

jest.mock('../../services/realtimeService', () => ({
  __esModule: true,
  default: {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    subscribe: jest.fn().mockReturnValue(() => {}),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ token: 'auth-token' }),
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid'),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ProvisioningProvider>{children}</ProvisioningProvider>
);

describe('useProvisioning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('provides initial state with phase idle', () => {
    const { result } = renderHook(() => useProvisioning(), { wrapper });

    expect(result.current.state.phase).toBe('idle');
    expect(result.current.state.sessionId).toBeNull();
    expect(result.current.state.device).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('provides all required methods', () => {
    const { result } = renderHook(() => useProvisioning(), { wrapper });

    expect(typeof result.current.startProvisioning).toBe('function');
    expect(typeof result.current.beginBleScan).toBe('function');
    expect(typeof result.current.selectDeviceAndConnect).toBe('function');
    expect(typeof result.current.sendCredentials).toBe('function');
    expect(typeof result.current.finalizeSetup).toBe('function');
    expect(typeof result.current.reset).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
  });

  describe('startProvisioning', () => {
    it('starts a provisioning session', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'session-123', provisioningToken: 'token-123' }),
      });

      const { result } = renderHook(() => useProvisioning(), { wrapper });

      await act(async () => {
        await result.current.startProvisioning('SMART_PLUG');
      });

      expect(result.current.state.phase).toBe('instructions');
      expect(result.current.state.sessionId).toBe('session-123');
      expect(result.current.isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: 'Server error' }),
      });

      const { result } = renderHook(() => useProvisioning(), { wrapper });

      await act(async () => {
        await result.current.startProvisioning('SMART_PLUG');
      });

      expect(result.current.state.error).not.toBeNull();
      expect(result.current.state.error?.code).toBe('SESSION_EXPIRED');
    });
  });

  describe('selectDeviceAndConnect', () => {
    it('selects a BLE device and moves to wifi scan results', async () => {
      const { result } = renderHook(() => useProvisioning(), { wrapper });

      const device = {
        id: 'dev-1',
        name: 'plug_1001585321',
        serialNumber: 'SP-B0A732',
        rssi: -45,
      };

      await act(async () => {
        await result.current.selectDeviceAndConnect(device);
      });

      expect(result.current.state.device).toEqual(device);
      expect(result.current.state.phase).toBe('wifi_scan_results');
    });
  });

  describe('sendCredentials', () => {
    it('sets error when no device selected', async () => {
      const { result } = renderHook(() => useProvisioning(), { wrapper });

      await act(async () => {
        await result.current.sendCredentials('HomeWiFi', 'password');
      });

      expect(result.current.state.error).not.toBeNull();
      expect(result.current.state.error?.code).toBe('UNKNOWN');
    });

    it('transitions through phases when device is selected', async () => {
      const { result } = renderHook(() => useProvisioning(), { wrapper });

      const device = {
        id: 'dev-1',
        name: 'plug_1001585321',
        serialNumber: 'SP-B0A732',
        rssi: -45,
      };

      await act(async () => {
        await result.current.selectDeviceAndConnect(device);
      });

      await act(async () => {
        await result.current.sendCredentials('HomeWiFi', 'password');
      });

      expect(result.current.state.selectedSSID).toBe('HomeWiFi');
    });
  });

  describe('reset', () => {
    it('resets state to idle', async () => {
      const { result } = renderHook(() => useProvisioning(), { wrapper });

      await act(async () => {
        await result.current.selectDeviceAndConnect({
          id: 'dev-1',
          name: 'plug_1001585321',
          serialNumber: 'SP-B0A732',
          rssi: -45,
        });
      });

      expect(result.current.state.phase).not.toBe('idle');

      await act(async () => {
        await result.current.reset();
      });

      expect(result.current.state.phase).toBe('idle');
      expect(result.current.state.device).toBeNull();
    });
  });

  describe('clearError', () => {
    it('clears error state', async () => {
      const { result } = renderHook(() => useProvisioning(), { wrapper });

      await act(async () => {
        await result.current.sendCredentials('HomeWiFi', 'password');
      });

      if (result.current.state.error) {
        act(() => {
          result.current.clearError();
        });
        expect(result.current.state.error).toBeNull();
      }
    });
  });
});

describe('useProvisioningContext', () => {
  it('throws when used outside ProvisioningProvider', () => {
    expect(() => {
      renderHook(() => useProvisioningContext());
    }).toThrow('useProvisioningContext must be used within ProvisioningProvider');
  });
});
