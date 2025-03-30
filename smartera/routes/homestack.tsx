// In App.js in a new project

import * as React from "react";
import { View, Text } from "react-native";
import { createStaticNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import WelcomeScreen from "../app/screens/WelcomeScreen";
import DeviceControlScreen from "../app/screens/DeviceControlScreen";

const RootStack = createNativeStackNavigator({
	screens: {
		Home: WelcomeScreen,
	},
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
	return <Navigation />;
}
