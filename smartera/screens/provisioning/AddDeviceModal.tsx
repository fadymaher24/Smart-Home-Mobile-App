import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Animated,
  Pressable,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import NetInfo from "@react-native-community/netinfo";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { Colors, getThemeColors } from "../../utils/colors";
import { API_BASE_URL } from "../../utils/api";
import { getCurrentWiFiSSID, parseSerialFromQRCode } from "../../utils/wifi";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import bleProvisioningService, {
  BleDiscoveredPlug,
  BleWifiNetwork,
} from "../../services/bleProvisioningService";
import smartConfigProvisioningService from "../../services/smartConfigProvisioningService";
import realtimeService from "../../services/realtimeService";
import QRScan from "../tabscreens/QRScan";

const { width, height } = Dimensions.get("window");
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type DeviceType = "SMART_PLUG" | "RGB_LIGHT" | "THERMOSTAT" | "SENSOR";

export interface Room {
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

interface AddDeviceModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: {
    serialNumber: string;
    name: string;
    type: DeviceType;
    roomId?: number;
  }) => void;
  loading: boolean;
  rooms: Room[];
  onCreateRoom: (name: string, icon?: string) => Promise<Room>;
  creatingRoom: boolean;
}

const DEVICE_TYPES: DeviceTypeOption[] = [
  {
    type: "SMART_PLUG",
    label: "Smart Plug",
    icon: "power-socket-eu",
    color: Colors.success,
    gradient: [Colors.success, "#059669"],
    description: "Control power outlets remotely",
  },
  {
    type: "RGB_LIGHT",
    label: "RGB Light",
    icon: "lightbulb",
    color: Colors.warning,
    gradient: [Colors.warning, "#D97706"],
    description: "Smart lighting with colors",
  },
  {
    type: "THERMOSTAT",
    label: "Thermostat",
    icon: "thermometer",
    color: Colors.accent,
    gradient: [Colors.accent, "#0891B2"],
    description: "Temperature control",
  },
  {
    type: "SENSOR",
    label: "Sensor",
    icon: "access-point",
    color: Colors.secondary,
    gradient: [Colors.secondary, "#7C3AED"],
    description: "Environmental monitoring",
  },
];

const SUGGESTED_ROOMS = [
  { name: "Living Room", icon: "sofa", color: Colors.success },
  { name: "Bedroom", icon: "bed", color: Colors.primary },
  { name: "Kitchen", icon: "silverware-fork-knife", color: Colors.warning },
  { name: "Bathroom", icon: "shower", color: Colors.accent },
  { name: "Office", icon: "desk", color: Colors.secondary },
  { name: "Garage", icon: "garage", color: "#64748B" },
  { name: "Garden", icon: "flower", color: "#22C55E" },
  { name: "Dining Room", icon: "table-furniture", color: "#A16207" },
];

type PairingStage =
  | "instruction"
  | "scanning"
  | "connect"
  | "wifi_scan"
  | "network"
  | "provisioning"
  | "success";

type EzStage = "input" | "broadcasting" | "claiming" | "success" | "error";
type ProvisioningMode = "ble" | "ez" | null;
type CloudConfirmPath = "none" | "realtime" | "polling";

const formatCountdown = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const isSmartConfigSupported = (): boolean => {
  try {
    return smartConfigProvisioningService.isSupported();
  } catch {
    return false;
  }
};

const SignalBars = ({ rssi }: { rssi: number }) => {
  const bars = (() => {
    if (rssi >= -50) return 4;
    if (rssi >= -60) return 3;
    if (rssi >= -70) return 2;
    if (rssi >= -85) return 1;
    return 0;
  })();

  return (
    <View style={styles.signalBars}>
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={[
            styles.signalBar,
            {
              height: 4 + i * 2,
              backgroundColor: i <= bars ? Colors.success : "#E2E8F0",
            },
          ]}
        />
      ))}
    </View>
  );
};

const StepIndicator = ({ step }: { step: number }) => {
  return (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map((s) => (
        <View
          key={s}
          style={[
            styles.stepDot,
            {
              backgroundColor: s <= step ? Colors.primary : "#E2E8F0",
              width: s === step ? 24 : 8,
            },
          ]}
        />
      ))}
    </View>
  );
};

