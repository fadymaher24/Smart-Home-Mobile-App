import Constants from 'expo-constants';

type ExpoConstantsShape = {
  expoConfig?: { hostUri?: string };
  manifest2?: { extra?: { expoClient?: { hostUri?: string } } };
  manifest?: { debuggerHost?: string };
};

const extractHost = (hostUri: string): string | null => {
  if (!hostUri) return null;

  try {
    const normalized = hostUri.includes('://') ? hostUri : `http://${hostUri}`;
    return new URL(normalized).hostname || null;
  } catch {
    return hostUri.split(':')[0] || null;
  }
};

const resolveLocalApiBaseUrl = (): string => {
  const constants = Constants as unknown as ExpoConstantsShape;
  const hostUri =
    constants.expoConfig?.hostUri ??
    constants.manifest2?.extra?.expoClient?.hostUri ??
    constants.manifest?.debuggerHost;

  const host = hostUri ? extractHost(hostUri) : null;
  return host ? `http://${host}:3000/api` : 'http://localhost:3000/api';
};

const DEFAULT_RELEASE_API_BASE_URL = 'http://192.168.1.57:3000/api';

const resolveApiBaseUrl = (): string => {
  const constants = Constants as unknown as ExpoConstantsShape & {
    expoConfig?: { extra?: { apiUrl?: string } };
  };

  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;

  const fromExpoExtra = constants.expoConfig?.extra?.apiUrl;
  if (fromExpoExtra) return fromExpoExtra;

  if (__DEV__) return resolveLocalApiBaseUrl();

  return DEFAULT_RELEASE_API_BASE_URL;
};

const API_BASE_URL = resolveApiBaseUrl().replace(/\/+$/, '');

export { API_BASE_URL };

function parseErrorMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    return parsed.message || parsed.error || parsed.msg || raw;
  } catch {
    return raw;
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiRequest(
  endpoint: string,
  method: string = "GET",
  body?: any,
  token?: string
) {
  const headers: any = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorText = await res.text();
    const message = parseErrorMessage(errorText);
    throw new ApiError(message || 'Request failed', res.status);
  }
  return res.json();
}
