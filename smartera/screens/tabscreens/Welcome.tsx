import React from "react";
import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { StyleSheet, Text, Button, View } from "react-native";
import { NavigationProp } from "@react-navigation/native";

interface WelcomeProps {
	navigation: NavigationProp<any>;
}

export default function Welcome({ navigation }: WelcomeProps) {
	const colorScheme = useColorScheme() ?? "light";
	return (
		<View style={styles(colorScheme).container}>
			<Button title="Press me" onPress={() => navigation.navigate("StackMe")} />

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