export default function AddDeviceModal({
  visible,
  onClose,
  onAdd,
  loading,
  rooms,
  onCreateRoom,
  creatingRoom,
}: AddDeviceModalProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const themeColors = getThemeColors(isDark);
  const { token } = useAuth();

  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<DeviceType | null>(null);
  const [serialNumber, setSerialNumber] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [showNewRoomInput, setShowNewRoomInput] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [scanningQR, setScanningQR] = useState(false);

  const [provisioningMode, setProvisioningMode] = useState<ProvisioningMode>(null);

  // BLE state
  const [pairingStage, setPairingStage] = useState<PairingStage | null>(null);
  const [pairingStartedAt, setPairingStartedAt] = useState<number | null>(null);
  const [pairingDeadlineAt, setPairingDeadlineAt] = useState<number | null>(null);
  const [pairingRemainingSec, setPairingRemainingSec] = useState(180);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [pairingProgressText, setPairingProgressText] = useState<string | null>(null);
  const [nearbyPlugs, setNearbyPlugs] = useState<BleDiscoveredPlug[]>([]);
  const [selectedPlug, setSelectedPlug] = useState<BleDiscoveredPlug | null>(null);
  const [wifiNetworks, setWifiNetworks] = useState<BleWifiNetwork[]>([]);
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [showWifiPassword, setShowWifiPassword] = useState(false);
  const [pairingBusy, setPairingBusy] = useState(false);
  const [manualWifiMode, setManualWifiMode] = useState(false);
  const [manualWifiReason, setManualWifiReason] = useState<string | null>(null);

  // EZ mode state
  const [ezStage, setEzStage] = useState<EzStage>("input");
  const [ezSsid, setEzSsid] = useState("");
  const [ezPassword, setEzPassword] = useState("");
  const [ezBssid, setEzBssid] = useState<string | undefined>(undefined);
  const [ezBroadcasting, setEzBroadcasting] = useState(false);
  const [ezPacketsSent, setEzPacketsSent] = useState(0);
  const [ezError, setEzError] = useState<string | null>(null);

  // Shared provisioning session
  const [provisioningSessionId, setProvisioningSessionId] = useState<string | null>(null);
  const [provisioningToken, setProvisioningToken] = useState<string | null>(null);
  const [cloudConfirmPath, setCloudConfirmPath] = useState<CloudConfirmPath>("none");
  const [cloudConfirmError, setCloudConfirmError] = useState<string | null>(null);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for device illustration
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulseAnim]);

  const resetState = useCallback(() => {
    setStep(1);
    setSelectedType(null);
    setSerialNumber("");
    setDeviceName("");
    setSelectedRoomId(null);
    setShowNewRoomInput(false);
    setNewRoomName("");
    setScanningQR(false);
    setProvisioningMode(null);

    setPairingStage(null);
    setPairingStartedAt(null);
    setPairingDeadlineAt(null);
    setPairingRemainingSec(180);
    setPairingError(null);
    setPairingProgressText(null);
    setNearbyPlugs([]);
    setSelectedPlug(null);
    setWifiNetworks([]);
    setWifiSsid("");
    setWifiPassword("");
    setShowWifiPassword(false);
    setPairingBusy(false);
    setManualWifiMode(false);
    setManualWifiReason(null);

    setEzStage("input");
    setEzSsid("");
    setEzPassword("");
    setEzBssid(undefined);
    setEzBroadcasting(false);
    setEzPacketsSent(0);
    setEzError(null);

    setProvisioningSessionId(null);
    setProvisioningToken(null);
    setCloudConfirmPath("none");
    setCloudConfirmError(null);
  }, []);

  useEffect(() => {
    if (visible) {
      resetState();
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
  }, [visible, resetState, slideAnim, fadeAnim]);

  useEffect(() => {
    if (!pairingDeadlineAt || !pairingStage || pairingStage === "success") {
      return;
    }

    const updateRemaining = () => {
      const left = Math.max(0, Math.ceil((pairingDeadlineAt - Date.now()) / 1000));
      setPairingRemainingSec(left);

      if (left === 0) {
        setPairingError("Pairing timed out after 3 minutes. Please try again.");
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
      const suggestedRoom = SUGGESTED_ROOMS.find(
        (s) => s.name.toLowerCase() === newRoomName.trim().toLowerCase()
      );
      const icon = suggestedRoom?.icon;

      const newRoom = await onCreateRoom(newRoomName.trim(), icon);
      setSelectedRoomId(newRoom.roomId);
      setShowNewRoomInput(false);
      setNewRoomName("");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create room");
    }
  };

  const handleNext = () => {
    if (step === 1 && selectedType) {
      animateStepTransition();
      setStep(2);
    } else if (step === 2 && serialNumber.trim()) {
      setStep(3);
    } else if (step === 3) {
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

  const animateStepTransition = () => {
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
  };

  const isPairingActive = pairingStage && pairingStage !== "success";
  const isEzActive = ezStage === "broadcasting" || ezStage === "claiming";

  const handleBack = () => {
    if (isPairingActive) {
      if (pairingStage === "instruction") {
        setPairingStage(null);
        setProvisioningMode(null);
        return;
      }
      if (pairingStage === "network") {
        setPairingStage("instruction");
        setPairingError(null);
        return;
      }
      if (["scanning", "connect", "wifi_scan"].includes(pairingStage || "")) {
        setPairingStage("instruction");
        setPairingError(null);
        return;
      }
      if (pairingStage === "provisioning") {
        setPairingError("Provisioning is in progress. Please wait a few seconds.");
        return;
      }
    }

    if (isEzActive) {
      setEzError("Broadcasting is in progress. Please wait or close the modal.");
      return;
    }

    if (provisioningMode) {
      setProvisioningMode(null);
      setPairingStage(null);
      setEzStage("input");
      setPairingError(null);
      setEzError(null);
      return;
    }

    if (showNewRoomInput) {
      setShowNewRoomInput(false);
      setNewRoomName("");
      return;
    }

    if (step > 1) {
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
          SMART_PLUG: "SMART_PLUG",
          RGB_LIGHT: "RGB_LIGHT",
          THERMOSTAT: "THERMOSTAT",
          SENSOR: "SENSOR",
          SmartPlug: "SMART_PLUG",
          SmartBulb: "RGB_LIGHT",
          SmartSwitch: "SMART_PLUG",
          Thermostat: "THERMOSTAT",
          Sensor: "SENSOR",
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

  const createProvisioningSession = async (): Promise<{
    sessionId: string;
    sessionToken: string;
  }> => {
    if (!token) {
      throw new Error("Please log in again before starting pairing.");
    }

    const response = await fetch(`${API_BASE_URL}/provisioning/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        deviceType: selectedType || "SMART_PLUG",
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(
        payload?.error || payload?.message || "Failed to start pairing session."
      );
    }

    const data = await response.json();
    setProvisioningSessionId(data.id);
    setProvisioningToken(data.provisioningToken);
    return {
      sessionId: data.id,
      sessionToken: data.provisioningToken,
    };
  };

  const waitForCloudClaimPolling = async (
    sessionId: string,
    timeoutMs = 45_000
  ) => {
    if (!token) {
      throw new Error("Authentication expired. Please log in and retry.");
    }

    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const response = await fetch(
        `${API_BASE_URL}/provisioning/session/${sessionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data?.status === "claimed" || data?.status === "registered") {
          return;
        }
        if (data?.status === "failed" || data?.status === "expired") {
          throw new Error(
            data?.error || "Pairing session failed before cloud registration."
          );
        }
      }

      await sleep(1200);
    }

    throw new Error(
      "Cloud registration timed out. Keep the plug powered and retry."
    );
  };

  const waitForCloudClaimRealtime = async (sessionId: string) => {
    if (!token) {
      throw new Error("Authentication expired. Please log in and retry.");
    }

    let finished = false;

    await realtimeService.connect(token).catch(() => {
      throw new Error("Realtime connection unavailable. Falling back to polling...");
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!finished) {
          cleanup();
          reject(
            new Error("Realtime confirmation timed out. Falling back to polling...")
          );
        }
      }, 20_000);

      const cleanup = () => {
        clearTimeout(timeout);
        unsubscribeClaimed();
        unsubscribePhase();
      };

      const unsubscribeClaimed = realtimeService.subscribe(
        "provisioning-claimed",
        (payload) => {
          if (payload?.sessionId === sessionId) {
            finished = true;
            cleanup();
            resolve();
          }
        }
      );

      const unsubscribePhase = realtimeService.subscribe(
        "provisioning-phase",
        (payload) => {
          if (payload?.sessionId !== sessionId) {
            return;
          }

          if (payload?.status === "claimed") {
            finished = true;
            cleanup();
            resolve();
            return;
          }

          if (payload?.status === "failed" || payload?.status === "expired") {
            finished = true;
            cleanup();
            reject(
              new Error(
                payload?.error || "Pairing session failed before cloud registration."
              )
            );
          }
        }
      );
    });
  };

  const waitForCloudClaim = async (sessionId: string) => {
    try {
      await waitForCloudClaimRealtime(sessionId);
      setCloudConfirmPath("realtime");
      setCloudConfirmError(null);
    } catch {
      setCloudConfirmPath("polling");
      setPairingProgressText("Waiting for cloud confirmation...");
      await waitForCloudClaimPolling(sessionId, 30_000);
      setCloudConfirmError(null);
    }
  };

  const prefillPhoneWifiIfAvailable = async () => {
    try {
      const current = await getCurrentWiFiSSID();
      if (current?.trim()) {
        setWifiSsid(current.trim());
      }
      const netInfo = await NetInfo.fetch();
      const details = netInfo.details as any;
      if (details?.bssid) {
        setEzBssid(details.bssid);
      }
    } catch {
      // best effort only
    }
  };

  const beginPairingFlow = () => {
    const started = Date.now();
    setPairingStartedAt(started);
    setPairingDeadlineAt(started + 180 * 1000);
    setPairingRemainingSec(180);
    setPairingStage("instruction");
    setPairingError(null);
    setPairingProgressText(null);
    setNearbyPlugs([]);
    setSelectedPlug(null);
    setWifiNetworks([]);
    setWifiSsid("");
    setWifiPassword("");
    setShowWifiPassword(false);
    setPairingBusy(false);
    setManualWifiMode(false);
    setManualWifiReason(null);
    setCloudConfirmPath("none");
    setCloudConfirmError(null);
    setProvisioningSessionId(null);
    setProvisioningToken(null);
    prefillPhoneWifiIfAvailable();
  };

  const scanNearbyPlugs = async () => {
    if (!serialNumber.trim()) {
      setPairingError("Please enter your plug serial number first.");
      return;
    }

    setPairingStage("scanning");
    setPairingBusy(true);
    setPairingError(null);
    setPairingProgressText("Scanning devices nearby...");

    try {
      const plugs = await bleProvisioningService.discoverPlugs(serialNumber.trim());
      setNearbyPlugs(plugs);

      if (plugs.length === 0) {
        setPairingError(
          "No nearby plug found. Keep your phone close to the plug and retry."
        );
        setPairingBusy(false);
        return;
      }

      const firstPlug = plugs[0];
      setSelectedPlug(firstPlug);
      setPairingProgressText(`Found ${firstPlug.name}. Connecting...`);
      await connectPlugAndLoadWifi(firstPlug);
    } catch (err: any) {
      setPairingError(err?.message || "Bluetooth scan failed. Please try again.");
      setPairingStage("instruction");
      setPairingBusy(false);
    }
  };

  const connectPlugAndLoadWifi = async (plug: BleDiscoveredPlug) => {
    setPairingBusy(true);
    setPairingStage("connect");
    setPairingError(null);

    try {
      setPairingProgressText(`Connected to ${plug.name}.`);
      await sleep(350);

      setPairingStage("wifi_scan");
      setPairingProgressText("Scanning nearby Wi-Fi networks...");
      const networks = await bleProvisioningService.scanWifiNetworks(
        plug.serialNumber,
        plug.id
      );
      const sorted = [...networks].sort((a, b) => {
        if (a.band === "2.4GHz" && b.band !== "2.4GHz") return -1;
        if (a.band !== "2.4GHz" && b.band === "2.4GHz") return 1;
        return b.rssi - a.rssi;
      });
      setWifiNetworks(sorted);
      const recommended = sorted.find((n) => n.band === "2.4GHz") || sorted[0];
      setWifiSsid(recommended?.ssid || "");

      if (sorted.length === 0) {
        const scanDebug = bleProvisioningService.getDebugSnapshot().lastWifiScan;
        const scanError = scanDebug?.error?.toLowerCase() || "";

        if (scanError.includes("rejected") || scanError.includes("not_supported")) {
          setPairingError(
            "This plug firmware does not expose Wi-Fi scan over BLE. Enter SSID/password manually to continue."
          );
          setManualWifiMode(true);
          setManualWifiReason("firmware_not_supported");
        } else {
          setPairingError(
            "No Wi-Fi list returned by device. Enter SSID manually or scan again."
          );
          setManualWifiMode(false);
          setManualWifiReason(null);
        }

        await prefillPhoneWifiIfAvailable();
      } else {
        setManualWifiMode(false);
        setManualWifiReason(null);
      }

      setPairingStage("network");
      setPairingProgressText(null);
    } catch (err: any) {
      setPairingError(err?.message || "Failed to connect to plug. Retry scanning.");
      setPairingStage("instruction");
    } finally {
      setPairingBusy(false);
    }
  };

  const submitWifiProvisioning = async () => {
    if (!selectedPlug) {
      setPairingError("No plug selected. Start scan again.");
      return;
    }
    if (!wifiSsid.trim() || wifiPassword.trim().length < 8) {
      setPairingError("Enter a valid Wi-Fi name and password (8+ characters).");
      return;
    }
    setPairingBusy(true);
    setPairingStage("provisioning");
    setPairingError(null);

    try {
      let sessionId = provisioningSessionId;
      let sessionToken = provisioningToken;

      if (!sessionId || !sessionToken) {
        setPairingProgressText("Preparing secure pairing session...");
        const session = await createProvisioningSession();
        sessionId = session.sessionId;
        sessionToken = session.sessionToken;
      }

      if (!sessionId || !sessionToken) {
        throw new Error("Could not initialize pairing session. Please retry.");
      }

      setPairingProgressText("Sending Wi-Fi credentials securely...");
      const provisionResult = await bleProvisioningService.provisionDevice({
        serialNumber: selectedPlug.serialNumber,
        deviceId: selectedPlug.id,
        ssid: wifiSsid.trim(),
        password: wifiPassword,
        token: sessionToken,
      });

      if (!provisionResult.ackReceived) {
        setPairingProgressText(
          "Credentials sent. Waiting for device/cloud confirmation..."
        );
      } else {
        setPairingProgressText("Plug is connecting to Wi-Fi and cloud...");
      }

      await waitForCloudClaim(sessionId);

      setPairingBusy(false);
      setPairingStage("success");
    } catch (err: any) {
      setPairingBusy(false);
      setPairingStage("network");
      setCloudConfirmError(err?.message || "cloud_confirmation_error");
      setPairingError(err?.message || "Failed to send credentials. Please retry.");
    }
  };

  const startEzProvisioning = async () => {
    if (!serialNumber.trim()) {
      setEzError("Please enter your device serial number first.");
      return;
    }
    if (!ezSsid.trim() || ezPassword.trim().length < 8) {
      setEzError("Enter a valid Wi-Fi name and password (8+ characters).");
      return;
    }
    if (!isSmartConfigSupported()) {
      setEzError(
        "EZ mode is not supported on this platform. Use BLE mode or a native build."
      );
      return;
    }

    setEzError(null);
    setEzBroadcasting(true);
    setEzStage("broadcasting");
    setEzPacketsSent(0);

    try {
      let sessionId = provisioningSessionId;
      let sessionToken = provisioningToken;

      if (!sessionId || !sessionToken) {
        const session = await createProvisioningSession();
        sessionId = session.sessionId;
        sessionToken = session.sessionToken;
      }

      if (!sessionId || !sessionToken) {
        throw new Error("Could not initialize pairing session. Please retry.");
      }

      const result = await smartConfigProvisioningService.start({
        ssid: ezSsid.trim(),
        password: ezPassword,
        bssid: ezBssid,
        token: sessionToken,
      });

      setEzPacketsSent(result.packetsSent);

      if (result.error) {
        throw new Error(result.error);
      }

      setEzStage("claiming");
      setPairingProgressText("Broadcast complete. Waiting for cloud confirmation...");
      await waitForCloudClaim(sessionId);
      setEzStage("success");
    } catch (err: any) {
      setEzError(err?.message || "EZ mode failed. Please try again.");
      setEzStage("error");
    } finally {
      setEzBroadcasting(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: themeColors.text }]}>
        Select Device Type
      </Text>
      <Text style={[styles.stepSubtitle, { color: themeColors.textSecondary }]}>
        What kind of device are you adding?
      </Text>

      <View style={styles.deviceTypesGrid}>
        {DEVICE_TYPES.map((deviceType) => (
          <TouchableOpacity
            key={deviceType.type}
            activeOpacity={0.7}
            onPress={() => setSelectedType(deviceType.type)}
            style={styles.deviceTypeCardWrapper}
          >
            <LinearGradient
              colors={
                selectedType === deviceType.type
                  ? deviceType.gradient
                  : isDark
                  ? ["#2a2a2a", "#1a1a1a"]
                  : ["#f8f8f8", "#eee"]
              }
              style={[
                styles.deviceTypeCard,
                selectedType === deviceType.type && styles.deviceTypeCardSelected,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View
                style={[
                  styles.deviceTypeIconBg,
                  {
                    backgroundColor:
                      selectedType === deviceType.type
                        ? "rgba(255,255,255,0.2)"
                        : `${deviceType.color}20`,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={deviceType.icon}
                  size={28}
                  color={
                    selectedType === deviceType.type ? "#fff" : deviceType.color
                  }
                />
              </View>
              <Text
                style={[
                  styles.deviceTypeLabel,
                  {
                    color:
                      selectedType === deviceType.type
                        ? "#fff"
                        : themeColors.text,
                  },
                ]}
              >
                {deviceType.label}
              </Text>
              <Text
                style={[
                  styles.deviceTypeDesc,
                  {
                    color:
                      selectedType === deviceType.type
                        ? "rgba(255,255,255,0.8)"
                        : themeColors.textTertiary,
                  },
                ]}
                numberOfLines={2}
              >
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

  const renderModeSelection = () => {
    const bleSupported = bleProvisioningService.isSupported();
    const ezSupported = isSmartConfigSupported();

    return (
      <View style={styles.modeSelectionContainer}>
        <Text style={[styles.modeSelectionTitle, { color: themeColors.text }]}>
          Choose Pairing Mode
        </Text>
        <Text
          style={[styles.modeSelectionSubtitle, { color: themeColors.textSecondary }]}
        >
          BLE is recommended for the most reliable setup.
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (!bleSupported) {
              Alert.alert(
                "Bluetooth Not Available",
                "BLE mode requires a native build with react-native-ble-plx."
              );
              return;
            }
            setProvisioningMode("ble");
            beginPairingFlow();
          }}
          style={[
            styles.modeCard,
            {
              backgroundColor: isDark ? "#1E293B" : "#fff",
              borderColor: isDark ? "#334155" : "#E2E8F0",
            },
          ]}
        >
          <LinearGradient
            colors={["#5B6EF5", "#8B5CF6"]}
            style={styles.modeIconCircle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="bluetooth" size={24} color="#fff" />
          </LinearGradient>
          <View style={styles.modeTextContainer}>
            <Text style={[styles.modeCardTitle, { color: themeColors.text }]}>
              Bluetooth (BLE)
            </Text>
            <Text
              style={[
                styles.modeCardSubtitle,
                { color: themeColors.textSecondary },
              ]}
            >
              {bleSupported
                ? "Fast and reliable. Recommended."
                : "Requires native build."}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={themeColors.textTertiary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (!ezSupported) {
              Alert.alert(
                "EZ Mode Not Available",
                "EZ mode requires react-native-udp and a native iOS/Android build."
              );
              return;
            }
            setProvisioningMode("ez");
            setEzStage("input");
            prefillPhoneWifiIfAvailable();
          }}
          style={[
            styles.modeCard,
            {
              backgroundColor: isDark ? "#1E293B" : "#fff",
              borderColor: isDark ? "#334155" : "#E2E8F0",
            },
          ]}
        >
          <LinearGradient
            colors={["#0F766E", "#14B8A6"]}
            style={styles.modeIconCircle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="wifi" size={24} color="#fff" />
          </LinearGradient>
          <View style={styles.modeTextContainer}>
            <Text style={[styles.modeCardTitle, { color: themeColors.text }]}>
              EZ Mode (SmartConfig)
            </Text>
            <Text
              style={[
                styles.modeCardSubtitle,
                { color: themeColors.textSecondary },
              ]}
            >
              {ezSupported
                ? "Broadcast credentials over UDP."
                : "Requires native build."}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={themeColors.textTertiary}
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderBleFlow = () => (
    <View style={[styles.pairingCard, { backgroundColor: isDark ? "#181A24" : "#F8FAFF" }]}>
      <View style={styles.pairingHeaderRow}>
        <Text style={[styles.pairingTitle, { color: themeColors.text }]}>
          Smart Plug Pairing
        </Text>
        {pairingStage && pairingStage !== "success" && (
          <View style={styles.timeoutBadge}>
            <Ionicons name="time-outline" size={14} color={Colors.primary} />
            <Text style={styles.timeoutText}>
              {formatCountdown(pairingRemainingSec)}
            </Text>
          </View>
        )}
      </View>

      {pairingStage === "instruction" && (
        <View style={styles.pairingSection}>
          <View style={styles.illustrationContainer}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <LinearGradient
                colors={DEVICE_TYPES[0].gradient}
                style={styles.illustrationCircle}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons
                  name="power-socket-eu"
                  size={48}
                  color="rgba(255,255,255,0.9)"
                />
              </LinearGradient>
            </Animated.View>
            <View style={styles.pulseRing} />
          </View>

          <Text style={[styles.pairingBodyText, { color: themeColors.textSecondary }]}>
            1. Plug in your device and wait for the LED to blink rapidly.
          </Text>
          <Text
            style={[
              styles.pairingBodyText,
              { color: themeColors.textSecondary, marginTop: 8 },
            ]}
          >
            2. Keep your phone within 1 meter of the device.
          </Text>
          <Text
            style={[
              styles.pairingBodyText,
              { color: themeColors.textSecondary, marginTop: 8 },
            ]}
          >
            3. Press the button below to scan and connect.
          </Text>

          <TouchableOpacity
            style={[styles.pairingActionButton, pairingBusy && { opacity: 0.7 }]}
            onPress={scanNearbyPlugs}
            disabled={pairingBusy}
          >
            <Ionicons name="search" size={18} color="#fff" />
            <Text style={styles.pairingActionText}>Scan Devices Nearby</Text>
          </TouchableOpacity>
        </View>
      )}

      {(pairingStage === "scanning" ||
        pairingStage === "connect" ||
        pairingStage === "wifi_scan") && (
        <View style={styles.pairingSection}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text
            style={[
              styles.pairingBodyText,
              { color: themeColors.textSecondary, marginTop: 12, textAlign: "center" },
            ]}
          >
            {pairingProgressText || "Scanning devices nearby..."}
          </Text>
          {nearbyPlugs.length > 0 && (
            <View style={styles.plugList}>
              {nearbyPlugs.slice(0, 3).map((plug) => (
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
                    <Text style={styles.plugMeta}>
                      {plug.serialNumber} • RSSI {plug.rssi}
                    </Text>
                  </View>
                  <Text style={styles.plugConnectText}>Connect</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {pairingStage === "network" && (
        <View style={styles.pairingSection}>
          <Text
            style={[
              styles.pairingBodyText,
              { color: themeColors.textSecondary, marginBottom: 8 },
            ]}
          >
            Select your 2.4GHz Wi-Fi network
          </Text>

          {manualWifiMode && (
            <View style={styles.manualModeBanner}>
              <Ionicons name="construct-outline" size={14} color="#7C3AED" />
              <Text style={styles.manualModeText}>
                {manualWifiReason === "firmware_not_supported"
                  ? "Manual Wi-Fi mode (firmware limitation)"
                  : "Manual Wi-Fi mode"}
              </Text>
            </View>
          )}

          {wifiNetworks.length === 0 && !manualWifiMode && (
            <Text
              style={[
                styles.manualHintText,
                { color: themeColors.textSecondary },
              ]}
            >
              No networks listed. You can still type your SSID manually.
            </Text>
          )}

          {!manualWifiMode && wifiNetworks.length > 0 && (
            <ScrollView
              style={styles.networkList}
              showsVerticalScrollIndicator={false}
            >
              {wifiNetworks.slice(0, 8).map((net) => {
                const selected = wifiSsid === net.ssid;
                return (
                  <TouchableOpacity
                    key={`${net.ssid}-${net.rssi}`}
                    style={[
                      styles.networkRow,
                      selected && styles.networkRowActive,
                    ]}
                    onPress={() => setWifiSsid(net.ssid)}
                  >
                    <SignalBars rssi={net.rssi} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.networkName}>{net.ssid}</Text>
                      <Text style={styles.networkMeta}>
                        {net.band} • RSSI {net.rssi}
                      </Text>
                    </View>
                    {net.band === "2.4GHz" && (
                      <Text style={styles.recommendedChip}>2.4GHz</Text>
                    )}
                    {selected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={Colors.primary}
                        style={{ marginLeft: 8 }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <TextInput
            style={[
              styles.pairingInput,
              {
                color: themeColors.text,
                borderColor: themeColors.border,
                backgroundColor: isDark ? "#0F172A" : "#fff",
              },
            ]}
            placeholder="Wi-Fi Account (SSID)"
            placeholderTextColor={themeColors.textTertiary}
            value={wifiSsid}
            onChangeText={setWifiSsid}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View
            style={[
              styles.passwordRow,
              {
                borderColor: themeColors.border,
                backgroundColor: isDark ? "#0F172A" : "#fff",
              },
            ]}
          >
            <TextInput
              style={[styles.passwordInputText, { color: themeColors.text }]}
              placeholder="Wi-Fi Password"
              placeholderTextColor={themeColors.textTertiary}
              value={wifiPassword}
              onChangeText={setWifiPassword}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!showWifiPassword}
            />
            <TouchableOpacity onPress={() => setShowWifiPassword((prev) => !prev)}>
              <Text style={styles.showHideText}>
                {showWifiPassword ? "Hide" : "Show"}
              </Text>
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

      {pairingStage === "provisioning" && (
        <View style={[styles.pairingSection, { alignItems: "center" }]}>
          <View style={styles.circleProgressOuter}>
            <View style={styles.circleProgressInner}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          </View>
          <Text
            style={[
              styles.pairingBodyText,
              {
                color: themeColors.textSecondary,
                marginTop: 14,
                textAlign: "center",
              },
            ]}
          >
            {pairingProgressText || "Connecting your plug..."}
          </Text>
          {cloudConfirmPath === "polling" && (
            <Text
              style={[
                styles.pairingBodyText,
                {
                  color: themeColors.textTertiary,
                  marginTop: 8,
                  fontSize: 12,
                  textAlign: "center",
                },
              ]}
            >
              Using polling fallback. This may take a moment.
            </Text>
          )}
        </View>
      )}

      {pairingStage === "success" && (
        <View style={[styles.pairingSection, { alignItems: "center" }]}>
          <View style={styles.successBubble}>
            <Ionicons name="checkmark" size={26} color="#fff" />
          </View>
          <Text style={[styles.successTitle, { color: themeColors.text }]}>
            Plug connected successfully
          </Text>
          <Text
            style={[
              styles.pairingBodyText,
              { color: themeColors.textSecondary, textAlign: "center" },
            ]}
          >
            Continue with room assignment and device naming.
          </Text>
          <TouchableOpacity
            style={styles.pairingActionButton}
            onPress={() => {
              setPairingStage(null);
              setProvisioningMode(null);
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
        <View
          style={[
            styles.debugPanel,
            {
              backgroundColor: isDark ? "#0F172A" : "#EEF2FF",
              borderColor: isDark ? "#334155" : "rgba(91,110,245,0.35)",
            },
          ]}
        >
          <Text style={styles.debugTitle}>Debug (dev only)</Text>
          <Text style={styles.debugLine}>Stage: {pairingStage}</Text>
          <Text style={styles.debugLine}>Cloud path: {cloudConfirmPath}</Text>
          {!!cloudConfirmError && (
            <Text style={styles.debugLine}>Cloud error: {cloudConfirmError}</Text>
          )}
          {(() => {
            const snap = bleProvisioningService.getDebugSnapshot();
            return (
              <>
                <Text style={styles.debugLine}>
                  WiFi payload: {snap.lastWifiScan?.payloadShape || "n/a"}
                </Text>
                <Text style={styles.debugLine}>
                  WiFi list count: {snap.lastWifiScan?.networkCount ?? 0}
                </Text>
                <Text style={styles.debugLine}>
                  WiFi msgId: {snap.lastWifiScan?.msgId || "n/a"}
                </Text>
                <Text style={styles.debugLine}>
                  Manual WiFi mode: {String(manualWifiMode)}
                </Text>
                <Text style={styles.debugLine}>
                  ACK received: {String(snap.lastProvision?.ackReceived ?? false)}
                </Text>
                <Text style={styles.debugLine}>
                  ACK attempts: {snap.lastProvision?.ackAttempts ?? 0}
                </Text>
                <Text style={styles.debugLine}>
                  Provision msgId: {snap.lastProvision?.msgId || "n/a"}
                </Text>
                {!!snap.lastWifiScan?.error && (
                  <Text style={styles.debugLine}>
                    WiFi error: {snap.lastWifiScan.error}
                  </Text>
                )}
                {!!snap.lastProvision?.error && (
                  <Text style={styles.debugLine}>
                    ACK error: {snap.lastProvision.error}
                  </Text>
                )}
              </>
            );
          })()}
        </View>
      )}
    </View>
  );

  const renderEzFlow = () => (
    <View style={[styles.pairingCard, { backgroundColor: isDark ? "#181A24" : "#F8FAFF" }]}>
      <View style={styles.pairingHeaderRow}>
        <Text style={[styles.pairingTitle, { color: themeColors.text }]}>
          EZ Mode (SmartConfig)
        </Text>
      </View>

      {ezStage === "input" && (
        <View style={styles.pairingSection}>
          <Text style={[styles.pairingBodyText, { color: themeColors.textSecondary }]}>
            Enter your 2.4GHz Wi-Fi credentials. Your phone will broadcast them
            securely to the device.
          </Text>

          <View style={[styles.inputWrapper, { backgroundColor: themeColors.surfaceVariant }]}>
            <Ionicons name="wifi-outline" size={22} color={themeColors.textTertiary} />
            <TextInput
              style={[styles.textInput, { color: themeColors.text }]}
              placeholder="Wi-Fi Account (SSID)"
              placeholderTextColor={themeColors.textTertiary}
              value={ezSsid}
              onChangeText={setEzSsid}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View
            style={[
              styles.passwordRow,
              {
                borderColor: themeColors.border,
                backgroundColor: isDark ? "#0F172A" : "#fff",
              },
            ]}
          >
            <TextInput
              style={[styles.passwordInputText, { color: themeColors.text }]}
              placeholder="Wi-Fi Password"
              placeholderTextColor={themeColors.textTertiary}
              value={ezPassword}
              onChangeText={setEzPassword}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!showWifiPassword}
            />
            <TouchableOpacity onPress={() => setShowWifiPassword((prev) => !prev)}>
              <Text style={styles.showHideText}>
                {showWifiPassword ? "Hide" : "Show"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.pairingActionButton, ezBroadcasting && { opacity: 0.7 }]}
            onPress={startEzProvisioning}
            disabled={ezBroadcasting}
          >
            <MaterialCommunityIcons name="broadcast" size={18} color="#fff" />
            <Text style={styles.pairingActionText}>Start Broadcasting</Text>
          </TouchableOpacity>

          {!isSmartConfigSupported() && (
            <View style={styles.pairingErrorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.warning} />
              <Text style={[styles.pairingErrorText, { color: Colors.warning }]}>
                EZ mode requires react-native-udp and a native build. Use BLE mode
                instead.
              </Text>
            </View>
          )}
        </View>
      )}

      {ezStage === "broadcasting" && (
        <View style={[styles.pairingSection, { alignItems: "center" }]}>
          <View style={styles.illustrationContainer}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <LinearGradient
                colors={["#0F766E", "#14B8A6"]}
                style={styles.illustrationCircle}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="wifi" size={48} color="#fff" />
              </LinearGradient>
            </Animated.View>
            <View style={styles.pulseRing} />
          </View>
          <Text
            style={[
              styles.pairingBodyText,
              { color: themeColors.textSecondary, marginTop: 16, textAlign: "center" },
            ]}
          >
            Broadcasting Wi-Fi credentials to your device...
          </Text>
          <Text
            style={[
              styles.pairingBodyText,
              {
                color: themeColors.textTertiary,
                marginTop: 8,
                fontSize: 12,
                textAlign: "center",
              },
            ]}
          >
            Keep your phone close to the device. Packets sent: {ezPacketsSent}
          </Text>
          <ActivityIndicator style={{ marginTop: 16 }} size="small" color={Colors.primary} />
        </View>
      )}

      {ezStage === "claiming" && (
        <View style={[styles.pairingSection, { alignItems: "center" }]}>
          <View style={styles.circleProgressOuter}>
            <View style={styles.circleProgressInner}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          </View>
          <Text
            style={[
              styles.pairingBodyText,
              { color: themeColors.textSecondary, marginTop: 14, textAlign: "center" },
            ]}
          >
            Broadcast complete. Waiting for cloud confirmation...
          </Text>
        </View>
      )}

      {ezStage === "success" && (
        <View style={[styles.pairingSection, { alignItems: "center" }]}>
          <View style={styles.successBubble}>
            <Ionicons name="checkmark" size={26} color="#fff" />
          </View>
          <Text style={[styles.successTitle, { color: themeColors.text }]}>
            Device connected successfully
          </Text>
          <Text
            style={[
              styles.pairingBodyText,
              { color: themeColors.textSecondary, textAlign: "center" },
            ]}
          >
            Continue with room assignment and device naming.
          </Text>
          <TouchableOpacity
            style={styles.pairingActionButton}
            onPress={() => {
              setEzStage("input");
              setProvisioningMode(null);
              setStep(3);
            }}
          >
            <Ionicons name="arrow-forward" size={18} color="#fff" />
            <Text style={styles.pairingActionText}>Continue Setup</Text>
          </TouchableOpacity>
        </View>
      )}

      {(ezStage === "error" || !!ezError) && (
        <View style={styles.pairingSection}>
          <View style={styles.pairingErrorBox}>
            <Ionicons name="alert-circle" size={16} color={Colors.error} />
            <Text style={styles.pairingErrorText}>
              {ezError || "EZ mode failed. Please try again."}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.pairingActionButton}
            onPress={() => {
              setEzError(null);
              setEzStage("input");
            }}
          >
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.pairingActionText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: themeColors.text }]}>
        Device Serial Number
      </Text>
      <Text style={[styles.stepSubtitle, { color: themeColors.textSecondary }]}>
        Enter the serial number or scan the QR code on your device
      </Text>

      <View style={styles.inputContainer}>
        <View
          style={[
            styles.inputWrapper,
            { backgroundColor: themeColors.surfaceVariant },
          ]}
        >
          <MaterialCommunityIcons
            name="barcode-scan"
            size={24}
            color={themeColors.textTertiary}
          />
          <TextInput
            style={[styles.textInput, { color: themeColors.text }]}
            placeholder="e.g., SP-B0A7322BCC90"
            placeholderTextColor={themeColors.textTertiary}
            value={serialNumber}
            onChangeText={setSerialNumber}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {Platform.OS !== "web" && (
            <TouchableOpacity
              onPress={() => setScanningQR(true)}
              style={styles.qrButton}
              activeOpacity={0.7}
            >
              <Ionicons name="qr-code" size={24} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.inputHint, { color: themeColors.textTertiary }]}>
          Usually found on the device label or packaging
        </Text>
      </View>

      {serialNumber.trim() && !scanningQR && !provisioningMode && (
        <>{renderModeSelection()}</>
      )}

      {provisioningMode === "ble" && renderBleFlow()}
      {provisioningMode === "ez" && renderEzFlow()}

      {/* Visual pattern decoration */}
      {!scanningQR && !provisioningMode && (
        <View style={styles.patternContainer}>
          <LinearGradient
            colors={
              DEVICE_TYPES.find((t) => t.type === selectedType)?.gradient || [
                "#4CAF50",
                "#2E7D32",
              ]
            }
            style={styles.patternBox}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialCommunityIcons
              name={
                DEVICE_TYPES.find((t) => t.type === selectedType)?.icon ||
                "power-socket-eu"
              }
              size={60}
              color="rgba(255,255,255,0.3)"
            />
          </LinearGradient>
        </View>
      )}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: themeColors.text }]}>
        {showNewRoomInput ? "Create New Room" : "Assign to Room"}
      </Text>
      <Text style={[styles.stepSubtitle, { color: themeColors.textSecondary }]}>
        {showNewRoomInput
          ? "Select a suggestion or enter a custom name"
          : "Choose which room this device belongs to (Optional)"}
      </Text>

      {showNewRoomInput ? (
        <View style={styles.newRoomContainer}>
          <Text style={[styles.suggestedLabel, { color: themeColors.textSecondary }]}>
            Quick Select
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.suggestedRoomsScroll}
            contentContainerStyle={styles.suggestedRoomsContainer}
          >
            {SUGGESTED_ROOMS.filter(
              (suggestion) =>
                !rooms.some(
                  (r) => r.name.toLowerCase() === suggestion.name.toLowerCase()
                )
            ).map((suggestion) => (
              <TouchableOpacity
                key={suggestion.name}
                style={[
                  styles.suggestedRoomCard,
                  {
                    backgroundColor:
                      newRoomName === suggestion.name
                        ? "rgba(91, 110, 245, 0.15)"
                        : themeColors.surfaceVariant,
                    borderColor:
                      newRoomName === suggestion.name
                        ? Colors.primary
                        : "transparent",
                  },
                ]}
                onPress={() => setNewRoomName(suggestion.name)}
              >
                <View
                  style={[
                    styles.suggestedRoomIcon,
                    { backgroundColor: suggestion.color },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={suggestion.icon as any}
                    size={20}
                    color="#fff"
                  />
                </View>
                <Text style={[styles.suggestedRoomName, { color: themeColors.text }]}>
                  {suggestion.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text
            style={[
              styles.suggestedLabel,
              { color: themeColors.textSecondary, marginTop: 16 },
            ]}
          >
            Or enter custom name
          </Text>
          <View
            style={[
              styles.inputWrapper,
              { backgroundColor: themeColors.surfaceVariant },
            ]}
          >
            <MaterialCommunityIcons
              name="door"
              size={24}
              color={themeColors.textTertiary}
            />
            <TextInput
              style={[styles.textInput, { color: themeColors.text }]}
              placeholder="e.g., Guest Room, Office..."
              placeholderTextColor={themeColors.textTertiary}
              value={newRoomName}
              onChangeText={setNewRoomName}
            />
            {newRoomName.length > 0 && (
              <TouchableOpacity onPress={() => setNewRoomName("")}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={themeColors.textTertiary}
                />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.createRoomButton,
              {
                backgroundColor: newRoomName.trim() ? Colors.primary : "#888",
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
        <View style={styles.roomsGrid}>
          <TouchableOpacity
            style={[
              styles.roomCard,
              {
                backgroundColor:
                  selectedRoomId === null
                    ? "rgba(91, 110, 245, 0.15)"
                    : themeColors.surfaceVariant,
                borderColor: selectedRoomId === null ? Colors.primary : "transparent",
                borderWidth: 2,
              },
            ]}
            onPress={() => setSelectedRoomId(null)}
          >
            <View style={[styles.roomIconContainer, { backgroundColor: "#9E9E9E" }]}>
              <MaterialCommunityIcons name="skip-forward" size={28} color="#fff" />
            </View>
            <Text style={[styles.roomName, { color: themeColors.text }]}>
              Skip for now
            </Text>
            {selectedRoomId === null && (
              <View style={styles.roomCheckmark}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
              </View>
            )}
          </TouchableOpacity>

          {rooms.map((room) => {
            const isSelected = selectedRoomId !== null && selectedRoomId === room.roomId;
            return (
              <TouchableOpacity
                key={room.roomId}
                style={[
                  styles.roomCard,
                  {
                    backgroundColor: isSelected
                      ? "rgba(91, 110, 245, 0.15)"
                      : themeColors.surfaceVariant,
                    borderColor: isSelected ? Colors.primary : "transparent",
                    borderWidth: 2,
                  },
                ]}
                onPress={() => setSelectedRoomId(room.roomId)}
              >
                <View style={[styles.roomIconContainer, { backgroundColor: Colors.primary }]}>
                  <MaterialCommunityIcons
                    name={(room.icon || "door") as any}
                    size={28}
                    color="#fff"
                  />
                </View>
                <Text style={[styles.roomName, { color: themeColors.text }]}>
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

          <TouchableOpacity
            style={[
              styles.roomCard,
              {
                backgroundColor: themeColors.surfaceVariant,
                borderColor: Colors.secondary,
                borderWidth: 2,
                borderStyle: "dashed",
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

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: themeColors.text }]}>
        Name Your Device
      </Text>
      <Text style={[styles.stepSubtitle, { color: themeColors.textSecondary }]}>
        Give your device a friendly name
      </Text>

      <View style={styles.inputContainer}>
        <View
          style={[
            styles.inputWrapper,
            { backgroundColor: themeColors.surfaceVariant },
          ]}
        >
          <MaterialCommunityIcons
            name="tag-outline"
            size={24}
            color={themeColors.textTertiary}
          />
          <TextInput
            style={[styles.textInput, { color: themeColors.text }]}
            placeholder="e.g., Living Room Lamp"
            placeholderTextColor={themeColors.textTertiary}
            value={deviceName}
            onChangeText={setDeviceName}
          />
        </View>
      </View>

      <View style={styles.previewContainer}>
        <Text style={[styles.previewLabel, { color: themeColors.textSecondary }]}>
          Preview
        </Text>
        <LinearGradient
          colors={
            DEVICE_TYPES.find((t) => t.type === selectedType)?.gradient || [
              "#4CAF50",
              "#2E7D32",
            ]
          }
          style={styles.previewCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.previewIconContainer}>
            <MaterialCommunityIcons
              name={
                DEVICE_TYPES.find((t) => t.type === selectedType)?.icon ||
                "power-socket-eu"
              }
              size={32}
              color="#fff"
            />
          </View>
          <View style={styles.previewInfo}>
            <Text style={styles.previewName}>{deviceName || "Device Name"}</Text>
            <Text style={styles.previewSerial}>{serialNumber}</Text>
            <Text style={styles.previewType}>
              {DEVICE_TYPES.find((t) => t.type === selectedType)?.label}
            </Text>
            <Text style={styles.previewRoom}>
              {selectedRoomId !== null
                ? rooms.find((r) => r.roomId === selectedRoomId)?.name || "Unknown Room"
                : "No Room"}
            </Text>
          </View>
        </LinearGradient>
      </View>
    </View>
  );

  const canContinue = (() => {
    if (step === 1) return !!selectedType;
    if (step === 2) return !!serialNumber.trim() && !provisioningMode;
    if (step === 3) return true;
    if (step === 4) return !!deviceName.trim();
    return false;
  })();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />

        <Animated.View
          style={[
            styles.modalContent,
            {
              backgroundColor: themeColors.surface,
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
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: themeColors.border },
            ]}
          >
            <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
              <Ionicons
                name={step === 1 ? "close" : "arrow-back"}
                size={24}
                color={themeColors.text}
              />
            </TouchableOpacity>

            <StepIndicator step={step} />

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
          <View
            style={[
              styles.modalFooter,
              { borderTopColor: themeColors.border },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.nextButton,
                {
                  opacity: provisioningMode ? 0.5 : 1,
                  backgroundColor: canContinue ? Colors.primary : "#888",
                },
              ]}
              onPress={handleNext}
              disabled={!canContinue || loading || !!provisioningMode}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.nextButtonText}>
                    {step === 4 ? "Add Device" : "Continue"}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {Platform.OS !== "web" && (
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
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    height: Math.min(height * 0.9, 760),
    minHeight: Math.min(height * 0.72, 620),
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  stepContainer: {
    minHeight: 400,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  deviceTypesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  deviceTypeCardWrapper: {
    width: (width - 64) / 2,
  },
  deviceTypeCard: {
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    minHeight: 140,
  },
  deviceTypeCardSelected: {
    borderWidth: 2,
    borderColor: "#fff",
  },
  deviceTypeIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  deviceTypeLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  deviceTypeDesc: {
    fontSize: 11,
    textAlign: "center",
  },
  checkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
    marginTop: 20,
  },
  patternBox: {
    width: 120,
    height: 120,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  previewContainer: {
    marginTop: 24,
  },
  previewLabel: {
    fontSize: 12,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    gap: 16,
  },
  previewIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  previewSerial: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  previewType: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
  },
  previewRoom: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  roomsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
  },
  roomCard: {
    width: (width - 80) / 2,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    position: "relative",
  },
  roomIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  roomName: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  roomCheckmark: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  newRoomContainer: {
    marginTop: 16,
  },
  suggestedLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
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
    flexDirection: "row",
    alignItems: "center",
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
    justifyContent: "center",
    alignItems: "center",
  },
  suggestedRoomName: {
    fontSize: 14,
    fontWeight: "500",
  },
  createRoomButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
    gap: 8,
  },
  createRoomButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  pairingCard: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(91,110,245,0.18)",
    padding: 14,
  },
  pairingHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  pairingTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  timeoutBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(91,110,245,0.12)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timeoutText: {
    color: "#5B6EF5",
    fontSize: 12,
    fontWeight: "600",
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
    backgroundColor: "#5B6EF5",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  pairingActionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  plugList: {
    marginTop: 12,
  },
  plugListItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(91,110,245,0.22)",
    backgroundColor: "#fff",
    padding: 12,
    marginBottom: 8,
  },
  plugListItemActive: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(91,110,245,0.08)",
  },
  plugName: {
    color: "#1F2937",
    fontSize: 14,
    fontWeight: "600",
  },
  plugMeta: {
    marginTop: 2,
    color: "#64748B",
    fontSize: 12,
  },
  plugConnectText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "600",
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
    alignSelf: "flex-start",
    backgroundColor: "rgba(124,58,237,0.12)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  manualModeText: {
    color: "#6D28D9",
    fontSize: 12,
    fontWeight: "700",
  },
  networkRow: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 10,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  networkRowActive: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(91,110,245,0.08)",
  },
  networkName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  networkMeta: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  recommendedChip: {
    fontSize: 11,
    color: "#0F766E",
    fontWeight: "700",
  },
  pairingInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  passwordRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  passwordInputText: {
    flex: 1,
    fontSize: 14,
  },
  showHideText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  circleProgressOuter: {
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 8,
    borderColor: "rgba(91,110,245,0.20)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  circleProgressInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  successBubble: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.success,
  },
  successTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  pairingErrorBox: {
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: "rgba(239,68,68,0.10)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
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
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E3A8A",
    marginBottom: 4,
  },
  debugLine: {
    fontSize: 11,
    lineHeight: 16,
    color: "#334155",
  },
  qrButton: {
    padding: 8,
    marginRight: 4,
  },
  // New Tuya-like UX styles
  modeSelectionContainer: {
    marginTop: 8,
  },
  modeSelectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  modeSelectionSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    gap: 14,
  },
  modeIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  modeTextContainer: {
    flex: 1,
  },
  modeCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  modeCardSubtitle: {
    fontSize: 12,
  },
  illustrationContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 160,
    marginVertical: 8,
  },
  illustrationCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  pulseRing: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: "rgba(91,110,245,0.15)",
    zIndex: 1,
  },
  signalBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 20,
  },
  signalBar: {
    width: 4,
    borderRadius: 2,
  },
});
