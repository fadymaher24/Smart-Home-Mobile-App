import { Client } from "react-native-paho-mqtt";
class MQTTService {
	constructor() {
		this.client = null;
		this.isConnected = false;
		this.subscriptions = {};
		this.reconnectAttempts = 0;
		this.maxReconnectAttempts = 5;
		this.reconnectDelay = 3000; // 3 seconds
	}

	// Initialize connection to HiveMQ
	connect = (onConnectCallback, onMessageCallback) => {
		// Replace with your HiveMQ broker details
		const brokerUrl = "wss://your-hivemq-broker-url:8884/mqtt";
		const options = {
			clientId:
				"react-native-client-" + Math.random().toString(16).substr(2, 8),
			username: "your-username", // if required
			password: "your-password", // if required
			clean: true,
			reconnectPeriod: 0, // we handle reconnection manually
		};

		try {
			this.client = Client(brokerUrl, options);

			this.client.on("connect", () => {
				this.isConnected = true;
				this.reconnectAttempts = 0;
				console.log("Connected to HiveMQ");
				if (onConnectCallback) onConnectCallback();
			});

			this.client.on("message", (topic, message) => {
				if (onMessageCallback) onMessageCallback(topic, message.toString());
			});

			this.client.on("error", (error) => {
				console.error("MQTT Error:", error);
				this.handleConnectionError();
			});

			this.client.on("close", () => {
				console.log("MQTT Connection closed");
				this.isConnected = false;
				this.handleConnectionError();
			});

			this.client.on("offline", () => {
				console.log("MQTT Client offline");
				this.isConnected = false;
				this.handleConnectionError();
			});
		} catch (error) {
			console.error("MQTT Initialization Error:", error);
			this.handleConnectionError();
		}
	};

	handleConnectionError = () => {
		if (this.reconnectAttempts < this.maxReconnectAttempts) {
			this.reconnectAttempts++;
			console.log(
				`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
			);
			setTimeout(() => {
				this.connect();
			}, this.reconnectDelay);
		} else {
			console.error(
				"Max reconnection attempts reached. Please check your network connection."
			);
		}
	};

	// Publish a message to a topic
	publish = (topic, message, options = { qos: 0, retain: false }) => {
		if (!this.isConnected || !this.client) {
			console.error("MQTT Client not connected");
			return false;
		}

		try {
			this.client.publish(topic, message, options);
			return true;
		} catch (error) {
			console.error("Publish Error:", error);
			return false;
		}
	};

	// Subscribe to a topic
	subscribe = (topic, callback) => {
		if (!this.isConnected || !this.client) {
			console.error("MQTT Client not connected");
			return false;
		}

		try {
			if (!this.subscriptions[topic]) {
				this.client.subscribe(topic, { qos: 0 }, (err) => {
					if (err) {
						console.error("Subscription Error:", err);
					} else {
						this.subscriptions[topic] = callback;
						console.log(`Subscribed to ${topic}`);
					}
				});
			}
			return true;
		} catch (error) {
			console.error("Subscribe Error:", error);
			return false;
		}
	};

	// Unsubscribe from a topic
	unsubscribe = (topic) => {
		if (!this.isConnected || !this.client) {
			console.error("MQTT Client not connected");
			return false;
		}

		try {
			if (this.subscriptions[topic]) {
				this.client.unsubscribe(topic);
				delete this.subscriptions[topic];
				console.log(`Unsubscribed from ${topic}`);
			}
			return true;
		} catch (error) {
			console.error("Unsubscribe Error:", error);
			return false;
		}
	};

	// Disconnect from the broker
	disconnect = () => {
		if (this.client && this.isConnected) {
			try {
				this.client.end();
				this.isConnected = false;
				this.subscriptions = {};
				console.log("Disconnected from MQTT broker");
				return true;
			} catch (error) {
				console.error("Disconnection Error:", error);
				return false;
			}
		}
		return false;
	};
}

const mqttService = new MQTTService();
export default mqttService;
