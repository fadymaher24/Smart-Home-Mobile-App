# API Documentation for Smart Home Mobile App Backend

This document lists the REST API endpoints your mobile app will use to communicate with your Node.js backend. The backend will handle authentication, device management, and broker/database communication.

---

## Authentication

### POST /auth/login

- **Body:** `{ email, password }`
- **Response:** `{ token, user }`

### POST /auth/register

- **Body:** `{ name, email, password }`
- **Response:** `{ token, user }`

### GET /auth/me

- **Headers:** `Authorization: Bearer <token>`
- **Response:** `{ user }`

---

## Devices

### GET /devices

- **Headers:** `Authorization: Bearer <token>`
- **Response:** `[{ id, type, location, status, ... }]`

### POST /devices

- **Headers:** `Authorization: Bearer <token>`
- **Body:** `{ id, type, location }`
- **Response:** `{ device }`

### GET /devices/:id

- **Headers:** `Authorization: Bearer <token>`
- **Response:** `{ device }`

### POST /devices/:id/control

- **Headers:** `Authorization: Bearer <token>`
- **Body:** `{ action: "turnOn" | "turnOff" }`
- **Response:** `{ success: true }`

### DELETE /devices/:id

- **Headers:** `Authorization: Bearer <token>`
- **Response:** `{ success: true }`

---

## Device Status & Events

### GET /devices/:id/status

- **Headers:** `Authorization: Bearer <token>`
- **Response:** `{ status: "Active" | "Inactive" | "Disconnected" }`

### (Optional) WebSocket /devices/events

- **Headers:** `Authorization: Bearer <token>`
- **Description:** Receive real-time device status/events.

---

## Power Usage

### GET /devices/:id/power-usage

- **Headers:** `Authorization: Bearer <token>`
- **Response:** `{ usage: number, unit: string, history: [...] }`

---

## Notifications

### GET /notifications

- **Headers:** `Authorization: Bearer <token>`
- **Response:** `[{ id, message, read, createdAt }]`

### POST /notifications/read

- **Headers:** `Authorization: Bearer <token>`
- **Body:** `{ id }`
- **Response:** `{ success: true }`

---

## Example Usage in App

```js
import { apiRequest } from "./path/to/api";

// Login
const { token } = await apiRequest("/auth/login", "POST", { email, password });

// Get devices
const devices = await apiRequest("/devices", "GET", undefined, token);

// Control device
await apiRequest(
  `/devices/${deviceId}/control`,
  "POST",
  { action: "turnOn" },
  token
);
```

---

**Note:**

- All endpoints require authentication except `/auth/*`.
- The backend will handle MQTT and DB communication.
- Adjust endpoints as needed for your backend design.
