import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { useWifiScan } from '../../hooks/useWifiScan';

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  PermissionsAndroid: {
    PERMISSIONS: { ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION' },
    RESULTS: { GRANTED: 'granted', DENIED: 'denied', NEVER_ASK_AGAIN: 'never_ask_again' },
    check: jest.fn(),
    request: jest.fn(),
  },
  Linking: { openSettings: jest.fn() },
  Alert: { alert: jest.fn() },
}));

import { PermissionsAndroid } from 'react-native';

const mockPermissionsAndroid = PermissionsAndroid as jest.Mocked<typeof PermissionsAndroid>;

describe('useWifiScan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockPermissionsAndroid.check.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
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
  });

  it('requests permission when not granted', async () => {
    mockPermissionsAndroid.check.mockResolvedValue(false);
    mockPermissionsAndroid.request.mockResolvedValue('denied');

    const { result } = renderHook(() => useWifiScan());

    await act(async () => {
      await Promise.resolve();
      await result.current.startScan();
    });

    expect(mockPermissionsAndroid.request).toHaveBeenCalled();
  });

  it('scans and populates devices on Android', async () => {
    mockPermissionsAndroid.check.mockResolvedValue(true);

    const { result } = renderHook(() => useWifiScan());

    await act(async () => {
      await Promise.resolve();
    });

    const scanPromise = act(async () => {
      const promise = result.current.startScan();
      jest.advanceTimersByTime(2000);
      await promise;
    });

    await scanPromise;

    expect(result.current.devices.length).toBeGreaterThan(0);
    expect(result.current.devices[0]).toHaveProperty('ssid');
    expect(result.current.devices[0]).toHaveProperty('deviceType');
    expect(result.current.devices[0]).toHaveProperty('serialSuffix');
    expect(result.current.isScanning).toBe(false);
  });

  it('stops scanning', async () => {
    const { result } = renderHook(() => useWifiScan());

    await act(async () => {
      result.current.stopScan();
    });

    expect(result.current.isScanning).toBe(false);
  });

  it('returns true when permission granted', async () => {
    mockPermissionsAndroid.request.mockResolvedValue('granted');

    const { result } = renderHook(() => useWifiScan());

    await act(async () => {
      await Promise.resolve();
    });

    let granted = false;
    await act(async () => {
      granted = await result.current.requestPermission();
    });

    expect(granted).toBe(true);
  });

  it('returns false when permission denied', async () => {
    mockPermissionsAndroid.request.mockResolvedValue('denied');

    const { result } = renderHook(() => useWifiScan());

    await act(async () => {
      await Promise.resolve();
    });

    let granted = true;
    await act(async () => {
      granted = await result.current.requestPermission();
    });

    expect(granted).toBe(false);
  });
});
