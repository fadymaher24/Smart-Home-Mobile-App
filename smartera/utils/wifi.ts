import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

let cachedSSID: string | null = null;

export async function getCurrentWiFiSSID(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    const netInfo = await NetInfo.fetch();
    if (netInfo.type === 'wifi' && netInfo.details) {
      const details = netInfo.details as any;
      const ssid = details.ssid || details.bssid || null;
      if (ssid && !ssid.startsWith('<') && ssid !== '(null)') {
        cachedSSID = ssid;
        return ssid;
      }
    }
  } catch (error) {
    console.log('Could not get WiFi SSID:', error);
  }

  return cachedSSID;
}

export function parseSerialFromQRCode(data: string): { serialNumber: string; type: string | null } | null {
  if (!data || typeof data !== 'string') {
    return null;
  }

  let serialNumber = data.trim();

  if (serialNumber.startsWith('smartera://')) {
    try {
      const url = new URL(serialNumber);
      serialNumber = url.searchParams.get('sn') || url.pathname.split('/').pop() || '';
      const type = url.searchParams.get('type');
      return { serialNumber, type };
    } catch {
      serialNumber = serialNumber.replace('smartera://', '');
    }
  }

  if (serialNumber.startsWith('http://') || serialNumber.startsWith('https://')) {
    try {
      const url = new URL(serialNumber);
      const sn = url.searchParams.get('sn') || url.searchParams.get('serial');
      const type = url.searchParams.get('type');
      if (sn) {
        return { serialNumber: sn, type };
      }
    } catch {}
  }

  const spPattern = /^SP-([A-Fa-f0-9]{6,12})$/;
  const match = serialNumber.match(spPattern);
  if (match) {
    return { serialNumber, type: 'SMART_PLUG' };
  }

  const rgbPattern = /^RGB-([A-Fa-f0-9]{6,12})$/;
  if (rgbPattern.test(serialNumber)) {
    return { serialNumber, type: 'RGB_LIGHT' };
  }

  const thPattern = /^TH-([A-Fa-f0-9]{6,12})$/;
  if (thPattern.test(serialNumber)) {
    return { serialNumber, type: 'THERMOSTAT' };
  }

  if (serialNumber.length >= 4) {
    return { serialNumber, type: null };
  }

  return null;
}

export function generateQRCodeData(serialNumber: string, type?: string): string {
  const params = new URLSearchParams();
  params.set('sn', serialNumber);
  if (type) {
    params.set('type', type);
  }
  return `smartera://device?${params.toString()}`;
}