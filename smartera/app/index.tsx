// import { NavigationContainer } from "@react-navigation/native";
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import "react-native-gesture-handler";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import Feather from "@expo/vector-icons/Feather";

import Welcome from "../screens/tabscreens/Welcome";
import Settings from "../screens/tabscreens/Settings";
import Notification from "../screens/tabscreens/Notification";

const HomeStack = createNativeStackNavigator();

function HomeStackScreen() {
	return (
		<HomeStack.Navigator>
			<HomeStack.Screen name="Welcome" component={Welcome} />
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
					let iconName: "home" | "settings" | "bell" | undefined;
					if (route.name === "Welcome") {
						iconName = "home";
					}
					if (route.name === "Settings") {
						iconName = "settings";
					}
					if (route.name === "Notification") {
						iconName = "bell";
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
			<Tab.Screen name="Welcome" component={Welcome} />
			<Tab.Screen name="Settings" component={Settings} />
			<Tab.Screen name="Notification" component={Notification} />
		</Tab.Navigator>
	);
}

export default function index() {
	return <TabGroup />;
}
