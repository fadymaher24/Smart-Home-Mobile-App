import React from 'react';
import { View, Button, StyleSheet, Alert } from 'react-native';
import { turnSwitchOn, turnSwitchOff } from '../backend/mqttService';

const SwitchControlScreen = () => {
  const handleSwitchOn = async () => {
    try {
      await turnSwitchOn();
      Alert.alert('Success', 'Switch turned ON');
    } catch (error) {
      Alert.alert('Error', `Failed to turn ON: ${error.message}`);
    }
  };

  const handleSwitchOff = async () => {
    try {
      await turnSwitchOff();
      Alert.alert('Success', 'Switch turned OFF');
    } catch (error) {
      Alert.alert('Error', `Failed to turn OFF: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Turn ON" onPress={handleSwitchOn} />
      <Button title="Turn OFF" onPress={handleSwitchOff} style={styles.button} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  button: {
    marginTop: 20,
  },
});

export default SwitchControlScreen;
