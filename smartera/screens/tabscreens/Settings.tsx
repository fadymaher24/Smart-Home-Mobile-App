import React, { useState } from "react";
import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  Switch,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";

interface SettingItemProps {
  icon: string;
  title: string;
  value?: boolean;
  onPress?: () => void;
  onValueChange?: (value: boolean) => void;
  hasSwitch?: boolean;
  colorScheme: "light" | "dark";
}

const SettingItem = ({
  icon,
  title,
  value,
  onPress,
  onValueChange,
  hasSwitch,
  colorScheme,
}: SettingItemProps) => (
  <TouchableOpacity
    style={styles(colorScheme).settingItem}
    onPress={onPress}
    disabled={hasSwitch}
  >
    <View style={styles(colorScheme).settingLeft}>
      <Feather
        name={icon as any}
        size={24}
        color={colorScheme === "dark" ? "#fff" : "#000"}
      />
      <Text
        style={[
          styles(colorScheme).settingText,
          { color: colorScheme === "dark" ? "#fff" : "#000" },
        ]}
      >
        {title}
      </Text>
    </View>
    {hasSwitch ? (
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#767577", true: "#4CAF50" }}
        thumbColor={value ? "#fff" : "#f4f3f4"}
      />
    ) : (
      <Feather
        name="chevron-right"
        size={24}
        color={colorScheme === "dark" ? "#fff" : "#000"}
      />
    )}
  </TouchableOpacity>
);

export default function Settings() {
  const { theme, toggleTheme, isDarkMode } = useTheme();
  const { logout } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [locationServices, setLocationServices] = useState(true);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles(theme).container}>
      <View style={styles(theme).header}>
        <Text
          style={[
            styles(theme).headerTitle,
            { color: theme === "dark" ? "#fff" : "#000" },
          ]}
        >
          Settings
        </Text>
      </View>

      <View style={styles(theme).section}>
        <Text style={styles(theme).sectionTitle}>General</Text>
        <SettingItem
          icon="bell"
          title="Notifications"
          value={notifications}
          onValueChange={setNotifications}
          hasSwitch
          colorScheme={theme}
        />
        <SettingItem
          icon="moon"
          title="Dark Mode"
          value={isDarkMode}
          onValueChange={toggleTheme}
          hasSwitch
          colorScheme={theme}
        />
        <SettingItem
          icon="map-pin"
          title="Location Services"
          value={locationServices}
          onValueChange={setLocationServices}
          hasSwitch
          colorScheme={theme}
        />
      </View>

      <View style={styles(theme).section}>
        <Text style={styles(theme).sectionTitle}>Account</Text>
        <SettingItem
          icon="user"
          title="Profile"
          onPress={() => {}}
          colorScheme={theme}
        />
        <SettingItem
          icon="lock"
          title="Privacy"
          onPress={() => {}}
          colorScheme={theme}
        />
        <SettingItem
          icon="shield"
          title="Security"
          onPress={() => {}}
          colorScheme={theme}
        />
      </View>

      <View style={styles(theme).section}>
        <Text style={styles(theme).sectionTitle}>Support</Text>
        <SettingItem
          icon="help-circle"
          title="Help Center"
          onPress={() => {}}
          colorScheme={theme}
        />
        <SettingItem
          icon="info"
          title="About"
          onPress={() => {}}
          colorScheme={theme}
        />
      </View>

      <View style={styles(theme).section}>
        <Text style={styles(theme).sectionTitle}>Account</Text>
        <SettingItem
          icon="log-out"
          title="Logout"
          onPress={handleLogout}
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
      backgroundColor: colorScheme === "dark" ? "#000" : "#fff",
    },
    header: {
      padding: 20,
      paddingTop: 40,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "bold",
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "500",
      color: "#666",
      marginLeft: 20,
      marginBottom: 8,
    },
    settingItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      backgroundColor: colorScheme === "dark" ? "#1a1a1a" : "#f5f5f5",
      marginBottom: 1,
    },
    settingLeft: {
      flexDirection: "row",
      alignItems: "center",
    },
    settingText: {
      fontSize: 16,
      marginLeft: 12,
    },
  });
