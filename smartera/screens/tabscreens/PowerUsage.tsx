import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, ScrollView, Dimensions, RefreshControl, ActivityIndicator } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useTheme } from "../../context/ThemeContext";
import { usePowerUsage, useDevices, useRealtimeConnection } from "../../hooks/useDeviceData";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";

interface UsageItemProps {
  icon: React.ReactNode;
  title: string;
  location: string;
  usage: string;
  time: string;
  percentage: string;
  colorScheme: "light" | "dark";
}

const UsageItem = ({
  icon,
  title,
  location,
  usage,
  time,
  percentage,
  colorScheme,
}: UsageItemProps) => (
  <View style={styles(colorScheme).usageItem}>
    {icon}
    <View style={styles(colorScheme).usageInfo}>
      <View>
        <Text
          style={[
            styles(colorScheme).usageTitle,
            { color: colorScheme === "dark" ? "#fff" : "#000" },
          ]}
        >
          {title}
        </Text>
        <Text style={styles(colorScheme).usageLocation}>
          {location} - {time}
        </Text>
      </View>
      <View style={styles(colorScheme).usageStats}>
        <Text
          style={[
            styles(colorScheme).usageValue,
            { color: colorScheme === "dark" ? "#fff" : "#000" },
          ]}
        >
          {usage}
        </Text>
        <Text
          style={[
            styles(colorScheme).usagePercentage,
            { color: percentage.includes("+") ? "#ff4444" : "#44ff44" },
          ]}
        >
          {percentage}
        </Text>
      </View>
    </View>
  </View>
);

