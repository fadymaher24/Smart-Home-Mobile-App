# Smart-Home-Mobile-App

## Description

Smart-Home-Mobile-App is a React Native application designed to control and monitor smart home devices. It provides a user-friendly interface to manage IoT devices using MQTT protocol for real-time communication.

## Features

- Real-time device control and monitoring.
- MQTT protocol integration for seamless communication.
- Cross-platform support (iOS and Android).
- Intuitive and responsive UI.

## Installation

### Prerequisites

- Node.js (>=14.x)
- npm (>=6.x)
- Expo CLI
- React Native development environment

### Steps

1. Install Expo CLI globally:

   ```bash
   sudo npm i -g expo-cli
   ```

2. Clone the repository:

   ```bash
   git clone https://github.com/your-username/Smart-Home-Mobile-App.git
   cd Smart-Home-Mobile-App
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Install MQTT library:

   ```bash
   npm install react-native-mqtt
   ```

5. Start the development server:
   ```bash
   expo start
   ```

## Backend Setup

The backend logic for the MQTT server is located in the `smartera/backend` folder.

### Steps

1. Navigate to the backend folder:

   ```bash
   cd smartera/backend
   ```

2. Install the required dependencies:

   ```bash
   npm install mqtt
   ```

3. Start the MQTT server:
   ```bash
   node mqttServer.js
   ```

The MQTT server will connect to the broker and listen for messages on the `smarthome/devices/#` topic.

## Folder Structure

```
Smart-Home-Mobile-App/
├── assets/               # Static assets (images, fonts, etc.)
├── components/           # Reusable React components
├── screens/              # Application screens
├── services/             # API and MQTT service logic
├── utils/                # Utility functions
├── App.js                # Main application entry point
├── package.json          # Project metadata and dependencies
└── README.md             # Project documentation
```

## Usage

1. Start the development server using `expo start`.
2. Scan the QR code displayed in the terminal or browser using the Expo Go app on your mobile device.
3. Interact with the app to control and monitor your smart home devices.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix:
   ```bash
   git checkout -b feature-name
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add feature-name"
   ```
4. Push to your branch:
   ```bash
   git push origin feature-name
   ```
5. Open a pull request.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Contact

For any inquiries or support, please contact [fadymaher@ieee.org].
