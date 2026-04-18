import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { useDevices, usePowerUsage, useRealtimeConnection } from "../../hooks/useDeviceData";
import Colors, { withAlpha } from "../../utils/colors";

const { width } = Dimensions.get("window");

// Device type icon mapping
const DEVICE_ICONS: Record<string, string> = {
  'SMART_PLUG': 'power-plug',
  'RGB_LIGHT': 'lightbulb',
  'THERMOSTAT': 'thermometer',
  'SENSOR': 'access-point',
  'DEFAULT': 'devices',
};

// Time period tabs
type TimePeriod = 'day' | 'week' | 'month';

// Usage Item Component with progress bar
const UsageItem = ({
  device,
  maxPower,
  isDark,
}: {
  device: any;
  maxPower: number;
  isDark: boolean;
}) => {
  const theme = isDark ? Colors.dark : Colors.light;
  const iconName = DEVICE_ICONS[device.type] || DEVICE_ICONS['DEFAULT'];
  const power = device.lastTelemetry?.power || 0;
  const energy = device.lastTelemetry?.energyTotal || device.lastTelemetry?.energy || 0;
  const isOnline = device.isOnline;
  const isOn = device.powerState;
  const percentage = maxPower > 0 ? Math.min((power / maxPower) * 100, 100) : 0;
  const deviceColor = Colors.deviceTypes[device.type as keyof typeof Colors.deviceTypes] || Colors.primary;

  // Color based on percentage
  const barColor = percentage > 80 ? Colors.danger : percentage > 50 ? Colors.warning : Colors.success;

  return (
    <TouchableOpacity 
      style={[styles.usageItem, { backgroundColor: theme.surface }]}
      activeOpacity={0.8}
    >
      <View style={[
        styles.usageItemIcon,
        { backgroundColor: theme.surfaceVariant },
        isOn && isOnline && { backgroundColor: withAlpha(deviceColor, 0.15) },
      ]}>
        <MaterialCommunityIcons
          name={iconName as any}
          size={22}
          color={isOn && isOnline ? deviceColor : theme.textSecondary}
        />
      </View>
      <View style={styles.usageItemContent}>
        <View style={styles.usageItemHeader}>
          <Text style={[styles.usageItemName, { color: theme.text }]} numberOfLines={1}>
            {device.name}
          </Text>
          <View style={styles.usageItemStats}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: withAlpha(isOnline ? (isOn ? Colors.success : Colors.warning) : Colors.danger, 0.15) },
            ]}>
              <View style={[
                styles.statusDot,
                { backgroundColor: isOnline ? (isOn ? Colors.success : Colors.warning) : Colors.danger },
              ]} />
              <Text style={[
                styles.statusText,
                { color: isOnline ? (isOn ? Colors.success : Colors.warning) : Colors.danger },
              ]}>
                {!isOnline ? 'Offline' : (isOn ? 'Active' : 'Standby')}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.usageItemBottom}>
          <View style={[styles.progressContainer, { backgroundColor: theme.surfaceVariant }]}>
            <View 
              style={[
                styles.progressBar,
                { 
                  width: `${percentage}%`,
                  backgroundColor: barColor,
                },
              ]} 
            />
          </View>
          <View style={styles.powerInfo}>
            <Text style={[styles.itemPowerValue, { color: theme.text }]}>
              {power.toFixed(1)} W
            </Text>
            <Text style={[styles.energyValue, { color: theme.textTertiary }]}>
              {energy > 0 ? `${(energy / 1000).toFixed(2)} kWh` : '-'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Summary Stat Card
const StatCard = ({
  icon,
  iconColor,
  title,
  value,
  isDark,
}: {
  icon: string;
  iconColor: string;
  title: string;
  value: string;
  isDark: boolean;
}) => {
  const theme = isDark ? Colors.dark : Colors.light;
  
  return (
    <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
      <View style={[styles.statCardIcon, { backgroundColor: withAlpha(iconColor, 0.15) }]}>
        <Feather name={icon as any} size={18} color={iconColor} />
      </View>
      <Text style={[styles.statCardTitle, { color: theme.textSecondary }]}>{title}</Text>
      <Text style={[styles.statCardValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
};

// Time Period Tab
const TimePeriodTab = ({
  period,
  selected,
  onSelect,
  isDark,
}: {
  period: TimePeriod;
  selected: boolean;
  onSelect: () => void;
  isDark: boolean;
}) => {
  const theme = isDark ? Colors.dark : Colors.light;
  const labels = { day: 'Day', week: 'Week', month: 'Month' };
  
  return (
    <TouchableOpacity
      style={[
        styles.periodTab,
        { backgroundColor: 'transparent' },
        selected && { backgroundColor: Colors.primary },
      ]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.periodTabText,
        { color: theme.textSecondary },
        selected && { color: '#fff' },
      ]}>
        {labels[period]}
      </Text>
    </TouchableOpacity>
  );
};

export default function PowerUsage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const themeColors = isDark ? Colors.dark : Colors.light;
  
  // Real data hooks
  const { devices, loading: devicesLoading, refresh: refreshDevices } = useDevices();
  const { stats: powerStats, weeklyData, dailyData, monthlyData, loading: powerLoading, refresh: refreshPower, loadDailyData, loadMonthlyData } = usePowerUsage();
  const { isConnected: wsConnected } = useRealtimeConnection();
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('week');

  // Fetch period-specific data when tab changes
  useEffect(() => {
    if (selectedPeriod === 'day') {
      loadDailyData();
    } else if (selectedPeriod === 'month') {
      loadMonthlyData();
    }
  }, [selectedPeriod, loadDailyData, loadMonthlyData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshDevices(), refreshPower()]);
    setRefreshing(false);
  }, [refreshDevices, refreshPower]);

  // Calculate real power stats from devices
  const currentPower = useMemo(() => {
    return devices.reduce((sum, d) => {
      if (d.powerState && d.isOnline && d.lastTelemetry?.power) {
        return sum + d.lastTelemetry.power;
      }
      return sum;
    }, 0);
  }, [devices]);

  const maxPower = useMemo(() => {
    return Math.max(...devices.map(d => d.lastTelemetry?.power || 0), 100);
  }, [devices]);

  // Get active devices sorted by power consumption
  const deviceUsageItems = useMemo(() => {
    return devices
      .map(device => ({
        ...device,
        power: device.lastTelemetry?.power || 0,
        energy: device.lastTelemetry?.energyTotal || device.lastTelemetry?.energy || 0,
      }))
      .sort((a, b) => b.power - a.power);
  }, [devices]);

  // Extract cost data safely
  const costData = useMemo(() => {
    if (typeof powerStats?.cost === 'object' && powerStats.cost) {
      return {
        today: powerStats.cost.today || 0,
        weekly: powerStats.cost.weekly || 0,
        monthly: powerStats.cost.monthly || 0,
        rate: powerStats.cost.rate || 0.12,
        currency: powerStats.cost.currency || 'USD',
      };
    }
    return {
      today: 0,
      weekly: 0,
      monthly: 0,
      rate: 0.12,
      currency: 'USD',
    };
  }, [powerStats]);

  // Energy stats
  const energyStats = useMemo(() => {
    const todayUsage = powerStats?.todayUsage || 0;
    const weeklyUsage = powerStats?.weeklyUsage || 0;
    const monthlyUsage = powerStats?.monthlyUsage || 0;
    
    // Calculate daily average (last 7 days)
    const dailyAverage = weeklyUsage > 0 ? weeklyUsage / 7 : todayUsage;
    
    // Peak usage estimate (1.5x average for now - in real app, get from backend)
    const peakUsage = Math.max(currentPower, dailyAverage * 1.5);
    
    return {
      todayUsage: todayUsage / 1000, // Convert to kWh
      weeklyUsage: weeklyUsage / 1000,
      monthlyUsage: monthlyUsage / 1000,
      dailyAverage: dailyAverage / 1000,
      peakUsage,
    };
  }, [powerStats, currentPower]);

  // Generate chart data from real backend data
  const chartData = useMemo(() => {
    if (selectedPeriod === 'day' && dailyData?.hourlyData) {
      const points = dailyData.hourlyData;
      const formatHour = (h: number) => {
        if (h === 0) return '12am';
        if (h === 12) return '12pm';
        return h < 12 ? `${h}am` : `${h - 12}pm`;
      };
      const labels = points.map(p => formatHour(p.hour));
      const data = points.map(p => Math.max(0, p.avgPower / 1000));
      return {
        labels,
        datasets: [
          {
            data: data.length > 0 ? data : [0],
            color: (opacity = 1) => withAlpha(Colors.primary, opacity),
            strokeWidth: 2,
          },
        ],
      };
    }

    if (selectedPeriod === 'week' && weeklyData.data.length > 0) {
      const hasData = weeklyData.data.some(v => v > 0);
      return {
        labels: weeklyData.labels,
        datasets: [
          {
            data: hasData ? weeklyData.data : [0],
            color: (opacity = 1) => withAlpha(Colors.primary, opacity),
            strokeWidth: 2,
          },
        ],
      };
    }

    if (selectedPeriod === 'month' && monthlyData.data.length > 0) {
      const hasData = monthlyData.data.some(v => v > 0);
      return {
        labels: monthlyData.labels,
        datasets: [
          {
            data: hasData ? monthlyData.data : [0],
            color: (opacity = 1) => withAlpha(Colors.primary, opacity),
            strokeWidth: 2,
          },
        ],
      };
    }

    // Fallback with empty data
    const fallbackLabels = selectedPeriod === 'day'
      ? ['6am', '9am', '12pm', '3pm', '6pm', '9pm']
      : selectedPeriod === 'week'
        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        : ['W1', 'W2', 'W3', 'W4'];
    return {
      labels: fallbackLabels,
      datasets: [{
        data: [0],
        color: (opacity = 1) => withAlpha(Colors.primary, opacity),
        strokeWidth: 2,
      }],
    };
  }, [selectedPeriod, dailyData, weeklyData, monthlyData]);

  const chartConfig = {
    backgroundColor: themeColors.surface,
    backgroundGradientFrom: themeColors.surface,
    backgroundGradientTo: themeColors.surface,
    decimalPlaces: 1,
    color: (opacity = 1) => withAlpha(Colors.primary, opacity),
    labelColor: (opacity = 1) => withAlpha(themeColors.textSecondary, opacity),
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: Colors.primary,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: themeColors.border,
    },
  };

  // Active devices count
  const activeCount = devices.filter(d => d.powerState && d.isOnline).length;
  const onlineCount = devices.filter(d => d.isOnline).length;

  const loading = devicesLoading || powerLoading;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Gradient Header */}
      <LinearGradient
        colors={isDark ? Colors.gradients.primaryDark : Colors.gradients.primary}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Power Usage</Text>
          <View style={styles.connectionStatus}>
            <View style={[
              styles.connectionDot,
              { backgroundColor: wsConnected ? Colors.success : Colors.danger },
            ]} />
            <Text style={styles.connectionText}>
              {wsConnected ? 'Live' : 'Offline'}
            </Text>
          </View>
        </View>
        
        {/* Current Power Display */}
        <View style={styles.powerDisplay}>
          <Feather name="zap" size={32} color={Colors.power} />
          <Text style={styles.powerValue}>{currentPower.toFixed(1)}</Text>
          <Text style={styles.powerUnit}>W</Text>
        </View>
        <Text style={styles.powerSubtext}>
          {activeCount} device{activeCount !== 1 ? 's' : ''} consuming power
        </Text>
        
        {/* Cost Display */}
        <View style={styles.costRow}>
          <View style={styles.costItem}>
            <Text style={styles.costLabel}>Today</Text>
            <Text style={styles.costValue}>${costData.today.toFixed(2)}</Text>
          </View>
          <View style={styles.costDivider} />
          <View style={styles.costItem}>
            <Text style={styles.costLabel}>This Week</Text>
            <Text style={styles.costValue}>${costData.weekly.toFixed(2)}</Text>
          </View>
          <View style={styles.costDivider} />
          <View style={styles.costItem}>
            <Text style={styles.costLabel}>This Month</Text>
            <Text style={styles.costValue}>${costData.monthly.toFixed(2)}</Text>
          </View>
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
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <StatCard
            icon="battery-charging"
            iconColor={Colors.primary}
            title="Today"
            value={`${energyStats.todayUsage.toFixed(2)} kWh`}
            isDark={isDark}
          />
          <StatCard
            icon="trending-up"
            iconColor={Colors.success}
            title="Daily Avg"
            value={`${energyStats.dailyAverage.toFixed(2)} kWh`}
            isDark={isDark}
          />
          <StatCard
            icon="alert-triangle"
            iconColor={Colors.warning}
            title="Peak"
            value={`${energyStats.peakUsage.toFixed(0)} W`}
            isDark={isDark}
          />
        </View>

        {/* Chart Section */}
        <View style={[styles.chartSection, { backgroundColor: themeColors.surface }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: themeColors.text }]}>Energy Consumption</Text>
            <View style={[styles.periodTabs, { backgroundColor: themeColors.surfaceVariant }]}>
              {(['day', 'week', 'month'] as TimePeriod[]).map(period => (
                <TimePeriodTab
                  key={period}
                  period={period}
                  selected={selectedPeriod === period}
                  onSelect={() => setSelectedPeriod(period)}
                  isDark={isDark}
                />
              ))}
            </View>
          </View>
          
