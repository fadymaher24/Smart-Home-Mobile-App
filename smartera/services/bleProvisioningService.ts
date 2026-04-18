import { PermissionsAndroid, Platform } from 'react-native';

export interface BleDiscoveredPlug {
  id: string;
  name: string;
  serialNumber: string;
  rssi: number;
}

export interface BleGatewayStatus {
  deviceId: string;
  gatewayEnabled: boolean;
  pairedRemotes: number;
  clientConnected: boolean;
  transport?: string;
}

export type SmarteraRemoteAction =
  | 'pair'
  | 'unpair'
  | 'relay_on'
  | 'relay_off'
  | 'relay_toggle'
  | 'gateway_enable'
  | 'gateway_disable';

interface ProvisionOverBleInput {
  serialNumber: string;
  ssid: string;
  password: string;
  token?: string;
}

interface RemoteCommandInput {
  serialNumber: string;
  action: SmarteraRemoteAction;
  remoteId: string;
}

interface BleManagerLike {
  state: () => Promise<string>;
  onStateChange: (listener: (state: string) => void, emitCurrentState: boolean) => { remove: () => void };
  connectToDevice: (deviceId: string, options?: { timeout?: number }) => Promise<any>;
  cancelDeviceConnection: (deviceIdentifier: string) => Promise<any>;
  startDeviceScan: (
    uuids: string[] | null,
    options: Record<string, unknown> | null,
    listener: (error: { message?: string } | null, device: any | null) => void
  ) => void;
  stopDeviceScan: () => void;
}

const BLE_NAME_PREFIX = 'Smartera-';
const BLE_SERVICE_UUID = '5af13000-88f6-4a20-b0ce-c45f6695d550';
const BLE_PROVISION_CHAR_UUID = '5af13001-88f6-4a20-b0ce-c45f6695d550';
const BLE_REMOTE_CHAR_UUID = '5af13002-88f6-4a20-b0ce-c45f6695d550';
const BLE_STATUS_CHAR_UUID = '5af13003-88f6-4a20-b0ce-c45f6695d550';

const DEFAULT_SCAN_TIMEOUT_MS = 7000;
const DEFAULT_REMOTE_ID = 'smartera-app';

let bleManagerInstance: BleManagerLike | null = null;

const toBase64 = (value: string): string => {
  const globalBuffer = (globalThis as { Buffer?: { from: (input: string, encoding?: string) => { toString: (enc: string) => string } } }).Buffer;
  if (globalBuffer) {
    return globalBuffer.from(value, 'utf-8').toString('base64');
  }

  const bufferModule = require('buffer').Buffer;
  return bufferModule.from(value, 'utf-8').toString('base64');
};

const fromBase64 = (value: string): string => {
  const globalBuffer = (globalThis as { Buffer?: { from: (input: string, encoding?: string) => { toString: (enc: string) => string } } }).Buffer;
  if (globalBuffer) {
    return globalBuffer.from(value, 'base64').toString('utf-8');
  }

  const bufferModule = require('buffer').Buffer;
  return bufferModule.from(value, 'base64').toString('utf-8');
};

const getPlugSerialFromName = (name: string): string | null => {
  if (!name.startsWith(BLE_NAME_PREFIX)) {
    return null;
  }

  const serial = name.slice(BLE_NAME_PREFIX.length).trim();
  return serial.length > 0 ? serial : null;
};

const normalizeSerial = (serial: string): string => serial.trim().toUpperCase();

