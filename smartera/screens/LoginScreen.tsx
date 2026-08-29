import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Colors } from "../utils/colors";

const LoginScreen = () => {
  const { theme } = useTheme();
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const normalizedEmail = email.trim();
    const normalizedName = name.trim();
    if (!normalizedEmail || !password || (!isLogin && !normalizedName)) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }
    if (!isLogin && (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))) {
      Alert.alert("Invalid Password", "Use at least 8 characters with a letter and a number.");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await login(normalizedEmail, password);
      } else {
        await register(normalizedName, normalizedEmail, password);
      }
    } catch (error: any) {
      const message = error?.message || (isLogin ? "Login failed" : "Registration failed");
      Alert.alert(isLogin ? "Login Failed" : "Registration Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme === "dark" ? "#000" : "#fff" },
      ]}
    >
      <Text
        style={[styles.title, { color: theme === "dark" ? "#fff" : "#000" }]}
      >
        {isLogin ? "Login" : "Register"}
      </Text>

      {!isLogin && (
        <TextInput
          style={[styles.input, { color: theme === "dark" ? "#fff" : "#000" }]}
          placeholder="Name"
          placeholderTextColor={theme === "dark" ? "#B0BEC5" : "#757575"}
          value={name}
          onChangeText={setName}
          autoComplete="name"
          textContentType="name"
        />
      )}

      <TextInput
        style={[styles.input, { color: theme === "dark" ? "#fff" : "#000" }]}
        placeholder="Email"
        placeholderTextColor={theme === "dark" ? "#B0BEC5" : "#757575"}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />

      <TextInput
        style={[styles.input, { color: theme === "dark" ? "#fff" : "#000" }]}
        placeholder="Password"
        placeholderTextColor={theme === "dark" ? "#B0BEC5" : "#757575"}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete={isLogin ? "current-password" : "new-password"}
        textContentType={isLogin ? "password" : "newPassword"}
        onSubmitEditing={handleSubmit}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
        accessibilityRole="button"
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {isLogin ? "Login" : "Register"}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
        <Text
          style={[
            styles.switchText,
            { color: theme === "dark" ? "#B0BEC5" : "#757575" },
          ]}
        >
          {isLogin
            ? "Don't have an account? Register"
            : "Have an account? Login"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 40,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  switchText: {
    textAlign: "center",
    fontSize: 14,
  },
});

export default LoginScreen;
