import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../utils/api';

const ACCESS_TOKEN_KEY = 'smartera.accessToken';

function parseErrorMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    return parsed.message || parsed.error || parsed.msg || raw;
  } catch {
    return raw;
  }
}

interface AuthContextType {
  token: string | null;
  user: any | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const fetchUserProfile = async (authToken: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        "Authorization": `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });
    if (response.ok) {
      const data = await response.json();
      return data.user || null;
    }
    if (response.status === 401 || response.status === 403) {
      return null;
    }
    throw new Error(`Server error: ${response.status}`);
  };

  const loadStoredAuth = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      const storedUser = await AsyncStorage.getItem("user");
      // Remove tokens written by older app versions; credentials now belong
      // exclusively in the OS-backed secure store.
      await AsyncStorage.removeItem("token");

      if (storedToken) {
        try {
          const userProfile = await fetchUserProfile(storedToken);
          if (userProfile) {
            setToken(storedToken);
            setUser(userProfile);
            await AsyncStorage.setItem("user", JSON.stringify(userProfile));
          } else {
            await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
            await AsyncStorage.removeItem("user");
          }
        } catch {
          const cachedUser = storedUser ? JSON.parse(storedUser) : null;
          setToken(storedToken);
          setUser(cachedUser);
        }
      }
    } catch (error) {
      console.log("Failed to load stored auth:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.token);
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.token, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
        await AsyncStorage.removeItem("token");

        let userProfile = data.user || null;
        if (!userProfile && data.token) {
          try {
            userProfile = await fetchUserProfile(data.token);
          } catch (error) {
            console.warn('Could not load the user profile after login:', error);
          }
        }

        if (userProfile) {
          setUser(userProfile);
          await AsyncStorage.setItem("user", JSON.stringify(userProfile));
        } else {
          const cachedUser = await AsyncStorage.getItem("user");
          setUser(cachedUser ? JSON.parse(cachedUser) : null);
        }
        return;
      }

      const errorText = await response.text();
      const message = parseErrorMessage(errorText);

      if (response.status === 401) {
        throw new Error("Invalid email or password");
      }
      throw new Error(message || "Login failed");
    } catch (error: any) {
      if (error instanceof TypeError && error.message === 'Network request failed') {
        throw new Error("Unable to connect to server. Check your network connection.");
      }
      throw error;
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string
  ): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          confirmPassword: password,
        }),
      });

      if (response.ok) {
        await login(email, password);
        return;
      }

      const errorText = await response.text();
      const message = parseErrorMessage(errorText);
      throw new Error(message || "Registration failed");
    } catch (error: any) {
      if (error instanceof TypeError && error.message === 'Network request failed') {
        throw new Error("Unable to connect to server. Check your network connection.");
      }
      throw error;
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider
      value={{ token, user, login, register, logout, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
};
