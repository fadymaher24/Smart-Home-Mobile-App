// In App.js in a new project

import * as React from "react";
import { View, Text } from "react-native";
import { createStaticNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";

const Stack = createNativeStackNavigator();

import WelcomeScreen from "../app/screens/WelcomeScreen";
// import DeviceControlScreen from "../app/screens/DeviceControlScreen";

function RootStack() {
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen name="WelcomeScreen" component={WelcomeScreen} />
      {/* <Stack.Screen
				name="DeviceControlScreen"
				component={DeviceControlScreen}
			/> */}
    </Stack.Navigator>
  );
}

function Navigation() {
  return (
    <NavigationContainer>
      <RootStack />
    </NavigationContainer>
  );
}
export default function App() {
  return <Navigation />;
}
