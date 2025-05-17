import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function Home() {
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";

  return (
    <LinearGradient
      colors={isDark ? ["#0F2027", "#203A43", "#2C5364"] : ["#E0F7FA", "#fff"]}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <Text
            style={[
              styles.greeting,
              isDark ? styles.textLight : styles.textDark,
            ]}
          >
            Good Morning,
          </Text>
          <Text
            style={[
              styles.username,
              isDark ? styles.textLight : styles.textDark,
            ]}
          >
            Fady Maher
          </Text>

          <View
            style={[
              styles.weatherCard,
              isDark ? styles.cardDark : styles.cardLight,
            ]}
          >
            <View>
              <Text
                style={[
                  styles.date,
                  isDark ? styles.textLight : styles.textDark,
                ]}
              >
                Oct 16, 2025 10:05 AM
              </Text>
              <Text
                style={[
                  styles.condition,
                  isDark ? styles.textLight : styles.textDark,
                ]}
              >
                Cloudy
              </Text>
              <Text
                style={[
                  styles.location,
                  isDark ? styles.textLight : styles.textDark,
                ]}
              >
                Cairo, Egypt
              </Text>
            </View>
            <View style={styles.weatherRight}>
              <Feather
                name="cloud"
                size={32}
                color={isDark ? "#fff" : "#333"}
              />
              <Text
                style={[
                  styles.temp,
                  isDark ? styles.textLight : styles.textDark,
                ]}
              >
                19°C
              </Text>
            </View>
          </View>

          <View style={styles.weatherDetails}>
            <Text style={isDark ? styles.textLight : styles.textDark}>
              💧 97% Humidity
            </Text>
            <Text style={isDark ? styles.textLight : styles.textDark}>
              🌫️ 7 km Visibility
            </Text>
            <Text style={isDark ? styles.textLight : styles.textDark}>
              🌬️ 3 km/h NE Wind
            </Text>
          </View>
        </View>

        {/* Rooms Section */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              isDark ? styles.textLight : styles.textDark,
            ]}
          >
            Rooms
          </Text>
          <View style={styles.cardRow}>
            {["Living Room", "Bedroom"].map((room, i) => (
              <View
                key={room}
                style={[
                  styles.roomCard,
                  isDark ? styles.cardDark : styles.cardLight,
                ]}
              >
                <Text
                  style={[
                    styles.roomTemp,
                    isDark ? styles.textLight : styles.textDark,
                  ]}
                >
                  {i === 0 ? "19°C" : "12°C"}
                </Text>
                <Text
                  style={[
                    styles.roomName,
                    isDark ? styles.textLight : styles.textDark,
                  ]}
                >
                  {room}
                </Text>
                <Text
                  style={[
                    styles.deviceCount,
                    isDark ? styles.textLight : styles.textDark,
                  ]}
                >
                  {i === 0 ? "5" : "8"} devices
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Active Devices Section */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              isDark ? styles.textLight : styles.textDark,
            ]}
          >
            Active Devices
          </Text>
          <View style={styles.cardRow}>
            {[
              { name: "AC", detail: "Temperature: 19°C", status: "OFF" },
              { name: "Lamp", detail: "Color: White", status: "OFF" },
            ].map((device) => (
              <View
                key={device.name}
                style={[
                  styles.deviceCard,
                  isDark ? styles.cardDark : styles.cardLight,
                ]}
              >
                <Text
                  style={[
                    styles.deviceName,
                    isDark ? styles.textLight : styles.textDark,
                  ]}
                >
                  {device.name}
                </Text>
                <Text style={isDark ? styles.textLight : styles.textDark}>
                  {device.detail}
                </Text>
                <Text style={isDark ? styles.textLight : styles.textDark}>
                  Status: {device.status}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 50,
  },
  textLight: {
    color: "#fff",
  },
  textDark: {
    color: "#1A1A1A",
  },
  headerContainer: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 20,
    fontWeight: "600",
  },
  username: {
    fontSize: 18,
    marginBottom: 10,
  },
  weatherCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    marginTop: 10,
    elevation: 4,
  },
  cardLight: {
    backgroundColor: "#fff",
    shadowColor: "#999",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  cardDark: {
    backgroundColor: "#2C3E50",
    borderColor: "#444",
    borderWidth: 1,
  },
  weatherRight: {
    alignItems: "center",
  },
  date: {
    fontSize: 12,
    marginBottom: 4,
  },
  condition: {
    fontSize: 16,
    fontWeight: "600",
  },
  location: {
    fontSize: 12,
    marginTop: 4,
  },
  temp: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 4,
  },
  weatherDetails: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  roomCard: {
    width: width * 0.43,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  roomTemp: {
    fontSize: 16,
    fontWeight: "600",
  },
  roomName: {
    fontSize: 16,
    marginVertical: 8,
    fontWeight: "700",
  },
  deviceCount: {
    fontSize: 12,
  },
  deviceCard: {
    width: width * 0.43,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
});