export default function PowerUsage() {
  const { theme } = useTheme();
  const { isConnected: wsConnected } = useRealtimeConnection();
  const { stats: powerStats, weeklyData, loading, refresh } = usePowerUsage();
  const { devices } = useDevices();
  const [refreshing, setRefreshing] = useState(false);
  const isDark = theme === "dark";

  // Calculate real-time power from devices
  const currentPower = devices.reduce((sum, d) => sum + (d.lastTelemetry?.power || 0), 0);
  const totalEnergy = devices.reduce((sum, d) => sum + (d.lastTelemetry?.energy || 0), 0);

  // Use real data or fallback to defaults
  const weeklyUsage = powerStats?.weeklyUsage || totalEnergy * 1000 || 0;
  const dailyAverage = powerStats?.todayUsage || Math.round(weeklyUsage / 7);
  const peakUsage = powerStats?.currentPower || currentPower || 0;
  // cost is an object with today, weekly, monthly - extract weekly or calculate
  const totalCost = typeof powerStats?.cost === 'object' 
    ? (powerStats.cost?.weekly || 0) 
    : (typeof powerStats?.cost === 'number' ? powerStats.cost : weeklyUsage * 0.00018); // $0.18 per kWh

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const data = {
    labels: ["Mon", "Tues", "Wed", "Thurs", "Fri", "Sat", "Sun"],
    datasets: [
      {
        data: weeklyData.data.length > 0 ? weeklyData.data : [0, 0, 0, 0, 0, 0, 0],
        color: (opacity = 1) =>
          isDark
            ? `rgba(76, 175, 80, ${opacity})`
            : `rgba(71, 117, 234, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: isDark ? "#1a1a1a" : "#ffffff",
    backgroundGradientFrom: isDark ? "#1a1a1a" : "#ffffff",
    backgroundGradientTo: isDark ? "#1a1a1a" : "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) =>
      isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) =>
      isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: isDark ? "#4CAF50" : "#4775EA",
    },
  };

  // Build device usage items from real telemetry
  const deviceUsageItems = devices
    .filter(d => d.lastTelemetry)
    .slice(0, 4)
    .map(device => ({
      id: device.deviceId,
      title: device.name || device.type,
      location: device.location,
      power: device.lastTelemetry?.power || 0,
      energy: device.lastTelemetry?.energy || 0,
      status: device.status,
    }));

  return (
    <ScrollView 
      style={styles(theme).container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles(theme).header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[styles(theme).headerTitle]}>Power Usage</Text>
          {/* Live indicator */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: wsConnected ? "#4CAF50" : "#FF5252",
                marginRight: 6,
              }}
            />
            <Text style={{ color: wsConnected ? "#4CAF50" : "#FF5252", fontSize: 12 }}>
              {wsConnected ? "Live" : "Offline"}
            </Text>
          </View>
        </View>
        
        {/* Current Power Reading */}
        <View style={styles(theme).usageWeek}>
          <Text style={styles(theme).usageLabel}>Current Power</Text>
          <Text style={[styles(theme).usageValue]}>
            {currentPower.toFixed(1)} W
          </Text>
        </View>
        
        <View style={[styles(theme).usageWeek, { marginTop: 8 }]}>
          <Text style={styles(theme).usageLabel}>Total Energy This Week</Text>
          <Text style={[styles(theme).usageValue]}>
            {(weeklyUsage / 1000).toFixed(2)} kWh
          </Text>
        </View>
      </View>

      {loading && devices.length === 0 ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#A97664" />
        </View>
      ) : (
        <>
          <View style={styles(theme).chartContainer}>
            <LineChart
              data={data}
              width={Dimensions.get("window").width - 32}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
            />
          </View>

          <View style={styles(theme).statsContainer}>
            <View style={styles(theme).statCard}>
              <Text style={styles(theme).statLabel}>Daily Average</Text>
              <Text style={styles(theme).statValue}>{(Number(dailyAverage) || 0).toFixed(0)}W</Text>
            </View>
            <View style={styles(theme).statCard}>
              <Text style={styles(theme).statLabel}>Peak Usage</Text>
              <Text style={styles(theme).statValue}>{(Number(peakUsage) || 0).toFixed(0)}W</Text>
            </View>
            <View style={styles(theme).statCard}>
              <Text style={styles(theme).statLabel}>Est. Cost</Text>
              <Text style={styles(theme).statValue}>
                ${(Number(totalCost) || 0).toFixed(2)}
              </Text>
            </View>
          </View>
        </>
      )}

      <View style={styles(theme).todayContainer}>
        <View style={styles(theme).todayHeader}>
          <Text
            style={[
              styles(theme).todayTitle,
              { color: theme === "dark" ? "#fff" : "#000" },
            ]}
          >
            Device Usage
          </Text>
          <Text style={styles(theme).seeAll}>See All</Text>
        </View>

        {/* Real device usage from telemetry */}
        {deviceUsageItems.length > 0 ? (
          deviceUsageItems.map((item) => (
            <UsageItem
              key={item.id}
              icon={
                <MaterialCommunityIcons
                  name="power-plug"
                  size={24}
                  color={item.status === 'online' ? "#4CAF50" : theme === "dark" ? "#fff" : "#000"}
                />
              }
              title={item.title}
              location={item.location}
              usage={`${item.power.toFixed(1)} W`}
              time={item.status === 'online' ? "Now" : "Offline"}
              percentage={item.energy > 0 ? `${item.energy.toFixed(2)} kWh` : "-"}
              colorScheme={theme}
            />
          ))
        ) : (
          <>
            {/* Fallback static items when no real data */}
            <UsageItem
              icon={
                <MaterialCommunityIcons
                  name="lightbulb-outline"
                  size={24}
                  color={theme === "dark" ? "#fff" : "#000"}
                />
              }
              title="Lamp"
              location="Kitchen - Bedroom"
              usage="0 W"
              time="No data"
              percentage="-"
              colorScheme={theme}
            />

            <UsageItem
              icon={
                <MaterialCommunityIcons
                  name="air-conditioner"
                  size={24}
                  color={theme === "dark" ? "#fff" : "#000"}
                />
              }
              title="Air Conditioner"
              location="Living Room"
              usage="0 W"
              time="No data"
              percentage="-"
              colorScheme={theme}
            />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colorScheme === "dark" ? "#000000" : "#ffffff",
    },
    header: {
      padding: 20,
      paddingTop: 40,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "bold",
      color: colorScheme === "dark" ? "#ffffff" : "#000000",
      marginBottom: 16,
    },
    usageWeek: {
      marginTop: 8,
    },
    usageLabel: {
      fontSize: 16,
      color: colorScheme === "dark" ? "#B0BEC5" : "#757575",
      marginBottom: 4,
    },
    usageValue: {
      fontSize: 24,
      fontWeight: "bold",
      color: colorScheme === "dark" ? "#ffffff" : "#000000",
    },
    chartContainer: {
      padding: 16,
      backgroundColor: colorScheme === "dark" ? "#1a1a1a" : "#ffffff",
      borderRadius: 16,
      margin: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: colorScheme === "dark" ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    statsContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      padding: 16,
      marginBottom: 16,
    },
    statCard: {
      flex: 1,
      backgroundColor: colorScheme === "dark" ? "#1a1a1a" : "#f5f5f5",
      padding: 16,
      borderRadius: 12,
      marginHorizontal: 4,
      alignItems: "center",
    },
    statLabel: {
      fontSize: 14,
      color: colorScheme === "dark" ? "#B0BEC5" : "#757575",
      marginBottom: 4,
    },
    statValue: {
      fontSize: 18,
      fontWeight: "bold",
      color: colorScheme === "dark" ? "#4CAF50" : "#4775EA",
    },
    todayContainer: {
      padding: 20,
    },
    todayHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    todayTitle: {
      fontSize: 20,
      fontWeight: "bold",
    },
    seeAll: {
      color: "#4775EA",
    },
    usageItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colorScheme === "dark" ? "#1a1a1a" : "#f5f5f5",
      padding: 15,
      borderRadius: 15,
      marginBottom: 10,
    },
    usageInfo: {
      flex: 1,
      marginLeft: 15,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    usageTitle: {
      fontSize: 16,
      fontWeight: "500",
      marginBottom: 5,
    },
    usageLocation: {
      color: "#666",
      fontSize: 14,
    },
    usageStats: {
      alignItems: "flex-end",
    },
    usagePercentage: {
      fontSize: 14,
    },
  });
