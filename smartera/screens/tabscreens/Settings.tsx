import React, { useCallback, useEffect, useState } from "react";
import "react-native-gesture-handler";
import {
  StyleSheet,
  Text,
  View,
  Switch,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import Colors, { withAlpha } from "../../utils/colors";
import { apiRequest } from "../../utils/api";
import { deviceService } from "../../services/deviceService";
import { useTranslation } from "react-i18next";

type NotificationPreferences = {
  info: boolean;
  warning: boolean;
  critical: boolean;
  deviceOffline: boolean;
};

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  info: true,
  warning: true,
  critical: true,
  deviceOffline: true,
};

interface SettingItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  value?: boolean;
  onPress?: () => void;
  onValueChange?: (value: boolean) => void;
  hasSwitch?: boolean;
  isDark: boolean;
  isDanger?: boolean;
}

const SettingItem = ({
  icon,
  title,
  subtitle,
  value,
  onPress,
  onValueChange,
  hasSwitch,
  isDark,
  isDanger,
}: SettingItemProps) => {
  const theme = isDark ? Colors.dark : Colors.light;
  
  return (
    <TouchableOpacity
      style={[styles.settingItem, { backgroundColor: theme.surface }]}
      onPress={onPress}
      disabled={hasSwitch}
      activeOpacity={0.7}
    >
      <View style={[
        styles.settingIcon, 
        { backgroundColor: withAlpha(isDanger ? Colors.danger : Colors.primary, 0.1) }
      ]}>
        <Feather
          name={icon as any}
          size={20}
          color={isDanger ? Colors.danger : Colors.primary}
        />
      </View>
      <View style={styles.settingContent}>
        <Text style={[
          styles.settingText,
          { color: isDanger ? Colors.danger : theme.text },
        ]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.settingSubtext, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {hasSwitch ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: theme.surfaceVariant, true: Colors.primary }}
          thumbColor={value ? "#fff" : "#f4f3f4"}
          ios_backgroundColor={theme.surfaceVariant}
        />
      ) : (
        <Feather
          name="chevron-right"
          size={20}
          color={theme.textTertiary}
        />
      )}
    </TouchableOpacity>
  );
};

