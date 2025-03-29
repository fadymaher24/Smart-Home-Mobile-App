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
					color: colors.black,
					position: "absolute",
					top: 200,
				}}
			>
				Welcome to Smart Home
			</Text>
			<View style={styles.loginButton}>
				<Text>Login</Text>
			</View>
			<View style={styles.registerButton}>
				<Text>Register</Text>
			</View>
			<View style={styles.button}>
				<Text>Login with Google</Text>
				<Text>Forgot Password?</Text>
			</View>
			<View style={styles.button}>
				<Text>Continue as Guest</Text>
			</View>
		</View>
		// </ImageBackground>
	);
}

export default WelcomeScreen;

const styles = StyleSheet.create({
	background: {
		flex: 1,
		// backgroundColor: colors.white,
		alignItems: "center",
		justifyContent: "flex-end",
		backgroundColor:
			"linear-gradient(45deg,rgb(51, 0, 172),rgb(255, 255, 255))", // Cool gradient background
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
		fontSize: 30,
		fontWeight: "bold",
		color: colors.black,
		alignItems: "center",
		justifyContent: "center",
		textAlign: "center",
		borderRadius: 50,
		padding: 20,
		borderColor: colors.black,
		elevation: 20,
		shadowColor: colors.black,
		shadowOffset: { width: 2, height: 4 },
		shadowOpacity: 0.8,
		width: 200,
		marginBottom: 90,
	},
	registerButton: {
		backgroundColor: "#4ECDC4",
		fontSize: 30,
		fontWeight: "bold",
		color: colors.black,
		alignItems: "center",
		justifyContent: "center",
		textAlign: "center",
		borderRadius: 50,
		padding: 20,
		borderColor: colors.black,
		elevation: 20,
		shadowColor: colors.black,
		shadowOffset: { width: 2, height: 4 },
		shadowOpacity: 0.8,
		width: 200,
		marginBottom: 90,
	},
	button: {
		fontSize: 30,
		fontWeight: "bold",
		color: colors.black,
		alignItems: "center",
		justifyContent: "center",
		textAlign: "center",
		borderRadius: 50,
		backgroundColor: colors.primary,
		padding: 20,
		borderColor: colors.black,
		elevation: 20,
		shadowColor: colors.black,
		shadowOffset: { width: 2, height: 4 },
		shadowOpacity: 0.8,
		width: 200,
		marginBottom: 90,
	},
});
