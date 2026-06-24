import React, { createContext, useContext, useEffect, useReducer, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ProvisioningPhase =
  | 'idle'
  | 'instructions'
  | 'ble_scanning'
  | 'ble_device_found'
  | 'ble_connecting'
  | 'ble_connected'
  | 'wifi_scan_requested'
  | 'wifi_scan_results'
  | 'credentials_sent'
  | 'wifi_connecting'
  | 'cloud_verifying'
  | 'claimed'
  | 'complete'
  | 'timeout'
  | 'error';

export type ProvisioningErrorCode =
  | 'SCAN_FAILED'
  | 'BLE_CONNECT_FAILED'
  | 'BLE_TIMEOUT'
  | 'CREDENTIALS_REJECTED'
  | 'WIFI_AUTH_FAILED'
  | 'WIFI_NOT_FOUND'
  | 'WIFI_TIMEOUT'
  | 'WIFI_SIGNAL_WEAK'
  | 'CLOUD_VERIFICATION_FAILED'
  | 'CLOUD_TIMEOUT'
  | 'CLAIM_FAILED'
  | 'SESSION_EXPIRED'
  | 'UNKNOWN';

export interface DiscoveredDevice {
  id: string;
  name: string;
  serialNumber: string;
  rssi: number;
}

export interface WifiNetworkOption {
  ssid: string;
  rssi: number;
  band: '2.4GHz' | '5GHz' | 'unknown';
  security?: string;
}

export interface ProvisioningError {
  code: ProvisioningErrorCode;
  message: string;
  retryable: boolean;
}

export interface ProvisioningState {
  phase: ProvisioningPhase;
  sessionId: string | null;
  token: string | null;
  device: DiscoveredDevice | null;
  selectedSSID: string | null;
  availableNetworks: WifiNetworkOption[];
  error: ProvisioningError | null;
  startedAt: number | null;
  deadlineAt: number | null;
  lastUpdated: number | null;
  deviceName: string;
  roomName: string;
}

type ProvisioningAction =
  | { type: 'START_SESSION'; payload: { sessionId: string; token: string } }
  | { type: 'SET_PHASE'; payload: ProvisioningPhase }
  | { type: 'SELECT_DEVICE'; payload: DiscoveredDevice }
  | { type: 'SET_WIFI'; payload: string }
  | { type: 'SET_NETWORKS'; payload: WifiNetworkOption[] }
  | { type: 'SET_METADATA'; payload: { deviceName?: string; roomName?: string } }
  | { type: 'SET_ERROR'; payload: ProvisioningError }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET' }
  | { type: 'RESTORE'; payload: ProvisioningState };

const initialState: ProvisioningState = {
  phase: 'idle',
  sessionId: null,
  token: null,
  device: null,
  selectedSSID: null,
  availableNetworks: [],
  error: null,
  startedAt: null,
  deadlineAt: null,
  lastUpdated: null,
  deviceName: '',
  roomName: 'Living Room',
};

const STORAGE_KEY = '@provisioning_session';
const GLOBAL_TIMEOUT_MS = 180 * 1000;

function provisioningReducer(state: ProvisioningState, action: ProvisioningAction): ProvisioningState {
  switch (action.type) {
    case 'START_SESSION':
      return {
        ...state,
        sessionId: action.payload.sessionId,
        token: action.payload.token,
        phase: 'instructions',
        startedAt: Date.now(),
        deadlineAt: Date.now() + GLOBAL_TIMEOUT_MS,
        lastUpdated: Date.now(),
      };
    case 'SET_PHASE':
      return {
        ...state,
        phase: action.payload,
        lastUpdated: Date.now(),
      };
    case 'SELECT_DEVICE':
      return {
        ...state,
        device: action.payload,
        phase: 'ble_device_found',
        lastUpdated: Date.now(),
      };
    case 'SET_WIFI':
      return {
        ...state,
        selectedSSID: action.payload,
        lastUpdated: Date.now(),
      };
    case 'SET_NETWORKS':
      return {
        ...state,
        availableNetworks: action.payload,
        lastUpdated: Date.now(),
      };
    case 'SET_METADATA':
      return {
        ...state,
        deviceName: action.payload.deviceName ?? state.deviceName,
        roomName: action.payload.roomName ?? state.roomName,
        lastUpdated: Date.now(),
      };
    case 'SET_ERROR':
      return {
        ...state,
        phase: 'error',
        error: action.payload,
        lastUpdated: Date.now(),
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
        lastUpdated: Date.now(),
      };
    case 'RESET':
      return initialState;
    case 'RESTORE':
      return {
        ...action.payload,
        lastUpdated: Date.now(),
      };
    default:
      return state;
  }
}

interface ProvisioningContextValue {
  state: ProvisioningState;
  startSession: (sessionId: string, token: string) => void;
  setPhase: (phase: ProvisioningPhase) => void;
  selectDevice: (device: DiscoveredDevice) => void;
  setWifi: (ssid: string) => void;
  setNetworks: (networks: WifiNetworkOption[]) => void;
  setMetadata: (values: { deviceName?: string; roomName?: string }) => void;
  setError: (code: ProvisioningErrorCode, message: string, retryable?: boolean) => void;
  clearError: () => void;
  reset: () => Promise<void>;
}

const ProvisioningContext = createContext<ProvisioningContextValue | undefined>(undefined);

export function ProvisioningProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(provisioningReducer, initialState);

  useEffect(() => {
    restoreState();
  }, []);

  useEffect(() => {
    if (state.phase !== 'idle') {
      saveState(state);
    }
  }, [state]);

  const restoreState = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (!saved) {
        return;
      }

      const parsed = JSON.parse(saved) as ProvisioningState;
      const now = Date.now();
      if (!parsed.deadlineAt || now > parsed.deadlineAt) {
        await AsyncStorage.removeItem(STORAGE_KEY);
        return;
      }

      dispatch({ type: 'RESTORE', payload: parsed });
    } catch (error) {
      console.error('Failed to restore provisioning state:', error);
    }
  };

  const saveState = async (nextState: ProvisioningState) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    } catch (error) {
      console.error('Failed to save provisioning state:', error);
    }
  };

  const startSession = (sessionId: string, token: string) => {
    dispatch({ type: 'START_SESSION', payload: { sessionId, token } });
  };

  const setPhase = (phase: ProvisioningPhase) => {
    dispatch({ type: 'SET_PHASE', payload: phase });
  };

  const selectDevice = (device: DiscoveredDevice) => {
    dispatch({ type: 'SELECT_DEVICE', payload: device });
  };

  const setWifi = (ssid: string) => {
    dispatch({ type: 'SET_WIFI', payload: ssid });
  };

  const setNetworks = (networks: WifiNetworkOption[]) => {
    dispatch({ type: 'SET_NETWORKS', payload: networks });
  };

  const setMetadata = (values: { deviceName?: string; roomName?: string }) => {
    dispatch({ type: 'SET_METADATA', payload: values });
  };

  const setError = (code: ProvisioningErrorCode, message: string, retryable = false) => {
    dispatch({ type: 'SET_ERROR', payload: { code, message, retryable } });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const reset = async () => {
    dispatch({ type: 'RESET' });
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  return (
    <ProvisioningContext.Provider
      value={{
        state,
        startSession,
        setPhase,
        selectDevice,
        setWifi,
        setNetworks,
        setMetadata,
        setError,
        clearError,
        reset,
      }}
    >
      {children}
    </ProvisioningContext.Provider>
  );
}

export function useProvisioningContext() {
  const context = useContext(ProvisioningContext);
  if (!context) {
    throw new Error('useProvisioningContext must be used within ProvisioningProvider');
  }
  return context;
}

export default ProvisioningContext;
