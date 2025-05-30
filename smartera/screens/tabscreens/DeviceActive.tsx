import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useTheme } from "../../context/ThemeContext";

interface Device {
  id: number;
  type: string;
  location: string;
  status: string;
  icon: any;
  temp?: string;
  color?: string;
  channel?: string;
}

const devices: Device[] = [
  {
    id: 1,
    type: "Smart Light",
    location: "Living Room",
    status: "Active",
    icon: require("../../assets/icons/lamp.png"),
    color: "Warm White",
  },
  {
    id: 2,
    type: "Air Conditioner",
    location: "Bedroom",
    status: "Active",
    icon: require("../../assets/icons/ac.png"),
    temp: "24",
  },
  {
    id: 3,
    type: "Smart TV",
    location: "Living Room",
    status: "Inactive",
    icon: require("../../assets/icons/tv.png"),
    channel: "Netflix",
  },
  {
    id: 4,
    type: "Security Camera",
    location: "Front Door",
    status: "Active",
    icon: require("../../assets/icons/tv.png"), // Using TV icon as placeholder for camera
  },
];

const { width } = Dimensions.get("window");

const DeviceCard = ({ device }: { device: Device }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <TouchableOpacity
      style={[
        styles(theme).deviceCard,
        { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" },
      ]}
    >
      <Image
        source={device.icon}
        style={styles(theme).deviceIcon}
        resizeMode="contain"
      />

      {device.temp && (
        <Text style={styles(theme).deviceDetail}>
          Temperature{" "}
          <Text style={styles(theme).deviceDetailBold}>{device.temp}°C</Text>
        </Text>
      )}
      {device.color && (
        <Text style={styles(theme).deviceDetail}>
          Color{" "}
          <Text style={styles(theme).deviceDetailBold}>{device.color}</Text>
        </Text>
      )}
      {device.channel && (
        <Text style={styles(theme).deviceDetail}>
          Channel{" "}
          <Text style={styles(theme).deviceDetailBold}>{device.channel}</Text>
        </Text>
      )}

      <Text style={styles(theme).deviceType}>{device.type}</Text>
      <Text style={styles(theme).deviceLocation}>{device.location}</Text>

      <View
        style={[
          styles(theme).statusPill,
          {
            backgroundColor:
              device.status === "Active" ? "#4CAF5020" : "#9E9E9E20",
          },
        ]}
      >
        <Text
          style={[
            styles(theme).statusText,
            { color: device.status === "Active" ? "#4CAF50" : "#9E9E9E" },
          ]}
        >
          {device.status}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const DevicesActive = () => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles(theme).container,
        { backgroundColor: theme === "dark" ? "#000000" : "#ffffff" },
      ]}
    >
      {/* Header */}
      <LinearGradient
        colors={
          theme === "dark" ? ["#232526", "#414345"] : ["#579BB1", "#337CA0"]
        }
        style={styles(theme).headerGradient}
      >
        <View style={styles(theme).headerRow}>
          <TouchableOpacity onPress={() => router.push("/Welcome")}>
            <Text style={styles(theme).headerBackButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles(theme).headerTitle}>Devices Active</Text>
          <Text style={styles(theme).headerSearchButton}>🔍</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles(theme).scrollContent}>
        <View style={styles(theme).topRow}>
          <Text
            style={[
              styles(theme).activeTitle,
              { color: theme === "dark" ? "#ffffff" : "#000000" },
            ]}
          >
            Device Active{" "}
            <Text style={styles(theme).activeCount}>{devices.length}</Text>
          </Text>
          <TouchableOpacity style={styles(theme).addBtn}>
            <Text style={styles(theme).addBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles(theme).devicesGrid}>
          {devices.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </View>

        <TouchableOpacity style={styles(theme).turnOffBtn}>
          <Text style={styles(theme).turnOffBtnText}>Turn Off All Devices</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colorScheme === "dark" ? "#000000" : "#ffffff",
    },
    bgLight: {
      backgroundColor: "#F4F7FA",
    },
    bgDark: {
      backgroundColor: "#181A20",
    },
    headerGradient: {
      paddingHorizontal: 24,
      paddingVertical: 32,
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    headerTitle: {
      color: "#fff",
      fontSize: 22,
      fontWeight: "bold",
      letterSpacing: 1,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
    },
    topRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    activeTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#23272F",
    },
    activeCount: {
      backgroundColor: "#E0E0E0",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
      fontSize: 13,
      color: "#23272F",
      marginLeft: 4,
    },
    addBtn: {
      backgroundColor: "#A97664",
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    addBtnText: {
      color: "#fff",
      fontSize: 22,
      fontWeight: "bold",
      marginTop: -2,
    },
    devicesGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    deviceCard: {
      width: width * 0.44,
      padding: 16,
      borderRadius: 20,
      marginBottom: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: colorScheme === "dark" ? 0.3 : 0.1,
      shadowRadius: 6,
      elevation: 2,
    },
    deviceIcon: {
      height: 56,
      width: 56,
      alignSelf: "flex-end",
      marginBottom: 8,
    },
    deviceType: {
      fontSize: 16,
      fontWeight: "bold",
      marginTop: 6,
      color: colorScheme === "dark" ? "#ffffff" : "#000000",
    },
    deviceLocation: {
      fontSize: 13,
      marginBottom: 4,
      color: colorScheme === "dark" ? "#B0BEC5" : "#757575",
    },
    deviceDetail: {
      fontSize: 13,
      marginTop: 2,
      color: colorScheme === "dark" ? "#B0BEC5" : "#757575",
    },
    deviceDetailBold: {
      fontWeight: "bold",
      color: colorScheme === "dark" ? "#ffffff" : "#000000",
    },
    statusPill: {
      backgroundColor: "#DBEEE6",
      width: 56,
      paddingVertical: 4,
      borderRadius: 16,
      alignSelf: "flex-end",
      alignItems: "center",
      marginTop: 6,
    },
    statusPillDark: {
      backgroundColor: "#333",
      width: 56,
      paddingVertical: 4,
      borderRadius: 16,
      alignSelf: "flex-end",
      alignItems: "center",
      marginTop: 6,
    },
    statusText: {
      color: "#1DB954",
      fontSize: 12,
      fontWeight: "bold",
    },
    statusTextDark: {
      color: "#A5FFCB",
      fontSize: 12,
      fontWeight: "bold",
    },
    turnOffBtn: {
      backgroundColor: "#A97664",
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: "center",
      marginTop: 18,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    turnOffBtnText: {
      color: "#fff",
      fontWeight: "bold",
      fontSize: 16,
      letterSpacing: 0.5,
    },
    textLight: {
      color: "#fff",
    },
    textDark: {
      color: "#23272F",
    },
    headerBackButton: {
      color: "#fff",
      fontSize: 24,
      fontWeight: "bold",
    },
    headerSearchButton: {
      color: "#fff",
      fontSize: 24,
    },
  });

export default DevicesActive;
