import React from "react";
import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import {
  useColorScheme,
  StyleSheet,
  Button,
  View,
  ColorSchemeName,
} from "react-native";
import { NavigationProp } from "@react-navigation/native";

interface WelcomeProps {
  navigation: NavigationProp<any>;
}

export default function Welcome({ navigation }: WelcomeProps) {
  const colorScheme = useColorScheme(); // "light" | "dark" | null

  return (
    <View style={styles(colorScheme).container}>
      <Button
        title="Go to StackMe"
        onPress={() => navigation.navigate("StackMe")}
      />
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </View>
  );
}

const styles = (colorScheme: ColorSchemeName) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colorScheme === "dark" ? "#000" : "#fff",
    },
  });
