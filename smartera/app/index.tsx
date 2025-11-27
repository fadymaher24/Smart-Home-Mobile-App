import React, { useEffect, useRef } from "react";
import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { useColorScheme, Animated, Dimensions, Platform } from "react-native";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const { width, height } = Dimensions.get("window");

// Unified Colors
const Colors = {
  primary: '#5B6EF5',
  secondary: '#8B5CF6',
  accent: '#06B6D4',
  success: '#10B981',
};

export default function Welcome() {
  const colorScheme = useColorScheme() ?? "dark";
  const isDark = colorScheme === "dark";
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const iconFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Floating icon animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconFloat, {
          toValue: -10,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(iconFloat, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <LinearGradient
      colors={isDark ? ['#0F172A', '#1E293B', '#334155'] : [Colors.primary, Colors.secondary, '#A78BFA']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Background Decorations */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />
      <View style={styles.bgCircle3} />

      {/* Logo/Brand */}
      <Animated.View 
        style={[
          styles.logoContainer,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.logoIcon}>
          <MaterialCommunityIcons name="home-lightning-bolt" size={28} color="#fff" />
        </View>
        <Text style={styles.logoText}>Smartera</Text>
      </Animated.View>

      {/* Main Content */}
      <Animated.View 
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        {/* Floating Home Icon */}
        <Animated.View 
          style={[
            styles.iconContainer,
            { transform: [{ translateY: iconFloat }] }
          ]}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
            style={styles.iconGradient}
          >
            <MaterialCommunityIcons name="home-automation" size={80} color="#fff" />
          </LinearGradient>
        </Animated.View>

        {/* Welcome Text */}
        <Text style={styles.title}>Welcome Home</Text>
        <Text style={styles.subtitle}>
          No matter how far you go, home will always be your destination to return to.
          Let's make your home smarter and more comfortable.
        </Text>

        {/* Feature Pills */}
        <View style={styles.featuresContainer}>
          <View style={styles.featurePill}>
            <Ionicons name="flash" size={16} color={Colors.accent} />
            <Text style={styles.featureText}>Smart Control</Text>
          </View>
          <View style={styles.featurePill}>
            <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
            <Text style={styles.featureText}>Secure</Text>
          </View>
          <View style={styles.featurePill}>
            <Ionicons name="analytics" size={16} color={Colors.primary} />
            <Text style={styles.featureText}>Analytics</Text>
          </View>
        </View>
      </Animated.View>

      {/* Get Started Button */}
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: Animated.multiply(slideAnim, -1) }]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.9}
          onPress={() => router.push("/Welcome")}
        >
          <LinearGradient
            colors={isDark ? [Colors.primary, Colors.secondary] : ['#fff', '#F8FAFC']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={[styles.buttonText, { color: isDark ? '#fff' : Colors.primary }]}>
              Get Started
            </Text>
            <View style={[styles.buttonIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : Colors.primary }]}>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Skip/Login Link */}
        <TouchableOpacity 
          style={styles.loginLink}
          onPress={() => router.push("/Welcome")}
        >
          <Text style={styles.loginText}>Already have an account? </Text>
          <Text style={[styles.loginText, styles.loginTextBold]}>Sign In</Text>
        </TouchableOpacity>
      </Animated.View>

      <StatusBar style="light" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  // Background decorations
  bgCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -100,
    right: -100,
  },
  bgCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.03)',
    bottom: 100,
    left: -50,
  },
  bgCircle3: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: height * 0.4,
    right: -30,
  },
  // Logo
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  // Content
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconGradient: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  // Features
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  featureText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  // Button
  buttonContainer: {
    alignItems: 'center',
  },
  button: {
    width: '100%',
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 12,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  buttonIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Login link
  loginLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  loginTextBold: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
