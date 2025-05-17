import React from "react";
import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { NavigationProp } from "@react-navigation/native";
import { router } from "expo-router";

interface WelcomeProps {
  navigation: NavigationProp<any>;
}

export default function Welcome({ navigation }: WelcomeProps) {
  const colorScheme = useColorScheme() ?? "dark";
  return (
    <View style={styles(colorScheme).container}>
      <Text style={styles(colorScheme).topLeftText}>Smartera</Text>
      <Text style={styles(colorScheme).text1}>Welcome Home</Text>
      <Text style={styles(colorScheme).text2}>
        no matter how far you go, home will be your destination to return to.
        let's make your home comfortable
      </Text>
      <TouchableOpacity
        style={styles(colorScheme).button}
        activeOpacity={0.8}
        onPress={() => router.push("/Welcome")}
      >
        <Text style={styles(colorScheme).buttonText}>Get Started &gt;|</Text>
      </TouchableOpacity>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = (colorScheme: "dark" | "light") =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colorScheme === "dark" ? "#4C7380" : "#4C7380",
    },
    button: {
      backgroundColor: colorScheme === "dark" ? "#fff" : "#222",
      paddingVertical: 16,
      paddingHorizontal: 40,
      borderRadius: 30,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 5,
      marginBottom: 20,
    },
    buttonText: {
      color: colorScheme === "dark" ? "#222" : "#fff",
      fontSize: 18,
      fontWeight: "bold",
      letterSpacing: 1,
    },
    text: {
      color: colorScheme === "dark" ? "#fff" : "#000",
      fontSize: 18,
      fontWeight: "bold",
    },
    text1: {
      color: colorScheme === "dark" ? "#fff" : "#000",
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 10,
    },
    text2: {
      color: colorScheme === "dark" ? "#fff" : "#000",
      fontSize: 16,
      textAlign: "center",
      marginHorizontal: 20,
      marginBottom: 20,
      lineHeight: 24,
      fontWeight: "400",
    },
    topLeftText: {
      position: "absolute",
      top: 40,
      left: 20,
      color: colorScheme === "dark" ? "#fff" : "#000",
      fontSize: 18,
      fontWeight: "bold",
    },
  });
