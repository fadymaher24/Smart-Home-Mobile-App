import { useCallback, useState } from 'react';
import bleProvisioningService, {
  BleDiscoveredPlug,
  BleGatewayStatus,
  SmarteraRemoteAction,
} from '../services/bleProvisioningService';

interface BleProvisionInput {
  serialNumber: string;
  ssid: string;
  password: string;
  token?: string;
}

interface BleRemoteActionInput {
  serialNumber: string;
  action: SmarteraRemoteAction;
  remoteId: string;
}

export function useBleProvisioning() {
  const [nearbyPlugs, setNearbyPlugs] = useState<BleDiscoveredPlug[]>([]);
  const [gatewayStatus, setGatewayStatus] = useState<BleGatewayStatus | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isSendingRemoteAction, setIsSendingRemoteAction] = useState(false);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const discoverNearbyPlugs = useCallback(async (targetSerial?: string) => {
    setIsScanning(true);
    setError(null);

    try {
      const plugs = await bleProvisioningService.discoverPlugs(targetSerial);
      setNearbyPlugs(plugs);
      return plugs;
    } catch (err: any) {
      setError(err?.message || 'Failed to discover nearby Smartera plugs over Bluetooth.');
      return [];
    } finally {
      setIsScanning(false);
    }
  }, []);

  const provisionViaBle = useCallback(async (input: BleProvisionInput) => {
    setIsProvisioning(true);
    setError(null);

    try {
      return await bleProvisioningService.provisionDevice(input);
    } catch (err: any) {
      setError(err?.message || 'Bluetooth provisioning failed.');
      throw err;
    } finally {
      setIsProvisioning(false);
    }
  }, []);

  const sendRemoteAction = useCallback(async (input: BleRemoteActionInput) => {
    setIsSendingRemoteAction(true);
    setError(null);

    try {
      await bleProvisioningService.sendRemoteCommand(input);
    } catch (err: any) {
      setError(err?.message || 'Failed to send Smartera-Remote command.');
      throw err;
    } finally {
      setIsSendingRemoteAction(false);
    }
  }, []);

  const refreshGatewayStatus = useCallback(async (serialNumber: string) => {
    setIsRefreshingStatus(true);
    setError(null);

    try {
      const status = await bleProvisioningService.readGatewayStatus(serialNumber);
      setGatewayStatus(status);
      return status;
    } catch {
      return null;
    } finally {
      setIsRefreshingStatus(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetNearbyPlugs = useCallback(() => {
    setNearbyPlugs([]);
  }, []);

  return {
    isSupported: bleProvisioningService.isSupported(),
    nearbyPlugs,
    gatewayStatus,
    isScanning,
    isProvisioning,
    isSendingRemoteAction,
    isRefreshingStatus,
    error,
    discoverNearbyPlugs,
    provisionViaBle,
    sendRemoteAction,
    refreshGatewayStatus,
    clearError,
    resetNearbyPlugs,
  };
}

export default useBleProvisioning;
