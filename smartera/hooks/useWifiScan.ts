import { useState, useCallback, useEffect } from 'react';
import { Platform, PermissionsAndroid, Linking, Alert } from 'react-native';
import { DiscoveredDevice } from '../context/ProvisioningContext';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const DEVICE_SSID_PATTERN = /^(SmartPlug|SmartBulb|SmartSwitch|Thermostat|Sensor)-([A-Fa-f0-9]{6,12})$/;

const DEVICE_AP_PASSWORD = 'smartplug123';
const DEVICE_AP_IP = '192.168.4.1';
const DEVICE_AP_PORT = 80;

type ScanMode = 'idle' | 'scanning' | 'connecting' | 'sending' | 'error' | 'complete';

interface UseWifiScanReturn {
  devices: DiscoveredDevice[];
  isScanning: boolean;
  error: string | null;
  scanMode: ScanMode;
  startScan: () => Promise<void>;
  stopScan: () => void;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
  sendCredentialsToAP: (device: DiscoveredDevice, ssid: string, password: string) => Promise<boolean>;
  storeCredentialsOnServer: (serialNumber: string, ssid: string, password: string) => Promise<boolean>;
  sendProvisioningToken: (device: DiscoveredDevice, token: string) => Promise<boolean>;
  parseDeviceSSID: (ssid: string) => DiscoveredDevice | null;
}

const PERMISSION_TITLE = 'Location Permission Required';
const PERMISSION_MESSAGE = 'Smartera needs access to your location to scan for nearby WiFi devices. Your location is not tracked or stored — it is only used to discover smart devices during setup.';

