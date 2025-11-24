// import { NavigationContainer } from "@react-navigation/native";
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { createDrawerNavigator } from "@react-navigation/drawer";

import "react-native-gesture-handler";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import Feather from "@expo/vector-icons/Feather";
import { View, StyleSheet, Text } from "react-native";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import { AuthProvider, useAuth } from "../context/AuthContext";

import Home from "../screens/tabscreens/Home";
import Settings from "../screens/tabscreens/Settings";
import Notification from "../screens/tabscreens/Notification";
import StackMe from "../screens/HomeStack/Stackme";
import DevicesActive from "@/screens/tabscreens/DeviceActive";
import PowerUsage from "../screens/tabscreens/PowerUsage";
import LoginScreen from "../screens/LoginScreen";

const HomeStack = createNativeStackNavigator();
const drawer = createDrawerNavigator();

function drawerScreen() {
  return (
    <drawer.Navigator screenOptions={{ headerShown: false }}>
      <drawer.Screen name="MainHome" component={HomeStackScreen} />
      <drawer.Screen
        name="Settings"
        component={Settings}
        options={{ headerShown: true }}
      />
      <drawer.Screen
        name="Notification"
        component={Notification}
        options={{ headerShown: true }}
      />
    </drawer.Navigator>
  );
}

function HomeStackScreen() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="HomeStackHome"
        component={Home}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen name="StackMe" component={StackMe} />
    </HomeStack.Navigator>
  );
}

const Tab = createBottomTabNavigator();

function TabGroup() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size, focused }) => {
          let iconName:
            | "home"
            | "settings"
            | "bell"
            | "smartphone"
            | "activity"
            | undefined;
          if (route.name === "Home") {
            iconName = "home";
          }
          if (route.name === "Settings") {
            iconName = "settings";
          }
          if (route.name === "Notification") {
            iconName = "bell";
          }
          if (route.name === "DeviceActive") {
            iconName = "smartphone";
          }
          if (route.name === "Power Usage") {
            iconName = "activity";
          }
          return (
            <View
              style={[
                styles.iconContainer,
                focused && styles.activeIconContainer,
              ]}
            >
              {iconName && (
                <Feather name={iconName} size={size} color={color} />
              )}
              {focused && <View style={styles.activeIndicator} />}
            </View>
          );
        },
        tabBarActiveTintColor: "#4CAF50",
        tabBarInactiveTintColor: "#9E9E9E",
        tabBarStyle: {
          backgroundColor: isDark ? "#212121" : "#ffffff",
          borderTopWidth: 0,
          elevation: 0,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          position: "absolute",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
          marginTop: 4,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackScreen}
        options={{
          tabBarLabel: "Home",
        }}
      />
      <Tab.Screen
        name="DeviceActive"
        component={DevicesActive}
        options={{
          tabBarLabel: "Devices",
        }}
      />
      <Tab.Screen
        name="Power Usage"
        component={PowerUsage}
        options={{
          tabBarLabel: "Power",
        }}
      />
      <Tab.Screen
        name="Settings"
        component={Settings}
        options={{
          tabBarLabel: "Settings",
        }}
      />
      <Tab.Screen
        name="Notification"
        component={Notification}
        options={{
          tabBarLabel: "Alerts",
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 50,
    height: 30,
  },
  activeIconContainer: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: 15,
    padding: 8,
  },
  activeIndicator: {
    position: "absolute",
    bottom: -8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#4CAF50",
  },
});

// Main app component with authentication wrapper
function MainApp() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!token) {
    return <LoginScreen />;
  }

  return <TabGroup />;
}

export default function Index() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
