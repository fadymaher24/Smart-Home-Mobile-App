import React from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

const devices = [
  {
    type: "AC",
    location: "Kitchen",
    temp: "14",
    icon: require("../../assets/icons/ac.png"),
    status: "OFF",
  },
  {
    type: "Lamp",
    location: "Dining room",
    color: "White",
    icon: require("../../assets/icons/lamp.png"),
    status: "OFF",
  },
  {
    type: "Lamp",
    location: "Bed room",
    color: "Yellow",
    icon: require("../../assets/icons/lamp.png"),
    status: "OFF",
  },
  {
    type: "AC",
    location: "Living room",
    temp: "19",
    icon: require("../../assets/icons/ac.png"),
    status: "OFF",
  },
  {
    type: "TV",
    location: "Bed room",
    channel: "TVN",
    icon: require("../../assets/icons/tv.png"),
    status: "OFF",
  },
  {
    type: "AC",
    location: "Bedroom",
    temp: "12",
    icon: require("../../assets/icons/ac.png"),
    status: "OFF",
  },
];

type Device = {
  type: string;
  location: string;
  temp?: string;
  color?: string;
  channel?: string;
  icon: any;
  status: string;
};

const { width } = Dimensions.get("window");

const DeviceCard = ({ device }: { device: Device }) => {
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  return (
    <View
      style={[
        styles.deviceCard,
        isDark ? styles.deviceCardDark : styles.deviceCardLight,
      ]}
    >
      <Image
        source={device.icon}
        style={styles.deviceIcon}
        resizeMode="contain"
      />
      {device.temp && (
        <Text
          style={[
            styles.deviceDetail,
            isDark ? styles.textLight : styles.textDark,
          ]}
        >
          Temperature{" "}
          <Text style={styles.deviceDetailBold}>{device.temp}°C</Text>
        </Text>
      )}
      {device.color && (
        <Text
          style={[
            styles.deviceDetail,
            isDark ? styles.textLight : styles.textDark,
          ]}
        >
          Color <Text style={styles.deviceDetailBold}>{device.color}</Text>
        </Text>
      )}
      {device.channel && (
        <Text
          style={[
            styles.deviceDetail,
            isDark ? styles.textLight : styles.textDark,
          ]}
        >
          Channel <Text style={styles.deviceDetailBold}>{device.channel}</Text>
        </Text>
      )}
      <Text
        style={[styles.deviceType, isDark ? styles.textLight : styles.textDark]}
      >
        {device.type}
      </Text>
      <Text
        style={[
          styles.deviceLocation,
          isDark ? styles.textLight : styles.textDark,
        ]}
      >
        {device.location}
      </Text>
      <View style={isDark ? styles.statusPillDark : styles.statusPill}>
        <Text style={isDark ? styles.statusTextDark : styles.statusText}>
          {device.status}
        </Text>
      </View>
    </View>
  );
};

const DevicesActive = () => {
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  return (
    <View style={[styles.container, isDark ? styles.bgDark : styles.bgLight]}>
      {/* Header */}
      <LinearGradient
        colors={isDark ? ["#232526", "#414345"] : ["#579BB1", "#337CA0"]}
        style={styles.headerGradient}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity>
            <Ionicons
              name="arrow-back"
              size={24}
              color="#fff"
              onPress={() => router.push("/Welcome")}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Devices Active</Text>
          <Ionicons name="search" size={24} color="#fff" />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.topRow}>
          <Text
            style={[
              styles.activeTitle,
              isDark ? styles.textLight : styles.textDark,
            ]}
          >
            Device Active{" "}
            <Text style={styles.activeCount}>{devices.length}</Text>
          </Text>
          <TouchableOpacity style={styles.addBtn}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.deviceGrid}>
          {devices.map((device, index) => (
            <DeviceCard key={index} device={device} />
          ))}
        </View>

        <TouchableOpacity style={styles.turnOffBtn}>
          <Text style={styles.turnOffBtnText}>Turn Off All Devices</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  deviceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  deviceCard: {
    width: width * 0.44,
    backgroundColor: "#A97664",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  deviceCardLight: {
    backgroundColor: "#A97664",
  },
  deviceCardDark: {
    backgroundColor: "#232526",
    borderWidth: 1,
    borderColor: "#444",
  },
  deviceIcon: {
    height: 56,
    width: 56,
    alignSelf: "flex-end",
    marginBottom: 8,
  },
  deviceDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  deviceDetailBold: {
    fontWeight: "bold",
  },
  deviceType: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 6,
  },
  deviceLocation: {
    fontSize: 13,
    marginBottom: 4,
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
});

export default DevicesActive;
