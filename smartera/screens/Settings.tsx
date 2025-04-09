import React from "react";
import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { StyleSheet, Text, View } from "react-native";

export default function Settings() {
	const colorScheme = useColorScheme() ?? "light";
	return (
		<View style={styles(colorScheme).container}>
			<Text style={{ color: colorScheme === "dark" ? "#fff" : "#000" }}>
				Settings
			</Text>
			<StatusBar style="auto" />
		</View>
	);
}

const styles = (colorScheme: "dark" | "light") =>
	StyleSheet.create({
		container: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			backgroundColor: colorScheme === "dark" ? "#000" : "#fff",
		},
	});
