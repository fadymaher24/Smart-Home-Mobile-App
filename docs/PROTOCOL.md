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
   plug persists it and reconnects with the new credential. Only that
   authenticated reconnection clears the claim token and acknowledges the
   credential ID, allowing the backend to activate the credential, mark the
   session claimed, and clear the retained response.
6. The app waits for an authenticated Socket.IO provisioning event or polls the
   authenticated session endpoint, then applies the device name and room.

Wi-Fi passwords must never be uploaded to the backend, stored in AsyncStorage,
logged, or returned from an API. Web and SmartConfig provisioning are disabled;
the supported flow requires a native BLE build.

The provisioning token is short lived and single use. It is a temporary
bootstrap credential only and must never be stored as, or reused as, the
long-lived MQTT password. Runtime MQTT credentials are individually issued,
rotatable, and revocable. Initial delivery uses the bootstrap connection; a
rotation is delivered only to the existing device-scoped runtime session while
its prior credential remains valid until the replacement has reconnected and
acknowledged its credential ID.

ESP32 is the provisionable smart-plug target. ESP8266 has no BLE radio, so its
build remains available for already provisioned/bench hardware but cannot enter
the mobile onboarding flow.

### BLE provisioning transport v1

The app reads `protocolVersion` from the BLE status characteristic and rejects
anything other than version `1`. Provisioning JSON also carries
`protocolVersion: 1`. It is Base64 encoded and sent in ordered frames on the
provisioning characteristic:

```text
P1|<zero-based-index>|<frame-count>|<base64-chunk>
```

Chunks are limited so every frame fits the default 20-byte ATT payload; an MTU
request is only an optimization. Firmware accepts at most 32 ordered frames and
512 encoded bytes, resets partial data on disconnect or sequence error, and
decodes only after every frame arrives. ACKs include the protocol version and a
stable error code.

The QR label currently narrows discovery to the exact 12-hex-digit `SP-` serial,
and the physical button opens the 120-second pairing window. This is proximity
and physical-confirmation protection, not cryptographic proof of possession.
Production challenge-response remains blocked until manufacturing provisions a
random per-unit secret or asymmetric device key and prints a non-secret proof
reference on the unit label. The MAC-derived verification code is not suitable
for that role.

Wi-Fi changes are staged in RAM while the last persisted network remains the
rollback target. Firmware commits the new SSID only after reconnecting to MQTT
with the delivered runtime credential and publishing its credential ACK. Wi-Fi,
MQTT, claim, and timeout failures restore the previous network.

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

## Smart-plug configuration v1

The current v1 configuration contract supports `autoOffEnabled`,
`autoOffDelaySeconds` (1–86,400), `powerOnBehavior` (`off`, `on`, or `restore`),
`childLock`, `ledMode` (`relay` or `off`), `reportingIntervalSeconds` (10–3,600),
up to 16 non-conflicting `weeklySchedule` entries, and a POSIX `timeZoneRule`.
Owners update it with an expected desired version; the backend stores the
shadow update and delivery payload transactionally, then publishes the retained desired version to
`devices/{deviceId}/config/desired`. Firmware rejects unknown fields, invalid
types, an unsupported schema, corrupt stored configuration, and stale versions.
It persists valid settings, schedule, and timezone as one checksummed version
before acknowledging `applied` on
`devices/{deviceId}/config/ack`.

## Smart-plug metering quality and energy counter

`devices/<serial>/telemetry` includes `measurementQuality`. Current hardware
reports `estimated`: the ACS712/default-voltage implementation is not a
calibrated electricity meter and must not be used for billing. The accumulated
`energyWh` counter is checksum-protected and retained in ESP32 NVS at most once
per five minutes; it is restored after a reboot. A metering-IC driver and
manufacturing calibration flow are required before firmware may report
`calibrated`.

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
