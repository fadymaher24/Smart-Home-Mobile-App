import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
        return "#FF5252";
      case "success":
        return "#4CAF50";
      case "info":
        return "#2196F3";
      default:
        return "#757575";
    }
  };

  return (
    <TouchableOpacity
      style={styles(theme).notificationItem}
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
    >
      <View
        style={[
          styles(theme).iconContainer,
          { backgroundColor: `${getIconColor()}20` },
        ]}
      >
        <Feather name={getIconName()} size={24} color={getIconColor()} />
      </View>
      <View style={styles(theme).contentContainer}>
        <Text style={styles(theme).title}>{title}</Text>
        <Text style={styles(theme).message}>{message}</Text>
        <Text style={styles(theme).time}>{time}</Text>
      </View>
      <TouchableOpacity
        style={styles(theme).deleteButton}
        onPress={() => onDelete(id)}
      >
        <Feather
          name="trash-2"
          size={20}
          color={isDark ? "#FF5252" : "#FF5252"}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export default function Notification() {
  const { theme } = useTheme();
  const [notifications, setNotifications] = useState<
    Array<{
      id: string;
      title: string;
      message: string;
      time: string;
      type: "alert" | "success" | "info";
    }>
  >([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const storedNotifications = await AsyncStorage.getItem("notifications");
      if (storedNotifications) {
        setNotifications(JSON.parse(storedNotifications));
      } else {
        // Initialize with default notifications if none exist
        const defaultNotifications = [
          {
            id: "1",
            title: "High Power Usage",
            message: "Your living room AC is consuming more power than usual",
            time: "2m ago",
            type: "alert" as const,
          },
          {
            id: "2",
            title: "Device Connected",
            message: "New smart bulb connected successfully",
            time: "15m ago",
            type: "success" as const,
          },
          {
            id: "3",
            title: "System Update",
            message: "New features available for your smart home",
            time: "1h ago",
            type: "info" as const,
          },
        ];
        await AsyncStorage.setItem(
          "notifications",
          JSON.stringify(defaultNotifications)
        );
        setNotifications(defaultNotifications);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const updatedNotifications = notifications.filter(
        (notification) => notification.id !== id
      );
      await AsyncStorage.setItem(
        "notifications",
        JSON.stringify(updatedNotifications)
      );
      setNotifications(updatedNotifications);
    } catch (error) {
      console.error("Error deleting notification:", error);
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
    <ScrollView style={styles(theme).container}>
      <View style={styles(theme).header}>
        <Text style={styles(theme).headerTitle}>Notifications</Text>
        {notifications.length > 0 && (
          <TouchableOpacity
            style={styles(theme).clearAllButton}
            onPress={clearAllNotifications}
          >
            <Text style={styles(theme).clearAllText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles(theme).notificationList}>
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              {...notification}
              onDelete={handleDelete}
            />
          ))
        ) : (
          <View style={styles(theme).emptyState}>
            <Feather
              name="bell-off"
              size={48}
              color={theme === "dark" ? "#B0BEC5" : "#757575"}
            />
            <Text style={styles(theme).emptyStateText}>
              No notifications yet
            </Text>
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
    header: {
      padding: 20,
      paddingTop: 40,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "bold",
      color: colorScheme === "dark" ? "#ffffff" : "#000000",
      marginBottom: 16,
    },
    clearAllButton: {
      padding: 8,
    },
    clearAllText: {
      color: "#FF5252",
      fontSize: 16,
      fontWeight: "500",
    },
    notificationList: {
      padding: 16,
    },
    notificationItem: {
      flexDirection: "row",
      backgroundColor: colorScheme === "dark" ? "#1a1a1a" : "#f5f5f5",
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: colorScheme === "dark" ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 16,
    },
    contentContainer: {
      flex: 1,
    },
    title: {
      fontSize: 16,
      fontWeight: "600",
      color: colorScheme === "dark" ? "#ffffff" : "#000000",
      marginBottom: 4,
    },
    message: {
      fontSize: 14,
      color: colorScheme === "dark" ? "#B0BEC5" : "#757575",
      marginBottom: 8,
      lineHeight: 20,
    },
    time: {
      fontSize: 12,
      color: colorScheme === "dark" ? "#78909C" : "#9E9E9E",
    },
    deleteButton: {
      padding: 8,
      justifyContent: "center",
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
    },
    emptyStateText: {
      marginTop: 16,
      fontSize: 16,
      color: colorScheme === "dark" ? "#B0BEC5" : "#757575",
    },
  });
