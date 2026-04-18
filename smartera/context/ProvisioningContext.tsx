import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ProvisioningPhase =
  | 'idle'
  | 'scanning'
  | 'device_selected'
  | 'ap_connected'
  | 'credentials_sent'
  | 'wifi_connecting'
  | 'mqtt_connecting'
  | 'claimed'
  | 'complete'
  | 'error';

export type ProvisioningErrorCode =
  | 'SCAN_FAILED'
  | 'AP_CONNECTION_FAILED'
  | 'AP_TIMEOUT'
  | 'CREDENTIALS_REJECTED'
  | 'WIFI_AUTH_FAILED'
  | 'WIFI_NOT_FOUND'
  | 'WIFI_TIMEOUT'
  | 'WIFI_SIGNAL_WEAK'
  | 'MQTT_CONNECTION_FAILED'
  | 'CLAIM_FAILED'
  | 'SESSION_EXPIRED'
  | 'UNKNOWN';

export interface DiscoveredDevice {
  ssid: string;
  deviceType: string;
  serialSuffix: string;
  signalStrength: number;
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
  error: ProvisioningError | null;
  startedAt: number | null;
  lastUpdated: number | null;
}

type ProvisioningAction =
  | { type: 'START_SESSION'; payload: { sessionId: string; token: string } }
  | { type: 'SET_PHASE'; payload: ProvisioningPhase }
  | { type: 'SELECT_DEVICE'; payload: DiscoveredDevice }
  | { type: 'SET_WIFI'; payload: string }
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
  error: null,
  startedAt: null,
  lastUpdated: null,
};

const STORAGE_KEY = '@provisioning_session';

function provisioningReducer(state: ProvisioningState, action: ProvisioningAction): ProvisioningState {
  switch (action.type) {
    case 'START_SESSION':
      return {
        ...state,
        sessionId: action.payload.sessionId,
        token: action.payload.token,
        phase: 'scanning',
        startedAt: Date.now(),
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
        phase: 'device_selected',
        lastUpdated: Date.now(),
      };
    case 'SET_WIFI':
      return {
        ...state,
        selectedSSID: action.payload,
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
  setError: (code: ProvisioningErrorCode, message: string, retryable?: boolean) => void;
  clearError: () => void;
  reset: () => void;
}

const ProvisioningContext = createContext<ProvisioningContextValue | undefined>(undefined);

export function ProvisioningProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(provisioningReducer, initialState);

  // Restore state from AsyncStorage on mount
  useEffect(() => {
    restoreState();
  }, []);

  // Persist state changes to AsyncStorage
  useEffect(() => {
    if (state.phase !== 'idle') {
      saveState(state);
    }
  }, [state]);

  const restoreState = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ProvisioningState;
        // Don't restore sessions older than 10 minutes
        if (parsed.startedAt && Date.now() - parsed.startedAt < 10 * 60 * 1000) {
          dispatch({ type: 'RESTORE', payload: parsed });
        } else {
          await AsyncStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Failed to restore provisioning state:', error);
    }
  };

  const saveState = async (state: ProvisioningState) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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