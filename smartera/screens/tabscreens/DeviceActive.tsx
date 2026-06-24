import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Pressable,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { Colors } from "../../utils/colors";
import { useDevices, useRealtimeConnection, useRooms } from "../../hooks/useDeviceData";
import { API_BASE_URL, ApiError } from "../../utils/api";
import { Device as ServiceDevice } from "../../services/deviceService";
import { getCurrentWiFiSSID, parseSerialFromQRCode } from "../../utils/wifi";
import { useBleProvisioning } from "../../hooks/useBleProvisioning";
import { MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";
import bleProvisioningService, { BleDiscoveredPlug, BleWifiNetwork } from "../../services/bleProvisioningService";
import realtimeService from "../../services/realtimeService";
import QRScan from "./QRScan";

// Device types matching backend
type DeviceType = 'SMART_PLUG' | 'RGB_LIGHT' | 'THERMOSTAT' | 'SENSOR';

// Room type matching backend model
interface Room {
  roomId: number;
  name: string;
  icon?: string;
}

interface DeviceTypeOption {
  type: DeviceType;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  gradient: [string, string];
  description: string;
}

const DEVICE_TYPES: DeviceTypeOption[] = [
  {
    type: 'SMART_PLUG',
    label: 'Smart Plug',
    icon: 'power-socket-eu',
    color: Colors.success,
    gradient: [Colors.success, '#059669'],
    description: 'Control power outlets remotely'
  },
  {
    type: 'RGB_LIGHT',
    label: 'RGB Light',
    icon: 'lightbulb',
    color: Colors.warning,
    gradient: [Colors.warning, '#D97706'],
    description: 'Smart lighting with colors'
  },
  {
    type: 'THERMOSTAT',
    label: 'Thermostat',
    icon: 'thermometer',
    color: Colors.accent,
    gradient: [Colors.accent, '#0891B2'],
    description: 'Temperature control'
  },
  {
    type: 'SENSOR',
    label: 'Sensor',
    icon: 'access-point',
    color: Colors.secondary,
    gradient: [Colors.secondary, '#7C3AED'],
    description: 'Environmental monitoring'
  },
];

const { width, height } = Dimensions.get("window");
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Suggested rooms for quick selection
const SUGGESTED_ROOMS = [
  { name: 'Living Room', icon: 'sofa', color: Colors.success },
  { name: 'Bedroom', icon: 'bed', color: Colors.primary },
  { name: 'Kitchen', icon: 'silverware-fork-knife', color: Colors.warning },
  { name: 'Bathroom', icon: 'shower', color: Colors.accent },
  { name: 'Office', icon: 'desk', color: Colors.secondary },
  { name: 'Garage', icon: 'garage', color: '#64748B' },
  { name: 'Garden', icon: 'flower', color: '#22C55E' },
  { name: 'Dining Room', icon: 'table-furniture', color: '#A16207' },
];

type PairingStage =
  | 'instruction'
  | 'scanning'
  | 'connect'
  | 'wifi_scan'
  | 'network'
  | 'provisioning'
  | 'success';

// Animated Device Card Component
const DeviceCard = ({
  device,
  onControl,
  onLongPress,
  index,
}: {
  device: ServiceDevice;
  onControl: (id: number, action: 'turnOn' | 'turnOff') => void;
  onLongPress: (device: ServiceDevice) => void;
  index: number;
}) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isOnline = device.isOnline;
  const isPowerOn = device.powerState;

  // Get device type info
  const deviceTypeInfo = DEVICE_TYPES.find(t => t.type === device.type) || DEVICE_TYPES[0];

  useEffect(() => {
    // Entry animation with stagger
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      delay: index * 100,
      useNativeDriver: true,
    }).start();

    // Pulse animation for online devices
    if (isOnline && isPowerOn) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isOnline, isPowerOn]);

  const handlePress = () => {
    // Haptic-like animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();

    onControl(device.id, isPowerOn ? 'turnOff' : 'turnOn');
  };

  return (
    <Animated.View
      style={[
        {
          transform: [
            { scale: Animated.multiply(scaleAnim, pulseAnim) },
          ],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePress}
        onLongPress={() => onLongPress(device)}
        delayLongPress={500}
      >
        <LinearGradient
          colors={isPowerOn ? deviceTypeInfo.gradient : (isDark ? ['#2a2a2a', '#1a1a1a'] : ['#f5f5f5', '#e0e0e0'])}
          style={[
            styles.deviceCard,
            {
              borderColor: isOnline ? (isPowerOn ? deviceTypeInfo.color : '#666') : Colors.error,
              borderWidth: 2,
            },
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Status indicator */}
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isOnline ? Colors.success : Colors.error },
              ]}
            />
            <Text style={[styles.statusText, { color: isPowerOn ? '#fff' : (isDark ? '#aaa' : '#666') }]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>

          {/* Device Icon */}
          <View style={[styles.iconContainer, { backgroundColor: isPowerOn ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]}>
            <MaterialCommunityIcons
              name={deviceTypeInfo.icon}
              size={32}
              color={isPowerOn ? '#fff' : deviceTypeInfo.color}
            />
          </View>

          {/* Device Info */}
          <Text style={[styles.deviceName, { color: isPowerOn ? '#fff' : (isDark ? '#fff' : '#333') }]} numberOfLines={1}>
            {device.name}
          </Text>
          <Text style={[styles.deviceType, { color: isPowerOn ? 'rgba(255,255,255,0.8)' : (isDark ? '#888' : '#666') }]}>
            {deviceTypeInfo.label}
          </Text>

          {/* Power State Toggle */}
          <View style={[styles.powerToggle, { backgroundColor: isPowerOn ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)' }]}>
            <Ionicons
              name={isPowerOn ? 'power' : 'power-outline'}
              size={20}
              color={isPowerOn ? '#fff' : '#888'}
            />
            <Text style={[styles.powerText, { color: isPowerOn ? '#fff' : '#888' }]}>
              {isPowerOn ? 'ON' : 'OFF'}
            </Text>
          </View>

          {/* Real-time data for smart plugs */}
          {device.type === 'SMART_PLUG' && device.lastTelemetry && (
            <View style={styles.telemetryContainer}>
              <View style={styles.telemetryItem}>
                <Feather name="zap" size={12} color={isPowerOn ? '#fff' : '#888'} />
                <Text style={[styles.telemetryText, { color: isPowerOn ? '#fff' : '#888' }]}>
                  {(device.lastTelemetry.power || 0).toFixed(1)}W
                </Text>
              </View>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Add Device Modal Component
const AddDeviceModal = ({
  visible,
  onClose,
  onAdd,
  loading,
  rooms,
  onCreateRoom,
  creatingRoom,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: { serialNumber: string; name: string; type: DeviceType; roomId?: number }) => void;
  loading: boolean;
  rooms: Room[];
  onCreateRoom: (name: string, icon?: string) => Promise<Room>;
  creatingRoom: boolean;
}) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<DeviceType | null>(null);
  const [serialNumber, setSerialNumber] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [showNewRoomInput, setShowNewRoomInput] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [scanningQR, setScanningQR] = useState(false);
  const [pairingStage, setPairingStage] = useState<PairingStage | null>(null);
  const [pairingStartedAt, setPairingStartedAt] = useState<number | null>(null);
  const [pairingDeadlineAt, setPairingDeadlineAt] = useState<number | null>(null);
  const [pairingRemainingSec, setPairingRemainingSec] = useState(180);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [pairingProgressText, setPairingProgressText] = useState<string | null>(null);
  const [nearbyPlugs, setNearbyPlugs] = useState<BleDiscoveredPlug[]>([]);
  const [selectedPlug, setSelectedPlug] = useState<BleDiscoveredPlug | null>(null);
  const [wifiNetworks, setWifiNetworks] = useState<BleWifiNetwork[]>([]);
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [showWifiPassword, setShowWifiPassword] = useState(false);
  const [pairingBusy, setPairingBusy] = useState(false);
  const [provisioningSessionId, setProvisioningSessionId] = useState<string | null>(null);
  const [provisioningToken, setProvisioningToken] = useState<string | null>(null);
  const [manualWifiMode, setManualWifiMode] = useState(false);
  const [manualWifiReason, setManualWifiReason] = useState<string | null>(null);
  const [cloudConfirmPath, setCloudConfirmPath] = useState<'none' | 'realtime' | 'polling'>('none');
  const [cloudConfirmError, setCloudConfirmError] = useState<string | null>(null);
  const { token } = useAuth();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStep(1);
      setSelectedType(null);
      setSerialNumber('');
      setDeviceName('');
      setSelectedRoomId(null);
      setShowNewRoomInput(false);
      setNewRoomName('');
      setScanningQR(false);
      setPairingStage(null);
      setPairingStartedAt(null);
      setPairingDeadlineAt(null);
      setPairingRemainingSec(180);
      setPairingError(null);
      setPairingProgressText(null);
      setNearbyPlugs([]);
      setSelectedPlug(null);
      setWifiNetworks([]);
      setWifiSsid('');
      setWifiPassword('');
      setShowWifiPassword(false);
      setPairingBusy(false);
      setProvisioningSessionId(null);
      setProvisioningToken(null);
      setManualWifiMode(false);
      setManualWifiReason(null);
      setCloudConfirmPath('none');
      setCloudConfirmError(null);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  useEffect(() => {
    if (!pairingDeadlineAt || !pairingStage || pairingStage === 'success') {
      return;
    }

    const updateRemaining = () => {
      const left = Math.max(0, Math.ceil((pairingDeadlineAt - Date.now()) / 1000));
      setPairingRemainingSec(left);

      if (left === 0) {
        setPairingError('Pairing timed out after 3 minutes. Please try again.');
        setPairingBusy(false);
      }
    };

    updateRemaining();
    const timer = setInterval(updateRemaining, 1000);
    return () => clearInterval(timer);
  }, [pairingDeadlineAt, pairingStage]);

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;
    
    try {
      // Find icon from suggested rooms if name matches
      const suggestedRoom = SUGGESTED_ROOMS.find(
        s => s.name.toLowerCase() === newRoomName.trim().toLowerCase()
      );
      const icon = suggestedRoom?.icon;
      
      const newRoom = await onCreateRoom(newRoomName.trim(), icon);
      setSelectedRoomId(newRoom.roomId);
      setShowNewRoomInput(false);
      setNewRoomName('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create room');
    }
  };

  const handleNext = () => {
    if (step === 1 && selectedType) {
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: 0.5,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
      setStep(2);
    } else if (step === 2 && serialNumber.trim()) {
      setStep(3);
    } else if (step === 3) {
      // Room selection is optional, can continue without selecting
      setStep(4);
    } else if (step === 4 && deviceName.trim() && selectedType) {
      onAdd({
        serialNumber: serialNumber.trim(),
        name: deviceName.trim(),
        type: selectedType,
        roomId: selectedRoomId || undefined,
      });
    }
  };

  const handleBack = () => {
    if (pairingStage) {
      if (pairingStage === 'instruction') {
        setPairingStage(null);
        return;
      }

      if (pairingStage === 'network') {
        setPairingStage('connect');
        setPairingError(null);
        return;
      }

      if (pairingStage === 'connect' || pairingStage === 'scanning') {
        setPairingStage('instruction');
        setPairingError(null);
        return;
      }

      if (pairingStage === 'provisioning') {
        setPairingError('Provisioning is in progress. Please wait a few seconds.');
        return;
      }

      if (pairingStage === 'success') {
        setPairingStage(null);
        return;
      }
    }

    if (showNewRoomInput) {
      setShowNewRoomInput(false);
      setNewRoomName('');
    } else if (step > 1) {
      setStep(step - 1);
    } else {
      onClose();
    }
  };

  const handleBarCodeScanned = (data: string) => {
    const parsed = parseSerialFromQRCode(data);
    if (parsed) {
      setSerialNumber(parsed.serialNumber);
      if (parsed.type) {
        const typeMap: Record<string, DeviceType> = {
          'SMART_PLUG': 'SMART_PLUG',
          'RGB_LIGHT': 'RGB_LIGHT',
          'THERMOSTAT': 'THERMOSTAT',
          'SENSOR': 'SENSOR',
          'SmartPlug': 'SMART_PLUG',
          'SmartBulb': 'RGB_LIGHT',
          'SmartSwitch': 'SMART_PLUG',
          'Thermostat': 'THERMOSTAT',
          'Sensor': 'SENSOR',
        };
        const mapped = typeMap[parsed.type];
        if (mapped) setSelectedType(mapped);
      }
      setScanningQR(false);
    } else {
      setSerialNumber(data.trim());
      setScanningQR(false);
    }
  };

  const createProvisioningSession = async (): Promise<{ sessionId: string; sessionToken: string }> => {
    if (!token) {
      throw new Error('Please log in again before starting pairing.');
    }

    const response = await fetch(`${API_BASE_URL}/provisioning/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        deviceType: selectedType || 'SMART_PLUG',
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload?.error || payload?.message || 'Failed to start pairing session.');
    }

    const data = await response.json();
    setProvisioningSessionId(data.id);
    setProvisioningToken(data.provisioningToken);
    return {
      sessionId: data.id,
      sessionToken: data.provisioningToken,
    };
  };

  const beginPairingFlow = () => {
    const started = Date.now();
    setPairingStartedAt(started);
    setPairingDeadlineAt(started + 180 * 1000);
    setPairingRemainingSec(180);
    setPairingStage('instruction');
    setPairingError(null);
    setPairingProgressText(null);
    setNearbyPlugs([]);
    setSelectedPlug(null);
    setWifiNetworks([]);
    setWifiSsid('');
    setWifiPassword('');
    setShowWifiPassword(false);
    setPairingBusy(false);
    setManualWifiMode(false);
    setManualWifiReason(null);
    setCloudConfirmPath('none');
    setCloudConfirmError(null);
    setProvisioningSessionId(null);
    setProvisioningToken(null);
  };

  const prefillPhoneWifiIfAvailable = async () => {
    try {
      const current = await getCurrentWiFiSSID();
      if (current?.trim()) {
        setWifiSsid(current.trim());
      }
    } catch {
      // best effort only
    }
  };

  const waitForCloudClaim = async (sessionId: string, timeoutMs = 45_000) => {
    if (!token) {
      throw new Error('Authentication expired. Please log in and retry.');
    }

    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const response = await fetch(`${API_BASE_URL}/provisioning/session/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.status === 'claimed' || data?.status === 'registered') {
          return;
        }

        if (data?.status === 'failed' || data?.status === 'expired') {
          throw new Error(data?.error || 'Pairing session failed before cloud registration.');
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1200));
    }

    throw new Error('Cloud registration timed out. Keep the plug powered and retry.');
  };

  const waitForCloudClaimRealtime = async (sessionId: string) => {
    if (!token) {
      throw new Error('Authentication expired. Please log in and retry.');
    }

    let finished = false;

    await realtimeService.connect(token).catch(() => {
      throw new Error('Realtime connection unavailable. Falling back to polling...');
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!finished) {
          cleanup();
          reject(new Error('Realtime confirmation timed out. Falling back to polling...'));
        }
      }, 20_000);

      const cleanup = () => {
        clearTimeout(timeout);
        unsubscribeClaimed();
        unsubscribePhase();
      };

      const unsubscribeClaimed = realtimeService.subscribe('provisioning-claimed', payload => {
        if (payload?.sessionId === sessionId) {
          finished = true;
          cleanup();
          resolve();
        }
      });

      const unsubscribePhase = realtimeService.subscribe('provisioning-phase', payload => {
        if (payload?.sessionId !== sessionId) {
          return;
        }

        if (payload?.status === 'claimed') {
          finished = true;
          cleanup();
          resolve();
          return;
        }

        if (payload?.status === 'failed' || payload?.status === 'expired') {
          finished = true;
          cleanup();
          reject(new Error(payload?.error || 'Pairing session failed before cloud registration.'));
        }
      });
    });
  };

  const scanNearbyPlugs = async () => {
    if (!serialNumber.trim()) {
      setPairingError('Please enter your plug serial number first.');
      return;
    }

    setPairingStage('scanning');
    setPairingBusy(true);
    setPairingError(null);
    setPairingProgressText('Scanning devices nearby...');

    try {
      const plugs = await bleProvisioningService.discoverPlugs(serialNumber.trim());
      setNearbyPlugs(plugs);

      if (plugs.length === 0) {
        setPairingError('No nearby plug found. Keep your phone close to the plug and retry.');
        return;
      }

      const firstPlug = plugs[0];
      setSelectedPlug(firstPlug);
      setPairingProgressText(`Found ${firstPlug.name}. Connecting...`);
      await connectPlugAndLoadWifi(firstPlug);
    } catch (err: any) {
      setPairingError(err?.message || 'Bluetooth scan failed. Please try again.');
      setPairingStage('instruction');
    } finally {
      setPairingBusy(false);
    }
  };

  const connectPlugAndLoadWifi = async (plug: BleDiscoveredPlug) => {
    setPairingBusy(true);
    setPairingStage('connect');
    setPairingError(null);

    try {
      setPairingProgressText(`Connected to ${plug.name}.`);
      await sleep(350);

      setPairingStage('wifi_scan');
      setPairingProgressText('Scanning nearby Wi-Fi networks...');
      const networks = await bleProvisioningService.scanWifiNetworks(plug.serialNumber, plug.id);
      const sorted = [...networks].sort((a, b) => {
        if (a.band === '2.4GHz' && b.band !== '2.4GHz') return -1;
        if (a.band !== '2.4GHz' && b.band === '2.4GHz') return 1;
        return b.rssi - a.rssi;
      });
      setWifiNetworks(sorted);
      const recommended = sorted.find(n => n.band === '2.4GHz') || sorted[0];
      setWifiSsid(recommended?.ssid || '');

      if (sorted.length === 0) {
        const scanDebug = bleProvisioningService.getDebugSnapshot().lastWifiScan;
        const scanError = scanDebug?.error?.toLowerCase() || '';

        if (scanError.includes('rejected') || scanError.includes('not_supported')) {
          setPairingError('This plug firmware does not expose Wi-Fi scan over BLE. Enter SSID/password manually to continue.');
          setManualWifiMode(true);
          setManualWifiReason('firmware_not_supported');
        } else {
          setPairingError('No Wi-Fi list returned by device. Enter SSID manually or scan again.');
          setManualWifiMode(false);
          setManualWifiReason(null);
        }

        await prefillPhoneWifiIfAvailable();
      } else {
        setManualWifiMode(false);
        setManualWifiReason(null);
      }

      setPairingStage('network');
      setPairingProgressText(null);
    } catch (err: any) {
      setPairingError(err?.message || 'Failed to connect to plug. Retry scanning.');
      setPairingStage('instruction');
    } finally {
      setPairingBusy(false);
    }
  };

  const submitWifiProvisioning = async () => {
    if (!selectedPlug) {
      setPairingError('No plug selected. Start scan again.');
      return;
    }
    if (!wifiSsid.trim() || wifiPassword.trim().length < 8) {
      setPairingError('Enter a valid Wi-Fi name and password (8+ characters).');
      return;
    }
    setPairingBusy(true);
    setPairingStage('provisioning');
    setPairingError(null);

    try {
      let sessionId = provisioningSessionId;
      let sessionToken = provisioningToken;

      if (!sessionId || !sessionToken) {
        setPairingProgressText('Preparing secure pairing session...');
        const session = await createProvisioningSession();
        sessionId = session.sessionId;
        sessionToken = session.sessionToken;
      }

      if (!sessionId || !sessionToken) {
        throw new Error('Could not initialize pairing session. Please retry.');
      }

      setPairingProgressText('Sending Wi-Fi credentials securely...');
      const provisionResult = await bleProvisioningService.provisionDevice({
        serialNumber: selectedPlug.serialNumber,
        deviceId: selectedPlug.id,
        ssid: wifiSsid.trim(),
        password: wifiPassword,
        token: sessionToken,
      });

      if (!provisionResult.ackReceived) {
        setPairingProgressText('Credentials sent. Waiting for device/cloud confirmation...');
      } else {
        setPairingProgressText('Plug is connecting to Wi-Fi and cloud...');
      }

      try {
        await waitForCloudClaimRealtime(sessionId);
        setCloudConfirmPath('realtime');
        setCloudConfirmError(null);
      } catch {
        setCloudConfirmPath('polling');
        setPairingProgressText('Waiting for cloud confirmation...');
        await waitForCloudClaim(sessionId, 30_000);
        setCloudConfirmError(null);
      }

      setPairingBusy(false);
      setPairingStage('success');
    } catch (err: any) {
      setPairingBusy(false);
      setPairingStage('network');
      setCloudConfirmError(err?.message || 'cloud_confirmation_error');
      setPairingError(err?.message || 'Failed to send credentials. Please retry.');
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: isDark ? '#fff' : '#333' }]}>
        Select Device Type
      </Text>
      <Text style={[styles.stepSubtitle, { color: isDark ? '#888' : '#666' }]}>
        What kind of device are you adding?
      </Text>
      
      <View style={styles.deviceTypesGrid}>
        {DEVICE_TYPES.map((deviceType, index) => (
          <TouchableOpacity
            key={deviceType.type}
            activeOpacity={0.7}
            onPress={() => setSelectedType(deviceType.type)}
            style={styles.deviceTypeCardWrapper}
          >
            <LinearGradient
              colors={selectedType === deviceType.type ? deviceType.gradient : (isDark ? ['#2a2a2a', '#1a1a1a'] : ['#f8f8f8', '#eee'])}
              style={[
                styles.deviceTypeCard,
                selectedType === deviceType.type && styles.deviceTypeCardSelected,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.deviceTypeIconBg, { backgroundColor: selectedType === deviceType.type ? 'rgba(255,255,255,0.2)' : `${deviceType.color}20` }]}>
                <MaterialCommunityIcons
                  name={deviceType.icon}
                  size={28}
                  color={selectedType === deviceType.type ? '#fff' : deviceType.color}
                />
              </View>
              <Text style={[
                styles.deviceTypeLabel,
                { color: selectedType === deviceType.type ? '#fff' : (isDark ? '#fff' : '#333') }
              ]}>
                {deviceType.label}
              </Text>
              <Text style={[
                styles.deviceTypeDesc,
                { color: selectedType === deviceType.type ? 'rgba(255,255,255,0.8)' : (isDark ? '#666' : '#888') }
              ]} numberOfLines={2}>
                {deviceType.description}
              </Text>
              {selectedType === deviceType.type && (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: isDark ? '#fff' : '#333' }]}>
        Device Serial Number
      </Text>
      <Text style={[styles.stepSubtitle, { color: isDark ? '#888' : '#666' }]}>
        Enter the serial number or scan the QR code on your device
      </Text>

      <View style={styles.inputContainer}>
        <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
          <MaterialCommunityIcons
            name="barcode-scan"
            size={24}
            color={isDark ? '#888' : '#666'}
          />
          <TextInput
            style={[styles.textInput, { color: isDark ? '#fff' : '#333' }]}
            placeholder="e.g., SP-B0A7322BCC90"
            placeholderTextColor={isDark ? '#555' : '#999'}
            value={serialNumber}
            onChangeText={setSerialNumber}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {Platform.OS !== 'web' && (
            <TouchableOpacity
              onPress={() => setScanningQR(true)}
              style={styles.qrButton}
              activeOpacity={0.7}
            >
              <Ionicons name="qr-code" size={24} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.inputHint, { color: isDark ? '#666' : '#888' }]}>
          Usually found on the device label or packaging
        </Text>
      </View>

      {serialNumber.trim() && !scanningQR && !pairingStage && (
        <>
          <TouchableOpacity
            style={[styles.wifiProvisionButton, { backgroundColor: '#0F766E' }]}
            onPress={beginPairingFlow}
            activeOpacity={0.8}
          >
            <Ionicons name="bluetooth" size={20} color="#fff" />
            <View style={styles.wifiProvisionButtonTextContainer}>
              <Text style={styles.wifiProvisionButtonText}>Start Guided Pairing</Text>
              <Text style={styles.wifiProvisionButtonSubtext}>
                In-wizard flow: instruction, scan, Wi-Fi setup, and connection
              </Text>
            </View>
          </TouchableOpacity>
        </>
      )}

      {pairingStage && (
        <View style={[styles.pairingCard, { backgroundColor: isDark ? '#181A24' : '#F8FAFF' }]}> 
          <View style={styles.pairingHeaderRow}>
            <Text style={[styles.pairingTitle, { color: isDark ? '#fff' : '#1F2937' }]}>Smart Plug Pairing</Text>
            <View style={styles.timeoutBadge}>
              <Ionicons name="time-outline" size={14} color="#5B6EF5" />
              <Text style={styles.timeoutText}>{Math.floor(pairingRemainingSec / 60)}:{(pairingRemainingSec % 60).toString().padStart(2, '0')}</Text>
            </View>
          </View>

          {pairingStage === 'instruction' && (
            <View style={styles.pairingSection}>
              <Text style={[styles.pairingBodyText, { color: isDark ? '#CBD5E1' : '#475569' }]}> 
                Press and hold the device button for 5 seconds until the LED indicator blinks twice,
                stays on for 1 second, and repeats.
              </Text>
              <TouchableOpacity
                style={[styles.pairingActionButton, pairingBusy && { opacity: 0.7 }]}
                onPress={() => {
                  scanNearbyPlugs();
                }}
                disabled={pairingBusy}
              >
                <Ionicons name="search" size={18} color="#fff" />
                <Text style={styles.pairingActionText}>Scan Devices Nearby</Text>
              </TouchableOpacity>
            </View>
          )}

          {(pairingStage === 'scanning' || pairingStage === 'connect' || pairingStage === 'wifi_scan') && (
            <View style={styles.pairingSection}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={[styles.pairingBodyText, { color: isDark ? '#CBD5E1' : '#475569', marginTop: 12 }]}>
                {pairingProgressText || 'Scanning devices nearby...'}
              </Text>
              {nearbyPlugs.length > 0 && (
                <View style={styles.plugList}>
                  {nearbyPlugs.slice(0, 3).map(plug => (
                    <TouchableOpacity
                      key={plug.id}
                      style={[
                        styles.plugListItem,
                        selectedPlug?.id === plug.id && styles.plugListItemActive,
                      ]}
                      onPress={() => {
                        setSelectedPlug(plug);
                        connectPlugAndLoadWifi(plug);
                      }}
                      disabled={pairingBusy}
                    >
                      <View>
                        <Text style={styles.plugName}>{plug.name}</Text>
                        <Text style={styles.plugMeta}>{plug.serialNumber} | RSSI {plug.rssi}</Text>
                      </View>
                      <Text style={styles.plugConnectText}>Connect</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {pairingStage === 'network' && (
            <View style={styles.pairingSection}>
              <Text style={[styles.pairingBodyText, { color: isDark ? '#CBD5E1' : '#475569' }]}>Select Wi-Fi (2.4GHz recommended)</Text>
              {manualWifiMode && (
                <View style={styles.manualModeBanner}>
                  <Ionicons name="construct-outline" size={14} color="#7C3AED" />
                  <Text style={styles.manualModeText}>
                    {manualWifiReason === 'firmware_not_supported'
                      ? 'Manual Wi-Fi mode (firmware limitation)'
                      : 'Manual Wi-Fi mode'}
                  </Text>
                </View>
              )}
              {wifiNetworks.length === 0 && (
                <Text style={[styles.manualHintText, { color: isDark ? '#94A3B8' : '#64748B' }]}>No networks listed. You can still type your SSID manually.</Text>
              )}
              {!manualWifiMode && wifiNetworks.length > 0 && (
                <ScrollView style={styles.networkList} showsVerticalScrollIndicator={false}>
                  {wifiNetworks.slice(0, 8).map(net => {
                    const selected = wifiSsid === net.ssid;
                    return (
                      <TouchableOpacity
                        key={`${net.ssid}-${net.rssi}`}
                        style={[styles.networkRow, selected && styles.networkRowActive]}
                        onPress={() => setWifiSsid(net.ssid)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.networkName}>{net.ssid}</Text>
                          <Text style={styles.networkMeta}>{net.band} | RSSI {net.rssi}</Text>
                        </View>
                        {net.band === '2.4GHz' && <Text style={styles.recommendedChip}>2.4GHz</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              <TextInput
                style={[styles.pairingInput, { color: isDark ? '#fff' : '#111', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                placeholder="Wi-Fi Account (SSID)"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                value={wifiSsid}
                onChangeText={setWifiSsid}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={[styles.passwordRow, { borderColor: isDark ? '#334155' : '#E2E8F0' }]}> 
                <TextInput
                  style={[styles.passwordInputText, { color: isDark ? '#fff' : '#111' }]}
                  placeholder="Wi-Fi Password"
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  value={wifiPassword}
                  onChangeText={setWifiPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!showWifiPassword}
                />
                <TouchableOpacity onPress={() => setShowWifiPassword(prev => !prev)}>
                  <Text style={styles.showHideText}>{showWifiPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.pairingActionButton, pairingBusy && { opacity: 0.7 }]}
                onPress={submitWifiProvisioning}
                disabled={pairingBusy}
              >
                <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                <Text style={styles.pairingActionText}>Connect Plug</Text>
              </TouchableOpacity>
            </View>
          )}

          {pairingStage === 'provisioning' && (
            <View style={[styles.pairingSection, { alignItems: 'center' }]}>
              <View style={styles.circleProgressOuter}>
                <View style={styles.circleProgressInner}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                </View>
              </View>
              <Text style={[styles.pairingBodyText, { color: isDark ? '#CBD5E1' : '#475569', marginTop: 14, textAlign: 'center' }]}> 
                {pairingProgressText || 'Connecting your plug...'}
              </Text>
            </View>
          )}

          {pairingStage === 'success' && (
            <View style={[styles.pairingSection, { alignItems: 'center' }]}>
              <View style={styles.successBubble}><Ionicons name="checkmark" size={26} color="#fff" /></View>
              <Text style={[styles.successTitle, { color: isDark ? '#fff' : '#111827' }]}>Plug connected successfully</Text>
              <Text style={[styles.pairingBodyText, { color: isDark ? '#CBD5E1' : '#475569', textAlign: 'center' }]}> 
                Continue with room assignment and device naming.
              </Text>
              <TouchableOpacity
                style={styles.pairingActionButton}
                onPress={() => {
                  setPairingStage(null);
                  setStep(3);
                }}
              >
                <Ionicons name="arrow-forward" size={18} color="#fff" />
                <Text style={styles.pairingActionText}>Continue Setup</Text>
              </TouchableOpacity>
            </View>
          )}

          {!!pairingError && (
            <View style={styles.pairingErrorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.pairingErrorText}>{pairingError}</Text>
            </View>
          )}

          {__DEV__ && (
            <View style={[styles.debugPanel, { backgroundColor: isDark ? '#0F172A' : '#EEF2FF' }]}>
              <Text style={styles.debugTitle}>Debug (dev only)</Text>
              <Text style={styles.debugLine}>Stage: {pairingStage}</Text>
              <Text style={styles.debugLine}>Cloud path: {cloudConfirmPath}</Text>
              {!!cloudConfirmError && <Text style={styles.debugLine}>Cloud error: {cloudConfirmError}</Text>}
              {(() => {
                const snap = bleProvisioningService.getDebugSnapshot();
                return (
                  <>
                    <Text style={styles.debugLine}>WiFi payload: {snap.lastWifiScan?.payloadShape || 'n/a'}</Text>
                    <Text style={styles.debugLine}>WiFi list count: {snap.lastWifiScan?.networkCount ?? 0}</Text>
                    <Text style={styles.debugLine}>WiFi msgId: {snap.lastWifiScan?.msgId || 'n/a'}</Text>
                    <Text style={styles.debugLine}>Manual WiFi mode: {String(manualWifiMode)}</Text>
                    <Text style={styles.debugLine}>ACK received: {String(snap.lastProvision?.ackReceived ?? false)}</Text>
                    <Text style={styles.debugLine}>ACK attempts: {snap.lastProvision?.ackAttempts ?? 0}</Text>
                    <Text style={styles.debugLine}>Provision msgId: {snap.lastProvision?.msgId || 'n/a'}</Text>
                    {!!snap.lastWifiScan?.error && <Text style={styles.debugLine}>WiFi error: {snap.lastWifiScan.error}</Text>}
                    {!!snap.lastProvision?.error && <Text style={styles.debugLine}>ACK error: {snap.lastProvision.error}</Text>}
                  </>
                );
              })()}
            </View>
          )}
        </View>
      )}

      {/* Visual pattern decoration */}
      {!scanningQR && !pairingStage && (
        <View style={styles.patternContainer}>
          <LinearGradient
            colors={DEVICE_TYPES.find(t => t.type === selectedType)?.gradient || ['#4CAF50', '#2E7D32']}
            style={styles.patternBox}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialCommunityIcons
              name={DEVICE_TYPES.find(t => t.type === selectedType)?.icon || 'power-socket-eu'}
              size={60}
              color="rgba(255,255,255,0.3)"
            />
          </LinearGradient>
        </View>
      )}
    </View>
  );

  // Step 3: Room Selection
  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: isDark ? '#fff' : '#333' }]}>
        {showNewRoomInput ? 'Create New Room' : 'Assign to Room'}
      </Text>
      <Text style={[styles.stepSubtitle, { color: isDark ? '#888' : '#666' }]}>
        {showNewRoomInput 
          ? 'Select a suggestion or enter a custom name'
          : 'Choose which room this device belongs to (Optional)'}
      </Text>

      {showNewRoomInput ? (
        /* Create New Room Input */
        <View style={styles.newRoomContainer}>
          {/* Suggested Rooms */}
          <Text style={[styles.suggestedLabel, { color: isDark ? '#888' : '#666' }]}>
            Quick Select
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.suggestedRoomsScroll}
            contentContainerStyle={styles.suggestedRoomsContainer}
          >
            {SUGGESTED_ROOMS.filter(
              suggestion => !rooms.some(r => r.name.toLowerCase() === suggestion.name.toLowerCase())
            ).map((suggestion) => (
              <TouchableOpacity
                key={suggestion.name}
                style={[
                  styles.suggestedRoomCard,
                  {
                    backgroundColor: newRoomName === suggestion.name
                      ? 'rgba(91, 110, 245, 0.15)'
                      : isDark ? '#1a1a1a' : '#f5f5f5',
                    borderColor: newRoomName === suggestion.name ? Colors.primary : 'transparent',
                  },
                ]}
                onPress={() => setNewRoomName(suggestion.name)}
              >
                <View style={[styles.suggestedRoomIcon, { backgroundColor: suggestion.color }]}>
                  <MaterialCommunityIcons name={suggestion.icon as any} size={20} color="#fff" />
                </View>
                <Text style={[styles.suggestedRoomName, { color: isDark ? '#fff' : '#333' }]}>
                  {suggestion.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Custom Input */}
          <Text style={[styles.suggestedLabel, { color: isDark ? '#888' : '#666', marginTop: 16 }]}>
            Or enter custom name
          </Text>
          <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
            <MaterialCommunityIcons
              name="door"
              size={24}
              color={isDark ? '#888' : '#666'}
            />
            <TextInput
              style={[styles.textInput, { color: isDark ? '#fff' : '#333' }]}
              placeholder="e.g., Guest Room, Office..."
              placeholderTextColor={isDark ? '#555' : '#999'}
              value={newRoomName}
              onChangeText={setNewRoomName}
            />
            {newRoomName.length > 0 && (
              <TouchableOpacity onPress={() => setNewRoomName('')}>
                <Ionicons name="close-circle" size={20} color={isDark ? '#555' : '#999'} />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity
            style={[
              styles.createRoomButton,
              {
                backgroundColor: newRoomName.trim() ? Colors.primary : '#888',
                opacity: creatingRoom ? 0.7 : 1,
              },
            ]}
            onPress={handleCreateRoom}
            disabled={!newRoomName.trim() || creatingRoom}
          >
            {creatingRoom ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.createRoomButtonText}>Create Room</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        /* Room Selection Grid */
        <View style={styles.roomsGrid}>
          {/* Skip for now / No Room Option */}
          <TouchableOpacity
            style={[
              styles.roomCard,
              {
                backgroundColor: selectedRoomId === null
                  ? 'rgba(91, 110, 245, 0.15)'
                  : isDark ? '#1a1a1a' : '#f5f5f5',
                borderColor: selectedRoomId === null ? Colors.primary : 'transparent',
                borderWidth: 2,
              },
            ]}
            onPress={() => setSelectedRoomId(null)}
          >
            <View style={[styles.roomIconContainer, { backgroundColor: '#9E9E9E' }]}>
              <MaterialCommunityIcons name="skip-forward" size={28} color="#fff" />
            </View>
            <Text style={[styles.roomName, { color: isDark ? '#fff' : '#333' }]}>
              Skip for now
            </Text>
            {selectedRoomId === null && (
              <View style={styles.roomCheckmark}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
              </View>
            )}
          </TouchableOpacity>

          {/* Room Options */}
          {rooms.map((room) => {
            const isSelected = selectedRoomId !== null && selectedRoomId === room.roomId;
            return (
              <TouchableOpacity
                key={room.roomId}
                style={[
                  styles.roomCard,
                  {
                    backgroundColor: isSelected
                      ? 'rgba(91, 110, 245, 0.15)'
                      : isDark ? '#1a1a1a' : '#f5f5f5',
                    borderColor: isSelected ? Colors.primary : 'transparent',
                    borderWidth: 2,
                  },
                ]}
                onPress={() => setSelectedRoomId(room.roomId)}
              >
                <View style={[styles.roomIconContainer, { backgroundColor: Colors.primary }]}>
                  <MaterialCommunityIcons name={(room.icon || 'door') as any} size={28} color="#fff" />
                </View>
                <Text style={[styles.roomName, { color: isDark ? '#fff' : '#333' }]}>
                  {room.name}
                </Text>
                {isSelected && (
                  <View style={styles.roomCheckmark}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Create New Room Button */}
          <TouchableOpacity
            style={[
              styles.roomCard,
              {
                backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
                borderColor: Colors.secondary,
                borderWidth: 2,
                borderStyle: 'dashed',
              },
            ]}
            onPress={() => setShowNewRoomInput(true)}
          >
            <View style={[styles.roomIconContainer, { backgroundColor: Colors.secondary }]}>
              <Ionicons name="add" size={28} color="#fff" />
            </View>
            <Text style={[styles.roomName, { color: Colors.secondary }]}>
              + Create New
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Step 4: Name Your Device
  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: isDark ? '#fff' : '#333' }]}>
        Name Your Device
      </Text>
      <Text style={[styles.stepSubtitle, { color: isDark ? '#888' : '#666' }]}>
        Give your device a friendly name
      </Text>

      <View style={styles.inputContainer}>
        <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
          <MaterialCommunityIcons
            name="tag-outline"
            size={24}
            color={isDark ? '#888' : '#666'}
          />
          <TextInput
            style={[styles.textInput, { color: isDark ? '#fff' : '#333' }]}
            placeholder="e.g., Living Room Lamp"
            placeholderTextColor={isDark ? '#555' : '#999'}
            value={deviceName}
            onChangeText={setDeviceName}
          />
        </View>
      </View>

      {/* Preview Card */}
      <View style={styles.previewContainer}>
        <Text style={[styles.previewLabel, { color: isDark ? '#888' : '#666' }]}>Preview</Text>
        <LinearGradient
          colors={DEVICE_TYPES.find(t => t.type === selectedType)?.gradient || ['#4CAF50', '#2E7D32']}
          style={styles.previewCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.previewIconContainer}>
            <MaterialCommunityIcons
              name={DEVICE_TYPES.find(t => t.type === selectedType)?.icon || 'power-socket-eu'}
              size={32}
              color="#fff"
            />
          </View>
          <View style={styles.previewInfo}>
            <Text style={styles.previewName}>{deviceName || 'Device Name'}</Text>
            <Text style={styles.previewSerial}>{serialNumber}</Text>
            <Text style={styles.previewType}>
              {DEVICE_TYPES.find(t => t.type === selectedType)?.label}
            </Text>
            <Text style={styles.previewRoom}>
              {selectedRoomId !== null
                ? rooms.find(r => r.roomId === selectedRoomId)?.name || 'Unknown Room'
                : 'No Room'}
            </Text>
          </View>
        </LinearGradient>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.modalOverlay,
          { opacity: fadeAnim },
        ]}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        
        <Animated.View
          style={[
            styles.modalContent,
            {
              backgroundColor: isDark ? '#1e1e1e' : '#fff',
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [height, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
              <Ionicons
                name={step === 1 ? "close" : "arrow-back"}
                size={24}
                color={isDark ? '#fff' : '#333'}
              />
            </TouchableOpacity>
            
          <View style={styles.stepIndicator}>
              {[1, 2, 3, 4].map((s) => (
                <View
                  key={s}
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor: s <= step ? Colors.primary : (isDark ? '#333' : '#ddd'),
                      width: s === step ? 24 : 8,
                    },
                  ]}
                />
              ))}
            </View>

            <View style={styles.headerButton} />
          </View>

          {/* Content */}
          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            showsVerticalScrollIndicator={false}
          >
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.modalFooter, { borderTopColor: isDark ? '#333' : '#eee' }]}>
            <TouchableOpacity
              style={[
                styles.nextButton,
                {
                  opacity: pairingStage ? 0.5 : 1,
                  backgroundColor: (
                    (step === 1 && selectedType) ||
                    (step === 2 && serialNumber.trim()) ||
                    (step === 3) || // Room selection is always valid (can skip)
                    (step === 4 && deviceName.trim())
                  ) ? Colors.primary : '#888',
                },
              ]}
              onPress={handleNext}
              disabled={!!pairingStage || loading || (
                (step === 1 && !selectedType) ||
                (step === 2 && !serialNumber.trim()) ||
                (step === 4 && !deviceName.trim())
              )}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.nextButtonText}>
                    {step === 4 ? 'Add Device' : 'Continue'}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {Platform.OS !== 'web' && (
            <Modal
              visible={scanningQR}
              animationType="slide"
              onRequestClose={() => setScanningQR(false)}
            >
              <QRScan
                onScanned={handleBarCodeScanned}
                onCancel={() => setScanningQR(false)}
              />
            </Modal>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// Device Details Modal
const DeviceDetailsModal = ({
  device,
  visible,
  onClose,
  onDelete,
  onControl,
  onUpdate,
  rooms,
}: {
  device: ServiceDevice | null;
  visible: boolean;
  onClose: () => void;
  onDelete: (id: number) => void;
  onControl: (id: number, action: 'turnOn' | 'turnOff') => void;
  onUpdate: (id: number, data: { name: string; roomId: number | null }) => Promise<void>;
  rooms: Room[];
}) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [controlling, setControlling] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRoomId, setEditRoomId] = useState<number | null>(null);
  const [remoteId, setRemoteId] = useState('wireless-switch-1');
  const lastControlTime = useRef(0);
  const {
    isSupported: bleSupported,
    gatewayStatus,
    isSendingRemoteAction,
    isRefreshingStatus,
    sendRemoteAction,
    refreshGatewayStatus,
    error: bleError,
    clearError: clearBleError,
  } = useBleProvisioning();

  const isSmartPlug = device?.type === 'SMART_PLUG';
  const deviceTypeInfo = DEVICE_TYPES.find(t => t.type === device?.type) || DEVICE_TYPES[0];

  const handlePowerToggle = async () => {
    if (!device) return;

    // Debounce - prevent rapid taps (must wait 1 second between taps)
    const now = Date.now();
    if (now - lastControlTime.current < 1000) {
      console.log('Debouncing power toggle - too fast');
      return;
    }
    lastControlTime.current = now;

    if (controlling) return;
    
    setControlling(true);
    try {
      await onControl(device.id, device.powerState ? 'turnOff' : 'turnOn');
    } finally {
      // Keep button disabled for a short time to prevent double-tap
      setTimeout(() => setControlling(false), 500);
    }
  };

  useEffect(() => {
    if (!visible || !bleSupported || !isSmartPlug || !device?.serialNumber) {
      return;
    }

    refreshGatewayStatus(device.serialNumber);
  }, [visible, bleSupported, isSmartPlug, device?.serialNumber, refreshGatewayStatus]);

  useEffect(() => {
    if (!visible || !device) return;
    setEditName(device.name || '');
    setEditRoomId(device.roomId ?? null);
  }, [visible, device?.id, device?.name, device?.roomId]);

  const handleSmarteraRemoteAction = async (
    action: 'pair' | 'unpair' | 'relay_toggle' | 'gateway_enable' | 'gateway_disable'
  ) => {
    if (!device) return;

    if (!bleSupported) {
      Alert.alert(
        'Bluetooth Not Available',
        'Smartera-Remote requires a native build with BLE support (react-native-ble-plx).'
      );
      return;
    }

    clearBleError();

    try {
      await sendRemoteAction({
        serialNumber: device.serialNumber,
        action,
        remoteId: remoteId.trim() || 'wireless-switch-1',
      });

      await refreshGatewayStatus(device.serialNumber);
    } catch {}
  };

  const handleSaveEdit = async () => {
    if (!device) return;

    const trimmedName = editName.trim();
    if (!trimmedName) {
      Alert.alert('Invalid name', 'Device name cannot be empty.');
      return;
    }

    const nameUnchanged = trimmedName === (device.name || '').trim();
    const roomUnchanged = (editRoomId ?? null) === (device.roomId ?? null);
    if (nameUnchanged && roomUnchanged) {
      return;
    }

    setSavingEdit(true);
    try {
      await onUpdate(device.id, { name: trimmedName, roomId: editRoomId ?? null });
      Alert.alert('Saved', 'Device details updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update device details');
    } finally {
      setSavingEdit(false);
    }
  };

  if (!device) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        
        <View style={[styles.detailsModal, { backgroundColor: isDark ? '#1e1e1e' : '#fff' }]}>
          {/* Header Gradient */}
          <LinearGradient
            colors={deviceTypeInfo.gradient}
            style={styles.detailsHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.detailsIconContainer}>
              <MaterialCommunityIcons
                name={deviceTypeInfo.icon}
                size={48}
                color="#fff"
              />
            </View>
            
            <Text style={styles.detailsName}>{device.name}</Text>
            <Text style={styles.detailsSerial}>{device.serialNumber}</Text>
            
            <View style={styles.detailsStatusRow}>
              <View style={[styles.detailsStatusBadge, { backgroundColor: device.isOnline ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)' }]}>
                <View style={[styles.statusDotLarge, { backgroundColor: device.isOnline ? Colors.success : Colors.error }]} />
                <Text style={styles.detailsStatusText}>{device.isOnline ? 'Online' : 'Offline'}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Content */}
          <ScrollView style={styles.detailsBody}>
            {/* Power Control */}
            <View style={styles.detailsSection}>
              <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#333' }]}>Power Control</Text>
              <View style={styles.powerControlRow}>
                <TouchableOpacity
                  style={[
                    styles.powerControlButton, 
                    { 
                      backgroundColor: device.powerState ? Colors.success : (isDark ? '#333' : '#eee'),
                      opacity: controlling ? 0.6 : 1,
                    }
                  ]}
                  onPress={handlePowerToggle}
                  disabled={controlling}
                  activeOpacity={0.7}
                >
                  {controlling ? (
                    <ActivityIndicator color={device.powerState ? '#fff' : '#888'} size="small" />
                  ) : (
                    <Ionicons
                      name="power"
                      size={32}
                      color={device.powerState ? '#fff' : '#888'}
                    />
                  )}
                  <Text style={[styles.powerControlText, { color: device.powerState ? '#fff' : '#888' }]}>
                    {device.powerState ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {device.type === 'SMART_PLUG' && (
              <View style={styles.detailsSection}>
                <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#333' }]}>Smartera-Remote</Text>
                <Text style={[styles.remoteSubtitle, { color: isDark ? '#888' : '#666' }]}>Local BLE gateway for wireless switch control without WiFi or internet.</Text>

                {!bleSupported ? (
                  <View style={[styles.remoteInfoCard, { backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5' }]}>
                    <Ionicons name="bluetooth-outline" size={18} color={Colors.warning} />
                    <Text style={[styles.remoteInfoText, { color: isDark ? '#ddd' : '#333' }]}>Bluetooth module is unavailable in this build. Use a native dev build to enable Smartera-Remote.</Text>
                  </View>
                ) : (
                  <>
                    <View style={[styles.remoteStatusCard, { backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5' }]}>
                      <View style={styles.remoteStatusRow}>
                        <Text style={[styles.remoteStatusLabel, { color: isDark ? '#aaa' : '#666' }]}>Gateway</Text>
                        <Text style={[styles.remoteStatusValue, { color: gatewayStatus?.gatewayEnabled ? Colors.success : Colors.error }]}> 
                          {gatewayStatus?.gatewayEnabled ? 'Enabled' : 'Disabled'}
                        </Text>
                      </View>
                      <View style={styles.remoteStatusRow}>
                        <Text style={[styles.remoteStatusLabel, { color: isDark ? '#aaa' : '#666' }]}>Paired Remotes</Text>
                        <Text style={[styles.remoteStatusValue, { color: isDark ? '#fff' : '#333' }]}> 
                          {gatewayStatus?.pairedRemotes ?? 0}
                        </Text>
                      </View>
                      <View style={styles.remoteStatusRow}>
                        <Text style={[styles.remoteStatusLabel, { color: isDark ? '#aaa' : '#666' }]}>Transport</Text>
                        <Text style={[styles.remoteStatusValue, { color: isDark ? '#fff' : '#333' }]}> 
                          {gatewayStatus?.transport || 'smartera-Remote'}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.remoteInputRow, { backgroundColor: isDark ? '#2a2a2a' : '#f8f8f8' }]}>
                      <Ionicons name="hardware-chip-outline" size={18} color={isDark ? '#aaa' : '#666'} />
                      <TextInput
                        value={remoteId}
                        onChangeText={setRemoteId}
                        style={[styles.remoteInput, { color: isDark ? '#fff' : '#333' }]}
                        placeholder="wireless-switch-1"
                        placeholderTextColor={isDark ? '#666' : '#999'}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>

                    <View style={styles.remoteActionGrid}>
                      <TouchableOpacity
                        style={[styles.remoteActionButton, { backgroundColor: '#0F766E' }]}
                        onPress={() => handleSmarteraRemoteAction('pair')}
                        disabled={isSendingRemoteAction}
                      >
                        <Text style={styles.remoteActionText}>Pair Switch</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.remoteActionButton, { backgroundColor: '#475569' }]}
                        onPress={() => handleSmarteraRemoteAction('unpair')}
                        disabled={isSendingRemoteAction}
                      >
                        <Text style={styles.remoteActionText}>Unpair Switch</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.remoteActionButton, { backgroundColor: Colors.primary }]}
                        onPress={() => handleSmarteraRemoteAction('relay_toggle')}
                        disabled={isSendingRemoteAction}
                      >
                        <Text style={styles.remoteActionText}>Local Toggle</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.remoteActionButton, { backgroundColor: gatewayStatus?.gatewayEnabled ? Colors.error : Colors.success }]}
                        onPress={() =>
                          handleSmarteraRemoteAction(gatewayStatus?.gatewayEnabled ? 'gateway_disable' : 'gateway_enable')
                        }
                        disabled={isSendingRemoteAction}
                      >
                        <Text style={styles.remoteActionText}>
                          {gatewayStatus?.gatewayEnabled ? 'Disable Gateway' : 'Enable Gateway'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={[styles.remoteRefreshButton, { borderColor: isDark ? '#555' : '#ccc' }]}
                      onPress={() => refreshGatewayStatus(device.serialNumber)}
                      disabled={isRefreshingStatus}
                    >
                      {isRefreshingStatus ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                      ) : (
                        <>
                          <Ionicons name="refresh" size={16} color={Colors.primary} />
                          <Text style={styles.remoteRefreshText}>Refresh Gateway Status</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {!!bleError && (
                      <View style={styles.remoteErrorCard}>
                        <Ionicons name="alert-circle" size={14} color={Colors.error} />
                        <Text style={styles.remoteErrorText}>{bleError}</Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {/* Telemetry Data */}
            {device.type === 'SMART_PLUG' && device.lastTelemetry && (
              <View style={styles.detailsSection}>
                <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#333' }]}>Real-time Data</Text>
                <View style={styles.telemetryGrid}>
                  <View style={[styles.telemetryCard, { backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5' }]}>
                    <Feather name="zap" size={20} color={Colors.warning} />
                    <Text style={[styles.telemetryValue, { color: isDark ? '#fff' : '#333' }]}>
                      {(device.lastTelemetry.power || 0).toFixed(1)}
                    </Text>
                    <Text style={[styles.telemetryUnit, { color: isDark ? '#888' : '#666' }]}>Watts</Text>
                  </View>
                  <View style={[styles.telemetryCard, { backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5' }]}>
                    <Feather name="activity" size={20} color={Colors.primary} />
                    <Text style={[styles.telemetryValue, { color: isDark ? '#fff' : '#333' }]}>
                      {(device.lastTelemetry.voltage || 0).toFixed(1)}
                    </Text>
                    <Text style={[styles.telemetryUnit, { color: isDark ? '#888' : '#666' }]}>Volts</Text>
                  </View>
                  <View style={[styles.telemetryCard, { backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5' }]}>
                    <Feather name="trending-up" size={20} color={Colors.success} />
                    <Text style={[styles.telemetryValue, { color: isDark ? '#fff' : '#333' }]}>
                      {(device.lastTelemetry.current || 0).toFixed(2)}
                    </Text>
                    <Text style={[styles.telemetryUnit, { color: isDark ? '#888' : '#666' }]}>Amps</Text>
                  </View>
                  <View style={[styles.telemetryCard, { backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5' }]}>
                    <Feather name="battery-charging" size={20} color={Colors.secondary} />
                    <Text style={[styles.telemetryValue, { color: isDark ? '#fff' : '#333' }]}>
                      {(device.lastTelemetry.energy || device.lastTelemetry.energyTotal || 0).toFixed(2)}
                    </Text>
                    <Text style={[styles.telemetryUnit, { color: isDark ? '#888' : '#666' }]}>kWh</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Device Info */}
            <View style={styles.detailsSection}>
              <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#333' }]}>Device Info</Text>
              <View style={[styles.infoCard, { backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5' }]}>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: isDark ? '#888' : '#666' }]}>Type</Text>
                  <Text style={[styles.infoValue, { color: isDark ? '#fff' : '#333' }]}>{deviceTypeInfo.label}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: isDark ? '#888' : '#666' }]}>Serial Number</Text>
                  <Text style={[styles.infoValue, { color: isDark ? '#fff' : '#333' }]}>{device.serialNumber}</Text>
                </View>
                {device.lastSeenAt && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: isDark ? '#888' : '#666' }]}>Last Seen</Text>
                    <Text style={[styles.infoValue, { color: isDark ? '#fff' : '#333' }]}>
                      {new Date(device.lastSeenAt).toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Edit Device */}
            <View style={styles.detailsSection}>
              <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#333' }]}>Edit Device</Text>
              <View style={[styles.editCard, { backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5' }]}> 
                <View style={[styles.editNameRow, { backgroundColor: isDark ? '#1f1f1f' : '#fff' }]}> 
                  <Ionicons name="create-outline" size={18} color={isDark ? '#aaa' : '#666'} />
                  <TextInput
                    style={[styles.editNameInput, { color: isDark ? '#fff' : '#333' }]}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Device name"
                    placeholderTextColor={isDark ? '#666' : '#999'}
                    autoCorrect={false}
                  />
                </View>

                <Text style={[styles.editRoomLabel, { color: isDark ? '#aaa' : '#666' }]}>Room</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.editRoomChips}
                >
                  <TouchableOpacity
                    style={[
                      styles.editRoomChip,
                      {
                        backgroundColor: editRoomId === null ? Colors.primary : (isDark ? '#1f1f1f' : '#fff'),
                      },
                    ]}
                    onPress={() => setEditRoomId(null)}
                  >
                    <Text style={[styles.editRoomChipText, { color: editRoomId === null ? '#fff' : (isDark ? '#ddd' : '#333') }]}>No Room</Text>
                  </TouchableOpacity>

                  {rooms.map((room) => {
                    const selected = editRoomId === room.roomId;
                    return (
                      <TouchableOpacity
                        key={room.roomId}
                        style={[
                          styles.editRoomChip,
                          {
                            backgroundColor: selected ? Colors.primary : (isDark ? '#1f1f1f' : '#fff'),
                          },
                        ]}
                        onPress={() => setEditRoomId(room.roomId)}
                      >
                        <Text style={[styles.editRoomChipText, { color: selected ? '#fff' : (isDark ? '#ddd' : '#333') }]}>
                          {room.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <TouchableOpacity
                  style={[
                    styles.editSaveButton,
                    {
                      backgroundColor: editName.trim() ? Colors.primary : '#888',
                      opacity: savingEdit ? 0.7 : 1,
                    },
                  ]}
                  onPress={handleSaveEdit}
                  disabled={!editName.trim() || savingEdit}
                >
                  {savingEdit ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={18} color="#fff" />
                      <Text style={styles.editSaveButtonText}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Danger Zone */}
            <View style={styles.detailsSection}>
              <Text style={[styles.sectionTitle, { color: Colors.error }]}>Danger Zone</Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  Alert.alert(
                    'Delete Device',
                    `Are you sure you want to remove "${device.name}"? This action cannot be undone.`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => {
                          onDelete(device.id);
                          onClose();
                        },
                      },
                    ]
                  );
                }}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
                <Text style={styles.deleteButtonText}>Remove Device</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Main Component
export default function DeviceActive() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { isConnected: wsConnected } = useRealtimeConnection();
  const {
    devices,
    loading,
    error,
    refresh,
    controlDevice,
    addDevice,
    removeDevice,
    updateDevice,
  } = useDevices();
  const { rooms, createRoom, creating: creatingRoom } = useRooms();

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<ServiceDevice | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [addingDevice, setAddingDevice] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleCreateRoom = async (name: string, icon?: string): Promise<Room> => {
    const newRoom = await createRoom(name, icon);
    return newRoom;
  };

  const handleAddDevice = async (data: { serialNumber: string; name: string; type: DeviceType; roomId?: number }) => {
    setAddingDevice(true);
    try {
      await addDevice({
        serialNumber: data.serialNumber,
        name: data.name,
        type: data.type,
        roomId: data.roomId,
      });
      setAddModalVisible(false);
      Alert.alert('Success', `${data.name} has been added successfully!`);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
        Alert.alert(
          'Device already exists',
          'This serial number is already registered. Long-press the existing device to edit its name or room.'
        );
      } else {
        Alert.alert('Error', err.message || 'Failed to add device');
      }
    } finally {
      setAddingDevice(false);
    }
  };

  const handleControl = async (deviceId: number, action: 'turnOn' | 'turnOff') => {
    try {
      await controlDevice(deviceId, action);
    } catch (err: any) {
      console.error('Failed to control device:', err);
      Alert.alert('Error', err.message || 'Failed to control device');
    }
  };

  const handleDelete = async (deviceId: number) => {
    try {
      await removeDevice(deviceId);
      Alert.alert('Success', 'Device removed successfully');
    } catch (err: any) {
      console.error('Failed to delete device:', err);
      Alert.alert('Error', err.message || 'Failed to delete device');
    }
  };

  const handleUpdateDevice = async (deviceId: number, data: { name: string; roomId: number | null }) => {
    try {
      const updated = await updateDevice(deviceId, data);
      if (updated) {
        setSelectedDevice(prev => {
          if (!prev) return prev;
          if (prev.id !== deviceId) return prev;
          return { ...prev, ...updated };
        });
      }
    } catch (err: any) {
      throw err;
    }
  };

  // Group devices by type
  const groupedDevices = DEVICE_TYPES.map(type => ({
    ...type,
    devices: devices.filter(d => d.type === type.type),
  })).filter(group => group.devices.length > 0);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#f8f9fa' }]}>
      {/* Header */}
      <LinearGradient
        colors={isDark ? ['#1e1e1e', '#121212'] : [Colors.primary, Colors.secondary]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>My Devices</Text>
            <Text style={styles.headerSubtitle}>
              {devices.length} device{devices.length !== 1 ? 's' : ''} • {devices.filter(d => d.isOnline).length} online
            </Text>
          </View>
          
          <View style={styles.headerRight}>
            {/* Connection Status */}
            <View style={[styles.connectionBadge, { backgroundColor: wsConnected ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)' }]}>
              <View style={[styles.connectionDot, { backgroundColor: wsConnected ? Colors.success : Colors.error }]} />
              <Text style={styles.connectionText}>{wsConnected ? 'Live' : 'Offline'}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={isDark ? '#fff' : Colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading && devices.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[styles.loadingText, { color: isDark ? '#888' : '#666' }]}>
              Loading devices...
            </Text>
          </View>
        ) : devices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={[Colors.primary, Colors.secondary]}
              style={styles.emptyIconContainer}
            >
              <MaterialCommunityIcons name="devices" size={48} color="#fff" />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: isDark ? '#fff' : '#333' }]}>
              No Devices Yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: isDark ? '#888' : '#666' }]}>
              Add your first smart device to get started
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setAddModalVisible(true)}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>Add Device</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Quick Stats */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: isDark ? '#1e1e1e' : '#fff' }]}>
                <View style={[styles.statIconBg, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                  <Ionicons name="power" size={20} color={Colors.success} />
                </View>
                <Text style={[styles.statValue, { color: isDark ? '#fff' : '#333' }]}>
                  {devices.filter(d => d.powerState).length}
                </Text>
                <Text style={[styles.statLabel, { color: isDark ? '#888' : '#666' }]}>Active</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: isDark ? '#1e1e1e' : '#fff' }]}>
                <View style={[styles.statIconBg, { backgroundColor: 'rgba(91,110,245,0.12)' }]}>
                  <Ionicons name="wifi" size={20} color={Colors.primary} />
                </View>
                <Text style={[styles.statValue, { color: isDark ? '#fff' : '#333' }]}>
                  {devices.filter(d => d.isOnline).length}
                </Text>
                <Text style={[styles.statLabel, { color: isDark ? '#888' : '#666' }]}>Online</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: isDark ? '#1e1e1e' : '#fff' }]}>
                <View style={[styles.statIconBg, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
                  <Feather name="zap" size={20} color={Colors.warning} />
                </View>
                <Text style={[styles.statValue, { color: isDark ? '#fff' : '#333' }]}>
                  {devices.reduce((sum, d) => sum + (d.lastTelemetry?.power || 0), 0).toFixed(0)}W
                </Text>
                <Text style={[styles.statLabel, { color: isDark ? '#888' : '#666' }]}>Power</Text>
              </View>
            </View>

            {/* Devices Grid */}
            <View style={styles.devicesSection}>
              <Text style={[styles.sectionHeader, { color: isDark ? '#fff' : '#333' }]}>
                All Devices
              </Text>
              <View style={styles.devicesGrid}>
                {devices.map((device, index) => (
                  <DeviceCard
                    key={device.id}
                    device={device}
                    index={index}
                    onControl={handleControl}
                    onLongPress={setSelectedDevice}
                  />
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setAddModalVisible(true)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[Colors.primary, Colors.secondary]}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Modals */}
      <AddDeviceModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onAdd={handleAddDevice}
        loading={addingDevice}
        rooms={rooms}
        onCreateRoom={handleCreateRoom}
        creatingRoom={creatingRoom}
      />

      <DeviceDetailsModal
        device={selectedDevice}
        visible={!!selectedDevice}
        onClose={() => setSelectedDevice(null)}
        onDelete={handleDelete}
        onControl={handleControl}
        onUpdate={handleUpdateDevice}
        rooms={rooms}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  devicesSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  devicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  deviceCard: {
    width: (width - 44) / 2,
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  deviceType: {
    fontSize: 12,
    marginBottom: 12,
  },
  powerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
  },
  powerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  telemetryContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  telemetryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  telemetryText: {
    fontSize: 11,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    height: Math.min(height * 0.9, 760),
    minHeight: Math.min(height * 0.72, 620),
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepDot: {
    height: 8,
    borderRadius: 4,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 20,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  stepContainer: {
    minHeight: 400,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  deviceTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  deviceTypeCardWrapper: {
    width: (width - 64) / 2,
  },
  deviceTypeCard: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 140,
  },
  deviceTypeCardSelected: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  deviceTypeIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  deviceTypeDesc: {
    fontSize: 11,
    textAlign: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
  },
  inputHint: {
    fontSize: 12,
    marginTop: 8,
    marginLeft: 4,
  },
  patternContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  patternBox: {
    width: 120,
    height: 120,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    marginTop: 24,
  },
  previewLabel: {
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 16,
  },
  previewIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  previewSerial: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  previewType: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  previewRoom: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  // Room selection styles
  roomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  roomCard: {
    width: (width - 80) / 2,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    position: 'relative',
  },
  roomIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  roomName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  roomCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  noRoomsMessage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  noRoomsText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
  // New room creation styles
  newRoomContainer: {
    marginTop: 16,
  },
  suggestedLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  suggestedRoomsScroll: {
    marginHorizontal: -20,
  },
  suggestedRoomsContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  suggestedRoomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  suggestedRoomIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestedRoomName: {
    fontSize: 14,
    fontWeight: '500',
  },
  createRoomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
    gap: 8,
  },
  createRoomButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Details modal styles
  detailsModal: {
    maxHeight: height * 0.85,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  detailsHeader: {
    padding: 24,
    paddingTop: 16,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailsName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  detailsSerial: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 16,
  },
  detailsStatusRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailsStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDotLarge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  detailsStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  detailsBody: {
    padding: 20,
  },
  detailsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  powerControlRow: {
    alignItems: 'center',
  },
  powerControlButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  powerControlText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  telemetryCard: {
    width: (width - 64) / 2,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  telemetryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  telemetryUnit: {
    fontSize: 12,
    marginTop: 4,
  },
  infoCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.error,
    gap: 8,
  },
  deleteButtonText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  editCard: {
    borderRadius: 14,
    padding: 12,
  },
  editNameRow: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  editNameInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  editRoomLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  editRoomChips: {
    gap: 8,
    paddingBottom: 2,
    marginBottom: 12,
  },
  editRoomChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editRoomChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editSaveButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  editSaveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  remoteSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  remoteInfoCard: {
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  remoteInfoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  remoteStatusCard: {
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 10,
  },
  remoteStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  remoteStatusLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  remoteStatusValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  remoteInputRow: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  remoteInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  remoteActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  remoteActionButton: {
    flex: 1,
    minWidth: 130,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  remoteActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  remoteRefreshButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  remoteRefreshText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  remoteErrorCard: {
    marginTop: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  remoteErrorText: {
    color: Colors.error,
    fontSize: 12,
    flex: 1,
  },
  wifiProvisionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
    gap: 12,
  },
  wifiProvisionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  wifiProvisionButtonSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  wifiProvisionButtonTextContainer: {
    flex: 1,
  },
  pairingCard: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(91,110,245,0.18)',
    padding: 14,
  },
  pairingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pairingTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  timeoutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(91,110,245,0.12)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timeoutText: {
    color: '#5B6EF5',
    fontSize: 12,
    fontWeight: '600',
  },
  pairingSection: {
    marginTop: 8,
  },
  pairingBodyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  pairingActionButton: {
    marginTop: 14,
    backgroundColor: '#5B6EF5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  pairingActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  plugList: {
    marginTop: 12,
  },
  plugListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(91,110,245,0.22)',
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
  },
  plugListItemActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(91,110,245,0.08)',
  },
  plugName: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '600',
  },
  plugMeta: {
    marginTop: 2,
    color: '#64748B',
    fontSize: 12,
  },
  plugConnectText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  networkList: {
    maxHeight: 180,
    marginTop: 10,
    marginBottom: 10,
  },
  manualHintText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
  },
  manualModeBanner: {
    marginTop: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(124,58,237,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  manualModeText: {
    color: '#6D28D9',
    fontSize: 12,
    fontWeight: '700',
  },
  networkRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  networkRowActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(91,110,245,0.08)',
  },
  networkName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  networkMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  recommendedChip: {
    fontSize: 11,
    color: '#0F766E',
    fontWeight: '700',
  },
  pairingInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    fontSize: 14,
    marginBottom: 10,
  },
  passwordRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  passwordInputText: {
    flex: 1,
    fontSize: 14,
  },
  showHideText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  circleProgressOuter: {
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 8,
    borderColor: 'rgba(91,110,245,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  circleProgressInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBubble: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success,
  },
  successTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  pairingErrorBox: {
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.10)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pairingErrorText: {
    color: Colors.error,
    fontSize: 12,
    flex: 1,
  },
  debugPanel: {
    marginTop: 12,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(91,110,245,0.35)',
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  debugLine: {
    fontSize: 11,
    lineHeight: 16,
    color: '#334155',
  },
  qrButton: {
    padding: 8,
    marginRight: 4,
  },
});
