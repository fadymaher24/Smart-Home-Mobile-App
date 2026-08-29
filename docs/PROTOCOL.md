# Smartera device and provisioning contract

This document defines the contract shared by the mobile app, backend, MQTT
broker, and smart-plug firmware. Changes to topics, units, authentication, or
claim state must be updated in all four components.

## Provisioning

1. An authenticated mobile client creates a session with
   `POST /api/provisioning/session`.
2. The backend returns the raw, single-use `provisioningToken` once. Only its
   SHA-256-derived value is stored by the backend.
3. The app stores the token in the device secure store and sends it, together
   with Wi-Fi credentials, over an encrypted and bonded BLE connection while
   the plug's physical 120-second pairing window is open.
4. The plug connects to MQTT and publishes its claim request. The backend
   atomically consumes the unexpired session before assigning the plug.
5. The backend publishes a retained `claim_result` with a newly issued runtime
   MQTT credential on the plug's bootstrap-authenticated config topic. The
   plug persists that credential and acknowledges its credential ID; the backend
   clears the retained response, then the plug clears the claim token and
   reconnects before it marks provisioning complete.
6. The app waits for an authenticated Socket.IO provisioning event or polls the
   authenticated session endpoint, then applies the device name and room.

Wi-Fi passwords must never be uploaded to the backend, stored in AsyncStorage,
logged, or returned from an API. Web and SmartConfig provisioning are disabled;
the supported flow requires a native BLE build.

The provisioning token is short lived and single use. It is a temporary
bootstrap credential only and must never be stored as, or reused as, the
long-lived MQTT password. Runtime MQTT credentials are individually issued,
rotatable, revocable, and delivered only on the bootstrap connection.

ESP32 is the provisionable smart-plug target. ESP8266 has no BLE radio, so its
build remains available for already provisioned/bench hardware but cannot enter
the mobile onboarding flow.

## MQTT namespace

Every plug uses its immutable serial/device identifier in one namespace:

```text
devices/{deviceId}/telemetry  plug -> backend
devices/{deviceId}/status     plug -> backend, retained
devices/{deviceId}/alerts     plug -> backend
devices/{deviceId}/acks       plug -> backend
devices/{deviceId}/provision  plug -> backend
devices/{deviceId}/provision-status plug -> backend
devices/{deviceId}/cmd        backend -> plug
devices/{deviceId}/config     backend -> plug
devices/{deviceId}/lwt        broker/plug -> backend, retained
```

The broker must authenticate each plug with a per-device credential and enforce
ACLs that bind that identity to only `devices/{deviceId}/#`. Backend credentials
may subscribe and publish across device namespaces. Shared firmware credentials
are forbidden.

## Telemetry and commands

Telemetry reports instantaneous `voltage` in volts, `current` in amps, `power`
in watts, and cumulative `energyWh` in watt-hours. The backend validates finite,
non-negative readings and converts cumulative energy exactly once to
`energyTotal` in kilowatt-hours for storage and API responses.

Commands include a unique `messageId`. A publish acknowledgement from the MQTT
client is not device execution confirmation. The backend treats a command as
accepted only after receiving a matching message on the plug's `acks` topic:

```json
{
  "messageId": "uuid",
  "deviceId": "SP-...",
  "command": "on",
  "accepted": true
}
```

API control responses are pending (`202`) until reported telemetry confirms the
new relay state. The backend must not overwrite reported state when it merely
publishes a desired state.

## Safety and release gates

Over-current, over-power, and over-temperature events turn the relay off, save
the off state, and persist an emergency latch. Remote commands and remote
factory reset cannot turn the relay on or clear that latch; physical recovery is
required. BLE pairing and trust-management operations are also limited to the
physical pairing window.

Before a production release:

- configure `EXPO_PUBLIC_API_URL` in every EAS release profile;
- provision broker TLS and per-device credentials with the ACL above;
- calibrate current, voltage, energy, and temperature against the production
  hardware revision, then run load and trip-threshold tests;
- flash and exercise both supported board targets on hardware;
- rotate any credential that has ever appeared in Git history and purge it from
  history where required.