const getAndroidBlePermissions = (): string[] => {
  const sdkVersion = Number(Platform.Version || 0);

  if (sdkVersion >= 31) {
    return [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ];
  }

  return [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
};

const ensureBlePermissions = async (): Promise<void> => {
  if (Platform.OS !== 'android') {
    return;
  }

  const requiredPermissions = getAndroidBlePermissions();
  const missingPermissions: string[] = [];

  for (const permission of requiredPermissions) {
    const granted = await PermissionsAndroid.check(permission as any);
    if (!granted) {
      missingPermissions.push(permission);
    }
  }

  if (missingPermissions.length === 0) {
    return;
  }

  const requested = (await PermissionsAndroid.requestMultiple(
    requiredPermissions as any
  )) as Record<string, string>;

  const denied = requiredPermissions.filter(
    permission => requested[permission] !== PermissionsAndroid.RESULTS.GRANTED
  );

  if (denied.length > 0) {
    throw new Error(
      'Bluetooth pairing requires Nearby devices and Location permissions. Enable them in Android settings and retry.'
    );
  }
};

const getBleLibrary = () => {
  try {
    return require('react-native-ble-plx');
  } catch {
    throw new Error(
      'Bluetooth module is not available. Install react-native-ble-plx and run a native build to use Smartera-Remote fast pairing.'
    );
  }
};

const getBleManager = (): BleManagerLike => {
  if (bleManagerInstance) {
    return bleManagerInstance;
  }

  const { BleManager } = getBleLibrary();
  bleManagerInstance = new BleManager() as BleManagerLike;
  return bleManagerInstance;
};

const ensureBluetoothReady = async (manager: BleManagerLike): Promise<void> => {
  const currentState = await manager.state();
  if (currentState === 'PoweredOn') {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      subscription.remove();
      reject(new Error('Bluetooth is off. Turn on Bluetooth and try again.'));
    }, 8000);

    const subscription = manager.onStateChange((state: string) => {
      if (state === 'PoweredOn') {
        clearTimeout(timeout);
        subscription.remove();
        resolve();
      }
    }, true);
  });
};

const scanForPlugs = async (targetSerial?: string, timeoutMs = DEFAULT_SCAN_TIMEOUT_MS): Promise<BleDiscoveredPlug[]> => {
  await ensureBlePermissions();

  const manager = getBleManager();
  await ensureBluetoothReady(manager);

  const desiredSerial = targetSerial ? normalizeSerial(targetSerial) : null;

  return await new Promise<BleDiscoveredPlug[]>((resolve, reject) => {
    const plugs = new Map<string, BleDiscoveredPlug>();
    let settled = false;

    const finish = (error?: Error) => {
      if (settled) {
        return;
      }
      settled = true;

      try {
        manager.stopDeviceScan();
      } catch {}

      clearTimeout(timeoutHandle);

      if (error) {
        reject(error);
        return;
      }

      const list = Array.from(plugs.values()).sort((a, b) => b.rssi - a.rssi);
      resolve(list);
    };

    const timeoutHandle = setTimeout(() => {
      finish();
    }, timeoutMs);

    manager.startDeviceScan(null, null, (scanError, device) => {
      if (scanError) {
        finish(new Error(scanError.message || 'Bluetooth scan failed'));
        return;
      }

      if (!device) {
        return;
      }

      const rawName = (device.name || device.localName || '').trim();
      const serialNumber = getPlugSerialFromName(rawName);
      if (!serialNumber) {
        return;
      }

      const normalized = normalizeSerial(serialNumber);
      if (desiredSerial && normalized !== desiredSerial) {
        return;
      }

      plugs.set(device.id, {
        id: device.id,
        name: rawName,
        serialNumber: normalized,
        rssi: typeof device.rssi === 'number' ? device.rssi : -100,
      });

      if (desiredSerial && normalized === desiredSerial) {
        finish();
      }
    });
  });
};

const connectToPlug = async (serialNumber: string): Promise<any> => {
  let plugs = await scanForPlugs(serialNumber);
  let selectedPlug = plugs[0];

  if (!selectedPlug) {
    const nearby = await scanForPlugs();

    if (nearby.length === 1) {
      selectedPlug = nearby[0];
    } else if (nearby.length > 1) {
      const found = nearby.map(device => device.serialNumber).join(', ');
      throw new Error(
        `No nearby plug matched serial ${serialNumber}. Found these Smartera plugs instead: ${found}. Enter the exact serial and retry.`
      );
    } else {
      throw new Error(
        `No nearby Smartera plug found for serial ${serialNumber}. Make sure the plug is powered and in Bluetooth pairing mode.`
      );
    }
  }

  const manager = getBleManager();
  const connected = await manager.connectToDevice(selectedPlug.id, { timeout: 12000 });
  await connected.discoverAllServicesAndCharacteristics();
  return connected;
};

