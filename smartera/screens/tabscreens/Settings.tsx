import React, { useState } from "react";
import "react-native-gesture-handler";
import {
  StyleSheet,
  Text,
  View,
  Switch,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import Colors, { withAlpha } from "../../utils/colors";

interface SettingItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  value?: boolean;
  onPress?: () => void;
  onValueChange?: (value: boolean) => void;
  hasSwitch?: boolean;
  isDark: boolean;
  isDanger?: boolean;
}

const SettingItem = ({
  icon,
  title,
  subtitle,
  value,
  onPress,
  onValueChange,
  hasSwitch,
  isDark,
  isDanger,
}: SettingItemProps) => {
  const theme = isDark ? Colors.dark : Colors.light;
  
  return (
    <TouchableOpacity
      style={[styles.settingItem, { backgroundColor: theme.surface }]}
      onPress={onPress}
      disabled={hasSwitch}
      activeOpacity={0.7}
    >
      <View style={[
        styles.settingIcon, 
        { backgroundColor: withAlpha(isDanger ? Colors.danger : Colors.primary, 0.1) }
      ]}>
        <Feather
          name={icon as any}
          size={20}
          color={isDanger ? Colors.danger : Colors.primary}
        />
      </View>
      <View style={styles.settingContent}>
        <Text style={[
          styles.settingText,
          { color: isDanger ? Colors.danger : theme.text },
        ]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.settingSubtext, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {hasSwitch ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: theme.surfaceVariant, true: Colors.primary }}
          thumbColor={value ? "#fff" : "#f4f3f4"}
          ios_backgroundColor={theme.surfaceVariant}
        />
      ) : (
        <Feather
          name="chevron-right"
          size={20}
          color={theme.textTertiary}
        />
      )}
    </TouchableOpacity>
  );
};

export default function Settings() {
  const { theme, toggleTheme, isDarkMode } = useTheme();
  const { logout, user } = useAuth();
  const isDark = theme === "dark";
  const themeColors = isDark ? Colors.dark : Colors.light;
  
  const [notifications, setNotifications] = useState(true);
  const [locationServices, setLocationServices] = useState(true);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Gradient Header */}
      <LinearGradient
        colors={isDark ? Colors.gradients.primaryDark : Colors.gradients.primary}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.headerTitle}>Settings</Text>
        
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Feather name="user" size={28} color={Colors.primary} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'User'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'user@example.com'}</Text>
          </View>
          <TouchableOpacity style={styles.editButton}>
            <Feather name="edit-2" size={18} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* General Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>
            General
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: themeColors.surface }]}>
            <SettingItem
              icon="bell"
              title="Notifications"
              subtitle="Push and in-app alerts"
              value={notifications}
              onValueChange={setNotifications}
              hasSwitch
              isDark={isDark}
            />
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
            <SettingItem
              icon="moon"
              title="Dark Mode"
              subtitle="Switch between light and dark"
              value={isDarkMode}
              onValueChange={toggleTheme}
              hasSwitch
              isDark={isDark}
            />
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
            <SettingItem
              icon="map-pin"
              title="Location Services"
              subtitle="Enable for automation triggers"
              value={locationServices}
              onValueChange={setLocationServices}
              hasSwitch
              isDark={isDark}
            />
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>
            Account
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: themeColors.surface }]}>
            <SettingItem
              icon="user"
              title="Profile"
              subtitle="Manage your account"
              onPress={() => {}}
              isDark={isDark}
            />
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
            <SettingItem
              icon="lock"
              title="Privacy"
              subtitle="Data and sharing preferences"
              onPress={() => {}}
              isDark={isDark}
            />
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
            <SettingItem
              icon="shield"
              title="Security"
              subtitle="Password and authentication"
              onPress={() => {}}
              isDark={isDark}
            />
          </View>
        </View>

        {/* Devices Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>
            Devices
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: themeColors.surface }]}>
            <SettingItem
              icon="wifi"
              title="Connected Devices"
              subtitle="Manage smart devices"
              onPress={() => {}}
              isDark={isDark}
            />
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
            <SettingItem
              icon="home"
              title="Rooms"
              subtitle="Organize your spaces"
              onPress={() => {}}
              isDark={isDark}
            />
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>
            Support
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: themeColors.surface }]}>
            <SettingItem
              icon="help-circle"
              title="Help Center"
              subtitle="FAQ and guides"
              onPress={() => {}}
              isDark={isDark}
            />
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
            <SettingItem
              icon="info"
              title="About"
              subtitle="Version and legal info"
              onPress={() => {}}
              isDark={isDark}
            />
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          <View style={[styles.sectionCard, { backgroundColor: themeColors.surface }]}>
            <SettingItem
              icon="log-out"
              title="Logout"
              onPress={handleLogout}
              isDark={isDark}
              isDanger
            />
          </View>
        </View>

        {/* App Version */}
        <Text style={[styles.version, { color: themeColors.textTertiary }]}>
          Smartera v1.0.0
        </Text>

        {/* Bottom spacing */}
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
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  profileEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    marginTop: -15,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 8,
    marginBottom: 10,
  },
  sectionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingContent: {
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginLeft: 68,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 24,
  },
});
