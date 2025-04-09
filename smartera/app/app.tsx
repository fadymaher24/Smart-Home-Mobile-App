import React from "react";
import { StyleSheet, Text, View } from "react-native";
import index from ".";

const App = () => {
	return (
		<View style={styles.container}>
			<Text>Welcome to Smartera!</Text>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#f5f5f5",
	},
});

export default App;
