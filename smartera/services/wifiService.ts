import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

const DEVICE_SSID_PREFIX = 'Smartera';

export interface WifiNetwork {
  ssid: string;
  signalStrength: number;
  isSecure: boolean;
  isDevice: boolean;
}

export interface DeviceAPInfo {
  ssid: string;
  deviceType: string;
  serialSuffix: string;
  signalStrength: number;
}

class WifiService {
  async scanForDevices(): Promise<DeviceAPInfo[]> {
    if (Platform.OS === 'ios') {
      return this.scanForDevicesIOS();
    }
    return this.scanForDevicesAndroid();
  }

  private async scanForDevicesAndroid(): Promise<DeviceAPInfo[]> {
    try {
      const networks: WifiNetwork[] = [];

      // On Android, we would use WiFi Android library to scan
      // This is a placeholder - actual implementation requires native module
      // For now, return empty array and rely on user manual selection
      console.log('Android WiFi scan - requires native module implementation');

      return networks
        .filter(n => n.ssid.startsWith(DEVICE_SSID_PREFIX))
        .map(n => this.parseDeviceSSID(n.ssid, n.signalStrength));
    } catch (error) {
      console.error('Error scanning for devices:', error);
      return [];
    }
  }

  private async scanForDevicesIOS(): Promise<DeviceAPInfo[]> {
    // iOS doesn't allow WiFi scanning
    // Users must manually enter device SSID
    console.log('iOS WiFi scan not supported - user must enter SSID manually');
    return [];
  }

  parseDeviceSSID(ssid: string, signalStrength: number): DeviceAPInfo {
    const parts = ssid.split('-');
    return {
      ssid,
      deviceType: parts[0] || 'Unknown',
      serialSuffix: parts[1] || ssid.slice(-8),
      signalStrength,
    };
  }

  async connectToDeviceAP(ssid: string, password?: string): Promise<boolean> {
    if (Platform.OS === 'ios') {
      // iOS requires user to manually switch WiFi in Settings
      console.log('iOS: User must manually connect to device AP in Settings');
      return false;
    }

    // Android implementation would use WifiManager
    // This is a placeholder
    console.log('Android: connectToDeviceAP requires native module');
    return false;
  }

  async disconnectFromDeviceAP(): Promise<void> {
    if (Platform.OS === 'android') {
      console.log('Android: disconnectFromDeviceAP requires native module');
    }
  }

  async getCurrentWifiSSID(): Promise<string | null> {
    try {
      const state = await NetInfo.fetch();
      const details = state.details as { ssid?: string } | undefined;
      return details?.ssid || null;
    } catch (error) {
      console.error('Error getting current WiFi:', error);
      return null;
    }
  }

  async isWifiConnected(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      return state.isConnected === true && state.type === 'wifi';
    } catch (error) {
      console.error('Error checking WiFi connection:', error);
      return false;
    }
  }

  async sendCredentialsToDeviceAP(
    deviceIP: string,
    ssid: string,
    password: string,
    token: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`http://${deviceIP}/api/wifi/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ssid,
          password,
          token,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending credentials:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getDefaultDeviceIP(): string {
    return '192.168.4.1';
  }
}

const wifiService = new WifiService();
export default wifiService;