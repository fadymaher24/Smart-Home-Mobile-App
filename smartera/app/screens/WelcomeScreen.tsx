import React from "react";
import { View, Text, Image } from "react-native";
import { useState } from "react";
import { useRef } from "react";
import { ImageBackground } from "react-native";
import { StyleSheet } from "react-native";
import colors from "../config/colors";

function WelcomeScreen(props: React.PropsWithChildren<{}>) {
	return (
		<ImageBackground
			source={require("../assets/WelcomeScreen.png")}
			style={styles.background}
		>
			<Image source={require("../assets/logo-smart.png")} style={styles.logo} />

			<View style={styles.loginButton}>
				<Text>Login</Text>
			</View>
			<View style={styles.registerButton}>
				<Text>Register</Text>
			</View>
			<View style={styles.loginButton}>
				<Text>Forgot Password?</Text>
			</View>
			<View style={styles.loginButton}>
				<Text>Continue as Guest</Text>
			</View>
		</ImageBackground>
	);
}

export default WelcomeScreen;

const styles = StyleSheet.create({
	background: {
		flex: 1,
		backgroundColor: colors.primary,
		alignItems: "center",
		justifyContent: "flex-end",
	},
	logo: {
		width: 50,
		height: 50,
		position: "absolute",
		top: 70,
		left: 190,
		alignItems: "center",
		borderRadius: 50,
		justifyContent: "center",
	},
	loginButton: {
		backgroundColor: "#fc5c65",
		padding: 10,
		borderRadius: 5,
		marginTop: 20,
		width: "100%",
		height: 70,
		alignItems: "center",
		justifyContent: "center",
	},
	registerButton: {
		backgroundColor: "#4ECDC4",
		width: "100%",
		height: 70,
		alignItems: "center",
		justifyContent: "center",
	},
});
