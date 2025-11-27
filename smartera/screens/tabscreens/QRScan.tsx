import React, { useState, useEffect } from "react";
import { useCameraPermissions, CameraView } from "expo-camera";
import {
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

// API utility for backend communication
export const API_BASE_URL = "http://localhost:3000/api"; // Use local backend for development

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
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function QRScan({
  onScanned,
  onCancel,
}: {
  onScanned: (id: string) => void;
  onCancel: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Request permission on mount
  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#5B6EF5" />
        <Text style={{ color: "#fff", marginTop: 16 }}>
          Checking camera permissions...
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={{ marginBottom: 16, color: "#fff" }}>
          Camera permission is required to scan QR codes.
          {Platform.OS === "ios" &&
            "\nGo to Settings > Privacy > Camera to enable."}
        </Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={{ color: "#fff" }}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onCancel}
          style={[styles.button, { backgroundColor: "#aaa", marginTop: 8 }]}
        >
          <Text style={{ color: "#fff" }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // CameraView fallback for camera not available
  if (permission.granted && typeof CameraView !== "function") {
    return (
      <View style={styles.centered}>
        <Text style={{ color: "#fff" }}>
          Camera is not available on this device or Expo Go. Try on a real
          device with a production build.
        </Text>
        <TouchableOpacity
          onPress={onCancel}
          style={[styles.button, { marginTop: 16 }]}
        >
          <Text style={{ color: "#fff" }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden />
      <CameraView
        style={styles.camStyle}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={({ data }) => {
          if (!scanned) {
            setScanned(true);
            onScanned(data);
          }
        }}
      />
      <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
        <Text style={{ color: "#fff" }}>Cancel</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  camStyle: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
    padding: 20,
  },
  button: { backgroundColor: "#5B6EF5", padding: 14, borderRadius: 12, minWidth: 160, alignItems: "center" },
  cancelBtn: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "#5B6EF5",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
});
