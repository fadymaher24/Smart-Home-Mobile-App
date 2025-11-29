# 🏠 Smartera - Smart Home Mobile App

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-0.81.5-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React Native" />
  <img src="https://img.shields.io/badge/Expo-54.0-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" />
  <img src="https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Socket.IO-Real--time-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="Socket.IO" />
</p>

<p align="center">
  <b>A modern, feature-rich smart home control application built with React Native and Expo</b>
</p>

---

## ✨ Features

### 🎮 Device Control
- **Real-time device management** - Control smart plugs, RGB lights, thermostats, and sensors
- **Live telemetry data** - Monitor power, voltage, current, and energy consumption in real-time
- **Quick toggle controls** - Turn devices on/off with a single tap
- **Device grouping** - Organize devices by rooms for easy management

### 📊 Power Analytics
- **Live power monitoring** - Track energy usage across all connected devices
- **Cost breakdown** - View daily, weekly, and monthly energy costs
- **Usage insights** - Get smart recommendations to reduce energy consumption
- **Interactive charts** - Visualize power consumption trends over time

### 🏡 Room Management
- **Create custom rooms** - Organize your home with personalized room categories
- **Suggested room templates** - Quick setup with pre-configured room types
- **Room-based device overview** - See all devices in each room at a glance

### 🔔 Notifications
- **Real-time alerts** - Get notified about device status changes
- **Energy alerts** - Receive warnings about unusual power consumption
- **System notifications** - Stay informed about connection status and updates

### 🎨 Modern UI/UX
- **Unified color palette** - Consistent, modern design across all screens
- **Dark/Light mode** - Automatic theme switching based on system preferences
- **Smooth animations** - Delightful micro-interactions and transitions
- **Gradient headers** - Beautiful visual hierarchy with gradient backgrounds

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | React Native 0.81.5 with Expo SDK 54 |
| **Language** | TypeScript 5.3 |
| **State Management** | React Context API |
| **Real-time** | Socket.IO Client |
| **Navigation** | Expo Router (file-based routing) |
| **UI Components** | Custom components with Linear Gradients |
| **Icons** | @expo/vector-icons (Ionicons, MaterialCommunityIcons, Feather) |
| **Testing** | Jest with React Native Testing Library |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/fadymaher24/Smart-Home-Mobile-App.git
   cd Smart-Home-Mobile-App/smartera
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure the backend**
   
   Update the API URL in `utils/api.ts`:
   ```typescript
   export const API_BASE_URL = 'http://YOUR_BACKEND_IP:3000/api';
   ```

4. **Start the development server**
   ```bash
   npx expo start
   ```

5. **Run on your device**
   - Press `a` for Android emulator
   - Press `i` for iOS simulator
   - Scan the QR code with Expo Go app on your physical device

---

## 📁 Project Structure

```
smartera/
├── app/                    # Expo Router pages
│   ├── index.tsx          # Welcome screen
│   └── Welcome.tsx        # Onboarding flow
├── screens/
│   ├── LoginScreen.tsx    # Authentication
│   └── tabscreens/        # Main app screens
│       ├── Home.tsx       # Dashboard
│       ├── DeviceActive.tsx   # Device management
│       ├── PowerUsage.tsx     # Energy analytics
│       ├── Notification.tsx   # Alerts & notifications
│       ├── Settings.tsx       # App settings
│       └── QRScan.tsx         # QR code scanner
├── hooks/
│   └── useDeviceData.ts   # Custom hooks for device data
├── services/
│   ├── deviceService.ts   # Device API calls
│   └── realtimeService.ts # Socket.IO connection
├── context/
│   ├── AuthContext.tsx    # Authentication state
│   └── ThemeContext.tsx   # Theme management
├── utils/
│   ├── api.ts            # API configuration
│   └── colors.ts         # Unified color palette
└── assets/               # Images, fonts, icons
```

---

## 🎨 Color Palette

The app uses a unified color system for consistency:

| Color | Hex | Usage |
|-------|-----|-------|
| 🔵 Primary | `#5B6EF5` | Main brand color, buttons, links |
| 🟣 Secondary | `#8B5CF6` | Accents, gradients |
| 🔷 Accent | `#06B6D4` | Highlights, special elements |
| 🟢 Success | `#10B981` | Online status, confirmations |
| 🟠 Warning | `#F59E0B` | Caution, power indicators |
| 🔴 Error | `#EF4444` | Offline status, errors |

---

## 🔌 Backend Integration

This app connects to a Node.js backend server that handles:

- **Authentication** - JWT-based user authentication
- **Device Management** - CRUD operations for smart devices
- **Real-time Updates** - Socket.IO for live telemetry data
- **MQTT Bridge** - Communication with IoT devices via EMQX broker

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register` | User registration |
| GET | `/api/device` | Get all devices |
| POST | `/api/device` | Add new device |
| POST | `/api/device/:id/control` | Control device |
| GET | `/api/rooms` | Get user's rooms |
| POST | `/api/rooms` | Create new room |

---

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

---

## 📱 Screenshots

| Welcome | Home | Devices | Power Usage |
|---------|------|---------|-------------|
| Gradient welcome screen with animations | Live dashboard with device overview | Device control with real-time data | Energy analytics and costs |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Fady Maher**
- GitHub: [@fadymaher24](https://github.com/fadymaher24)

---

## 🙏 Acknowledgments

- [Expo](https://expo.dev) - Amazing React Native framework
- [React Native](https://reactnative.dev) - Build native apps with React
- [Socket.IO](https://socket.io) - Real-time bidirectional communication
- [@expo/vector-icons](https://icons.expo.fyi) - Beautiful icon library

---

<p align="center">
  Made with ❤️ for smart homes everywhere
</p>
