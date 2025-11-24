import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

const API_BASE_URL = "http://172.20.10.2:3000/api";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem("token");
      if (storedToken) {
        setToken(storedToken);
        // Optionally verify token with backend
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
        setUser(data.user);
        await AsyncStorage.setItem("token", data.token);
        return; // Success - no error thrown
      }

      const errorData = await response.text();
      throw new Error(errorData || "Login failed");
    } catch (error) {
      console.log("Login failed:", error);
      throw error; // Re-throw to be handled by LoginScreen
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
        // Auto-login after registration
        await login(email, password);
        return; // Success
      }

      const errorData = await response.text();
      throw new Error(errorData || "Registration failed");
    } catch (error) {
      console.log("Registration failed:", error);
      throw error; // Re-throw to be handled by LoginScreen
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider
      value={{ token, user, login, register, logout, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
};
