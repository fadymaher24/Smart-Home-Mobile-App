// import { NavigationContainer } from "@react-navigation/native";
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { createDrawerNavigator } from "@react-navigation/drawer";

import "react-native-gesture-handler";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import Feather from "@expo/vector-icons/Feather";

import Home from "../screens/tabscreens/Home";
import Settings from "../screens/tabscreens/Settings";
import Notification from "../screens/tabscreens/Notification";
import StackMe from "../screens/HomeStack/Stackme";
import DevicesActive from "@/screens/tabscreens/DeviceActive";

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
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: "home" | "settings" | "bell" | "smartphone" | undefined;
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
          return iconName ? (
            <Feather name={iconName} size={size} color={color} />
          ) : null;
        },
        tabBarActiveTintColor: "#4CAF50", // Cool green
        tabBarInactiveTintColor: "#9E9E9E", // Neutral gray
        tabBarStyle: {
          backgroundColor: "#212121", // Dark background
          borderTopWidth: 0,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStackScreen} />
      <Tab.Screen name="DeviceActive" component={DevicesActive} />
      <Tab.Screen name="Settings" component={Settings} />
      <Tab.Screen name="Notification" component={Notification} />
    </Tab.Navigator>
  );
}

export default function index() {
  return (
    <TabGroup />
    // drawerScreen()
  );
}
