import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, ScrollView, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../utils/api";
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
  const { token } = useAuth();
  const isDark = theme === "dark";

  const [powerData, setPowerData] = useState({
    weeklyUsage: 2500,
    dailyAverage: 350,
    peakUsage: 520,
    totalCost: 45.2,
    chartData: [100, 140, 220, 120, 80, 100, 140],
    recentUsage: [],
  });

  useEffect(() => {
    loadPowerUsageData();
  }, [token]);

  const loadPowerUsageData = async () => {
    if (!token) return;

    try {
      // Load power usage statistics
      const weeklyData = await apiRequest(
        "/power-usage/weekly",
        "GET",
        null,
        token
      );
      const totalData = await apiRequest(
        "/power-usage/total",
        "GET",
        null,
        token
      );
      const recentData = await apiRequest(
        "/power-usage/recent",
        "GET",
        null,
        token
      );

      setPowerData({
        weeklyUsage: weeklyData.totalUsage || 2500,
        dailyAverage: Math.round((weeklyData.totalUsage || 2500) / 7),
        peakUsage: weeklyData.peakUsage || 520,
        totalCost: (weeklyData.totalUsage || 2500) * 0.018, // $0.018 per watt
        chartData: weeklyData.dailyData || [100, 140, 220, 120, 80, 100, 140],
        recentUsage: recentData || [],
      });
    } catch (error) {
      console.log("Failed to load power usage data:", error);
    }
  };

  const data = {
    labels: ["Mon", "Tues", "Wed", "Thurs", "Fri", "Sat", "Sun"],
    datasets: [
      {
        data: powerData.chartData,
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

  return (
    <ScrollView style={styles(theme).container}>
      <View style={styles(theme).header}>
        <Text style={[styles(theme).headerTitle]}>Power Usage</Text>
        <View style={styles(theme).usageWeek}>
          <Text style={styles(theme).usageLabel}>Usage this Week</Text>
          <Text style={[styles(theme).usageValue]}>
            {powerData.weeklyUsage} watt
          </Text>
        </View>
      </View>

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
          <Text style={styles(theme).statValue}>{powerData.dailyAverage}W</Text>
        </View>
        <View style={styles(theme).statCard}>
          <Text style={styles(theme).statLabel}>Peak Usage</Text>
          <Text style={styles(theme).statValue}>{powerData.peakUsage}W</Text>
        </View>
        <View style={styles(theme).statCard}>
          <Text style={styles(theme).statLabel}>Total Cost</Text>
          <Text style={styles(theme).statValue}>
            ${powerData.totalCost.toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles(theme).todayContainer}>
        <View style={styles(theme).todayHeader}>
          <Text
            style={[
              styles(theme).todayTitle,
              { color: theme === "dark" ? "#fff" : "#000" },
            ]}
          >
            Total Today
          </Text>
          <Text style={styles(theme).seeAll}>See All</Text>
        </View>

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
          usage="1000 Kw/h"
          time="12 Jan"
          percentage="-11.2%"
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
          location="Kitchen - Living Room"
          usage="1000 Kw/h"
          time="12 Jan"
          percentage="-10.2%"
          colorScheme={theme}
        />

        <UsageItem
          icon={
            <Feather
              name="speaker"
              size={24}
              color={theme === "dark" ? "#fff" : "#000"}
            />
          }
          title="Wireless Speaker"
          location="Bedroom"
          usage="1090 Kw/h"
          time="3 Jan"
          percentage="+10.2%"
          colorScheme={theme}
        />

        <UsageItem
          icon={
            <MaterialCommunityIcons
              name="television"
              size={24}
              color={theme === "dark" ? "#fff" : "#000"}
            />
          }
          title="Television"
          location="Living Room"
          usage="1000 Kw/h"
          time="12 Jan"
          percentage="-100.2%"
          colorScheme={theme}
        />
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
