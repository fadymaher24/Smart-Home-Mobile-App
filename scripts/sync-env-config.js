const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const backendEnvPath = path.join(repoRoot, 'Smartera-Backend', '.env');

const mobileEnvPath = path.join(repoRoot, 'smartera', '.env.local');

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

const apiPort = Number(env.PORT || '3000');
const apiBaseUrl = env.API_BASE_URL || `http://localhost:${apiPort}/api`;
fs.writeFileSync(mobileEnvPath, `EXPO_PUBLIC_API_URL=${apiBaseUrl}\n`, 'utf8');

console.log('Synced local mobile API setting from Smartera-Backend/.env');
console.log(`- Mobile API URL: ${apiBaseUrl}`);
