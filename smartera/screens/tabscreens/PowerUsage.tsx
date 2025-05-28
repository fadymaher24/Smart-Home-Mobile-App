import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  useColorScheme,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
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
  const colorScheme = useColorScheme() ?? "light";

  const data = {
    labels: ["Mon", "Tues", "Wed", "Thurs", "Fri", "Sat", "Sun"],
    datasets: [
      {
        data: [100, 140, 220, 120, 80, 100, 140],
        color: (opacity = 1) => `rgba(71, 117, 234, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  return (
    <ScrollView style={styles(colorScheme).container}>
      <View style={styles(colorScheme).header}>
        <Text
          style={[
            styles(colorScheme).headerTitle,
            { color: colorScheme === "dark" ? "#fff" : "#000" },
          ]}
        >
          Power Usage
        </Text>
        <View style={styles(colorScheme).usageWeek}>
          <Text style={styles(colorScheme).usageLabel}>Usage this Week</Text>
          <Text
            style={[
              styles(colorScheme).usageValue,
              { color: colorScheme === "dark" ? "#fff" : "#000" },
            ]}
          >
            2500 watt
          </Text>
        </View>
      </View>

      <View style={styles(colorScheme).chartContainer}>
        <LineChart
          data={data}
          width={Dimensions.get("window").width - 40}
          height={220}
          chartConfig={{
            backgroundColor: colorScheme === "dark" ? "#1a1a1a" : "#fff",
            backgroundGradientFrom: colorScheme === "dark" ? "#1a1a1a" : "#fff",
            backgroundGradientTo: colorScheme === "dark" ? "#1a1a1a" : "#fff",
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(71, 117, 234, ${opacity})`,
            labelColor: (opacity = 1) =>
              colorScheme === "dark"
                ? `rgba(255, 255, 255, ${opacity})`
                : `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: "6",
              strokeWidth: "2",
              stroke: "#4775EA",
            },
          }}
          bezier
          style={{
            marginVertical: 8,
            borderRadius: 16,
          }}
        />
      </View>

      <View style={styles(colorScheme).todayContainer}>
        <View style={styles(colorScheme).todayHeader}>
          <Text
            style={[
              styles(colorScheme).todayTitle,
              { color: colorScheme === "dark" ? "#fff" : "#000" },
            ]}
          >
            Total Today
          </Text>
          <Text style={styles(colorScheme).seeAll}>See All</Text>
        </View>

        <UsageItem
          icon={
            <MaterialCommunityIcons
              name="lightbulb-outline"
              size={24}
              color={colorScheme === "dark" ? "#fff" : "#000"}
            />
          }
          title="Lamp"
          location="Kitchen - Bedroom"
          usage="1000 Kw/h"
          time="12 Jan"
          percentage="-11.2%"
          colorScheme={colorScheme}
        />

        <UsageItem
          icon={
            <MaterialCommunityIcons
              name="air-conditioner"
              size={24}
              color={colorScheme === "dark" ? "#fff" : "#000"}
            />
          }
          title="Air Conditioner"
          location="Kitchen - Living Room"
          usage="1000 Kw/h"
          time="12 Jan"
          percentage="-10.2%"
          colorScheme={colorScheme}
        />

        <UsageItem
          icon={
            <Feather
              name="speaker"
              size={24}
              color={colorScheme === "dark" ? "#fff" : "#000"}
            />
          }
          title="Wireless Speaker"
          location="Bedroom"
          usage="1090 Kw/h"
          time="3 Jan"
          percentage="+10.2%"
          colorScheme={colorScheme}
        />

        <UsageItem
          icon={
            <MaterialCommunityIcons
              name="television"
              size={24}
              color={colorScheme === "dark" ? "#fff" : "#000"}
            />
          }
          title="Television"
          location="Living Room"
          usage="1000 Kw/h"
          time="12 Jan"
          percentage="-100.2%"
          colorScheme={colorScheme}
        />
      </View>
    </ScrollView>
  );
}

const styles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colorScheme === "dark" ? "#000" : "#fff",
    },
    header: {
      padding: 20,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 20,
    },
    usageWeek: {
      marginBottom: 10,
    },
    usageLabel: {
      fontSize: 16,
      color: "#666",
      marginBottom: 5,
    },
    chartContainer: {
      padding: 20,
      backgroundColor: colorScheme === "dark" ? "#1a1a1a" : "#fff",
      borderRadius: 20,
      margin: 20,
      marginTop: 0,
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
    usageValue: {
      fontSize: 16,
      fontWeight: "500",
      marginBottom: 5,
    },
    usagePercentage: {
      fontSize: 14,
    },
  });