export default function Settings() {
  const { t } = useTranslation();
  const { theme, toggleTheme, isDarkMode } = useTheme();
  const { logout, user, token } = useAuth();
  const isDark = theme === "dark";
  const themeColors = isDark ? Colors.dark : Colors.light;
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [tariffCurrency, setTariffCurrency] = useState('EGP');
  const [tariffPrice, setTariffPrice] = useState('');
  const [savingTariff, setSavingTariff] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiRequest('/notifications/preferences', 'GET', undefined, token)
      .then(response => setNotificationPreferences(response.preferences))
      .catch(error => console.warn('Unable to load notification preferences:', error));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    deviceService.getCurrentTariff(token)
      .then(({ tariff }) => {
        if (!tariff) return;
        setTariffCurrency(tariff.currency);
        setTariffPrice(String(tariff.pricePerKwh));
      })
      .catch(error => console.warn('Unable to load electricity tariff:', error));
  }, [token]);

  const saveTariff = useCallback(async () => {
    if (!token) return;
    const pricePerKwh = Number(tariffPrice);
    const currency = tariffCurrency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency) || !Number.isFinite(pricePerKwh) || pricePerKwh <= 0) {
      Alert.alert(t('tariff.invalidTitle'), t('tariff.invalidBody'));
      return;
    }
    setSavingTariff(true);
    try {
      const response = await deviceService.setCurrentTariff({ currency, pricePerKwh }, token);
      setTariffCurrency(response.tariff.currency);
      setTariffPrice(String(response.tariff.pricePerKwh));
      Alert.alert(t('tariff.savedTitle'), t('tariff.savedBody'));
    } catch (error: any) {
      Alert.alert(t('tariff.saveFailedTitle'), error?.message || t('tariff.saveFailedBody'));
    } finally {
      setSavingTariff(false);
    }
  }, [tariffCurrency, tariffPrice, token, t]);

  const updateNotificationPreference = useCallback(async (key: keyof NotificationPreferences, value: boolean) => {
    if (!token) return;
    const previous = notificationPreferences;
    const next = { ...previous, [key]: value };
    setNotificationPreferences(next);
    try {
      const response = await apiRequest('/notifications/preferences', 'PUT', { preferences: { [key]: value } }, token);
      setNotificationPreferences(response.preferences);
    } catch (error) {
      setNotificationPreferences(previous);
      Alert.alert('Unable to save preference', 'Please check your connection and try again.');
    }
  }, [notificationPreferences, token]);
  
  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Gradient Header */}
      <LinearGradient
        colors={isDark ? Colors.gradients.primaryDark : Colors.gradients.primary}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.headerTitle}>Settings</Text>
        
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Feather name="user" size={28} color={Colors.primary} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'User'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'user@example.com'}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* General Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>
            General
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: themeColors.surface }]}>
            <SettingItem
              icon="moon"
              title="Dark Mode"
              subtitle="Switch between light and dark"
              value={isDarkMode}
              onValueChange={toggleTheme}
              hasSwitch
              isDark={isDark}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>{t('tariff.title')}</Text>
          <View style={[styles.sectionCard, styles.tariffCard, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.tariffHint, { color: themeColors.textSecondary }]}>{t('tariff.hint')}</Text>
            <View style={styles.tariffInputRow}>
              <TextInput
                style={[styles.tariffCurrencyInput, { color: themeColors.text, borderColor: themeColors.border }]}
                value={tariffCurrency}
                onChangeText={setTariffCurrency}
                maxLength={3}
                autoCapitalize="characters"
                accessibilityLabel={t('tariff.currency')}
              />
              <TextInput
                style={[styles.tariffPriceInput, { color: themeColors.text, borderColor: themeColors.border }]}
                value={tariffPrice}
                onChangeText={setTariffPrice}
                keyboardType="decimal-pad"
                placeholder={t('tariff.pricePlaceholder')}
                placeholderTextColor={themeColors.textTertiary}
                accessibilityLabel={t('tariff.price')}
              />
            </View>
            <TouchableOpacity style={[styles.tariffSaveButton, { opacity: savingTariff ? 0.6 : 1 }]} onPress={saveTariff} disabled={savingTariff}>
              <Text style={styles.tariffSaveText}>{savingTariff ? t('tariff.saving') : t('tariff.save')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>Notifications</Text>
          <View style={[styles.sectionCard, { backgroundColor: themeColors.surface }]}>
            <SettingItem icon="info" title="Updates" subtitle="Device activity and confirmations" value={notificationPreferences.info} onValueChange={value => updateNotificationPreference('info', value)} hasSwitch isDark={isDark} />
            <SettingItem icon="alert-triangle" title="Warnings" subtitle="Non-critical device issues" value={notificationPreferences.warning} onValueChange={value => updateNotificationPreference('warning', value)} hasSwitch isDark={isDark} />
            <SettingItem icon="shield" title="Safety alerts" subtitle="Critical safety events" value={notificationPreferences.critical} onValueChange={value => updateNotificationPreference('critical', value)} hasSwitch isDark={isDark} />
            <SettingItem icon="wifi-off" title="Device offline" subtitle="Unexpected device disconnections" value={notificationPreferences.deviceOffline} onValueChange={value => updateNotificationPreference('deviceOffline', value)} hasSwitch isDark={isDark} />
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          <View style={[styles.sectionCard, { backgroundColor: themeColors.surface }]}>
            <SettingItem
              icon="log-out"
              title="Logout"
              onPress={handleLogout}
              isDark={isDark}
              isDanger
            />
          </View>
        </View>

        {/* App Version */}
        <Text style={[styles.version, { color: themeColors.textTertiary }]}>
          Smartera v1.0.0
        </Text>

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tariffCard: {
    padding: 16,
  },
  tariffHint: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  tariffInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tariffCurrencyInput: {
    borderRadius: 10,
    borderWidth: 1,
    fontWeight: '700',
    paddingHorizontal: 12,
    width: 74,
  },
  tariffPriceInput: {
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 12,
  },
  tariffSaveButton: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 10,
    marginTop: 12,
    padding: 12,
  },
  tariffSaveText: {
    color: '#fff',
    fontWeight: '700',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  profileEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    marginTop: -15,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 8,
    marginBottom: 10,
  },
  sectionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingContent: {
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginLeft: 68,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 24,
  },
});
