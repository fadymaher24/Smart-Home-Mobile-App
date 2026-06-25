import { Platform } from 'react-native';

/**
 * SmartConfig (ESP-Touch / EZ-mode) provisioning service.
 *
 * Tuya-like "EZ mode" works by broadcasting the target Wi-Fi credentials
 * encoded inside UDP packet lengths. The ESP device listens on a fixed port
 * while in SmartConfig mode, reconstructs the SSID, password and router BSSID
 * from the packet lengths, then connects to the router.
 *
 * This service uses `react-native-udp` for broadcasting. Because the full
 * ESPTouch v1 protocol is complex, the encoder below is a pragmatic
 * implementation that covers the common path. If you need full compatibility
 * with the official Espressif ESPTouch app, replace `encodeEsptouchPayload`
 * with the reference algorithm from the esptouch-android/ios sources.
 */

export interface SmartConfigInput {
  ssid: string;
  password: string;
  bssid?: string; // router MAC, e.g. "AA:BB:CC:DD:EE:FF"
  token?: string; // provisioning token forwarded to the device after Wi-Fi connect
}

export interface SmartConfigResult {
  success: boolean;
  packetsSent: number;
  durationMs: number;
  error?: string;
}

interface UdpSocket {
  bind: (port: number, callback?: (error?: Error) => void) => void;
  close: () => void;
  setBroadcast: (value: boolean) => void;
  send: (
    buffer: string | Uint8Array,
    offset: number,
    length: number,
    port: number,
    address: string,
    callback?: (error?: Error) => void
  ) => void;
  on: (event: string, listener: (...args: any[]) => void) => void;
}

const ESPTOUCH_PORT = 7001;
const ESPTOUCH_BROADCAST = '255.255.255.255';
const DEFAULT_BROADCAST_COUNT = 120; // ~60 seconds at 500ms interval
const BROADCAST_INTERVAL_MS = 500;

let udpModule: any = null;

const getUdpModule = () => {
  if (udpModule) {
    return udpModule;
  }
  try {
    udpModule = require('react-native-udp');
    return udpModule;
  } catch {
    throw new Error(
      'SmartConfig requires react-native-udp. Run `npx expo install react-native-udp` and rebuild the native app.'
    );
  }
};

const normalizeBssid = (bssid?: string): number[] => {
  if (!bssid) {
    return [0xff, 0xff, 0xff, 0xff, 0xff, 0xff];
  }
  const parts = bssid
    .toUpperCase()
    .replace(/[^0-9A-F]/g, ':')
    .split(':')
    .filter(Boolean);

  if (parts.length !== 6) {
    return [0xff, 0xff, 0xff, 0xff, 0xff, 0xff];
  }

  return parts.map(part => parseInt(part, 16));
};

/**
 * Build a sequence of UDP packet lengths that encode the payload.
 * ESPTouch v1 encodes data in the total length of each UDP datagram.
 * The device listens for this sequence and decodes it back.
 */
const encodeEsptouchPayload = (
  ssid: string,
  password: string,
  bssid: number[]
): number[] => {
  // Convert strings to byte arrays
  const ssidBytes = Array.from(new TextEncoder().encode(ssid));
  const passwordBytes = Array.from(new TextEncoder().encode(password));

  const dataLength = ssidBytes.length + passwordBytes.length + bssid.length + 9;

  // ESPTouch framing uses a leading "total length" guide packet, followed by
  // packets whose lengths encode the data bytes one at a time.
  const sequence: number[] = [];

  // Guide code: total data length (capped to a sensible range)
  sequence.push(Math.min(Math.max(dataLength, 1), 255));

  // Encode password length and password bytes
  sequence.push(Math.min(Math.max(passwordBytes.length, 0), 127));
  passwordBytes.forEach(byte => sequence.push(byte));

  // Encode SSID length and SSID bytes
  sequence.push(Math.min(Math.max(ssidBytes.length, 0), 127));
  ssidBytes.forEach(byte => sequence.push(byte));

  // Encode BSSID bytes
  bssid.forEach(byte => sequence.push(byte));

  // Append a simple checksum
  const checksum = sequence.reduce((sum, val) => sum + val, 0) % 256;
  sequence.push(checksum);

  return sequence;
};

const sendPacket = (
  socket: UdpSocket,
  targetPort: number,
  length: number
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const buffer = new Uint8Array(length).fill(0);
    socket.send(
      buffer as any,
      0,
      length,
      targetPort,
      ESPTOUCH_BROADCAST,
      (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      }
    );
  });
};

class SmartConfigProvisioningService {
  private socket: UdpSocket | null = null;
  private isRunning = false;

  isSupported(): boolean {
    return Platform.OS !== 'web';
  }

  async start(input: SmartConfigInput): Promise<SmartConfigResult> {
    if (!this.isSupported()) {
      return {
        success: false,
        packetsSent: 0,
        durationMs: 0,
        error: 'SmartConfig is not supported on web. Use BLE or SoftAP provisioning.',
      };
    }

    if (!input.ssid.trim() || input.password.length < 8) {
      return {
        success: false,
        packetsSent: 0,
        durationMs: 0,
        error: 'SSID and a password of at least 8 characters are required.',
      };
    }

    this.stop();

    const { createSocket } = getUdpModule();
    this.socket = createSocket({ type: 'udp4' }) as UdpSocket;
    this.isRunning = true;

    const startedAt = Date.now();
    let packetsSent = 0;

    return new Promise<SmartConfigResult>((resolve, reject) => {
      let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
      let intervalHandle: ReturnType<typeof setInterval> | null = null;

      const finish = (result: SmartConfigResult) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        if (intervalHandle) clearInterval(intervalHandle);
        this.stop();
        resolve(result);
      };

      const fail = (error: Error) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        if (intervalHandle) clearInterval(intervalHandle);
        this.stop();
        resolve({
          success: false,
          packetsSent,
          durationMs: Date.now() - startedAt,
          error: error.message,
        });
      };

      this.socket!.bind(ESPTOUCH_PORT, (error?: Error) => {
        if (error) {
          fail(error);
          return;
        }

        try {
          this.socket!.setBroadcast(true);
        } catch (err: any) {
          fail(err instanceof Error ? err : new Error(String(err)));
          return;
        }

        const bssid = normalizeBssid(input.bssid);
        const sequence = encodeEsptouchPayload(
          input.ssid.trim(),
          input.password,
          bssid
        );

        // Send the sequence repeatedly.
        intervalHandle = setInterval(async () => {
          if (!this.isRunning || !this.socket) {
            return;
          }

          try {
            for (const length of sequence) {
              await sendPacket(this.socket, ESPTOUCH_PORT, length);
              packetsSent++;
              await sleep(10);
            }
          } catch (err: any) {
            fail(err instanceof Error ? err : new Error(String(err)));
          }
        }, BROADCAST_INTERVAL_MS);

        timeoutHandle = setTimeout(() => {
          finish({
            success: true,
            packetsSent,
            durationMs: Date.now() - startedAt,
          });
        }, DEFAULT_BROADCAST_COUNT * BROADCAST_INTERVAL_MS);
      });
    });
  }

  stop(): void {
    this.isRunning = false;
    if (this.socket) {
      try {
        this.socket.close();
      } catch {}
      this.socket = null;
    }
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const smartConfigProvisioningService = new SmartConfigProvisioningService();
export default smartConfigProvisioningService;
