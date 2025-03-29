import React from "react";
import { StyleSheet, Text, View } from "react-native";
import WelcomeScreen from "./app/screens/WelcomeScreen";
import Navigator from "./routes/homestack";
import * as Font from "expo-font";

const getFonts = () => {
	return Font.loadAsync({
		"Roboto-Black": require("./assets/fonts/Roboto-Black.ttf"),
		"Roboto-Bold": `require("./assets/fonts/Roboto-Bold.ttf"),
		"Roboto-Light": require("./assets/fonts/Roboto-Light.ttf"),
		"Roboto-Medium": require("./assets/fonts/Roboto-Medium.ttf"),
		"Roboto-Regular": require("./assets/fonts/Roboto-Regular.ttf"),
	});
};
export default function App() {
	const [fontsLoaded, setFontsLoaded] = React.useState(false);
	React.useEffect(() => {
		getFonts().then(() => setFontsLoaded(true));
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
