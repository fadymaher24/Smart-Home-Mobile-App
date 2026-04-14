jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

const mockNetInfoFetch = jest.fn();

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: (...args: unknown[]) => mockNetInfoFetch(...args),
  },
  fetch: (...args: unknown[]) => mockNetInfoFetch(...args),
}));

import wifiService from '../../services/wifiService';

describe('wifiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetInfoFetch.mockReset();
  });

  describe('parseDeviceSSID', () => {
    it('parses Smartera-ABC12345 format', () => {
      const result = wifiService.parseDeviceSSID('Smartera-ABC12345', -50);

      expect(result).toEqual({
        ssid: 'Smartera-ABC12345',
        deviceType: 'Smartera',
        serialSuffix: 'ABC12345',
        signalStrength: -50,
      });
    });

    it('parses SmartPlug-B0A732 format', () => {
      const result = wifiService.parseDeviceSSID('SmartPlug-B0A732', -45);

      expect(result).toEqual({
        ssid: 'SmartPlug-B0A732',
        deviceType: 'SmartPlug',
        serialSuffix: 'B0A732',
        signalStrength: -45,
      });
    });

    it('handles SSID without dash - uses last 8 chars as suffix', () => {
      const result = wifiService.parseDeviceSSID('MyDevice', -60);

      expect(result.deviceType).toBe('MyDevice');
      expect(result.serialSuffix).toBe('MyDevice'.slice(-8));
    });

    it('handles empty string', () => {
      const result = wifiService.parseDeviceSSID('', -50);

      expect(result.deviceType).toBe('Unknown');
    });
  });

  describe('getDefaultDeviceIP', () => {
    it('returns 192.168.4.1', () => {
      expect(wifiService.getDefaultDeviceIP()).toBe('192.168.4.1');
    });
  });

  describe('getCurrentWifiSSID', () => {
    it('returns SSID from NetInfo', async () => {
      mockNetInfoFetch.mockResolvedValue({
        details: { ssid: 'HomeWiFi' },
      });

      const result = await wifiService.getCurrentWifiSSID();

      expect(result).toBe('HomeWiFi');
    });

    it('returns null when no SSID in details', async () => {
      mockNetInfoFetch.mockResolvedValue({
        details: {},
      });

      const result = await wifiService.getCurrentWifiSSID();

      expect(result).toBeNull();
    });

    it('returns null on error', async () => {
      mockNetInfoFetch.mockRejectedValue(new Error('fail'));

      const result = await wifiService.getCurrentWifiSSID();

      expect(result).toBeNull();
    });

    it('returns null when details is undefined', async () => {
      mockNetInfoFetch.mockResolvedValue({});

      const result = await wifiService.getCurrentWifiSSID();

      expect(result).toBeNull();
    });
  });

  describe('isWifiConnected', () => {
    it('returns true when connected via wifi', async () => {
      mockNetInfoFetch.mockResolvedValue({
        isConnected: true,
        type: 'wifi',
      });

      const result = await wifiService.isWifiConnected();

      expect(result).toBe(true);
    });

    it('returns false when connected via cellular', async () => {
      mockNetInfoFetch.mockResolvedValue({
        isConnected: true,
        type: 'cellular',
      });

      const result = await wifiService.isWifiConnected();

      expect(result).toBe(false);
    });

    it('returns false when not connected', async () => {
      mockNetInfoFetch.mockResolvedValue({
        isConnected: false,
        type: 'none',
      });

      const result = await wifiService.isWifiConnected();

      expect(result).toBe(false);
    });

    it('returns false on error', async () => {
      mockNetInfoFetch.mockRejectedValue(new Error('fail'));

      const result = await wifiService.isWifiConnected();

      expect(result).toBe(false);
    });
  });

  describe('sendCredentialsToDeviceAP', () => {
    it('sends credentials successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
      });

      const result = await wifiService.sendCredentialsToDeviceAP(
        '192.168.4.1', 'HomeWiFi', 'password123', 'token'
      );

      expect(result).toEqual({ success: true });
      expect(fetch).toHaveBeenCalledWith(
        'http://192.168.4.1/api/wifi/credentials',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ ssid: 'HomeWiFi', password: 'password123', token: 'token' }),
        })
      );
    });

    it('returns error on non-ok response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('Bad Request'),
      });

      const result = await wifiService.sendCredentialsToDeviceAP(
        '192.168.4.1', 'HomeWiFi', 'wrong', 'token'
      );

      expect(result).toEqual({ success: false, error: 'Bad Request' });
    });

    it('returns error on network failure', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await wifiService.sendCredentialsToDeviceAP(
        '192.168.4.1', 'HomeWiFi', 'pass', 'token'
      );

      expect(result).toEqual({ success: false, error: 'Network error' });
    });
  });
});
