import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from '../utils/api';

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

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem("token");
      const storedUser = await AsyncStorage.getItem("user");
      
      if (storedToken) {
        // Verify the token is still valid with the backend
        try {
          const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { 
              "Authorization": `Bearer ${storedToken}`,
              "Content-Type": "application/json"
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            setToken(storedToken);
            setUser(data.user || (storedUser ? JSON.parse(storedUser) : null));
            console.log("Token verified successfully");
          } else {
            // Token is invalid, clear it
            console.log("Stored token is invalid, clearing...");
            await AsyncStorage.removeItem("token");
            await AsyncStorage.removeItem("user");
          }
        } catch (error) {
          console.log("Could not verify token with backend:", error);
          // Keep token for offline use, but warn
          setToken(storedToken);
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
        }
      }
    } catch (error) {
      console.log("Failed to load stored auth:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    console.log("Login attempt for:", email);
    console.log("API URL:", `${API_BASE_URL}/auth/login`);
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      console.log("Login response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Login successful, received token");
        
        setToken(data.token);
        setUser(data.user);
        await AsyncStorage.setItem("token", data.token);
        if (data.user) {
          await AsyncStorage.setItem("user", JSON.stringify(data.user));
        }
        return; // Success
      }

      const errorData = await response.text();
      console.log("Login error response:", errorData);
      throw new Error(errorData || "Login failed");
    } catch (error: any) {
      console.log("Login failed:", error.message);
      throw error; // Re-throw to be handled by LoginScreen
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string
  ): Promise<void> => {
    console.log("Register attempt for:", email);
    
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

      console.log("Register response status:", response.status);

      if (response.ok) {
        console.log("Registration successful, auto-logging in...");
        // Auto-login after registration
        await login(email, password);
        return;
      }

      const errorData = await response.text();
      console.log("Register error response:", errorData);
      throw new Error(errorData || "Registration failed");
    } catch (error: any) {
      console.log("Registration failed:", error.message);
      throw error;
    }
  };

  const logout = async () => {
    console.log("Logging out...");
    setToken(null);
    setUser(null);
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