import React, { useState, useEffect } from "react";
import { useCameraPermissions, CameraView } from "expo-camera";
import {
  Linking,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";

export default function QRScan({
  onScanned,
  onCancel,
}: {
  onScanned: (id: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Request permission on mount
  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#5B6EF5" />
        <Text style={{ color: "#fff", marginTop: 16 }}>
          {t("provisioning.scan.cameraChecking")}
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={{ marginBottom: 16, color: "#fff" }}>
          {t("provisioning.scan.cameraPermissionRequired")}
          {Platform.OS === "ios" && `\n${t("provisioning.scan.cameraSettingsHint")}`}
        </Text>
        <TouchableOpacity
          onPress={() => permission.canAskAgain ? requestPermission() : Linking.openSettings()}
          style={styles.button}
          accessibilityRole="button"
          accessibilityLabel={permission.canAskAgain
            ? t("provisioning.scan.cameraGrant")
            : t("provisioning.scan.openSettings")}
        >
          <Text style={{ color: "#fff" }}>
            {permission.canAskAgain
              ? t("provisioning.scan.cameraGrant")
              : t("provisioning.scan.openSettings")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onCancel}
          style={[styles.button, { backgroundColor: "#aaa", marginTop: 8 }]}
          accessibilityRole="button"
          accessibilityLabel={t("common.cancel")}
        >
          <Text style={{ color: "#fff" }}>{t("common.cancel")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // CameraView fallback for camera not available
  if (permission.granted && typeof CameraView !== "function") {
    return (
      <View style={styles.centered}>
        <Text style={{ color: "#fff" }}>
          {t("provisioning.scan.cameraUnavailable")}
        </Text>
        <TouchableOpacity
          onPress={onCancel}
          style={[styles.button, { marginTop: 16 }]}
          accessibilityRole="button"
          accessibilityLabel={t("common.cancel")}
        >
          <Text style={{ color: "#fff" }}>{t("common.cancel")}</Text>
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
      <TouchableOpacity
        onPress={onCancel}
        style={styles.cancelBtn}
        accessibilityRole="button"
        accessibilityLabel={t("common.cancel")}
      >
        <Text style={{ color: "#fff" }}>{t("common.cancel")}</Text>
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
