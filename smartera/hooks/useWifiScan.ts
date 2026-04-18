import { useState, useCallback, useEffect } from 'react';
import { Platform, PermissionsAndroid, Linking, Alert } from 'react-native';
import { DiscoveredDevice } from '../context/ProvisioningContext';

const DEVICE_SSID_PATTERN = /^(SmartPlug|SmartBulb|SmartSwitch|Thermostat|Sensor)-([A-Fa-f0-9]{6,12})$/;

interface UseWifiScanReturn {
  devices: DiscoveredDevice[];
  isScanning: boolean;
  error: string | null;
  startScan: () => Promise<void>;
  stopScan: () => void;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
}

const PERMISSION_TITLE = 'Location Permission Required';
const PERMISSION_MESSAGE = 'Smartera needs access to your location to scan for nearby WiFi devices. Your location is not tracked or stored — it is only used to discover smart devices during setup.';

export function useWifiScan(): UseWifiScanReturn {
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      setHasPermission(granted);
    } else {
      setHasPermission(true);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: PERMISSION_TITLE,
          message: PERMISSION_MESSAGE,
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
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

      const granted = result === PermissionsAndroid.RESULTS.GRANTED;
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
    setError(null);
    setDevices([]);

    try {
      if (Platform.OS === 'android') {
        await simulateScan();
      } else {
        setError('iOS does not support WiFi scanning. Please enter device SSID manually on the connect screen.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsScanning(false);
    }
  };

  const simulateScan = async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const mockDevices: DiscoveredDevice[] = [
      {
        ssid: 'SmartPlug-B0A732',
        deviceType: 'SmartPlug',
        serialSuffix: 'B0A732',
        signalStrength: -45,
      },
      {
        ssid: 'SmartBulb-A1B2C3',
        deviceType: 'SmartBulb',
        serialSuffix: 'A1B2C3',
        signalStrength: -60,
      },
    ];

    setDevices(mockDevices);
  };

  const stopScan = () => {
    setIsScanning(false);
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
    startScan,
    stopScan,
    hasPermission,
    requestPermission,
  };
}

export default useWifiScan;