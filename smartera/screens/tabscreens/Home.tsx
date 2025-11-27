import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useDevices, usePowerUsage, useRealtimeConnection } from "../../hooks/useDeviceData";

const { width } = Dimensions.get("window");

// Helper to get time-based greeting
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

const QuickActionButton = ({
  icon,
  label,
}: {
  icon: string;
  label: string;
}) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <TouchableOpacity style={styles(theme).quickActionButton}>
      <View style={styles(theme).iconContainer}>
        <Feather
          name={icon as any}
          size={24}
          color={isDark ? "#ffffff" : "#000000"}
        />
      </View>
      <Text style={styles(theme).quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

export default function Home() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { isConnected: wsConnected } = useRealtimeConnection();
  const { devices, loading: devicesLoading, refresh: refreshDevices } = useDevices();
  const { stats: powerStats, loading: powerLoading, refresh: refreshPower } = usePowerUsage();
  const [refreshing, setRefreshing] = useState(false);

  // Calculate stats from real data
  const activeDevices = devices.filter(d => d.status === 'online').length;
  const totalPower = devices.reduce((sum, d) => sum + (d.lastTelemetry?.power || 0), 0);
  
  const stats = [
    { 
      label: "Power Usage", 
      value: powerStats?.totalUsage 
        ? `${(powerStats.totalUsage / 1000).toFixed(2)} kWh` 
        : `${totalPower.toFixed(1)} W`,
      change: powerStats?.totalUsage ? "-11.2%" : "Live",
      icon: "zap" 
    },
    {
      label: "Active Now",
      value: `${totalPower.toFixed(0)}W`,
      change: wsConnected ? "Live" : "Offline",
      icon: "activity",
    },
    { 
      label: "Devices", 
      value: `${activeDevices}/${devices.length}`, 
      change: `${activeDevices} Online`, 
      icon: "smartphone" 
    },
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshDevices(), refreshPower()]);
    setRefreshing(false);
  };

  const isDark = theme === "dark";
  const greeting = getGreeting();
  const userName = user?.name || user?.email?.split('@')[0] || 'User';

  const quickActions = [
    { icon: "home", label: "All" },
    { icon: "sun", label: "Living Room" },
    { icon: "moon", label: "Bedroom" },
    { icon: "coffee", label: "Kitchen" },
  ];

  return (
    <ScrollView 
      style={styles(theme).container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header Section */}
      <View style={styles(theme).headerContainer}>
        <View>
          <Text style={styles(theme).greeting}>{greeting},</Text>
          <Text style={styles(theme).username}>{userName}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Connection indicator */}
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: wsConnected ? "#4CAF50" : "#FF5252",
              marginRight: 12,
            }}
          />
          <TouchableOpacity style={styles(theme).profileButton}>
            <Feather
              name="user"
              size={24}
              color={isDark ? "#ffffff" : "#000000"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles(theme).section}>
        <Text style={styles(theme).sectionTitle}>Quick Actions</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles(theme).quickActions}
        >
          {quickActions.map((action, index) => (
            <QuickActionButton
              key={index}
              icon={action.icon}
              label={action.label}
            />
          ))}
        </ScrollView>
      </View>

      {/* Stats Grid */}
      <View style={styles(theme).section}>
        <Text style={styles(theme).sectionTitle}>Today's Overview</Text>
        {(devicesLoading || powerLoading) && devices.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#A97664" />
          </View>
        ) : (
          <View style={styles(theme).statsGrid}>
            {stats.map((stat, index) => (
              <View key={index} style={styles(theme).statCard}>
                <View style={styles(theme).statHeader}>
                  <Feather
                    name={stat.icon as any}
                    size={24}
                    color={isDark ? "#4CAF50" : "#4775EA"}
                  />
                  <Text
                    style={[
                      styles(theme).statChange,
                      {
                        color: stat.change === "Live" 
                          ? "#4CAF50" 
                          : stat.change === "Offline"
                          ? "#FF5252"
                          : stat.change.includes("+") 
                          ? "#4CAF50" 
                          : "#FF5252",
                      },
                    ]}
                  >
                    {stat.change}
                  </Text>
                </View>
                <Text style={styles(theme).statValue}>{stat.value}</Text>
                <Text style={styles(theme).statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
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
    headerContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      paddingTop: 40,
    },
    greeting: {
      fontSize: 16,
      color: colorScheme === "dark" ? "#B0BEC5" : "#757575",
      marginBottom: 4,
    },
    username: {
      fontSize: 24,
      fontWeight: "bold",
      color: colorScheme === "dark" ? "#ffffff" : "#000000",
    },
    profileButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colorScheme === "dark" ? "#1a1a1a" : "#f5f5f5",
      justifyContent: "center",
      alignItems: "center",
    },
    section: {
      padding: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colorScheme === "dark" ? "#ffffff" : "#000000",
      marginBottom: 16,
    },
    quickActions: {
      flexDirection: "row",
      marginHorizontal: -8,
    },
    quickActionButton: {
      alignItems: "center",
      marginHorizontal: 8,
    },
    iconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colorScheme === "dark" ? "#1a1a1a" : "#f5f5f5",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 8,
    },
    quickActionLabel: {
      fontSize: 14,
      color: colorScheme === "dark" ? "#B0BEC5" : "#757575",
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      margin: -8,
    },
    statCard: {
      width: (width - 56) / 2,
      backgroundColor: colorScheme === "dark" ? "#1a1a1a" : "#f5f5f5",
      borderRadius: 16,
      padding: 16,
      margin: 8,
    },
    statHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    statValue: {
      fontSize: 24,
      fontWeight: "bold",
      color: colorScheme === "dark" ? "#ffffff" : "#000000",
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 14,
      color: colorScheme === "dark" ? "#B0BEC5" : "#757575",
    },
    statChange: {
      fontSize: 14,
      fontWeight: "500",
    },
  });
