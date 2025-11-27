import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useDevices, usePowerUsage, useRealtimeConnection, useRooms } from "../../hooks/useDeviceData";
import Colors, { withAlpha } from "../../utils/colors";

const { width, height } = Dimensions.get("window");

// Device type icon mapping
const DEVICE_ICONS: Record<string, string> = {
  'SMART_PLUG': 'power-plug',
  'RGB_LIGHT': 'lightbulb',
  'THERMOSTAT': 'thermometer',
  'SENSOR': 'access-point',
  'DEFAULT': 'devices',
};

// Get greeting based on time of day
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

// Quick Action Button Component
const QuickActionButton = ({
  icon,
  label,
  onPress,
  isDark,
  isActive,
  badge,
}: {
  icon: string;
  label: string;
  onPress?: () => void;
  isDark: boolean;
  isActive?: boolean;
  badge?: number;
}) => {
  const theme = isDark ? Colors.dark : Colors.light;
  
  return (
    <TouchableOpacity
      style={[styles.quickActionButton]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[
        styles.iconContainer,
        { backgroundColor: theme.surface },
        isActive && { backgroundColor: withAlpha(Colors.primary, 0.15) },
      ]}>
        <Feather
          name={icon as any}
          size={24}
          color={isActive ? Colors.primary : theme.text}
        />
        {badge !== undefined && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={[
        styles.quickActionLabel,
        { color: theme.textSecondary },
        isActive && { color: Colors.primary, fontWeight: '600' },
      ]}>{label}</Text>
    </TouchableOpacity>
  );
};

// Device Card Component with power display
const DeviceCard = ({
  device,
  isDark,
  onToggle,
  isToggling,
}: {
  device: any;
  isDark: boolean;
  onToggle: () => void;
  isToggling: boolean;
}) => {
  const theme = isDark ? Colors.dark : Colors.light;
  const isOn = device.powerState;
  const isOnline = device.isOnline;
  const iconName = DEVICE_ICONS[device.type] || DEVICE_ICONS['DEFAULT'];
  const power = device.lastTelemetry?.power || 0;
  const deviceColor = Colors.deviceTypes[device.type as keyof typeof Colors.deviceTypes] || Colors.primary;
  
  return (
    <TouchableOpacity
      style={[
        styles.deviceCard,
        { backgroundColor: theme.surface },
        isOn && isOnline && { 
          borderColor: Colors.success,
          borderWidth: 1.5,
          backgroundColor: withAlpha(Colors.success, 0.05),
        },
        !isOnline && { opacity: 0.6 },
      ]}
      onPress={onToggle}
      activeOpacity={0.8}
      disabled={isToggling || !isOnline}
    >
      <View style={styles.deviceCardHeader}>
        <View style={[
          styles.deviceIconWrapper,
          { backgroundColor: theme.surfaceVariant },
          isOn && isOnline && { backgroundColor: withAlpha(deviceColor, 0.15) },
        ]}>
          {isToggling ? (
            <ActivityIndicator size="small" color={theme.text} />
          ) : (
            <MaterialCommunityIcons 
              name={iconName as any} 
              size={22} 
              color={isOn && isOnline ? deviceColor : theme.textSecondary} 
            />
          )}
        </View>
        <View style={[
          styles.statusDot,
          { backgroundColor: isOnline ? (isOn ? Colors.success : Colors.warning) : Colors.danger },
        ]} />
      </View>
      <Text style={[styles.deviceCardName, { color: theme.text }]} numberOfLines={1}>
        {device.name}
      </Text>
      <Text style={[styles.deviceCardStatus, { color: theme.textSecondary }]}>
        {!isOnline ? 'Offline' : (isOn ? 'On' : 'Off')}
      </Text>
      {isOn && isOnline && power > 0 && (
        <View style={[styles.powerBadge, { backgroundColor: withAlpha(Colors.power, 0.15) }]}>
          <Feather name="zap" size={10} color={Colors.power} />
          <Text style={[styles.powerBadgeText, { color: Colors.power }]}>
            {power.toFixed(1)}W
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// Room Summary Card
const RoomCard = ({
  room,
  deviceCount,
  activeCount,
  totalPower,
  isDark,
}: {
  room: { roomId: number; name: string; icon?: string };
  deviceCount: number;
  activeCount: number;
  totalPower: number;
  isDark: boolean;
}) => {
  const theme = isDark ? Colors.dark : Colors.light;
  
  return (
    <View style={[styles.roomCard, { backgroundColor: theme.surface }]}>
      <View style={[styles.roomIcon, { backgroundColor: theme.surfaceVariant }]}>
        <Text style={{ fontSize: 28 }}>{room.icon || '🏠'}</Text>
      </View>
      <Text style={[styles.roomName, { color: theme.text }]}>{room.name}</Text>
      <Text style={[styles.roomDevices, { color: theme.textSecondary }]}>
        {activeCount}/{deviceCount} active
      </Text>
      {totalPower > 0 && (
        <Text style={[styles.roomPower, { color: Colors.power }]}>
          {totalPower.toFixed(1)}W
        </Text>
      )}
    </View>
  );
};

// Main Stats Card Component
const StatsCard = ({
  icon,
  iconColor,
  value,
  label,
  subValue,
  isDark,
}: {
  icon: string;
  iconColor: string;
  value: string;
  label: string;
  subValue?: string;
  isDark: boolean;
}) => {
  const theme = isDark ? Colors.dark : Colors.light;
  
  return (
    <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
      <View style={[styles.statsIconWrapper, { backgroundColor: withAlpha(iconColor, 0.15) }]}>
        <Feather name={icon as any} size={20} color={iconColor} />
      </View>
      <Text style={[styles.statsValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>{label}</Text>
      {subValue && (
        <Text style={[styles.statsSubValue, { color: iconColor }]}>
          {subValue}
        </Text>
      )}
    </View>
  );
};

export default function Home() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const isDark = theme === "dark";
  const themeColors = isDark ? Colors.dark : Colors.light;
  
  // Real data hooks
  const { devices, loading: devicesLoading, refresh: refreshDevices, controlDevice } = useDevices();
  const { stats: powerStats, loading: powerLoading, refresh: refreshPower } = usePowerUsage();
  const { rooms, loading: roomsLoading, refresh: refreshRooms } = useRooms();
  const { isConnected: wsConnected } = useRealtimeConnection();
  
  const [refreshing, setRefreshing] = useState(false);
  const [togglingDevices, setTogglingDevices] = useState<Set<string | number>>(new Set());
  const [lastToggle, setLastToggle] = useState<number>(0);
  
  // Animated header
  const scrollY = useRef(new Animated.Value(0)).current;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshDevices(), refreshPower(), refreshRooms()]);
    setRefreshing(false);
  }, [refreshDevices, refreshPower, refreshRooms]);

  // Calculate stats from real device data
  const totalDevices = devices.length;
  const onlineDevices = devices.filter(d => d.isOnline).length;
  const activeDevices = devices.filter(d => d.powerState && d.isOnline).length;
  const totalPower = devices.reduce((sum, d) => {
    if (d.powerState && d.isOnline && d.lastTelemetry?.power) {
      return sum + d.lastTelemetry.power;
    }
    return sum;
  }, 0);

  // Get devices by room
  const devicesByRoom = rooms.map(room => {
    const roomDevices = devices.filter(d => d.roomId === room.roomId);
    const activeRoomDevices = roomDevices.filter(d => d.powerState && d.isOnline);
    const roomPower = roomDevices.reduce((sum, d) => {
      if (d.powerState && d.isOnline && d.lastTelemetry?.power) {
        return sum + d.lastTelemetry.power;
      }
      return sum;
    }, 0);
    return {
      room,
      deviceCount: roomDevices.length,
      activeCount: activeRoomDevices.length,
      totalPower: roomPower,
    };
  }).filter(r => r.deviceCount > 0);

  // Handle device toggle with debounce
  const handleDeviceToggle = useCallback(async (device: any) => {
    const now = Date.now();
    if (now - lastToggle < 1000) return; // 1 second debounce
    
    setLastToggle(now);
    const deviceKey = device.id || device.serialNumber;
    setTogglingDevices(prev => new Set(prev).add(deviceKey));
    
    try {
      const action = device.powerState ? 'turnOff' : 'turnOn';
      await controlDevice(deviceKey, action);
    } catch (err) {
      console.error('Toggle failed:', err);
    } finally {
      setTimeout(() => {
        setTogglingDevices(prev => {
          const newSet = new Set(prev);
          newSet.delete(deviceKey);
          return newSet;
        });
      }, 500);
    }
  }, [controlDevice, lastToggle]);

  // Extract cost data safely
  const todayCost = typeof powerStats?.cost === 'object' 
    ? powerStats.cost.today 
    : (powerStats?.cost || 0);

  const userName = user?.name?.split(' ')[0] || 'User';

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Gradient Header */}
      <LinearGradient
        colors={isDark ? Colors.gradients.primaryDark : Colors.gradients.primary}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.username}>{userName} 👋</Text>
          </View>
          <TouchableOpacity style={styles.headerRight}>
            <View style={styles.connectionIndicator}>
              <View style={[
                styles.connectionDot,
                { backgroundColor: wsConnected ? Colors.success : Colors.danger },
              ]} />
            </View>
            <View style={styles.profileButton}>
              <Feather name="user" size={22} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Live Power Summary */}
        <View style={styles.powerSummary}>
          <View style={styles.powerMain}>
            <Feather name="zap" size={28} color={Colors.power} />
            <Text style={styles.powerValue}>
              {totalPower.toFixed(1)}
            </Text>
            <Text style={styles.powerUnit}>W</Text>
          </View>
          <Text style={styles.powerLabel}>Current Power Usage</Text>
          <Text style={[styles.powerCost, { color: Colors.success }]}>
            ~${todayCost.toFixed(2)} today
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? "#fff" : Colors.primary}
            colors={[Colors.primary]}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <StatsCard
            icon="cpu"
            iconColor={Colors.primary}
            value={`${onlineDevices}/${totalDevices}`}
            label="Devices Online"
            subValue={wsConnected ? 'Live' : 'Offline'}
            isDark={isDark}
          />
          <StatsCard
            icon="activity"
            iconColor={Colors.success}
            value={`${activeDevices}`}
            label="Active Now"
            isDark={isDark}
          />
          <StatsCard
            icon="battery-charging"
            iconColor={Colors.power}
            value={`${((powerStats?.todayUsage || 0) / 1000).toFixed(1)}`}
            label="kWh Today"
            isDark={isDark}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Quick Actions</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActions}
          >
            <QuickActionButton
              icon="power"
              label="All Off"
              onPress={() => {/* Turn all off */}}
              isDark={isDark}
              badge={activeDevices}
            />
            <QuickActionButton
              icon="moon"
              label="Night Mode"
              isDark={isDark}
            />
            <QuickActionButton
              icon="home"
              label="Home"
              isDark={isDark}
              isActive
            />
            <QuickActionButton
              icon="sun"
              label="Day Mode"
              isDark={isDark}
            />
            <QuickActionButton
              icon="shield"
              label="Security"
              isDark={isDark}
            />
          </ScrollView>
        </View>

        {/* My Devices */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>My Devices</Text>
            <Text style={[styles.seeAll, { color: Colors.primary }]}>
              {activeDevices} active
            </Text>
          </View>
          
          {devicesLoading && devices.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : devices.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: themeColors.surface }]}>
              <MaterialCommunityIcons 
                name="devices" 
                size={48} 
                color={themeColors.textTertiary} 
              />
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No devices yet</Text>
              <Text style={[styles.emptySubtext, { color: themeColors.textTertiary }]}>
                Go to Devices tab to add your first device
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.devicesScroll}
            >
              {devices.slice(0, 6).map((device) => (
                <DeviceCard
                  key={device.id || device.serialNumber}
                  device={device}
                  isDark={isDark}
                  onToggle={() => handleDeviceToggle(device)}
                  isToggling={togglingDevices.has(device.id) || togglingDevices.has(device.serialNumber)}
                />
              ))}
              {devices.length > 6 && (
                <View style={[styles.moreDevicesCard, { backgroundColor: themeColors.surface }]}>
                  <Text style={[styles.moreDevicesText, { color: Colors.primary }]}>
                    +{devices.length - 6} more
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>

        {/* Rooms Overview */}
        {devicesByRoom.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Rooms</Text>
              <Text style={[styles.seeAll, { color: Colors.primary }]}>
                {rooms.length} rooms
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.roomsScroll}
            >
              {devicesByRoom.map((item) => (
                <RoomCard
                  key={item.room.roomId}
                  room={item.room}
                  deviceCount={item.deviceCount}
                  activeCount={item.activeCount}
                  totalPower={item.totalPower}
                  isDark={isDark}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Energy Tip */}
        <View style={styles.section}>
          <View style={[styles.tipCard, { backgroundColor: themeColors.surface }]}>
            <View style={[styles.tipIcon, { backgroundColor: withAlpha(Colors.power, 0.15) }]}>
              <Ionicons name="bulb" size={24} color={Colors.power} />
            </View>
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: themeColors.text }]}>Energy Tip</Text>
              <Text style={[styles.tipText, { color: themeColors.textSecondary }]}>
                {activeDevices > 3 
                  ? `You have ${activeDevices} devices running. Consider turning off unused devices to save energy.`
                  : totalPower > 500
                  ? `Current power usage is ${totalPower.toFixed(0)}W. Check for high-consumption devices.`
                  : 'Great job! Your energy usage is optimal right now.'
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: {},
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionIndicator: {
    marginRight: 12,
  },
  connectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  greeting: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 4,
  },
  username: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  powerSummary: {
    marginTop: 24,
    alignItems: 'center',
  },
  powerMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  powerValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  powerUnit: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 4,
  },
  powerLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  powerCost: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    marginTop: -15,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 20,
    justifyContent: 'space-between',
  },
  statsCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statsIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statsLabel: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  statsSubValue: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  section: {
    padding: 20,
    paddingBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '500',
  },
  quickActions: {
    paddingRight: 20,
  },
  quickActionButton: {
    alignItems: "center",
    marginRight: 16,
    width: 70,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  quickActionLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  devicesScroll: {
    paddingRight: 20,
  },
  deviceCard: {
    width: 120,
    borderRadius: 16,
    padding: 14,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  deviceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deviceCardName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  deviceCardStatus: {
    fontSize: 12,
  },
  powerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  powerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  moreDevicesCard: {
    width: 80,
    borderRadius: 16,
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  moreDevicesText: {
    fontSize: 14,
    fontWeight: '600',
  },
  roomsScroll: {
    paddingRight: 20,
  },
  roomCard: {
    width: 130,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  roomIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  roomName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  roomDevices: {
    fontSize: 12,
  },
  roomPower: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  tipCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tipIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
