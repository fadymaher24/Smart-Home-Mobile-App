// import { NavigationContainer } from "@react-navigation/native";
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Feather from "@expo/vector-icons/Feather";

import Welcome from "../screens/Welcome";
import Settings from "../screens/Settings";
import Notification from "../screens/Notification";

const Tab = createBottomTabNavigator();

function TabGroup() {
	return (
		<Tab.Navigator
			screenOptions={({ route, navigation }) => ({
				headerShown: false,
				tabBarIcon: ({ color, focused, size }) => {
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
			})}
		>
			<Tab.Screen
				name="Welcome"
				component={Welcome}
				options={{
					tabBarIcon: ({ color, size }) => (
						<Feather name="home" size={size} color={color} />
					),
					tabBarLabel: "Home",
				}}
			/>
			<Tab.Screen
				name="Settings"
				component={Settings}
				options={{
					tabBarIcon: ({ color, size }) => (
						<Feather name="settings" size={size} color={color} />
					),
				}}
			/>
			<Tab.Screen
				name="Notification"
				component={Notification}
				options={{
					tabBarIcon: ({ color, size }) => (
						<Feather name="bell" size={size} color={color} />
					),
				}}
			/>
		</Tab.Navigator>
	);
}

export default function AppNavigation() {
	return <TabGroup />;
}
