import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import colors from "../config/colors"; // Assuming you have a colors config file
import { useNavigation } from "@react-navigation/native";

function WelcomeScreen(props) {
	const navigation = useNavigation();

	return (
		<View style={styles.background}>
			<Image source={require("../assets/logo-smart.png")} style={styles.logo} />
			<Text
				style={{
					fontSize: 30,
					fontWeight: "bold",
					color: colors.white,
					position: "absolute",
					top: 200,
				}}
			>
				Welcome to Smart Home
			</Text>
			<TouchableOpacity
				style={styles.loginButton}
				onPress={() => navigation.navigate("DeviceControl")}
			>
				<Text style={styles.Text}>Login</Text>
			</TouchableOpacity>
			<View style={styles.registerButton}>
				<Text style={styles.Text}>Register</Text>
			</View>
			<View style={styles.forgotPasswordButton}>
				<Text style={styles.Text}>Forgot Password?</Text>
			</View>
			<View style={styles.guestButton}>
				<Text style={styles.Text}>Continue as Guest</Text>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	// ...existing code...
});

export default WelcomeScreen;
