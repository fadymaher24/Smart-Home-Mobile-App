const mqtt = require('mqtt');
require('dotenv').config();

const brokerUrl = `mqtts://${process.env.MQTT_BROKER_URL}`;
const options = {
  port: parseInt(process.env.BROKER_PORT, 10),
  clientId: process.env.CLIENT_ID.replace('${RANDOM_ID}', Math.random().toString(16).substr(2, 8)),
  username: process.env.MQTT_USERNAME || '',
  password: process.env.MQTT_PASSWORD || '',
};

const client = mqtt.connect(brokerUrl, options);

client.on('connect', () => {
  console.log('Connected to HiveMQ broker');
});

client.on('error', (err) => {
  console.error('MQTT connection error:', err.message);
});

client.on('close', () => {
  console.log('MQTT connection closed');
});

const publishMessage = (topic, message) => {
  return new Promise((resolve, reject) => {
    client.publish(topic, message, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

const turnSwitchOn = async () => {
  try {
    await publishMessage('smartera/switch', 'ON');
    console.log('Switch turned ON');
  } catch (error) {
    console.error('Error turning switch ON:', error.message);
  }
};

const turnSwitchOff = async () => {
  try {
    await publishMessage('smartera/switch', 'OFF');
    console.log('Switch turned OFF');
  } catch (error) {
    console.error('Error turning switch OFF:', error.message);
  }
};

module.exports = { turnSwitchOn, turnSwitchOff };
