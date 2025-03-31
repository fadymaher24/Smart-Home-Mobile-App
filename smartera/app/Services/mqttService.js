import mqtt from "mqtt";
import { envConfig } from "../config/environment.js";
import { emitStateError } from "./errorHandler.js";

/**
 * @typedef {{
 * 	ssl: boolean,
 * 	setMqttStatus: (status: import('../hooks/useMqttConnection').MqttStatus) => void,
 *  setMqttError: (error: string) => void,
 *  uniqueId: string,
 * 	onMessage: (topic: string, message: any) => void,
 * }} CreateMqttClientOptions
 */

/**
 * @param {CreateMqttClientOptions} options
 *
 * @returns {mqtt.MqttClient}
 */
function createMqttClient({
	setMqttStatus,
	setMqttError,
	uniqueId,
	onMessage,
}) {
	const ssl = envConfig.MQTT_SSL;
	const host = envConfig.MQTT_HOST;
	const path = "/mqtt"; // HiveMQ WebSocket path
	const protocolVersion = envConfig.MQTT_VERSION;
	let port = envConfig.MQTT_PORT;
	let protocol = "ws";

	if (ssl) {
		protocol = "wss"; // Use secure WebSocket if SSL is enabled
	}

	const client = mqtt
		.connect({
			protocol,
			host,
			port,
			path,
			protocolVersion,
			clientId: uniqueId,
			username: envConfig.MQTT_USERNAME,
			password: envConfig.MQTT_PASSWORD,
			reconnectPeriod: 5000,
			queueQoSZero: true,
			resubscribe: true,
			clean: true,
			keepalive: 30,
			properties:
				protocolVersion === 5
					? {
							sessionExpiryInterval: 600,
					  }
					: undefined,
			forceNativeWebSocket: true,
		})
		.on("connect", () => {
			setMqttStatus("Connected");
		})
		.on("error", (error) => {
			setMqttStatus("Error");
			emitStateError(setMqttError, "MqttGeneral", error);
		})
		.on("disconnect", (packet) => {
			setMqttStatus("Disconnected");
		})
		.on("offline", () => {
			setMqttStatus("Offline");
		})
		.on("reconnect", () => {
			setMqttStatus("Reconnecting");
		})
		.on("close", () => {
			setMqttStatus("Disconnected");
		})
		.on("message", (topic, message, packet) => {
			onMessage(topic, message);
		});

	return client;
}

let mqttClient = null;

/**
 * Connect to the MQTT broker.
 * @param {() => void} onConnect - Callback for successful connection.
 * @param {(error: string) => void} onError - Callback for connection errors.
 */
function connect(onConnect, onError) {
	if (!mqttClient) {
		mqttClient = createMqttClient({
			setMqttStatus: (status) => console.log("MQTT Status:", status),
			setMqttError: (error) => onError(error),
			uniqueId: `smartera_${Math.random().toString(16).substr(2, 8)}`,
			onMessage: (topic, message) =>
				console.log(`Message received: ${topic} - ${message}`),
		});
	}

	mqttClient.on("connect", onConnect);
	mqttClient.on("error", onError);
}

/**
 * Disconnect from the MQTT broker.
 */
function disconnect() {
	if (mqttClient) {
		mqttClient.end(true);
		mqttClient = null;
	}
}

/**
 * Subscribe to a topic.
 * @param {string} topic - The topic to subscribe to.
 * @param {(topic: string, message: string) => void} onMessage - Callback for received messages.
 */
function subscribe(topic, onMessage) {
	if (mqttClient) {
		mqttClient.subscribe(topic, (err) => {
			if (err) {
				console.error(`Failed to subscribe to topic: ${topic}`, err);
			}
		});
		mqttClient.on("message", (receivedTopic, message) => {
			if (receivedTopic === topic) {
				onMessage(receivedTopic, message.toString());
			}
		});
	}
}

/**
 * Unsubscribe from a topic.
 * @param {string} topic - The topic to unsubscribe from.
 */
function unsubscribe(topic) {
	if (mqttClient) {
		mqttClient.unsubscribe(topic, (err) => {
			if (err) {
				console.error(`Failed to unsubscribe from topic: ${topic}`, err);
			}
		});
	}
}

/**
 * Publish a message to a topic.
 * @param {string} topic - The topic to publish to.
 * @param {string} message - The message to publish.
 * @returns {boolean} - Whether the publish was successful.
 */
function publish(topic, message) {
	if (mqttClient) {
		try {
			mqttClient.publish(topic, message);
			return true;
		} catch (error) {
			console.error(`Failed to publish message to topic: ${topic}`, error);
			return false;
		}
	}
	return false;
}

export default {
	connect,
	disconnect,
	subscribe,
	unsubscribe,
	publish,
};

export { createMqttClient };
