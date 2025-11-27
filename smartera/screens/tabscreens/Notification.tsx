import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../utils/api";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors, { withAlpha } from "../../utils/colors";

interface NotificationItemProps {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "alert" | "success" | "info";
  onDelete: (id: string) => void;
}

const NotificationItem = ({
  id,
  title,
  message,
  time,
  type,
  onDelete,
}: NotificationItemProps) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const themeColors = isDark ? Colors.dark : Colors.light;

  const getIconName = () => {
    switch (type) {
      case "alert":
        return "alert-circle";
      case "success":
        return "check-circle";
      case "info":
        return "info";
      default:
        return "bell";
    }
  };

  const getIconColor = () => {
    switch (type) {
      case "alert":
        return Colors.danger;
      case "success":
        return Colors.success;
      case "info":
        return Colors.info;
      default:
        return themeColors.textSecondary;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.notificationItem, { backgroundColor: themeColors.surface }]}
      onLongPress={() => {
        Alert.alert(
          "Delete Notification",
          "Are you sure you want to delete this notification?",
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => onDelete(id),
            },
          ]
        );
      }}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: withAlpha(getIconColor(), 0.15) },
        ]}
      >
        <Feather name={getIconName()} size={24} color={getIconColor()} />
      </View>
      <View style={styles.contentContainer}>
        <Text style={[styles.title, { color: themeColors.text }]}>{title}</Text>
        <Text style={[styles.message, { color: themeColors.textSecondary }]}>{message}</Text>
        <Text style={[styles.time, { color: themeColors.textTertiary }]}>{time}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => onDelete(id)}
      >
        <Feather name="trash-2" size={20} color={Colors.danger} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export default function Notification() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const isDark = theme === "dark";
  const themeColors = isDark ? Colors.dark : Colors.light;
  
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      title: string;
      message: string;
      time: string;
      type: "alert" | "success" | "info";
    }>
  >([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    // First try to load from local storage (faster)
    try {
      const storedNotifications = await AsyncStorage.getItem("notifications");
      if (storedNotifications) {
        setNotifications(JSON.parse(storedNotifications));
      }
    } catch (storageError) {
      console.log("Error loading from storage:", storageError);
    }

    // Then try to load from backend (might fail, that's okay)
    if (token) {
      try {
        const backendNotifications = await apiRequest(
          "/notifications",
          "GET",
          null,
          token
        );
        
        if (backendNotifications && Array.isArray(backendNotifications)) {
          const mapped = backendNotifications.map((notif: any) => ({
            id: notif._id || notif.id,
            title: notif.title,
            message: notif.message,
            time: new Date(notif.createdAt).toLocaleTimeString(),
            type: notif.type || 'info',
          }));
          setNotifications(mapped);
          // Save to local storage for offline access
          await AsyncStorage.setItem("notifications", JSON.stringify(mapped));
        }
      } catch (error) {
        // Backend failed - silently use local storage data
        // Don't show error to user, just use cached notifications
        console.log("Backend notifications unavailable, using local cache");
        
        // If no local cache exists, set default notifications
        const storedNotifications = await AsyncStorage.getItem("notifications");
        if (!storedNotifications || JSON.parse(storedNotifications).length === 0) {
          const defaultNotifications = [
            {
              id: "default-1",
              title: "Welcome to Smartera",
              message: "Start by adding your first smart device",
              time: "Just now",
              type: "info" as const,
            },
          ];
          setNotifications(defaultNotifications);
          await AsyncStorage.setItem("notifications", JSON.stringify(defaultNotifications));
        }
      }
    }
  }, [token]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, [loadNotifications]);

  const handleDelete = async (id: string) => {
    // Optimistically update UI first
    const updatedNotifications = notifications.filter(
      (notification) => notification.id !== id
    );
    setNotifications(updatedNotifications);

    // Save to local storage immediately
    try {
      await AsyncStorage.setItem(
        "notifications",
        JSON.stringify(updatedNotifications)
      );
    } catch (error) {
      console.log("Error saving to storage:", error);
    }

    // Try to delete from backend (don't block UI or show errors)
    if (token && !id.startsWith('default-')) {
      try {
        await apiRequest(`/notifications/${id}`, "DELETE", null, token);
      } catch (error) {
        // Silently fail - notification is already removed from local storage
        console.log("Backend delete failed (notification removed locally):", error);
      }
    }
  };

  const clearAllNotifications = async () => {
    Alert.alert(
      "Clear All Notifications",
      "Are you sure you want to clear all notifications?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("notifications");
              setNotifications([]);
            } catch (error) {
              console.error("Error clearing notifications:", error);
            }
          },
        },
      ]
    );
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
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {notifications.length > 0 && (
            <TouchableOpacity
              style={styles.clearAllButton}
              onPress={clearAllNotifications}
            >
              <Feather name="trash" size={20} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.headerSubtitle}>
          {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? "#fff" : Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        <View style={styles.notificationList}>
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                {...notification}
                onDelete={handleDelete}
              />
            ))
          ) : (
            <View style={[styles.emptyState, { backgroundColor: themeColors.surface }]}>
              <View style={[styles.emptyIcon, { backgroundColor: withAlpha(Colors.primary, 0.1) }]}>
                <Feather name="bell-off" size={32} color={Colors.primary} />
              </View>
              <Text style={[styles.emptyStateTitle, { color: themeColors.text }]}>
                All caught up!
              </Text>
              <Text style={[styles.emptyStateText, { color: themeColors.textSecondary }]}>
                You have no notifications at the moment
              </Text>
            </View>
          )}
        </View>
        
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },
  clearAllButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
  },
  scrollView: {
    flex: 1,
    marginTop: -15,
  },
  notificationList: {
    padding: 16,
    paddingTop: 24,
  },
  notificationItem: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  time: {
    fontSize: 12,
  },
  deleteButton: {
    padding: 8,
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    borderRadius: 20,
    marginTop: 20,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