const safeDisconnect = async (device: any): Promise<void> => {
  if (!device) {
    return;
  }

  const manager = getBleManager();

  if (device.id) {
    try {
      await manager.cancelDeviceConnection(device.id);
      return;
    } catch {}
  }

  try {
    const connected = await device.isConnected();
    if (connected) {
      await device.cancelConnection();
    }
  } catch {}
};

class BleProvisioningService {
  isSupported(): boolean {
    return Platform.OS !== 'web';
  }

  async discoverPlugs(targetSerial?: string): Promise<BleDiscoveredPlug[]> {
    if (!this.isSupported()) {
      throw new Error('Bluetooth pairing is not supported on web. Use native iOS/Android app for Smartera-Remote pairing.');
    }
    return scanForPlugs(targetSerial);
  }

  async provisionDevice(input: ProvisionOverBleInput): Promise<{ deviceName: string; serialNumber: string }> {
    if (!this.isSupported()) {
      throw new Error('Bluetooth provisioning is not available on web.');
    }

    const serial = normalizeSerial(input.serialNumber);
    if (!serial) {
      throw new Error('Device serial number is required for Bluetooth pairing.');
    }

    if (!input.ssid.trim() || input.password.trim().length < 8) {
      throw new Error('WiFi SSID and a password of at least 8 characters are required.');
    }

    let device: any;
    try {
      device = await connectToPlug(serial);

      const payload = {
        ssid: input.ssid.trim(),
        password: input.password,
        token: input.token || '',
      };

      await device.writeCharacteristicWithResponseForService(
        BLE_SERVICE_UUID,
        BLE_PROVISION_CHAR_UUID,
        toBase64(JSON.stringify(payload))
      );

      return {
        deviceName: device.name || device.localName || `${BLE_NAME_PREFIX}${serial}`,
        serialNumber: serial,
      };
    } finally {
      await safeDisconnect(device);
    }
  }

  async sendRemoteCommand(input: RemoteCommandInput): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Bluetooth remote commands are not available on web.');
    }

    const serial = normalizeSerial(input.serialNumber);
    if (!serial) {
      throw new Error('Device serial number is required.');
    }

    const remoteId = input.remoteId?.trim() || DEFAULT_REMOTE_ID;
    let device: any;

    try {
      device = await connectToPlug(serial);
      await device.writeCharacteristicWithResponseForService(
        BLE_SERVICE_UUID,
        BLE_REMOTE_CHAR_UUID,
        toBase64(
          JSON.stringify({
            action: input.action,
            remoteId,
          })
        )
      );
    } finally {
      await safeDisconnect(device);
    }
  }

  async readGatewayStatus(serialNumber: string): Promise<BleGatewayStatus | null> {
    if (!this.isSupported()) {
      return null;
    }

    const serial = normalizeSerial(serialNumber);
    if (!serial) {
      return null;
    }

    let device: any;
    try {
      device = await connectToPlug(serial);
      const characteristic = await device.readCharacteristicForService(
        BLE_SERVICE_UUID,
        BLE_STATUS_CHAR_UUID
      );

      if (!characteristic?.value) {
        return null;
      }

      const parsed = JSON.parse(fromBase64(characteristic.value));
      return {
        deviceId: parsed.deviceId || serial,
        gatewayEnabled: !!parsed.gatewayEnabled,
        pairedRemotes: Number(parsed.pairedRemotes || 0),
        clientConnected: !!parsed.clientConnected,
        transport: parsed.transport,
      };
    } catch {
      return null;
    } finally {
      await safeDisconnect(device);
    }
  }
}

const bleProvisioningService = new BleProvisioningService();
export default bleProvisioningService;
