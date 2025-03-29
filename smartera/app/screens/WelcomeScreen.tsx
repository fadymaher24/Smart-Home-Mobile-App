import React from "react";
import { View, Text } from "react-native";
import { useState } from "react";
import { useRef } from "react";
import { ImageBackground } from "react-native";
import { StyleSheet } from "react-native";

function WelcomeScreen(props: React.PropsWithChildren<{}>) {
	return (
		<ImageBackground
			source={require("../assets/WelcomeScreen.png")}
			style={styles.background}
		>
			<View style={styles.loginButton}>
				<Text>Login</Text>
			</View>
			<View style={styles.loginButton}>
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
		backgroundColor: "gainsboro",
		alignItems: "center",
		justifyContent: "flex-end",
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
});
