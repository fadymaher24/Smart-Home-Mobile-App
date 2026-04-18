import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { useWifiScan } from '../../hooks/useWifiScan';

jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
  PermissionsAndroid: {
    PERMISSIONS: { ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION' },
    RESULTS: { GRANTED: 'granted', DENIED: 'denied', NEVER_ASK_AGAIN: 'never_ask_again' },
    check: jest.fn(),
    request: jest.fn(),
  },
  Linking: { openSettings: jest.fn() },
  Alert: { alert: jest.fn() },
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    token: 'test-token',
    user: { id: 1, email: 'test@test.com' },
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    isLoading: false,
  }),
}));

jest.mock('../../utils/api', () => ({
  apiRequest: jest.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
    }
  },
}));

describe('useWifiScan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with required methods and state', async () => {
    const { result } = renderHook(() => useWifiScan());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.devices).toEqual([]);
    expect(result.current.isScanning).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.startScan).toBe('function');
    expect(typeof result.current.stopScan).toBe('function');
    expect(typeof result.current.requestPermission).toBe('function');
    expect(typeof result.current.hasPermission).toBe('boolean');
    expect(typeof result.current.scanMode).toBe('string');
    expect(typeof result.current.sendCredentialsToAP).toBe('function');
    expect(typeof result.current.storeCredentialsOnServer).toBe('function');
    expect(typeof result.current.sendProvisioningToken).toBe('function');
  });

  it('sets error on web platform when scanning', async () => {
    const { result } = renderHook(() => useWifiScan());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.startScan();
    });

    expect(result.current.error).toContain('not available on web');
    expect(result.current.isScanning).toBe(false);
  });

  it('stops scanning', async () => {
    const { result } = renderHook(() => useWifiScan());

    await act(async () => {
      result.current.stopScan();
    });

    expect(result.current.isScanning).toBe(false);
    expect(result.current.scanMode).toBe('idle');
  });

  it('stores credentials on server via apiRequest', async () => {
    const { apiRequest } = require('../../utils/api');
    (apiRequest as jest.Mock).mockResolvedValue({ id: 'test-id', deviceSerialNumber: 'SP-TEST123' });

    const { result } = renderHook(() => useWifiScan());

    await act(async () => {
      await Promise.resolve();
    });

    let success = false;
    await act(async () => {
      success = await result.current.storeCredentialsOnServer('SP-TEST123', 'MyWiFi', 'password123');
    });

    expect(success).toBe(true);
    expect(apiRequest).toHaveBeenCalledWith(
      '/provisioning/pending',
      'POST',
      {
        deviceSerialNumber: 'SP-TEST123',
        ssid: 'MyWiFi',
        password: 'password123',
      },
      'test-token'
    );
  });

  it('handles server credential storage failure', async () => {
    const { apiRequest } = require('../../utils/api');
    (apiRequest as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useWifiScan());

    await act(async () => {
      await Promise.resolve();
    });

    let success = true;
    await act(async () => {
      success = await result.current.storeCredentialsOnServer('SP-TEST123', 'MyWiFi', 'password123');
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('Network error');
  });

  it('returns false for sendCredentialsToAP on web', async () => {
    const { result } = renderHook(() => useWifiScan());

    await act(async () => {
      await Promise.resolve();
    });

    const device = { ssid: 'SmartPlug-TEST12', deviceType: 'SmartPlug', serialSuffix: 'TEST12', signalStrength: -50 };
    let result_ap = true;
    await act(async () => {
      result_ap = await result.current.sendCredentialsToAP(device, 'MyWiFi', 'password123');
    });

    expect(result_ap).toBe(false);
  });

  it('returns false for sendProvisioningToken on web', async () => {
    const { result } = renderHook(() => useWifiScan());

    await act(async () => {
      await Promise.resolve();
    });

    const device = { ssid: 'SmartPlug-TEST12', deviceType: 'SmartPlug', serialSuffix: 'TEST12', signalStrength: -50 };
    let result_token = true;
    await act(async () => {
      result_token = await result.current.sendProvisioningToken(device, 'token-123');
    });

    expect(result_token).toBe(false);
  });

  it('parses device SSID correctly', async () => {
    const { result } = renderHook(() => useWifiScan());

    await act(async () => {
      await Promise.resolve();
    });

    const validDevice = result.current.parseDeviceSSID('SmartPlug-B0A732');
    expect(validDevice).not.toBeNull();
    expect(validDevice?.deviceType).toBe('SmartPlug');
    expect(validDevice?.serialSuffix).toBe('B0A732');

    const invalidSSID = result.current.parseDeviceSSID('HomeWiFi');
    expect(invalidSSID).toBeNull();
  });

  it('fails credential storage without auth token', async () => {
    const { apiRequest } = require('../../utils/api');
    (apiRequest as jest.Mock).mockRejectedValue(new Error('You must be logged in to provision a device'));

    const { result } = renderHook(() => useWifiScan());

    await act(async () => {
      await Promise.resolve();
    });

    let success = true;
    await act(async () => {
      success = await result.current.storeCredentialsOnServer('SP-TEST', 'WiFi', 'pass1234');
    });

    expect(success).toBe(false);
    expect(result.current.error).toBeTruthy();
  });
});