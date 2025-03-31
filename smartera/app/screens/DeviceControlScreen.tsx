import React, { useState, useEffect } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	ActivityIndicator,
	Alert,
} from "react-native";
import { Switch } from "react-native-paper"; // You'll need to install react-native-paper
import mqttService from "../Services/mqttService"; // Adjust the import path as necessary

interface DeviceStates {
	device1: boolean;
	device2: boolean;
}

const DeviceControlScreen: React.FC = () => {
	const [isConnected, setIsConnected] = useState<boolean>(false);
	const [loading, setLoading] = useState<boolean>(true);
	const [deviceStates, setDeviceStates] = useState<DeviceStates>({
		device1: false,
		device2: false,
	});

	// MQTT Topics (replace with your actual topics)
	const TOPICS: Record<string, string> = {
		DEVICE1_CONTROL: "home/device1/control",
		DEVICE1_STATUS: "home/device1/status",
		DEVICE2_CONTROL: "home/device2/control",
		DEVICE2_STATUS: "home/device2/status",
	};

	useEffect(() => {
		// Initialize MQTT connection
		initializeMQTT();

		return () => {
			// Clean up on unmount
			mqttService.unsubscribe(TOPICS.DEVICE1_STATUS);
			mqttService.unsubscribe(TOPICS.DEVICE2_STATUS);
			mqttService.disconnect();
		};
	}, []);

	const initializeMQTT = (): void => {
		setLoading(true);

		mqttService.connect(
			() => {
				// On successful connection
				setIsConnected(true);
				setLoading(false);

				// Subscribe to status topics
				mqttService.subscribe(TOPICS.DEVICE1_STATUS, handleStatusUpdate);
				mqttService.subscribe(TOPICS.DEVICE2_STATUS, handleStatusUpdate);

				// Request current status
				mqttService.publish(TOPICS.DEVICE1_STATUS, "get");
				mqttService.publish(TOPICS.DEVICE2_STATUS, "get");
			},
			(error: string) => {
				// Handle connection error
				console.error("MQTT connection error:", error);
				setIsConnected(false);
				setLoading(false);
			}
		);
	};

	const handleStatusUpdate = (topic: string, message: string): void => {
		try {
			const status =
				message.trim().toLowerCase() === "on" || message.trim() === "1";

			if (topic === TOPICS.DEVICE1_STATUS) {
				setDeviceStates((prev) => ({ ...prev, device1: status }));
			} else if (topic === TOPICS.DEVICE2_STATUS) {
				setDeviceStates((prev) => ({ ...prev, device2: status }));
			}
		} catch (error) {
			console.error("Error processing status update:", error);
		}
	};

	const toggleDevice = (device: keyof DeviceStates): void => {
		if (!isConnected) {
			Alert.alert("Connection Error", "Not connected to MQTT broker");
			return;
		}

		const newState = !deviceStates[device];
		const topic =
			device === "device1" ? TOPICS.DEVICE1_CONTROL : TOPICS.DEVICE2_CONTROL;
		const message = newState ? "on" : "off";

		const success = mqttService.publish(topic, message);
		if (!success) {
			Alert.alert("Error", "Failed to send command to device");
		} else {
			// Optimistic UI update - only update if publish succeeds
			setDeviceStates((prev) => ({ ...prev, [device]: newState }));
		}
	};

	const handleReconnect = (): void => {
		if (loading) return; // Prevent multiple reconnection attempts
		setIsConnected(false);
		setLoading(true);
		initializeMQTT();
	};

	if (loading) {
		return (
			<View style={styles.container}>
				<ActivityIndicator size="large" color="#6200ee" />
				<Text style={styles.connectingText}>Connecting to IoT Hub...</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			{!isConnected && (
				<View style={styles.connectionStatus}>
					<Text style={styles.connectionError}>Disconnected from IoT Hub</Text>
					<TouchableOpacity
						style={styles.reconnectButton}
						onPress={handleReconnect}
					>
						<Text style={styles.reconnectButtonText}>Reconnect</Text>
					</TouchableOpacity>
				</View>
			)}

			<View style={styles.deviceContainer}>
				<Text style={styles.deviceLabel}>Device 1</Text>
				<Switch
					value={deviceStates.device1}
					onValueChange={() => toggleDevice("device1")}
					color="#6200ee"
					style={styles.switch}
				/>
				<Text style={styles.deviceStatus}>
					{deviceStates.device1 ? "ON" : "OFF"}
				</Text>
			</View>

			<View style={styles.deviceContainer}>
				<Text style={styles.deviceLabel}>Device 2</Text>
				<Switch
					value={deviceStates.device2}
					onValueChange={() => toggleDevice("device2")}
					color="#6200ee"
					style={styles.switch}
				/>
				<Text style={styles.deviceStatus}>
					{deviceStates.device2 ? "ON" : "OFF"}
				</Text>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f5f5f5",
		padding: 20,
		justifyContent: "center",
	},
	deviceContainer: {
		backgroundColor: "white",
		borderRadius: 10,
		padding: 20,
		marginBottom: 20,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
	},
	deviceLabel: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#333",
	},
	deviceStatus: {
		fontSize: 16,
		color: "#666",
	},
	switch: {
		transform: [{ scaleX: 1.3 }, { scaleY: 1.3 }],
	},
	connectingText: {
		marginTop: 20,
		fontSize: 16,
		color: "#666",
	},
	connectionStatus: {
		backgroundColor: "#ffebee",
		padding: 15,
		borderRadius: 8,
		marginBottom: 30,
		alignItems: "center",
	},
	connectionError: {
		color: "#c62828",
		fontSize: 16,
		marginBottom: 10,
	},
	reconnectButton: {
		backgroundColor: "#6200ee",
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: 5,
	},
	reconnectButtonText: {
		color: "white",
		fontWeight: "bold",
	},
});

export default DeviceControlScreen;
