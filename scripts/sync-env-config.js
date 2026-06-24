const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const backendEnvPath = path.join(repoRoot, 'Smartera-Backend', '.env');

const mobileEnvPath = path.join(repoRoot, 'smartera', '.env.local');
const mobileAppJsonPath = path.join(repoRoot, 'smartera', 'app.json');

const securityConfigPath = path.join(
  repoRoot,
  'Smartera-Hardware',
  'Smart Plug',
  'include',
  'security_config.h'
);

if (!fs.existsSync(backendEnvPath)) {
  throw new Error(`Missing backend env file: ${backendEnvPath}`);
}

const rawEnv = fs.readFileSync(backendEnvPath, 'utf8');
const env = Object.fromEntries(
  rawEnv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const separatorIndex = line.indexOf('=');
      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      return [key, value];
    })
);

const mqttBrokerUrl = env.MQTT_BROKER_URL;
if (!mqttBrokerUrl) {
  throw new Error('MQTT_BROKER_URL is required in Smartera-Backend/.env');
}

const parsedBroker = new URL(mqttBrokerUrl.includes('://') ? mqttBrokerUrl : `mqtt://${mqttBrokerUrl}`);
const mqttHost = parsedBroker.hostname;
const mqttPort = parsedBroker.port
  ? Number(parsedBroker.port)
  : parsedBroker.protocol === 'mqtts:'
    ? 8883
    : 1883;
const mqttUseTls = parsedBroker.protocol === 'mqtts:';

const apiPort = Number(env.PORT || '3000');
const apiBaseUrl = `http://${mqttHost}:${apiPort}/api`;
const provisioningApiUrl = `${apiBaseUrl}/provisioning/pending`;

const mqttUsername = env.MQTT_USERNAME || '';
const mqttPassword = env.MQTT_PASSWORD || '';

fs.writeFileSync(mobileEnvPath, `EXPO_PUBLIC_API_URL=${apiBaseUrl}\n`, 'utf8');

if (fs.existsSync(mobileAppJsonPath)) {
  const appJson = JSON.parse(fs.readFileSync(mobileAppJsonPath, 'utf8'));
  appJson.expo = appJson.expo || {};
  appJson.expo.extra = appJson.expo.extra || {};
  appJson.expo.extra.apiUrl = apiBaseUrl;
  fs.writeFileSync(mobileAppJsonPath, `${JSON.stringify(appJson, null, 2)}\n`, 'utf8');
}

if (fs.existsSync(securityConfigPath)) {
  let securityConfig = fs.readFileSync(securityConfigPath, 'utf8');

  securityConfig = securityConfig.replace(
    /inline const char\* DEFAULT_MQTT_HOST = ".*";/,
    `inline const char* DEFAULT_MQTT_HOST = "${mqttHost}";`
  );

  securityConfig = securityConfig.replace(
    /inline const int DEFAULT_MQTT_PORT = \d+;/,
    `inline const int DEFAULT_MQTT_PORT = ${mqttPort};`
  );

  securityConfig = securityConfig.replace(
    /inline const bool DEFAULT_USE_TLS = (true|false);/,
    `inline const bool DEFAULT_USE_TLS = ${mqttUseTls ? 'true' : 'false'};`
  );

  securityConfig = securityConfig.replace(
    /inline const char\* PROVISIONING_API_URL = ".*";/,
    `inline const char* PROVISIONING_API_URL = "${provisioningApiUrl}";`
  );

  securityConfig = securityConfig.replace(
    /inline const char\* DEFAULT_MQTT_USERNAME = ".*";/,
    `inline const char* DEFAULT_MQTT_USERNAME = "${mqttUsername}";`
  );

  securityConfig = securityConfig.replace(
    /inline const char\* DEFAULT_MQTT_PASSWORD = ".*";/,
    `inline const char* DEFAULT_MQTT_PASSWORD = "${mqttPassword}";`
  );

  fs.writeFileSync(securityConfigPath, securityConfig, 'utf8');
}

console.log('Synced API/MQTT settings from Smartera-Backend/.env');
console.log(`- MQTT host: ${mqttHost}`);
console.log(`- MQTT port: ${mqttPort}`);
console.log(`- MQTT TLS: ${mqttUseTls ? 'enabled' : 'disabled'}`);
console.log(`- Mobile API URL: ${apiBaseUrl}`);
