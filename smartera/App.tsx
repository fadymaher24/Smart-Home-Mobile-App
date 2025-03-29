import React from "react";
import { StyleSheet, Text, View } from "react-native";

import WelcomeScreen from "./app/screens/WelcomeScreen";

export default function App() {
	return <WelcomeScreen />;
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "gainsboro",
		alignItems: "center",
		justifyContent: "center",
	},
});
