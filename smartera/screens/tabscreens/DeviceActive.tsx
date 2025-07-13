import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import mqttService from "../../services/mqttService";

interface Device {
  id: string; // Unique plug/device ID
  type: string;
  location: string;
  status: string;
  icon: any;
  temp?: string;
  color?: string;
  channel?: string;
}

const locationOptions = [
  "Living Room",
  "Bedroom",
  "Kitchen",
  "Front Door",
  "Other",
];

const { width } = Dimensions.get("window");

const DeviceCard = ({
  device,
  onControl,
}: {
  device: Device;
  onControl: (id: string, action: string) => void;
}) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <TouchableOpacity
      style={[
        styles(theme).deviceCard,
        { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" },
      ]}
      onPress={() =>
        onControl(device.id, device.status === "Active" ? "turnOff" : "turnOn")
      }
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
  const [devices, setDevices] = useState<Device[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newPlugId, setNewPlugId] = useState("");
  const [newLocation, setNewLocation] = useState(locationOptions[0]);

  useEffect(() => {
    mqttService.onMessageCallback = (topic: string, message: string) => {
      const match = topic.match(/^plug\/(.+)\/status$/);
      if (match) {
        const plugId = match[1];
        setDevices((prev) =>
          prev.map((d) => (d.id === plugId ? { ...d, status: message } : d))
        );
      }
    };
    return () => {
      mqttService.onMessageCallback = null;
    };
  }, [devices]);

  const handleAddPlug = () => {
    if (!newPlugId) return;
    setDevices((prev) => [
      ...prev,
      {
        id: newPlugId,
        type: "Smart Plug",
        location: newLocation,
        status: "Inactive",
        icon: require("../../assets/icons/lamp.png"),
      },
    ]);
    setModalVisible(false);
    setNewPlugId("");
    setNewLocation(locationOptions[0]);

    // Set plugId in mqttService and subscribe to topics
    mqttService.setPlugId(newPlugId);

    // Only connect if not already connected
    if (mqttService.client && !mqttService.client.isConnected()) {
      console.log("[MQTT] Attempting to connect after adding plug...");
      mqttService.connect(
        () => console.log(`[MQTT] Connected after adding plug ${newPlugId}`),
        (err) => console.log(`[MQTT] Connection error after adding plug:`, err)
      );
    } else if (mqttService.client && mqttService.client.isConnected()) {
      console.log(`[MQTT] Already connected after adding plug ${newPlugId}`);
    } else {
      console.log("[MQTT] Client not initialized after adding plug.");
    }

    // Trace what is sent to the broker
    console.log(`[MQTT] Subscribed to plug topics for ${newPlugId}`);
  };

  const handleControl = (id: string, action: string) => {
    console.log(`[MQTT] Sending control: plug/${id}/control -> ${action}`);
    mqttService.publish(`plug/${id}/control`, action);
    Alert.alert("Sent", `Sent ${action} to plug ${id}`);
  };

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
          <TouchableOpacity
            style={styles(theme).addBtn}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles(theme).addBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles(theme).devicesGrid}>
          {devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onControl={handleControl}
            />
          ))}
        </View>
        {devices.length > 0 && (
          <TouchableOpacity
            style={styles(theme).turnOffBtn}
            onPress={() =>
              devices.forEach((d) => handleControl(d.id, "turnOff"))
            }
          >
            <Text style={styles(theme).turnOffBtnText}>
              Turn Off All Devices
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Modal for adding plug by ID and location */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#00000099",
          }}
        >
          <View
            style={{
              backgroundColor: theme === "dark" ? "#232526" : "#fff",
              padding: 24,
              borderRadius: 16,
              width: "80%",
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                marginBottom: 12,
                color: theme === "dark" ? "#fff" : "#23272F",
              }}
            >
              Add Smart Plug
            </Text>
            <TextInput
              placeholder="Enter Plug ID"
              value={newPlugId}
              onChangeText={setNewPlugId}
              style={{
                borderWidth: 1,
                borderColor: "#ccc",
                borderRadius: 8,
                padding: 10,
                marginBottom: 16,
                color: theme === "dark" ? "#fff" : "#23272F",
              }}
              placeholderTextColor={theme === "dark" ? "#B0BEC5" : "#757575"}
            />
            <Text
              style={{
                marginBottom: 8,
                color: theme === "dark" ? "#fff" : "#23272F",
              }}
            >
              Select Location:
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                marginBottom: 16,
              }}
            >
              {locationOptions.map((loc) => (
                <TouchableOpacity
                  key={loc}
                  style={{
                    backgroundColor: newLocation === loc ? "#A97664" : "#eee",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    marginRight: 8,
                    marginBottom: 8,
                  }}
                  onPress={() => setNewLocation(loc)}
                >
                  <Text
                    style={{ color: newLocation === loc ? "#fff" : "#23272F" }}
                  >
                    {loc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: "#A97664",
                padding: 12,
                borderRadius: 8,
                alignItems: "center",
              }}
              onPress={handleAddPlug}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                Add Plug
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginTop: 12, alignItems: "center" }}
              onPress={() => setModalVisible(false)}
            >
              <Text style={{ color: theme === "dark" ? "#fff" : "#23272F" }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