export function useWifiScan(): UseWifiScanReturn {
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>('idle');
  const { token } = useAuth();

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    if (Platform.OS === 'android') {
      const androidSdk = Platform.Version as number;
      if (androidSdk >= 33) {
        const nearByGranted = await PermissionsAndroid.check(
          'android.permission.NEARBY_WIFI_DEVICES' as any
        );
        setHasPermission(nearByGranted);
      } else {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        setHasPermission(granted);
      }
    } else {
      setHasPermission(true);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const androidSdk = Platform.Version as number;
      let permissionResult: string;

      if (androidSdk >= 33) {
        permissionResult = await PermissionsAndroid.request(
          'android.permission.NEARBY_WIFI_DEVICES' as any,
          {
            title: PERMISSION_TITLE,
            message: PERMISSION_MESSAGE,
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
      } else {
        permissionResult = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: PERMISSION_TITLE,
            message: PERMISSION_MESSAGE,
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
      }

      if (permissionResult === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        Alert.alert(
          'Location Permission Required',
          'Smartera needs location permission to scan for devices. Please enable it in Settings > Apps > Smartera > Permissions.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        setHasPermission(false);
        return false;
      }

      const granted = permissionResult === PermissionsAndroid.RESULTS.GRANTED;
      setHasPermission(granted);
      return granted;
    } catch (err) {
      console.error('Permission request failed:', err);
      return false;
    }
  };

  const startScan = async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        setError('Location permission required for WiFi scanning');
        return;
      }
    }

    setIsScanning(true);
    setScanMode('scanning');
    setError(null);
    setDevices([]);

    try {
      if (Platform.OS === 'web') {
        setError('WiFi scanning is not available on web. Use "Enter Serial Number" to add a device manually, then configure WiFi credentials through the provisioning form.');
        setIsScanning(false);
        setScanMode('idle');
        return;
      }

      if (Platform.OS === 'ios') {
        setError('iOS does not support WiFi scanning directly. Use "Enter Serial Number" and the app will configure the device through the provisioning server.');
        setIsScanning(false);
        setScanMode('idle');
        return;
      }

      await performAndroidWifiScan();
    } catch (err) {
      setError((err as Error).message || 'Failed to scan for devices');
      setScanMode('error');
    } finally {
      setIsScanning(false);
    }
  };

  const performAndroidWifiScan = async () => {
    try {
      const WifiScanner = require('react-native-wifi-reimagined')?.WifiScanner;
      if (!WifiScanner) {
        throw new Error('WiFi scanning module not available');
      }

      const results = await WifiScanner.scan();
      const smartDevices: DiscoveredDevice[] = [];

      for (const network of results) {
        const match = network.SSID?.match(DEVICE_SSID_PATTERN);
        if (match) {
          smartDevices.push({
            ssid: network.SSID,
            deviceType: match[1],
            serialSuffix: match[2],
            signalStrength: network.level || -50,
          });
        }
      }

      smartDevices.sort((a, b) => b.signalStrength - a.signalStrength);
      setDevices(smartDevices);

      if (smartDevices.length === 0) {
        setError('No Smartera devices found nearby. Make sure your device is powered on and in setup mode (LED flashing rapidly).');
        setScanMode('error');
      } else {
        setScanMode('idle');
      }
    } catch (err: any) {
      if (err.message?.includes('not available') || err.message?.includes('Cannot read')) {
        setError('WiFi scanning requires a native module. On web or iOS, please use manual serial number entry instead.');
        setScanMode('idle');
        return;
      }
      throw err;
    }
  };

  const sendCredentialsToAP = async (
    device: DiscoveredDevice,
    ssid: string,
    password: string
  ): Promise<boolean> => {
    if (Platform.OS === 'web' || Platform.OS === 'ios') {
      return false;
    }

    setScanMode('connecting');
    setError(null);

    try {
      const WifiApi = require('react-native-wifi-reimagined')?.default;
      if (!WifiApi) {
        throw new Error('WiFi module not available');
      }

      await WifiApi.connectToProtectedSSID(device.ssid, DEVICE_AP_PASSWORD, false);

      await new Promise(resolve => setTimeout(resolve, 2000));

      setScanMode('sending');

      const response = await fetch(
        `http://${DEVICE_AP_IP}:${DEVICE_AP_PORT}/api/wifi/credentials`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `ssid=${encodeURIComponent(ssid)}&password=${encodeURIComponent(password)}`,
        }
      );

      if (!response.ok) {
        throw new Error(`Device returned status ${response.status}`);
      }

      setScanMode('complete');
      return true;
    } catch (err: any) {
      setError(`Failed to send credentials to device: ${err.message}`);
      setScanMode('error');

      try {
        const savedNetworks = require('react-native-wifi-reimagined')?.default;
        if (savedNetworks?.disconnectFromSSID) {
          await savedNetworks.disconnectFromSSID(device.ssid);
        }
      } catch {}

      return false;
    }
  };

  const sendProvisioningToken = async (
    device: DiscoveredDevice,
    provisioningToken: string
  ): Promise<boolean> => {
    if (Platform.OS === 'web' || Platform.OS === 'ios') {
      return false;
    }

    try {
      const response = await fetch(
        `http://${DEVICE_AP_IP}:${DEVICE_AP_PORT}/api/wifi/credentials`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `ssid=&password=&token=${encodeURIComponent(provisioningToken)}`,
        }
      );

      return response.ok;
    } catch {
      return false;
    }
  };

  const storeCredentialsOnServer = async (
    serialNumber: string,
    ssid: string,
    password: string
  ): Promise<boolean> => {
    if (!token) {
      setError('You must be logged in to provision a device');
      setScanMode('error');
      return false;
    }

    setScanMode('sending');
    setError(null);

    try {
      await apiRequest('/provisioning/pending', 'POST', {
        deviceSerialNumber: serialNumber,
        ssid,
        password,
      }, token);

      setScanMode('complete');
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to store WiFi credentials');
      setScanMode('error');
      return false;
    }
  };

  const stopScan = () => {
    setIsScanning(false);
    setScanMode('idle');
  };

  const parseDeviceSSID = (ssid: string): DiscoveredDevice | null => {
    const match = ssid.match(DEVICE_SSID_PATTERN);
    if (!match) {
      return null;
    }

    return {
      ssid,
      deviceType: match[1],
      serialSuffix: match[2],
      signalStrength: -50,
    };
  };

  return {
    devices,
    isScanning,
    error,
    scanMode,
    startScan,
    stopScan,
    hasPermission,
    requestPermission,
    sendCredentialsToAP,
    storeCredentialsOnServer,
    sendProvisioningToken,
    parseDeviceSSID,
  };
}

export default useWifiScan;