{loading && devices.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : selectedPeriod === 'day' ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollChartContainer}>
              <LineChart
                data={chartData}
                width={Math.max(width - 64, chartData.labels.length * 50)}
                height={200}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withInnerLines={true}
                withOuterLines={false}
                withVerticalLines={true}
                withHorizontalLines={true}
                withDots={true}
                withShadow={false}
              />
            </ScrollView>
          ) : (
            <View style={styles.chartContainer}>
              <LineChart
                data={chartData}
                width={width - 64}
                height={180}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withInnerLines={true}
                withOuterLines={false}
                withVerticalLines={false}
                withHorizontalLines={true}
                withDots={true}
                withShadow={false}
              />
            </View>
          )}
        </View>

        {/* Device Breakdown */}
        <View style={styles.devicesSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Device Breakdown</Text>
            <Text style={[styles.sectionSubtitle, { color: Colors.primary }]}>
              {onlineCount} online • {activeCount} active
            </Text>
          </View>
          
          {loading && devices.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : devices.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: themeColors.surface }]}>
              <MaterialCommunityIcons 
                name="power-plug-off" 
                size={48} 
                color={themeColors.textTertiary} 
              />
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No devices connected</Text>
              <Text style={[styles.emptySubtext, { color: themeColors.textTertiary }]}>
                Add devices to see power consumption
              </Text>
            </View>
          ) : (
            deviceUsageItems.map(device => (
              <UsageItem
                key={device.id || device.serialNumber}
                device={device}
                maxPower={maxPower}
                isDark={isDark}
              />
            ))
          )}
        </View>

        {/* Energy Saving Tips */}
        <View style={styles.tipsSection}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Energy Insights</Text>
          
          <View style={[styles.tipCard, { backgroundColor: themeColors.surface }]}>
            <View style={[styles.tipIcon, { backgroundColor: withAlpha(Colors.success, 0.15) }]}>
              <Ionicons name="leaf" size={20} color={Colors.success} />
            </View>
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: themeColors.text }]}>
                {currentPower < 100 ? 'Great energy efficiency!' : 
                 currentPower < 500 ? 'Moderate usage' : 'High power consumption'}
              </Text>
              <Text style={[styles.tipText, { color: themeColors.textSecondary }]}>
                {currentPower < 100 
                  ? 'Your power consumption is very low. Keep up the good work!'
                  : currentPower < 500
                  ? `You're using ${currentPower.toFixed(0)}W. Consider turning off idle devices.`
                  : `High usage detected (${currentPower.toFixed(0)}W). Review active devices to optimize.`
                }
              </Text>
            </View>
          </View>

          <View style={[styles.tipCard, { backgroundColor: themeColors.surface }]}>
            <View style={[styles.tipIcon, { backgroundColor: withAlpha(Colors.primary, 0.15) }]}>
              <Ionicons name="trending-down" size={20} color={Colors.primary} />
            </View>
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: themeColors.text }]}>Cost Projection</Text>
              <Text style={[styles.tipText, { color: themeColors.textSecondary }]}>
                At current usage, your estimated monthly bill is ${(costData.monthly * 4.3).toFixed(2)} 
                (rate: ${costData.rate}/kWh)
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
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  powerDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: 24,
  },
  powerValue: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  powerUnit: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 4,
  },
  powerSubtext: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 4,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
  },
  costItem: {
    alignItems: 'center',
    flex: 1,
  },
  costDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  costLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginBottom: 4,
  },
  costValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
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
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statCardTitle: {
    fontSize: 11,
    marginBottom: 4,
  },
  statCardValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  chartSection: {
    borderRadius: 20,
    margin: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  periodTabs: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
  },
  periodTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  periodTabText: {
    fontSize: 12,
    fontWeight: '500',
  },
  chartContainer: {
    alignItems: 'center',
  },
  scrollChartContainer: {
    paddingVertical: 8,
  },
  chart: {
    borderRadius: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  devicesSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  usageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  usageItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  usageItemContent: {
    flex: 1,
  },
  usageItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  usageItemName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  usageItemStats: {},
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  usageItemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressContainer: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  powerInfo: {
    alignItems: 'flex-end',
  },
  itemPowerValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  energyValue: {
    fontSize: 11,
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
  tipsSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  tipCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
    fontSize: 12,
    lineHeight: 18,
  },
});
