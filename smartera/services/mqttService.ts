// MqttService.js

import { Client, Message } from 'paho-mqtt';

interface MqttServiceConfig {
    brokerHost: string;
    brokerPort: number;
    clientId: string;
    useSSL: boolean;
    protocol: 'mqtt' | 'mqtts' | 'ws' | 'wss';
    path?: string;
    username?: string;
    password?: string;
}

// Define a `Qos` enum for MQTT quality of service levels
enum Qos {
    AtMostOnce = 0,
    AtLeastOnce = 1,
    ExactlyOnce = 2,
}

class MqttService {
    client: any = null;
    plugId: string | null = null;
    onMessageCallback: ((topic: string, message: string) => void) | null = null;
    onConnectionStatusChange: ((status: 'connected' | 'disconnected' | 'error') => void) | null = null;
    qos: number = 1;
    retain: boolean = false;

    /**
     * Initializes the MQTT client with broker details.
     * @param brokerHost - e.g., 'broker.emqx.io'
     * @param brokerPort - e.g., 8084 (for wss)
     * @param clientId - A unique client ID for this app instance
     */
    public initializeClient(config: MqttServiceConfig): void {
        if (this.client) {
            console.warn("MQTT client already initialized. Call disconnect first if you want to re-initialize.");
            return;
        }
        // Initialize the MQTT bridge (required for window.Paho)
        const host = config.brokerHost;
        const port = config.brokerPort;
        const clientId = config.clientId;
        this.client = new Client(host, port, config.path || "/mqtt", clientId);

        // Assign event handlers
        this.client.onMessageArrived = (msg: any) => {
            if (this.onMessageCallback) {
                this.onMessageCallback(msg.destinationName, msg.payloadString);
            } 
        };
        this.client.onConnectionLost = (err: any) => {
            if (this.onConnectionStatusChange) {
                this.onConnectionStatusChange('disconnected');
            }
        };

        // Connect with EMQX login (username/password if needed)
        this.client.connect({
            useSSL: config.useSSL,
            mqttVersion: 4,
            onSuccess: () => {
                if (this.onConnectionStatusChange) {
                    this.onConnectionStatusChange('connected');
                }
            },
            onFailure: () => {
                if (this.onConnectionStatusChange) {
                    this.onConnectionStatusChange('error');
                }
            },
            keepAliveInterval: 60,
            cleanSession: true,
            userName: config.username,
            password: config.password,
        });
    }

    /**
     * Sets the unique ID of the smart plug this app instance is currently interacting with.
     * This is crucial for topic management.
     * @param {string} id - The unique ID of the smart plug.
     */
    setPlugId(id: string) {
        if (!id) return;
        // If a new plugId is set, we might need to unsubscribe from old topics
        // and subscribe to new ones if already connected.
        if (this.plugId && this.plugId !== id && this.client && this.client.isConnected()) {
            this._unsubscribeFromPlugTopics(this.plugId);
        }
        this.plugId = id;
        if (this.client && this.client.isConnected()) {
            this._subscribeToPlugTopics(this.plugId);
        }
    }

    getPlugId() {
        return this.plugId;
    }

    /**
     * Connects to the MQTT broker.
     * Ensure `initializeClient` has been called first.
     */
    connect(onConnect?: () => void, onError?: (err: any) => void) {
        if (!this.client) return;
        if (this.client.isConnected()) {
            console.warn("MQTT client is already connected.");
            return;
        }
        this.client.connect({
            onSuccess: () => {
                if (onConnect) onConnect();
                if (this.onConnectionStatusChange) this.onConnectionStatusChange('connected');
                if (this.plugId) this._subscribeToPlugTopics(this.plugId);
            },
            onFailure: (err: any) => {
                if (onError) onError(err);
                if (this.onConnectionStatusChange) this.onConnectionStatusChange('error');
            },
            useSSL: true,
            keepAliveInterval: 60,
            cleanSession: true,
        });
    }

    /**
     * Disconnects from the MQTT broker.
     */
    disconnect() {
        if (this.client && this.client.isConnected()) {
            if (this.plugId) this._unsubscribeFromPlugTopics(this.plugId);
            this.client.disconnect();
            this.plugId = null;
        }
    }

    /**
     * Subscribes to the specific topics for a given plug ID.
     * We'll use a clear topic structure:
     * - `smartplug/{plugId}/status`: For the plug to publish its status (on/off, power consumption, etc.)
     * - `smartplug/{plugId}/command`: For the mobile app to send commands to the plug (turn on/off)
     * - `smartplug/{plugId}/config_request`: For the app to request configuration
     * - `smartplug/{plugId}/config_response`: For the plug to respond with configuration
     * @param {string} id - The unique ID of the smart plug.
     */
    _subscribeToPlugTopics(id: string) {
        if (!this.client || !this.client.isConnected()) return;
        console.log(`Subscribing to topics for plug ID: ${id}`);
        this.client.subscribe(`smartplug/${id}/status`);
        this.client.subscribe(`smartplug/${id}/config_response`);
    }

    /**
     * Unsubscribes from topics associated with a specific plug ID.
     * @param {string} id - The unique ID of the smart plug.
     */
    _unsubscribeFromPlugTopics(id: string) {
        if (!this.client || !this.client.isConnected()) return;
        console.log(`Unsubscribing from topics for plug ID: ${id}`);
        this.client.unsubscribe(`smartplug/${id}/status`);
        this.client.unsubscribe(`smartplug/${id}/config_response`);
    }

    /**
     * Publishes a message to a specific topic.
     * @param {string} topicSuffix - The suffix of the topic (e.g., 'command', 'config_request').
     * @param {string} message - The payload to send.
     */
    public publish(topic: string, message: string): void {
        if (!this.client || !this.client.isConnected()) {
            console.warn("Cannot publish: MQTT client not connected.");
            return;
        }
        // Paho publish logic
        const mqttMsg = new Message(message);
        mqttMsg.destinationName = topic;
        mqttMsg.qos = this.qos as Qos; // Cast `qos` to the `Qos` enum
        mqttMsg.retained = this.retain;
        this.client.send(mqttMsg);
    }

    /**
     * Registers a callback function to handle incoming MQTT messages.
     * @param {function(topic: string, message: string)} callback - The function to call when a message is received.
     */
    setOnMessageCallback(callback: (topic: string, message: string) => void) {
        this.onMessageCallback = callback;
    }

    /**
     * Registers a callback function for connection status changes.
     * @param {function(status: 'connected' | 'disconnected' | 'error')} callback - The function to call when status changes.
     */
    setOnConnectionStatusChange(callback: (status: 'connected'|'disconnected'|'error') => void) {
        this.onConnectionStatusChange = callback;
    }

    /**
     * Helper to send a command to the plug (e.g., turn on/off).
     * @param {string} command - The command string (e.g., 'ON', 'OFF').
     */
    sendCommand(command: string) {
        this.publish('command', command);
    }

    /**
     * Helper to request configuration from the plug.
     */
    requestConfig() {
        this.publish('config_request', 'GET_CONFIG');
    }
}

// Export a singleton instance of the MqttService
const mqttService = new MqttService();
export default mqttService;