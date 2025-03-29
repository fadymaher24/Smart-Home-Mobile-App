import React from "react";
import { View, Text } from "react-native";
import { useState } from "react";
import { useRef } from "react";
import { ImageBackground } from "react-native";
import { StyleSheet } from "react-native";

function welcomescreen(props: React.PropsWithChildren<{}>) {
	return (
		<ImageBackground
			source={require("../assets/welcomescreen.png")}
			style={styles.background}
		>
			<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
				<Text style={{ fontSize: 20, color: "white" }}>
					Welcome to the App!
				</Text>
				<Text style={{ fontSize: 16, color: "white" }}>
					This is a sample welcome screen.
				</Text>
			</View>
		</ImageBackground>
	);
}

export default welcomescreen;

const styles = StyleSheet.create({
	background: {
		flex: 1,
		backgroundColor: "gainsboro",
		alignItems: "center",
		justifyContent: "center",
	},
});
