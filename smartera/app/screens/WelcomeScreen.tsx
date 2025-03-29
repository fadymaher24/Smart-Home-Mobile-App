import React from "react";
import { View, Text, Image } from "react-native";
import { useState } from "react";
import { useRef } from "react";
import { ImageBackground } from "react-native";
import { StyleSheet } from "react-native";
import colors from "../config/colors";

function WelcomeScreen(props: React.PropsWithChildren<{}>) {
	return (
		// <ImageBackground
		// 	source={require("../assets/WelcomeScreen.png")}
		// 	style={styles.background}
		// >
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
			<View style={styles.loginButton}>
				<Text style={styles.Text}>Login</Text>
			</View>
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
		// </ImageBackground>
	);
}

export default WelcomeScreen;

const styles = StyleSheet.create({
	background: {
		flex: 10,
		alignItems: "center",
		justifyContent: "flex-end",
		backgroundColor:
			"linear-gradient(45deg, rgb(0, 0, 102), rgb(0, 51, 153), rgb(0, 102, 204))", // Dark blue gradient
	},
	logo: {
		width: 50,
		height: 50,
		// // position: "absolute",
		// top: 70,
		// left: 190,
		alignItems: "center",
		borderRadius: 50,
		justifyContent: "center",
		marginBottom: 200,
	},
	loginButton: {
		backgroundColor: "#003366", // Dark blue shade
		fontSize: 30,
		fontWeight: "bold",
		color: "#ffffff", // White text
		alignItems: "center",
		justifyContent: "center",
		textAlign: "center",
		borderRadius: 50,
		padding: 20,
		borderColor: "#ffffff", // White border
		elevation: 20,
		shadowColor: "#000000", // Black shadow
		shadowOffset: { width: 2, height: 4 },
		shadowOpacity: 0.8,
		width: 200,
		marginBottom: 20,
	},
	registerButton: {
		backgroundColor: "#004080", // Slightly lighter blue
		fontSize: 30,
		fontWeight: "bold",
		color: "#ffffff", // White text
		alignItems: "center",
		justifyContent: "center",
		textAlign: "center",
		borderRadius: 50,
		padding: 20,
		borderColor: "#ffffff", // White border
		elevation: 20,
		shadowColor: "#000000", // Black shadow
		shadowOffset: { width: 2, height: 4 },
		shadowOpacity: 0.8,
		width: 200,
		marginBottom: 20,
	},
	forgotPasswordButton: {
		backgroundColor: "#0059b3", // Medium blue
		fontSize: 20,
		fontWeight: "bold",
		color: "#ffffff", // White text
		alignItems: "center",
		justifyContent: "center",
		textAlign: "center",
		borderRadius: 50,
		padding: 20,
		borderColor: "#ffffff", // White border
		elevation: 20,
		shadowColor: "#000000", // Black shadow
		shadowOffset: { width: 2, height: 4 },
		shadowOpacity: 0.8,
		width: 200,
		marginBottom: 20,
	},
	guestButton: {
		backgroundColor: "#0066cc", // Light blue
		fontSize: 20,
		fontWeight: "bold",
		color: "#ffffff", // White text
		alignItems: "center",
		justifyContent: "center",
		textAlign: "center",
		borderRadius: 50,
		padding: 20,
		borderColor: "#ffffff", // White border
		elevation: 20,
		shadowColor: "#000000", // Black shadow
		shadowOffset: { width: 2, height: 4 },
		shadowOpacity: 0.8,
		width: 200,
		marginBottom: 200,
	},
	button: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#ffffff", // White text
		alignItems: "center",
		justifyContent: "center",
		textAlign: "center",
		borderRadius: 50,
		backgroundColor: "#0059b3", // Medium blue
		padding: 20,
		borderColor: "#ffffff", // White border
		elevation: 20,
		shadowColor: "#000000", // Black shadow
		shadowOffset: { width: 2, height: 4 },
		shadowOpacity: 0.8,
		width: 200,
		marginBottom: 20,
	},
	Text: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#ffffff", // White text
		alignItems: "center",
		justifyContent: "center",
		textAlign: "center",
	},
});
