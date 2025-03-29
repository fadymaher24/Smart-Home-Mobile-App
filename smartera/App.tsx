import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import WelcomeScreen from "./app/screens/WelcomeScreen";
import Navigator from "./routes/homestack";
import * as Font from "expo-font";

export default function App() {
	const [fontsLoaded, setFontsLoaded] = useState(false);

	useEffect(() => {
		async function loadFonts() {
			await Font.loadAsync({
				"Roboto-Black": require("./app/assets/fonts/Roboto-Black.ttf"),
				"Roboto-Bold": require("./app/assets/fonts/Roboto-Bold.ttf"),
				"Roboto-Light": require("./app/assets/fonts/Roboto-Light.ttf"),
				"Roboto-Medium": require("./app/assets/fonts/Roboto-Medium.ttf"),
				"Roboto-Regular": require("./app/assets/fonts/Roboto-Regular.ttf"),
			});
			setFontsLoaded(true);
		}
		loadFonts();
	}, []);

	if (!fontsLoaded) {
		return <WelcomeScreen />;
	}

	return <Navigator />;
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "gainsboro",
		alignItems: "center",
		justifyContent: "center",
	},
});
