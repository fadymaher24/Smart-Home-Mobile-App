import React from "react";
import { View, Text, ScrollView, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const devices = [
  {
    type: "AC",
    location: "Kitchen",
    temp: "14",
    icon: require("../../assets/icons/ac.png"),
    status: "OFF",
  },
  {
    type: "Lamp",
    location: "Dining room",
    color: "White",
    icon: require("../../assets/icons/lamp.png"),
    status: "OFF",
  },
  {
    type: "Lamp",
    location: "Bed room",
    color: "Yellow",
    icon: require("../../assets/icons/lamp.png"),
    status: "OFF",
  },
  {
    type: "AC",
    location: "Living room",
    temp: "19",
    icon: require("../../assets/icons/ac.png"),
    status: "OFF",
  },
  {
    type: "TV",
    location: "Bed room",
    channel: "TVN",
    icon: require("../../assets/icons/tv.png"),
    status: "OFF",
  },
  {
    type: "AC",
    location: "Bedroom",
    temp: "12",
    icon: require("../../assets/icons/ac.png"),
    status: "OFF",
  },
];

type Device = {
  type: string;
  location: string;
  temp?: string;
  color?: string;
  channel?: string;
  icon: any;
  status: string;
};

const DeviceCard = ({ device }: { device: Device }) => {
  return (
    <View className="w-[47%] bg-[#A97664] rounded-2xl p-3 mb-3">
      <Image
        source={device.icon}
        className="h-16 w-16 self-end"
        resizeMode="contain"
      />
      {device.temp && (
        <Text className="text-white text-sm mt-1">
          Temperature <Text className="font-bold">{device.temp}°C</Text>
        </Text>
      )}
      {device.color && (
        <Text className="text-white text-sm mt-1">
          Color <Text className="font-bold">{device.color}</Text>
        </Text>
      )}
      {device.channel && (
        <Text className="text-white text-sm mt-1">
          Channel <Text className="font-bold">{device.channel}</Text>
        </Text>
      )}
      <Text className="text-white text-lg font-bold mt-1">{device.type}</Text>
      <Text className="text-white text-sm mb-1">{device.location}</Text>
      <View className="bg-[#DBEEE6] w-14 py-1 rounded-full self-end items-center">
        <Text className="text-green-600 text-xs font-bold">
          {device.status}
        </Text>
      </View>
    </View>
  );
};

const DevicesActive = () => {
  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <LinearGradient
        colors={["#579BB1", "#337CA0"]}
        className="px-4 py-6 rounded-b-3xl"
      >
        <View className="flex-row justify-between items-center">
          <TouchableOpacity>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-bold">Devices Active</Text>
          <Ionicons name="search" size={24} color="white" />
        </View>
      </LinearGradient>

      <ScrollView className="p-4">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-lg font-semibold">
            Device Active{" "}
            <Text className="bg-gray-300 px-2 py-0.5 rounded-full text-xs">
              {devices.length}
            </Text>
          </Text>
          <TouchableOpacity className="bg-[#A97664] w-6 h-6 rounded-full items-center justify-center">
            <Text className="text-white text-xl font-bold">+</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row flex-wrap justify-between">
          {devices.map((device, index) => (
            <DeviceCard key={index} device={device} />
          ))}
        </View>

        <TouchableOpacity className="bg-[#A97664] py-3 rounded-xl mt-6 items-center">
          <Text className="text-white font-semibold">Turn Off All Devices</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default DevicesActive;
