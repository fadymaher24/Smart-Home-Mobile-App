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
import { useDevices, useRealtimeConnection, useRooms } from "../../hooks/useDeviceData";
import { Device as ServiceDevice } from "../../services/deviceService";
import { MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";

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
    color: '#4CAF50',
    gradient: ['#4CAF50', '#2E7D32'],
    description: 'Control power outlets remotely'
  },
  {
    type: 'RGB_LIGHT',
    label: 'RGB Light',
    icon: 'lightbulb',
    color: '#FF9800',
    gradient: ['#FF9800', '#F57C00'],
    description: 'Smart lighting with colors'
  },
  {
    type: 'THERMOSTAT',
    label: 'Thermostat',
    icon: 'thermometer',
    color: '#2196F3',
    gradient: ['#2196F3', '#1565C0'],
    description: 'Temperature control'
  },
  {
    type: 'SENSOR',
    label: 'Sensor',
    icon: 'access-point',
    color: '#9C27B0',
    gradient: ['#9C27B0', '#6A1B9A'],
    description: 'Environmental monitoring'
  },
];

const { width, height } = Dimensions.get("window");

// Suggested rooms for quick selection
const SUGGESTED_ROOMS = [
  { name: 'Living Room', icon: 'sofa', color: '#4CAF50' },
  { name: 'Bedroom', icon: 'bed', color: '#2196F3' },
  { name: 'Kitchen', icon: 'silverware-fork-knife', color: '#FF9800' },
  { name: 'Bathroom', icon: 'shower', color: '#00BCD4' },
  { name: 'Office', icon: 'desk', color: '#9C27B0' },
  { name: 'Garage', icon: 'garage', color: '#607D8B' },
  { name: 'Garden', icon: 'flower', color: '#8BC34A' },
  { name: 'Dining Room', icon: 'table-furniture', color: '#795548' },
];

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
              borderColor: isOnline ? (isPowerOn ? deviceTypeInfo.color : '#666') : '#ff4444',
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
                { backgroundColor: isOnline ? '#4CAF50' : '#ff4444' },
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
  onCreateRoom: (name: string) => Promise<Room>;
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

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;
    
    try {
      const newRoom = await onCreateRoom(newRoomName.trim());
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
    if (showNewRoomInput) {
      setShowNewRoomInput(false);
      setNewRoomName('');
    } else if (step > 1) {
      setStep(step - 1);
    } else {
      onClose();
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
        Enter the serial number (MAC address) from your device
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
        </View>
        <Text style={[styles.inputHint, { color: isDark ? '#666' : '#888' }]}>
          Usually found on the device label or packaging
        </Text>
      </View>

      {/* Visual pattern decoration */}
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
                      ? 'rgba(76, 175, 80, 0.2)'
                      : isDark ? '#1a1a1a' : '#f5f5f5',
                    borderColor: newRoomName === suggestion.name ? '#4CAF50' : 'transparent',
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
                backgroundColor: newRoomName.trim() ? '#4CAF50' : '#888',
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
                  ? 'rgba(76, 175, 80, 0.2)'
                  : isDark ? '#1a1a1a' : '#f5f5f5',
                borderColor: selectedRoomId === null ? '#4CAF50' : 'transparent',
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
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
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
                      ? 'rgba(76, 175, 80, 0.2)'
                      : isDark ? '#1a1a1a' : '#f5f5f5',
                    borderColor: isSelected ? '#4CAF50' : 'transparent',
                    borderWidth: 2,
                  },
                ]}
                onPress={() => setSelectedRoomId(room.roomId)}
              >
                <View style={[styles.roomIconContainer, { backgroundColor: '#2196F3' }]}>
                  <MaterialCommunityIcons name={(room.icon || 'door') as any} size={28} color="#fff" />
                </View>
                <Text style={[styles.roomName, { color: isDark ? '#fff' : '#333' }]}>
                  {room.name}
                </Text>
                {isSelected && (
                  <View style={styles.roomCheckmark}>
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
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
                borderColor: '#FF9800',
                borderWidth: 2,
                borderStyle: 'dashed',
              },
            ]}
            onPress={() => setShowNewRoomInput(true)}
          >
            <View style={[styles.roomIconContainer, { backgroundColor: '#FF9800' }]}>
              <Ionicons name="add" size={28} color="#fff" />
            </View>
            <Text style={[styles.roomName, { color: '#FF9800' }]}>
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
                      backgroundColor: s <= step ? '#4CAF50' : (isDark ? '#333' : '#ddd'),
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
                  backgroundColor: (
                    (step === 1 && selectedType) ||
                    (step === 2 && serialNumber.trim()) ||
                    (step === 3) || // Room selection is always valid (can skip)
                    (step === 4 && deviceName.trim())
                  ) ? '#4CAF50' : '#888',
                },
              ]}
              onPress={handleNext}
              disabled={loading || (
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
}: {
  device: ServiceDevice | null;
  visible: boolean;
  onClose: () => void;
  onDelete: (id: number) => void;
  onControl: (id: number, action: 'turnOn' | 'turnOff') => void;
}) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (!device) return null;

  const deviceTypeInfo = DEVICE_TYPES.find(t => t.type === device.type) || DEVICE_TYPES[0];

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
              <View style={[styles.detailsStatusBadge, { backgroundColor: device.isOnline ? 'rgba(76,175,80,0.3)' : 'rgba(255,68,68,0.3)' }]}>
                <View style={[styles.statusDotLarge, { backgroundColor: device.isOnline ? '#4CAF50' : '#ff4444' }]} />
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
                  style={[styles.powerControlButton, { backgroundColor: device.powerState ? '#4CAF50' : (isDark ? '#333' : '#eee') }]}
                  onPress={() => onControl(device.id, device.powerState ? 'turnOff' : 'turnOn')}
                >
                  <Ionicons
                    name="power"
                    size={32}
                    color={device.powerState ? '#fff' : '#888'}
                  />
                  <Text style={[styles.powerControlText, { color: device.powerState ? '#fff' : '#888' }]}>
                    {device.powerState ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Telemetry Data */}
            {device.type === 'SMART_PLUG' && device.lastTelemetry && (
              <View style={styles.detailsSection}>
                <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#333' }]}>Real-time Data</Text>
                <View style={styles.telemetryGrid}>
                  <View style={[styles.telemetryCard, { backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5' }]}>
                    <Feather name="zap" size={20} color="#FF9800" />
                    <Text style={[styles.telemetryValue, { color: isDark ? '#fff' : '#333' }]}>
                      {(device.lastTelemetry.power || 0).toFixed(1)}
                    </Text>
                    <Text style={[styles.telemetryUnit, { color: isDark ? '#888' : '#666' }]}>Watts</Text>
                  </View>
                  <View style={[styles.telemetryCard, { backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5' }]}>
                    <Feather name="activity" size={20} color="#2196F3" />
                    <Text style={[styles.telemetryValue, { color: isDark ? '#fff' : '#333' }]}>
                      {(device.lastTelemetry.voltage || 0).toFixed(1)}
                    </Text>
                    <Text style={[styles.telemetryUnit, { color: isDark ? '#888' : '#666' }]}>Volts</Text>
                  </View>
                  <View style={[styles.telemetryCard, { backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5' }]}>
                    <Feather name="trending-up" size={20} color="#4CAF50" />
                    <Text style={[styles.telemetryValue, { color: isDark ? '#fff' : '#333' }]}>
                      {(device.lastTelemetry.current || 0).toFixed(2)}
                    </Text>
                    <Text style={[styles.telemetryUnit, { color: isDark ? '#888' : '#666' }]}>Amps</Text>
                  </View>
                  <View style={[styles.telemetryCard, { backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5' }]}>
                    <Feather name="battery-charging" size={20} color="#9C27B0" />
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

            {/* Danger Zone */}
            <View style={styles.detailsSection}>
              <Text style={[styles.sectionTitle, { color: '#ff4444' }]}>Danger Zone</Text>
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
                <Ionicons name="trash-outline" size={20} color="#ff4444" />
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

  const handleCreateRoom = async (name: string): Promise<Room> => {
    const newRoom = await createRoom(name);
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
      console.error('Failed to add device:', err);
      Alert.alert('Error', err.message || 'Failed to add device');
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

  // Group devices by type
  const groupedDevices = DEVICE_TYPES.map(type => ({
    ...type,
    devices: devices.filter(d => d.type === type.type),
  })).filter(group => group.devices.length > 0);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#f8f9fa' }]}>
      {/* Header */}
      <LinearGradient
        colors={isDark ? ['#1e1e1e', '#121212'] : ['#4CAF50', '#2E7D32']}
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
            <View style={[styles.connectionBadge, { backgroundColor: wsConnected ? 'rgba(76,175,80,0.3)' : 'rgba(255,68,68,0.3)' }]}>
              <View style={[styles.connectionDot, { backgroundColor: wsConnected ? '#4CAF50' : '#ff4444' }]} />
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
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={isDark ? '#fff' : '#4CAF50'} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading && devices.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={[styles.loadingText, { color: isDark ? '#888' : '#666' }]}>
              Loading devices...
            </Text>
          </View>
        ) : devices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={['#4CAF50', '#2E7D32']}
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
                <View style={[styles.statIconBg, { backgroundColor: '#4CAF5020' }]}>
                  <Ionicons name="power" size={20} color="#4CAF50" />
                </View>
                <Text style={[styles.statValue, { color: isDark ? '#fff' : '#333' }]}>
                  {devices.filter(d => d.powerState).length}
                </Text>
                <Text style={[styles.statLabel, { color: isDark ? '#888' : '#666' }]}>Active</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: isDark ? '#1e1e1e' : '#fff' }]}>
                <View style={[styles.statIconBg, { backgroundColor: '#2196F320' }]}>
                  <Ionicons name="wifi" size={20} color="#2196F3" />
                </View>
                <Text style={[styles.statValue, { color: isDark ? '#fff' : '#333' }]}>
                  {devices.filter(d => d.isOnline).length}
                </Text>
                <Text style={[styles.statLabel, { color: isDark ? '#888' : '#666' }]}>Online</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: isDark ? '#1e1e1e' : '#fff' }]}>
                <View style={[styles.statIconBg, { backgroundColor: '#FF980020' }]}>
                  <Feather name="zap" size={20} color="#FF9800" />
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
          colors={['#4CAF50', '#2E7D32']}
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
    backgroundColor: '#4CAF50',
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
    bottom: 24,
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
    maxHeight: height * 0.9,
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
    borderColor: '#ff4444',
    gap: 8,
  },
  deleteButtonText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: '600',
  },
});
