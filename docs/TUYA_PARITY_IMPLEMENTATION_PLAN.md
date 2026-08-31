# Smartera Independent Smart Plug: Tuya-Class Implementation Plan

Status: implementation backlog and product requirements document  
Initial product: ESP32 Wi-Fi + BLE smart plug  
Initial market: Egypt  
Platform strategy: fully independent Smartera mobile app, backend, MQTT broker,
firmware, device identity, and operations  
Schedule and team size: deliberately unset; estimate only after architecture,
hardware, certification, and staffing decisions in Phase 0

This document is the source of truth for evolving the existing Smartera
prototype into a commercially operable smart-plug platform with a configuration
and ownership experience comparable to mature ecosystems such as Tuya. It is a
delivery plan, not a claim of present capability.

The shared wire contract remains in [`PROTOCOL.md`](./PROTOCOL.md). When this
plan changes a topic, API, unit, state transition, or security rule, the
protocol document and all affected implementations must change together.

## 1. Executive Summary

### Problem Statement

Smartera already has an Expo mobile client, Express backend, MQTT transport,
BLE provisioning, telemetry, command acknowledgements, and ESP32 firmware.
However, it lacks the manufacturing identity, typed product configuration,
secure fleet credential lifecycle, signed OTA, production calibration,
offline automation, operational tooling, and commercial release controls that
make a smart-home platform dependable at scale.

The main risk is treating onboarding as the whole product. A commercial smart
plug must remain secure, measurable, recoverable, configurable, updateable, and
supportable throughout its manufactured lifetime.

### Proposed Solution

Build an independent Smartera device platform around one production ESP32 smart
plug. Give every manufactured unit an immutable identity, use a one-time claim
only for account binding, issue separate revocable runtime credentials, model
all hardware functions through a versioned schema, synchronize desired and
reported configuration, execute critical schedules locally, and operate signed
A/B firmware releases through a controlled fleet service.

Product expansion to lights, sensors, switches, remotes, gateways, and Matter
is deferred. The first plug must nevertheless use reusable product, identity,
configuration, and event abstractions so later products do not require a new
platform.

### Success Criteria

The following are proposed release targets. Phase 0 must ratify or replace each
target before implementation estimates are approved.

- 100% of production units have unique, traceable factory identities; no shared
  device, broker, provisioning, or OTA signing secret exists in firmware.
- At least 95% of supported-router onboarding attempts succeed on the first
  attempt and at least 99% succeed within three attempts in the qualification
  matrix.
- A valid remote relay command receives a device acknowledgement within 3
  seconds at p95 under the reference network; the UI never presents desired
  state as confirmed state.
- Cloud API and MQTT control-plane availability reach at least 99.9% monthly,
  measured separately from customer power and home-network failures.
- At least 99% of eligible online devices complete a staged OTA campaign; an
  interrupted or invalid update does not brick the plug and triggers rollback.
- 100% of released hardware passes serialized factory authorization,
  calibration, relay, button, LED, BLE, Wi-Fi, MQTT, and safety checks.
- Metering accuracy meets the ratified product specification across the tested
  voltage/load/power-factor matrix. Initial design target: no worse than +/-1%
  active power over the declared operating range, subject to metering IC and
  laboratory confirmation.
- Safety cutoff behavior passes electrical engineering and accredited-lab
  verification; firmware configuration can never raise limits above immutable
  hardware-certified ceilings.
- Mobile crash-free sessions reach at least 99.5%, and provisioning failures
  expose a stable reason code plus a recoverable next action.
- All security-significant device actions are attributable by account, device,
  credential, command ID, firmware version, and timestamp.

### Strategic Principles

1. Smartera owns the core platform and customer data.
2. Factory identity is immutable; account ownership is replaceable.
3. Provisioning credentials are short lived; runtime credentials are separate.
4. Hardware safety always overrides cloud, mobile, BLE, schedule, and button
   requests.
5. Desired state and reported state are distinct.
6. Configuration is typed, versioned, acknowledged, and bounded by hardware.
7. Devices continue safe local behavior during cloud or internet outages.
8. Firmware must be recoverable before it is remotely updateable.
9. Production and support tooling are product features, not post-launch chores.
10. Commercial release requires evidence from hardware, security, reliability,
    manufacturing, and regulatory tracks—not only successful software builds.

### Current Baseline

Existing strengths to preserve:

- Authenticated mobile session creation and a one-time provisioning token.
- Physical 120-second BLE pairing window.
- Encrypted and bonded BLE characteristics.
- Per-device MQTT namespace under `devices/{deviceId}/...`.
- MQTT command message IDs and firmware acknowledgements.
- Atomic backend device claim and ownership conflict rejection.
- Persisted emergency latch that blocks unsafe relay-on paths.
- Mobile secure storage for account and provisioning tokens.
- Telemetry validation and explicit Wh/kWh conversion.
- ESP32 and ESP8266 compile targets, with ESP32 defined as the provisionable
  product target.

Known baseline limitations addressed by this plan:

- The one-time claim token is currently also used as the device MQTT password.
- Factory identity and authenticity are not independently established.
- Wi-Fi and MQTT secrets are not stored in a hardened encrypted partition.
- Product capabilities are strings rather than a versioned typed schema.
- OTA command handling exists but production OTA is not implemented.
- Calibration is not a per-unit controlled manufacturing process.
- Schedules, countdowns, time synchronization, and offline automation are not a
  complete device subsystem.
- Fleet operations, release campaigns, device logs, credential rotation, and
  support tooling are incomplete.

## 2. User Experience & Functionality

### User Personas

#### Home owner

Buys one or more plugs, pairs them without technical knowledge, controls loads,
sets schedules, views energy usage, shares a home, and expects the plug to remain
safe during outages or service disruptions.

#### Shared household member

Receives access without receiving the owner's password or device root secret,
and can perform only the actions granted to the household role.

#### Customer-support operator

Diagnoses onboarding, connectivity, firmware, and hardware issues using
redacted device evidence without seeing Wi-Fi passwords or reusable secrets.

#### Manufacturing operator

Flashes, authorizes, calibrates, tests, labels, and releases each unit through a
repeatable station that cannot duplicate identities.

#### Product and fleet operator

Defines product schemas, publishes configuration defaults, deploys firmware in
stages, observes fleet health, and stops a rollout when guardrails fail.

#### Security administrator

Controls signing and issuing keys, rotates broker/device credentials, revokes
compromised units, and audits privileged operations.

### Primary User Journeys

#### Journey A: First-time setup

1. User signs in and selects Add device.
2. App explains the physical button sequence and LED pattern.
3. App scans the QR label and verifies product/device identity format.
4. User physically opens the pairing window.
5. App discovers the matching BLE advertisement and proves possession.
6. App collects or confirms a 2.4 GHz Wi-Fi network.
7. Backend creates a short-lived claim session.
8. App sends Wi-Fi credentials and claim material over authenticated BLE.
9. Device connects, authenticates with factory identity, and claims ownership.
10. Backend issues a separate runtime credential and confirms activation.
11. App names the plug, chooses a room, and shows a live reported state.
12. Device closes BLE pairing and clears transient claim material.

#### Journey B: Change Wi-Fi without losing ownership

1. Owner opens Network settings while near the device.
2. App requests physical confirmation and an encrypted BLE session.
3. Device stages new credentials while retaining the last working network.
4. Device tests Wi-Fi, DNS, TLS, broker authentication, and cloud reachability.
5. Device commits the new network only after end-to-end success.
6. Failure restores the old network and provides a specific recovery message.

#### Journey C: Configure safe plug behavior

1. Owner changes power-on behavior, child lock, LED mode, reporting interval,
   alert limits, or local schedules.
2. Backend validates settings against product schema and certified ceilings.
3. Device validates and atomically applies a new configuration version.
4. App shows Pending until reported configuration acknowledges the version.
5. Rejected fields show the device error and remain unchanged.

#### Journey D: Firmware update

1. Fleet operator releases firmware to internal devices.
2. Automated gates evaluate download, install, reboot, telemetry, and rollback.
3. Release expands to a small canary percentage, then larger cohorts.
4. App shows update availability or progress according to campaign policy.
5. Device validates signature, product, hardware revision, size, and version.
6. Device boots the candidate image and confirms health.
7. Failed candidates roll back and generate a fleet incident signal.

#### Journey E: Remove, transfer, or reset

1. Owner selects unbind, transfer, Wi-Fi reset, or factory reset.
2. UI explains exactly which local and cloud data will be removed.
3. Backend rotates/revokes runtime credentials as required.
4. Device acknowledges the action and clears only the defined data classes.
5. Factory identity and certified calibration remain immutable.

### User Stories and Acceptance Criteria

#### US-PROV-01: Scan and verify device label

As an owner, I want to scan the plug label so that I pair with the physical unit
in front of me.

Acceptance criteria:

- QR payload contains a version, product ID, device ID, and non-secret proof
  reference or setup code.
- App rejects malformed, unsupported, revoked, or mismatched product labels.
- Scanning a label never reveals the factory root secret.
- Manual entry is limited to a human-safe setup code and cannot claim by serial
  number alone.

#### US-PROV-02: Reliable BLE setup

As an owner, I want the app to find and configure the plug with clear progress
so that setup does not depend on guessing what failed.

Acceptance criteria:

- BLE discovery is restricted to the physical pairing window.
- App and firmware authenticate the setup exchange against the scanned unit.
- Progress distinguishes BLE, Wi-Fi association, DHCP, DNS, TLS, MQTT,
  activation, credential issuance, and cloud confirmation.
- Each failure has a stable code, localized explanation, retry action, and
  support correlation ID.
- Disconnecting and reopening the app resumes from authoritative session state.

#### US-PROV-03: Wi-Fi migration

As an owner, I want to change routers without deleting the plug so that rooms,
schedules, history, and sharing remain intact.

Acceptance criteria:

- Only an owner near the physically confirmed device may initiate migration.
- Old credentials remain usable until the new path passes end-to-end checks.
- Failed migration automatically returns to the last-known-good network.
- Wi-Fi passwords never enter backend logs, analytics, or cloud persistence.

#### US-CTRL-01: Truthful relay control

As a user, I want to know whether a command is pending, accepted, rejected, or
confirmed so that the app never lies about mains power state.

Acceptance criteria:

- App displays desired and reported state separately while a command is active.
- Backend success requires a matching acknowledgement from the addressed unit.
- Reported state changes only from device telemetry/status.
- Duplicate message IDs are idempotent.
- Safety latch, child lock, invalid version, offline, timeout, and hardware
  failure produce distinct results.

#### US-CFG-01: Versioned hardware settings

As an owner, I want configurable plug behavior that survives restart and remains
within safe limits.

Acceptance criteria:

- Configuration is validated by mobile hints, backend schema, and firmware.
- Device persists configuration atomically with checksum and schema version.
- Device reports applied version and per-field rejection reasons.
- Certified maximum current, power, voltage, and temperature ceilings cannot be
  raised remotely.
- Unknown fields are rejected or ignored according to explicit schema
  compatibility rules; they are never applied accidentally.

#### US-AUTO-01: Offline countdown and schedules

As an owner, I want timers to operate while the internet is unavailable.

Acceptance criteria:

- Countdown and weekly schedules execute on the plug.
- Firmware maintains validated UTC time plus timezone rules supplied by cloud.
- Clock uncertainty prevents unsafe or obviously stale executions and is
  reported diagnostically.
- Schedule changes are versioned and acknowledged.
- Factory reset clears schedules; network migration does not.

#### US-ENERGY-01: Trustworthy energy reporting

As an owner, I want accurate consumption and cost information.

Acceptance criteria:

- Per-unit calibration data is traceable to factory test evidence.
- Firmware reports voltage, current, active power, energy Wh, power factor where
  supported, frequency where supported, and measurement quality flags.
- Energy counter persists without excessive flash wear and survives reboot.
- Counter rollover/reset is explicit and does not create negative usage.
- Backend aggregates by timezone without double conversion.
- UI labels estimated cost separately from measured energy.

#### US-SAFE-01: Hardware protection

As an owner, I want the plug to turn off safely when electrical limits are
exceeded.

Acceptance criteria:

- Overcurrent, overpower, overtemperature, sensor failure, and relay fault
  policies are defined for the production hardware.
- Critical trips operate locally without cloud dependency.
- Safety latch survives restart and blocks every relay-on path.
- Clearing a critical latch requires the ratified physical recovery procedure.
- Trip evidence includes raw readings, calibrated readings, thresholds,
  firmware version, configuration version, and timestamp quality.

#### US-OTA-01: Recoverable firmware update

As an owner, I want updates without risking an unusable plug.

Acceptance criteria:

- Firmware image signature, digest, product ID, hardware revision, and version
  are verified before activation.
- Update uses an inactive partition and never overwrites the running image.
- Failed health confirmation rolls back automatically.
- Power interruption at every tested update stage leaves a bootable image.
- Device and backend expose durable progress and final result.

#### US-SHARE-01: Household sharing

As an owner, I want to share plugs without sharing my account.

Acceptance criteria:

- Home roles distinguish owner, administrator, member, and guest.
- Invitations expire and can be revoked.
- High-risk operations—ownership transfer, factory reset, credential rotation,
  and safety-limit changes—remain owner-only.
- Audit records identify the acting account and affected device.

#### US-SUPPORT-01: Privacy-safe diagnostics

As support staff, I want actionable evidence without access to household secrets.

Acceptance criteria:

- Support view shows firmware, hardware revision, RSSI, restart reason,
  configuration version, last error, time quality, and recent redacted events.
- Wi-Fi passwords, tokens, private keys, and full authorization credentials are
  never visible.
- Access is role restricted, time bounded where possible, and audited.
- User can export or reference a diagnostic bundle by correlation ID.

#### US-MFG-01: Serialized production

As a manufacturing operator, I want each unit authorized and tested exactly
once so that no duplicate or uncalibrated unit ships.

Acceptance criteria:

- Station obtains or injects one unique identity per physical unit.
- Reuse of an issued identity fails closed.
- Fixture verifies firmware hash, hardware revision, relay, button, LED,
  metering channels, BLE, Wi-Fi, MQTT, and safety response.
- Calibration and test evidence are stored against serial and batch.
- Label content is generated from the committed manufacturing record.
- Only a passing record may move to packaging/release state.

### Non-Goals for the First Commercial Product

- No Tuya Cloud, Tuya SDK, or Tuya device license dependency.
- No ESP8266 commercial onboarding or production SKU.
- No light, thermostat, camera, sensor, switch, or gateway implementation.
- No Matter certification in the first plug release; reserve architecture hooks
  and evaluate after the core product is stable.
- No user-authored scripting language in firmware.
- No remote configuration capable of exceeding hardware-certified limits.
- No claimed revenue-grade billing or utility metering unless separately
  certified for that use.
- No automatic public rollout directly from a developer build.
- No restoration of unsecured SmartConfig or open captive-portal onboarding.

## 3. AI System Requirements (Not Applicable)

The first smart-plug product does not require an AI system. Rules, schedules,
alerts, configuration validation, safety decisions, diagnostics, and rollout
gates must be deterministic and testable.

Future energy recommendations may use statistical or ML services only after the
metering pipeline is validated. Such recommendations must never control safety
limits or energize the relay without an explicit deterministic authorization
path. Any future AI feature requires a separate PRD, evaluation dataset,
accuracy thresholds, privacy review, and failure policy.

## 4. Technical Specifications

### Architecture Overview

```text
Manufacturing station
  |-- flashes signed production image
  |-- writes immutable identity + calibration
  |-- runs fixture tests and prints QR
  v
ESP32 smart plug
  |-- BLE: discovery, proof of possession, Wi-Fi migration
  |-- MQTT/TLS: telemetry, commands, config, events, OTA state
  |-- local: safety, schedules, metering, rollback, watchdog
  v
MQTT broker with per-device ACLs
  v
Smartera backend
  |-- account/home/device authorization
  |-- product schema + device shadow
  |-- credential/claim service
  |-- telemetry + automation + notification services
  |-- OTA campaign + fleet observability
  v
PostgreSQL + time-series/retention strategy + object storage
  ^
  |
Expo React Native app
  |-- account/home UX
  |-- BLE provisioning and recovery
  |-- control/config/energy/automation/OTA/support UX
```

### Trust and Credential Model

#### Credential classes

| Credential | Created | Stored | Purpose | Lifetime |
|---|---|---|---|---|
| Factory identity key | Manufacturing | Protected device partition; public record in backend | Prove genuine device identity | Device lifetime |
| Setup proof | Manufacturing label/record | QR label plus backend verification material | Bind app session to nearby unit | Until first use or rotation policy |
| Claim token | Backend | Secure mobile storage and transient device memory | Authorize one account-binding attempt | Minutes; single use |
| Bootstrap credential | Manufacturing/provisioning | Protected device storage | Reach only activation service | Rotatable; restricted scope |
| Runtime MQTT credential | Credential service after claim | Encrypted device storage and broker | Normal device messaging | Rotatable/revocable |
| User access token | Auth service | Mobile SecureStore | User API and Socket.IO access | Short lived with refresh policy |
| OTA signing key | Offline/HSM-controlled release process | Never on device; public verification key on device | Sign production firmware | Managed key lifecycle |

#### Required invariants

- A claim token must never become the MQTT password.
- Factory private identity must never be returned to the mobile app or backend
  support UI.
- Runtime credentials must be replaceable without changing device identity.
- Unbinding must revoke or rotate runtime credentials.
- Broker ACL identity must bind exactly to `devices/{deviceId}/#`.
- Bootstrap identity may publish only the minimum activation topics.
- Credential issuance, rotation, and revocation must be auditable and
  idempotent.

### Device Lifecycle State Machine

```text
manufactured
  -> factory_tested
  -> released
  -> unbound
  -> pairing
  -> activating
  -> active
  -> network_migration
  -> active
  -> unbinding
  -> unbound
  -> transferred
  -> active
  -> quarantined/revoked
  -> decommissioned
```

Transitions must be server-authoritative and compare-and-set. Firmware reports
its local state but cannot assign ownership. A revoked or decommissioned device
cannot reactivate without an explicit administrative recovery process.

### Product Identity and Schema

Create immutable identifiers:

- `productId`: smart-plug product family.
- `modelId`: commercial enclosure/electrical model.
- `hardwareRevision`: PCB/BOM/radio revision.
- `deviceId`: globally unique serialized unit ID.
- `manufacturingBatchId`: traceability group.
- `firmwareKeyId`: compatible signed firmware family.
- `schemaVersion`: supported function/config contract.

Initial product function groups:

- Relay: reported state, desired command, pending/result.
- Behavior: power-on mode, child lock, LED mode.
- Protection: certified ceilings, configurable lower thresholds, latch status.
- Metering: voltage, current, power, energy Wh, optional power factor/frequency,
  quality flags, calibration version.
- Automation: countdown, weekly schedules, timezone, clock quality.
- Connectivity: Wi-Fi status/RSSI, MQTT status, last contact, reset reason.
- Firmware: current version, slot, update state, rollback counter.
- Diagnostics: error codes, uptime, heap, watchdog/brownout counters.

Schema field definition must include:

- Stable field ID and human-readable name.
- Boolean, integer, decimal, enum, string, bitmap, timestamp, or structured type.
- Unit, scale, minimum, maximum, step, enum values, and default.
- Read-only/write-only/read-write direction.
- Persistence and reset behavior.
- Owner/member/service authorization.
- Real-time, sampled, event, or configuration reporting mode.
- Firmware minimum version and schema compatibility rule.
- Hardware-certified ceiling where applicable.

### Device Shadow and Configuration Protocol

Use explicit versioned topics:

```text
devices/{deviceId}/config/desired
devices/{deviceId}/config/reported
devices/{deviceId}/config/ack
devices/{deviceId}/events
```

Desired configuration envelope:

```json
{
  "messageId": "uuid",
  "configVersion": 14,
  "schemaVersion": 2,
  "issuedAt": "2026-08-29T12:00:00Z",
  "settings": {
    "powerOnBehavior": "off",
    "childLock": true,
    "ledMode": "relay",
    "maxCurrentMa": 15000,
    "maxPowerW": 3400,
    "reportingIntervalSeconds": 30
  }
}
```

Acknowledgement must state `applied`, `partially_applied`, `rejected`, or
`stale`; include the applied version and field-specific errors. Firmware must
write a candidate record, validate its checksum, then atomically select it.

### Firmware Architecture

Refactor firmware into explicit subsystems with bounded responsibilities:

- `IdentityManager`: immutable IDs, factory authorization, runtime credentials.
- `ProvisioningManager`: pairing window, BLE proof, Wi-Fi staging, activation.
- `ConnectivityManager`: Wi-Fi and MQTT reconnection/state transitions.
- `ConfigStore`: versioned atomic configuration and schema migration.
- `DeviceShadowClient`: desired/reported config and acknowledgement.
- `RelayController`: relay operation and physical button policy.
- `SafetyManager`: sensor validation, certified ceilings, trips, latch.
- `MeteringService`: sampling, calibration, integration, persistence quality.
- `TimeService`: UTC synchronization, timezone rule, clock uncertainty.
- `Scheduler`: countdown and local schedule execution.
- `OtaManager`: download, signature, partition, boot validation, rollback.
- `DiagnosticsService`: restart cause, counters, error ring buffer, health.
- `EventOutbox`: bounded persistent delivery for important offline events.

Firmware requirements:

- Replace general-purpose ADC metering with the selected production metering IC
  abstraction and a hardware-specific driver.
- Define a hardware abstraction boundary so PCB revisions do not contaminate
  protocol/business logic.
- Use watchdogs without masking deadlocks through unconditional feeding.
- Use brownout-safe writes and wear-conscious persistence.
- Bound every input length, collection, retry loop, queue, JSON document, and
  retained record.
- Never log credentials or Wi-Fi passwords, even in debug builds.
- Separate development and production build flags.
- Disable or protect JTAG/UART debug access for released units according to the
  security design.
- Persist restart cause, last safety trip, last OTA outcome, and configuration
  migration result.

### BLE Provisioning Protocol

Required enhancements to the existing BLE service:

- QR/setup-code proof of possession bound to `deviceId` and `productId`.
- Application-layer challenge-response in addition to BLE link encryption.
- Monotonic session nonce and transcript binding to prevent replay.
- Fragmentation/versioning for payloads larger than negotiated MTU.
- Stable typed response and failure codes.
- Explicit capabilities, protocol version, hardware revision, and firmware
  version during discovery.
- No permanent Wi-Fi or MQTT credential readable characteristic.
- Clear transient buffers after success, failure, disconnect, and timeout.
- Rate-limit failed proof attempts and require a new physical window after the
  threshold.
- Wi-Fi migration stages credentials and rolls back to last-known-good values.

### MQTT Protocol

Preserve per-device namespaces and add:

```text
devices/{deviceId}/telemetry
devices/{deviceId}/status
devices/{deviceId}/alerts
devices/{deviceId}/events
devices/{deviceId}/acks
devices/{deviceId}/cmd
devices/{deviceId}/config/desired
devices/{deviceId}/config/reported
devices/{deviceId}/config/ack
devices/{deviceId}/ota/desired
devices/{deviceId}/ota/reported
devices/{deviceId}/diagnostics
devices/{deviceId}/lwt
```

Rules:

- TLS is mandatory outside local development.
- Production firmware fails closed when trust anchors or credentials are absent.
- Broker uses per-device authentication, ACL, connection quotas, payload limits,
  retained-message policy, and certificate/credential revocation.
- Every command/config/OTA request has a message ID, issue time, expiry, schema
  version, and idempotency behavior.
- Backend validates topic identity against payload identity.
- Important device events use a bounded persistent outbox.
- QoS and retained behavior are defined per topic in `PROTOCOL.md`.
- Telemetry delivery must not block local safety or relay control.

### Backend Services

Evolve the Express codebase into explicit modules before feature volume grows:

- Identity and manufacturing registry.
- Product/schema registry.
- Provisioning and activation service.
- Device credential service.
- Home, membership, invitation, and authorization service.
- Device shadow/configuration service.
- Command service with durable result tracking.
- Telemetry ingestion and retention service.
- Energy aggregation service.
- Schedule/automation synchronization service.
- Firmware artifact and OTA campaign service.
- Notification preference and delivery service.
- Fleet health and diagnostics service.
- Support/admin audit service.

Required database entities:

- `products`, `product_schema_versions`, `hardware_revisions`.
- `manufacturing_batches`, `factory_devices`, `factory_test_runs`,
  `calibration_records`.
- `device_credentials`, `credential_events`, `device_lifecycle_events`.
- `homes`, `home_memberships`, `home_invitations`.
- `device_shadows`, `device_config_versions`, `device_config_results`.
- `device_commands`, `device_command_results`.
- `device_schedules`, `schedule_versions`, `schedule_results`.
- `firmware_artifacts`, `firmware_compatibility`, `ota_campaigns`,
  `ota_deployments`, `ota_results`.
- `device_health_snapshots`, `diagnostic_events`, `audit_events`.

API requirements:

- Version APIs under `/api/v1` before commercial client release.
- Publish OpenAPI and generate/test mobile request types.
- Use idempotency keys for claim, credential rotation, configuration, command,
  reset, and campaign operations.
- Enforce object ownership and home role on every direct-ID route.
- Paginate and bound every list/export endpoint.
- Use transactional outbox/event delivery for database-to-MQTT/WebSocket work
  where lost events would break lifecycle state.
- Store token/key hashes or encrypted ciphertext according to credential class;
  never store recoverable secrets without a documented need and key hierarchy.

### Mobile Application

Consolidate the current mixed Expo Router/React Navigation experience into one
documented navigation architecture before expanding flows.

Mobile feature areas:

- Guided QR + BLE onboarding with permissions requested contextually.
- Resumable progress and precise failure/recovery screens.
- Network migration and nearby-device recovery.
- Home, room, membership, and invitation management.
- Device dashboard showing reported state, pending operations, safety latch,
  connectivity, and firmware status.
- Schema-driven settings for power-on behavior, child lock, LED, thresholds,
  reporting interval, and schedules.
- Energy views with measurement quality and tariff assumptions.
- OTA availability, policy, progress, and failure recovery.
- Reset/unbind/transfer flows with explicit data consequences.
- Diagnostic export/correlation ID and privacy controls.
- Arabic and English parity, RTL validation, accessibility labels, dynamic type,
  screen-reader flow, contrast, and minimum touch targets.

Mobile state rules:

- SecureStore only for secrets; AsyncStorage only for non-secret cache.
- Server/session/device state remains authoritative after restart.
- Pending commands/config/OTA survive navigation and display expiry.
- Never synthesize successful device state locally.
- Offline cache clearly identifies stale timestamp and connection state.
- BLE scanning and location/Bluetooth permissions occur only in relevant flows.

### Local Automation and Time

Initial automation scope:

- One countdown timer.
- Versioned weekly on/off schedules.
- Explicit timezone identifier and DST rule version.
- Configurable power-on behavior: always off, always on if certified/approved,
  or restore last safe state.
- Optional away/random mode only after schedule reliability is established.

Execution priority:

```text
critical safety trip
  > persistent safety latch
  > physical hard-off
  > certified hardware limit
  > authorized local schedule
  > authenticated remote command
  > power-on preference
```

Cloud automations may request actions, but firmware still applies local safety
and authorization rules.

### Energy and Metering

Hardware selection must decide whether the production design uses a dedicated
metering IC capable of voltage/current/active power/energy and optional power
factor/frequency. Do not freeze PCB or enclosure before the metering and safety
architecture review.

Metering requirements:

- Per-unit factory calibration with reference equipment traceability.
- Declared valid operating range and accuracy specification.
- Quality flags for startup, saturation, sensor fault, uncalibrated, invalid
  frequency, and clock uncertainty.
- Monotonic Wh counter with atomic checkpoints and flash-wear budget.
- Separate lifetime, resettable user, and interval energy concepts if required.
- Backend derives usage by differences and handles resets/rollovers explicitly.
- Cost is derived from user tariff and must not alter the measured energy record.

### OTA and Release Management

Artifact pipeline:

1. Reproducible production build produces binary, symbols, manifest, SBOM,
   digest, product compatibility, schema range, and release notes.
2. CI performs static analysis, unit tests, firmware builds, protocol tests,
   dependency scans, and signing eligibility checks.
3. Authorized release process signs the immutable artifact using protected key
   infrastructure.
4. Internal devices install and pass automated health checks.
5. Campaign proceeds through test, employee, 1%, 5%, 25%, and 100% cohorts only
   when ratified guardrails pass.
6. Operator can pause but cannot mutate an existing artifact.

Device boot validation must confirm minimum runtime health before marking the
candidate partition valid. Rollback evidence must reach the fleet service after
connectivity returns.

### Manufacturing and Provisioning Station

Station capabilities:

- Authenticate operator and station.
- Select an approved product/hardware/firmware combination.
- Flash bootloader, partition table, and signed production image.
- Obtain and write exactly one factory identity.
- Write product/model/hardware/batch identifiers.
- Execute calibration using controlled loads/reference instruments.
- Run PCBA and final assembly tests.
- Commit signed test results before generating the final QR/serial label.
- Prevent release when any mandatory step is absent or failed.
- Support controlled rework without creating duplicate identities.

Minimum fixture tests:

- Supply voltage/current and board boot.
- Flash integrity and secure-boot/encryption state.
- Relay switching and contact feedback where hardware supports it.
- Button transitions and long-press timing.
- LED colors/patterns.
- BLE advertisement, connection, proof protocol, and RSSI.
- Wi-Fi association and RSSI on controlled network.
- TLS and restricted MQTT authentication.
- Meter zero/load points and calibration coefficients.
- Temperature sensor sanity.
- Safety cutoff command path and latch persistence.
- Factory reset semantics and identity preservation.
- Final current draw and thermal/aging plan.

### Physical Hardware and Safety Track

Required engineering decisions:

- ESP32 production module/chip selection with supply continuity and appropriate
  Wi-Fi/BLE radio certification evidence.
- Dedicated metering IC and isolation topology.
- Relay voltage/current/inrush rating and contact material.
- PCB trace current capacity, creepage, clearance, slots, and isolation barriers.
- Fuse/fusible element, MOV/surge protection, inrush limiting, and thermal
  protection.
- AC/DC power supply isolation, efficiency, heat, brownout, and failure mode.
- Flame-retardant enclosure/material and socket/plug mechanical durability.
- Antenna placement and enclosure detuning validation.
- Production temperature sensor placement and response time.
- Relay weld/stuck detection feasibility.
- Safe default relay state during boot, crash, brownout, OTA, and factory test.

No software milestone can waive failed electrical safety evidence.

### Security and Privacy

Required controls:

- Threat model covers manufacturing, BLE proximity, hostile LAN, broker,
  backend, mobile storage, supply chain, update pipeline, support access, device
  resale, physical extraction, and denial of service.
- ESP32 secure boot, flash encryption, encrypted NVS, protected factory data,
  production debug policy, and anti-rollback are evaluated and configured.
- Server secrets use managed secret storage and rotation, not repository files.
- OTA signing keys are separated from ordinary CI credentials.
- Broker and backend have independent least-privilege credentials.
- User sessions use short-lived access and revocable refresh tokens.
- Sensitive changes require recent authentication and audit events.
- Rate limits exist per IP, account, device, credential, and operation risk.
- Logs use structured redaction and retention rules.
- Security incident runbooks cover credential leak, signing-key compromise,
  malicious firmware, broker breach, device clone, and mass reset.
- Publish a vulnerability disclosure and supported-product lifetime policy
  before commercial sale.

### Egypt Commercial and Regulatory Track

This plan is not legal or certification advice. Before PCB freeze, engage an
Egypt-qualified compliance consultant and accredited laboratory to establish
the exact standards and approval scheme for the final product and supply chain.

Mandatory planning actions:

- Submit the final Wi-Fi/BLE product or applicable module/end product through
  the NTRA type-approval determination before shipment commitments. NTRA states
  that type approval is compulsory for importing, manufacturing, or assembling
  equipment with a communications element and evaluates RF, EMC, safety, and
  health compliance: <https://www.tra.gov.eg/en/regulations/type-approval/>.
- Determine whether Light, Intermediate, or Tight procedure applies using the
  then-current NTRA process. The official procedure page is updated and, as of
  this plan, lists all three schemes:
  <https://www.tra.gov.eg/en/regulations/type-approval/type-approval-procedure/>.
- Review the NTRA IoT regulatory framework with counsel, including licensing,
  service-provider, hosting/data-location, connectivity, and security effects:
  <https://www.tra.gov.eg/en/iot-regulatory-framework/>.
- Determine all applicable Egyptian electrical appliance, plug/socket,
  low-voltage safety, EMC, energy, labeling, import/manufacturing, consumer
  protection, warranty, and recycling obligations with EOS/GOEIC and the chosen
  lab/importer/manufacturer.
- Freeze the production BOM, module, antenna, PCB, enclosure, firmware radio
  behavior, model names, and labels before formal samples; manage any later
  changes through compliance impact review.
- Keep certificates, reports, declarations, BOM revision, samples, firmware
  version, and manufacturing evidence in the release dossier.

Commercial launch gate requires written confirmation of applicable approvals,
not an assumption that a pre-certified ESP32 module alone covers the end product.

### Observability and Operations

Define service-level indicators:

- API availability/latency/error rate.
- MQTT connection, authentication, subscription, and publish failures.
- Active device online rate by firmware/hardware/batch/network cohort.
- Command acknowledgement and reported-state confirmation latency.
- Provisioning funnel conversion and failure-code distribution.
- Configuration apply/reject/stale rate.
- OTA download/install/boot-confirm/rollback rate.
- Device reboot, brownout, watchdog, heap, RSSI, time-sync, and safety-trip rate.
- Telemetry validation rejection and energy-counter anomaly rate.
- Notification delivery rate.

Operations requirements:

- Separate development, staging, manufacturing, and production environments.
- Infrastructure as code, encrypted backups, restore tests, key rotation,
  monitoring, alerting, capacity review, and incident runbooks.
- Data retention by data class, with raw telemetry downsampling/archival policy.
- Fleet queries by product, hardware, batch, firmware, schema, geography,
  lifecycle, and health—not by arbitrary raw log searches alone.
- Support tools default to redacted views and use audited elevated access.

### Testing Strategy

#### Mobile gates

- `npm run lint`
- `npx tsc --noEmit`
- `npm test` in deterministic non-watch CI mode.
- Unit tests for auth, schema rendering, state transitions, error mapping, and
  reported-versus-desired behavior.
- Integration tests with mocked BLE and backend contracts.
- Physical-device E2E tests on supported Android/iOS versions.
- Arabic/English, RTL, accessibility, denied-permission, offline, background,
  app-killed, and interrupted-provisioning tests.

#### Backend gates

- `npm run build`
- Introduce a real automated test command; the current placeholder test command
  is not an acceptable commercial gate.
- Unit tests for validation, authorization, schema compatibility, and state
  machines.
- PostgreSQL integration tests for claim races, idempotency, ownership, device
  shadow, reset, and credential rotation.
- MQTT integration tests with ACL-enabled broker.
- Contract tests generated from OpenAPI and MQTT schemas.
- Load, soak, reconnect storm, retained-message, and broker failover tests.
- Backup restoration and disaster-recovery exercises.

#### Firmware gates

- `pio run -e esp32dev` on every change.
- Keep `pio run -e nodemcuv2` only as a compatibility/bench check until the
  ESP8266 target is formally retired; it is not a commercial product gate.
- Host/unit tests for parsers, configuration migration, schedule logic,
  idempotency, calibration math, and safety decisions.
- Hardware-in-loop relay, button, BLE, Wi-Fi, MQTT, sensor, and power-cycle tests.
- Fault injection for corrupt NVS, expired credentials, invalid config,
  malformed MQTT, network loss, broker loss, time loss, brownout, watchdog,
  sensor failure, OTA interruption, and bad signature.
- Long-duration energy, reconnect, thermal, flash-wear, and memory soak tests.

#### Security gates

- Secret and dependency scanning.
- Firmware artifact/SBOM and signature verification.
- BLE and MQTT protocol fuzzing.
- Authorization matrix and direct-object access tests.
- Replay, cloned identity, expired token, credential revocation, downgrade, and
  malicious retained-message tests.
- External penetration test before pilot and before material architecture change.

#### Manufacturing and compliance gates

- Fixture repeatability and gauge/calibration control.
- First-article inspection and pilot batch analysis.
- PCBA, final product, burn-in/aging, and sampled destructive safety testing.
- RF/EMC/electrical/thermal lab plan approved before design freeze.
- Formal release dossier complete before sale.

### Repository Implementation Map

Expected primary change areas:

- Mobile auth and lifecycle: `smartera/context/AuthContext.tsx`.
- Mobile provisioning state: `smartera/context/ProvisioningContext.tsx`,
  `smartera/hooks/useProvisioning.ts`, and `smartera/hooks/useBleProvisioning.ts`.
- Mobile BLE transport: `smartera/services/bleProvisioningService.ts`.
- Mobile device/config state: `smartera/hooks/useDeviceData.ts` and
  `smartera/services/deviceService.ts`.
- Mobile provisioning UI: `smartera/app/provisioning/` and
  `smartera/screens/provisioning/AddDeviceModal.tsx`; consolidate duplicate
  flows rather than implementing every feature twice.
- Backend claim/credentials: `Smartera-Backend/src/services/claimingService.ts`
  and new identity/credential modules.
- Backend MQTT: `Smartera-Backend/src/services/mqttHandlerService.ts` and
  `Smartera-Backend/src/config/mqttClient.ts`.
- Backend routes/models: `Smartera-Backend/src/routes/`, `src/models/`, and
  migrations; introduce versioned modules rather than continuing controller
  growth in `deviceController.ts`.
- Firmware identity/config: `include/config_manager.h`, `src/config_manager.cpp`,
  and new protected identity/config modules.
- Firmware BLE: `include/ble_manager.h` and `src/ble_manager.cpp`.
- Firmware MQTT: `include/backend_client.h` and `src/backend_client.cpp`.
- Firmware orchestration/safety: `src/main.cpp`, `src/device_control.cpp`,
  `src/safety_manager.cpp`, and `src/provisioning/provisioning_orchestrator.cpp`.
- Firmware OTA: replace the incomplete `include/ota_updater.h` path with a
  production implementation and explicit partition/recovery design.

## 5. Risks & Roadmap

### Delivery Model

Use evidence-based milestones rather than calendar promises. After Phase 0,
estimate each work package with the staffed team and selected hardware. No phase
may be declared complete because its UI is visible; its exit evidence must pass.

### Work-Package Conventions

- `ARCH`: architecture and contracts.
- `HW`: electrical/mechanical hardware.
- `SEC`: identity, credentials, platform security.
- `MFG`: manufacturing and calibration.
- `FW`: firmware runtime.
- `BE`: backend/platform.
- `APP`: mobile experience.
- `OPS`: reliability and support operations.
- `QA`: verification and release evidence.
- `REG`: Egypt regulatory/compliance.

Each implementation issue created from this plan must contain:

- Scope and non-scope.
- Dependencies and migration impact.
- API/topic/schema changes.
- Security and safety impact.
- Tests and measurable acceptance criteria.
- Rollout and rollback procedure.
- Documentation changes.

### Phase 0: Product Definition and Architecture Freeze Inputs

Objective: remove decisions that would otherwise invalidate PCB, identity, OTA,
and backend work.

Work packages:

- `ARCH-001`: Ratify product requirements, personas, non-goals, and KPIs.
- `ARCH-002`: Write ADRs for independent cloud, product schema, device shadow,
  lifecycle states, API versioning, event delivery, and data retention.
- `ARCH-003`: Define v1 MQTT/REST/BLE schemas and compatibility policy.
- `ARCH-004`: Decide commercial support lifetime and firmware support policy.
- `ARCH-005`: Produce staffed estimates and critical path after hardware and
  certification inputs are known.
- `HW-001`: Select ESP32 production module/chip and evaluate lifecycle/supply.
- `HW-002`: Select metering IC, relay, protection, power supply, and temperature
  architecture.
- `HW-003`: Define certified operating envelope and measurement specification.
- `SEC-001`: Complete cross-stack threat model and key hierarchy.
- `SEC-002`: Select factory identity mechanism: asymmetric device key preferred;
  document fallback if hardware constraints require symmetric keys.
- `MFG-001`: Select manufacturing partner, fixture strategy, secure injection
  method, and traceability system.
- `REG-001`: Engage Egypt compliance consultant/lab and obtain written approval
  roadmap before schematic/PCB freeze.
- `QA-001`: Define qualification router/phone/load/environment matrix.

Exit criteria:

- Approved product requirements and architecture decisions.
- Draft schematics/BOM and safety review.
- Identity/key/OTA signing design approved by security reviewer.
- NTRA and electrical compliance route documented by qualified parties.
- Test matrix, release gates, staffing assumptions, and estimates approved.

### Phase 1: Platform Security and Serialized Identity

Objective: establish a genuine device identity independent of account claims.

Started implementation (2026-08-29): `SEC-106`, `BE-101`, and the
claim-token-removal part of `FW-101` have an initial code slice. It creates a
per-device runtime credential after an atomic claim and persists it on the
plug. This is not a Phase 1 exit: broker authentication/ACL enforcement,
factory identity, encrypted storage, revocation/quarantine operations, audit,
and lifecycle tests
remain required.

Work packages:

- `SEC-101`: Implement factory device registry and unique issuance API.
- `SEC-102`: Implement protected factory partition and immutable identifiers.
- `SEC-103`: Enable and validate ESP32 secure boot and flash encryption for the
  chosen manufacturing process.
- `SEC-104`: Implement encrypted runtime credential/config storage.
- `SEC-105`: Implement bootstrap authentication with minimum broker/API scope.
- `SEC-106`: Implement runtime credential issuance after atomic claim.
- `SEC-107`: Implement credential rotation, revocation, quarantine, and audit.
- `SEC-108`: Implement broker per-device ACL templates and automated tests.
- `BE-101`: Split claim token from runtime credential in models and services.
- `BE-102`: Add lifecycle compare-and-set transitions and idempotency.
- `APP-101`: Add QR/setup-proof parsing and secure claim preparation.
- `FW-101`: Add `IdentityManager` and remove claim-token-as-MQTT-password logic.
- `QA-101`: Test clone, replay, expired claim, duplicate issuance, revoked unit,
  wrong product, and concurrent claim cases.

Exit criteria:

- A serialized test unit can bootstrap, claim, receive a new runtime credential,
  reconnect with it, rotate it, and be revoked.
- Claim token is cleared and cannot authenticate normal MQTT operation.
- No two manufacturing records can share identity material.
- Broker ACL integration tests prove cross-device publish/subscribe denial.

### Phase 2: Product Schema and Configuration Shadow

Objective: replace hardcoded/ad hoc settings with a typed, versioned contract.

Implementation update (2026-08-30): schema-v1 desired/reported shadow is
persisted and exposed through owner-scoped APIs. Auto-off, boot behavior, child
lock, LED behavior, reporting interval, timezone, and weekly schedules are
validated by both backend and ESP32 firmware, stored as one checksummed version,
and acknowledged after persistence. Desired delivery now uses a transactional
database outbox; rejected and stale results remain visible to the app. A dynamic
product-schema registry and certified hardware ceilings remain open work.

Work packages:

- `ARCH-201`: Define smart-plug schema v1 and compatibility semantics.
- `BE-201`: Implement product, hardware revision, and schema registry.
- `BE-202`: Implement desired/reported device shadow persistence.
- `BE-203`: Implement config validation against product and certified ceilings.
- `BE-204`: Implement transactional MQTT outbox and config result processing.
- `FW-201`: Implement atomic `ConfigStore`, checksum, defaults, and migrations.
- `FW-202`: Implement desired/reported/ack protocol and stale-version handling.
- `FW-203`: Enforce immutable certified ceilings below user-configurable limits.
- `APP-201`: Build schema-driven settings with localized units and validation.
- `APP-202`: Display pending, applied, partially applied, rejected, and stale
  configuration states.
- `QA-201`: Property/fuzz test types, bounds, unknown fields, duplicated versions,
  rollback, corrupt storage, and incompatible firmware/schema combinations.

Exit criteria:

- All configurable v1 behavior is represented in schema and acknowledged by
  actual firmware.
- Device restart preserves the last valid configuration.
- Invalid cloud/mobile settings cannot exceed firmware ceilings or corrupt the
  active record.

### Phase 3: Production Hardware, Metering, and Safety

Objective: prove the physical plug design and measurement/protection chain.

Current implementation status: the firmware now retains a checksum-protected
ESP32 energy counter, emits an explicit `estimated` measurement-quality flag,
and exposes sustained over-power conditions before the existing emergency
latch threshold. This is deliberately not calibrated metering: the current
ACS712/default-voltage path cannot satisfy FW-301/FW-302 or the Phase 3 exit
criteria. The legacy `update_config` command is rejected so it cannot claim to
change a safety limit without enforcement.

Work packages:

- `HW-301`: Complete schematic, PCB, enclosure, antenna, thermal, relay, and
  protection design reviews.
- `HW-302`: Build engineering validation units with production-like BOM.
- `FW-301`: Implement metering IC hardware abstraction and driver.
- `FW-302`: Implement calibration record validation and calibrated metrics.
- `FW-303`: Implement durable energy counter and quality flags.
- `FW-304`: Complete sensor-fault, relay-fault, overcurrent, overpower,
  overtemperature, brownout, and boot-safe behavior.
- `FW-305`: Implement diagnostic counters and bounded event outbox.
- `MFG-301`: Build calibration fixture and reference-equipment procedure.
- `QA-301`: Execute accuracy matrix over voltage, load, power factor,
  temperature, and duration.
- `QA-302`: Execute trip thresholds, relay stress/inrush, thermal, brownout,
  endurance, and fault-injection tests.
- `REG-301`: Run pre-compliance RF/EMC/electrical/thermal testing early enough
  to allow board changes.

Exit criteria:

- Production-like hardware meets ratified measurement and safety targets.
- All safety failures leave relay off and preserve actionable evidence.
- Calibration is repeatable and linked to serialized units.
- Pre-compliance findings are resolved or explicitly block progression.

### Phase 4: Provisioning and Recovery Experience

Objective: make setup and Wi-Fi recovery reliable enough for consumers.

Work packages:

- `FW-401`: Implement proof-of-possession challenge-response and BLE protocol
  versioning/fragmentation.
- `FW-402`: Implement staged Wi-Fi migration with automatic rollback.
- `FW-403`: Implement detailed network/activation failure taxonomy.
- `BE-401`: Implement resumable provisioning session state and correlation IDs.
- `BE-402`: Add provisioning funnel metrics without Wi-Fi credential exposure.
- `APP-401`: Consolidate the two provisioning UIs into one maintained flow.
- `APP-402`: Add QR, nearby-device match, physical-confirmation, and proof UX.
- `APP-403`: Implement resumable step-by-step progress and recovery actions.
- `APP-404`: Implement owned-device Wi-Fi migration.
- `APP-405`: Complete Arabic/English, RTL, accessibility, and denied-permission
  states.
- `QA-401`: Qualify supported router/security/band/SSID/password/DHCP/DNS cases.
- `QA-402`: Test interruption at every pairing transition and app lifecycle state.

Current implementation status (software-complete slice):

- `FW-401` has BLE protocol version 1, bounded 20-byte fragmentation, ordered
  reassembly, and physical-window enforcement. Cryptographic proof of possession
  is intentionally not claimed: it requires a random factory-provisioned secret
  or device key and a manufacturing label/identity record. The predictable
  MAC-derived verification code must not be used as proof.
- `FW-402` and `FW-403` stage Wi-Fi, preserve the previous network, commit only
  after a runtime-credential MQTT reconnect/ACK, roll back on activation failure,
  and expose stable Wi-Fi, MQTT, claim, protocol, and timeout codes.
- `BE-401` and `BE-402` provide active-session resume/cancel/status endpoints,
  correlation IDs, authoritative two-step claim completion, and allowlisted
  funnel telemetry. Mobile telemetry cannot claim a device and cannot persist
  Wi-Fi values or arbitrary error text.
- `APP-401` through `APP-405` now use one Expo Router provisioning flow, exact QR
  serial-to-nearby matching, physical pairing instructions, secure local resume
  with backend reconciliation, owned-plug network recovery, and localized camera
  permission recovery with accessibility labels.
- `QA-401` and `QA-402` remain release gates requiring real ESP32 plugs, Android
  and iOS devices, supported router/security variants, interruption testing, and
  measured onboarding targets. They cannot be completed by compilation alone.

Exit criteria:

- Onboarding metrics meet the ratified first/three-attempt targets.
- Every expected failure maps to a stable reason and recovery path.
- Wi-Fi migration preserves ownership/config/history and rolls back on failure.
- No Wi-Fi password reaches backend persistence or logs.

### Phase 5: Local Automation and Complete Plug Configuration

Objective: provide the expected daily smart-plug configuration experience.

Implementation update (2026-08-30): ESP32 weekly scheduling, POSIX timezone,
power-on behavior, child lock, LED mode, reporting interval, tariff persistence,
counter-reset-aware usage, and the core mobile configuration/tariff controls are
implemented. Countdown UI, schedule editing UI, historical multi-tariff cost,
calibrated metering, and hardware/DST interruption tests remain open gates.

Work packages:

- `FW-501`: Implement time synchronization and clock-quality state.
- `FW-502`: Implement countdown and versioned weekly scheduler.
- `FW-503`: Implement power-on behavior, child lock, and LED mode.
- `FW-504`: Define reboot/timezone/DST/schedule conflict behavior.
- `BE-501`: Implement schedule/version APIs and device synchronization.
- `BE-502`: Implement tariff profiles and energy-cost derivation.
- `APP-501`: Build countdown, schedule, timezone, power-on, child-lock, LED,
  protection, and reporting controls.
- `APP-502`: Build trustworthy energy/history/cost and quality-state views.
- `QA-501`: Test offline execution, DST, missed events, duplicated schedules,
  clock jumps, restart, long outage, and safety conflicts.

Exit criteria:

- Countdown and schedules execute correctly without cloud connectivity.
- Configuration is schema-driven and device-confirmed.
- Energy displays remain correct across reset, rollover, timezone, and missing
  telemetry cases.

### Phase 6: Secure OTA and Fleet Release Control

Objective: safely maintain devices after sale.

Work packages:

- `SEC-601`: Establish protected signing process, roles, rotation, and emergency
  key-compromise procedure.
- `FW-601`: Implement HTTPS artifact download, digest/signature verification,
  compatibility validation, inactive-partition write, and progress reporting.
- `FW-602`: Implement boot health confirmation, rollback, and anti-downgrade.
- `BE-601`: Implement immutable artifact registry and compatibility matrix.
- `BE-602`: Implement campaign cohorts, scheduling, pause, guardrails, and audit.
- `BE-603`: Implement OTA desired/reported state and fleet result aggregation.
- `APP-601`: Implement update policy, consent/forced policy where approved,
  progress, restart, success, and recovery UX.
- `OPS-601`: Implement internal/canary dashboards and automated stop conditions.
- `QA-601`: Power-cut every OTA phase; test corrupt, wrong product/revision,
  invalid signature, downgrade, full partition, network loss, and rollback.

Exit criteria:

- No tested interruption or invalid artifact bricks a device.
- Campaigns progress only through approved cohorts and measurable guardrails.
- Rollback and failure evidence are visible to operations and support.

### Phase 7: Homes, Sharing, Notifications, and Support

Objective: deliver the household and post-sale capabilities expected of a mature
consumer app.

Work packages:

- `BE-701`: Implement homes, memberships, invitations, and role matrix.
- `BE-702`: Apply role/scope authorization to every device, room, automation,
  energy, reset, transfer, and support action.
- `BE-703`: Implement notification preferences, deduplication, severity, push
  provider integration, and delivery tracking.
- `BE-704`: Implement owner transfer and auditable unbind/reset semantics.
- `BE-705`: Implement redacted diagnostics and support cases/correlation IDs.
- `APP-701`: Build home/member/invitation management.
- `APP-702`: Build notification preferences and actionable safety alerts.
- `APP-703`: Build network reset, unbind, transfer, and factory-reset flows.
- `APP-704`: Build device information, diagnostics, privacy, and support export.
- `QA-701`: Execute the complete role/action/resource matrix and account/device
  ownership lifecycle tests.

Exit criteria:

- Shared users cannot exceed granted roles.
- Ownership transfer rotates credentials and preserves/clears data exactly as
  specified.
- Support can diagnose common failures without secret access.

### Phase 8: Manufacturing Pilot and Egypt Approval

Objective: prove that repeatable, compliant units—not engineering samples—can
be produced and supported.

Work packages:

- `MFG-801`: Implement secured station software and operator roles.
- `MFG-802`: Implement fixture scripts, calibration, test evidence, rework, and
  label generation.
- `MFG-803`: Conduct engineering validation, design validation, and pilot
  production batches with traceability.
- `QA-801`: Analyze yield, false pass/fail, calibration drift, burn-in, field
  simulation, packaging, and shipping effects.
- `REG-801`: Submit and complete applicable NTRA approval path.
- `REG-802`: Complete applicable electrical/EMC/RF/safety/import/manufacturing,
  labeling, warranty, and consumer documentation obligations.
- `OPS-801`: Establish production incident, recall, credential compromise,
  firmware emergency, customer support, warranty, and replacement runbooks.

Exit criteria:

- Pilot units are serialized, authorized, calibrated, tested, and traceable.
- Manufacturing yield and escape thresholds meet ratified targets.
- Required certificates/permits/reports are complete and match final hardware.
- Support, warranty, security response, and fleet operations are staffed and
  rehearsed.

### Phase 9: Controlled Commercial Launch

Objective: launch without exposing the full customer base to unknown fleet
failure modes.

Work packages:

- `OPS-901`: Employee/internal deployment with full telemetry and weekly review.
- `OPS-902`: Invitation-only customer pilot with explicit support channel.
- `OPS-903`: Limited public cohort with inventory/batch traceability.
- `OPS-904`: Expand only after provisioning, safety, reliability, OTA, support,
  return, and energy-quality guardrails hold.
- `QA-901`: Perform post-launch security and reliability review.
- `ARCH-901`: Decide whether the next investment is scale, Matter/ecosystem
  integration, or the second device category based on evidence.

Exit criteria:

- Commercial KPIs meet the ratified observation window.
- No unresolved critical safety/security issue.
- OTA and credential revocation have been proven on real pilot inventory.
- Customer support and replacement logistics meet service targets.

### Later Product Categories

After the smart plug exits controlled launch, reuse the platform foundations in
this order only if product strategy supports it:

1. Additional plug/socket models using the same relay/metering schema family.
2. Wall switches using relay/schedule foundations without assumed metering.
3. Lights using a new product schema and firmware hardware abstraction.
4. Battery sensors after low-power/offline delivery architecture is designed.
5. Remotes/sub-devices and gateways after trust/delegation architecture.
6. Matter support after commissioning, fabric ownership, certification, and
   multi-admin lifecycle receive a separate plan.

### Technical Risks and Mitigations

| Risk | Impact | Mitigation and gate |
|---|---|---|
| Existing claim token doubles as runtime MQTT credential | Credential exposure and broken lifecycle | Phase 1 separates credentials before pilot |
| Hardware design changes after certification | Cost and launch delay | Compliance input in Phase 0; controlled BOM/revision process |
| General ADC metering cannot meet accuracy target | Misleading energy and unsafe thresholds | Select metering IC and validate before PCB freeze |
| OTA bricks devices | Recall and trust loss | A/B, signing, boot health, rollback, exhaustive power-cut tests |
| BLE Just Works permits nearby MITM during window | Credential interception | QR proof plus application challenge-response |
| Secrets extracted from flash | Device cloning/fleet compromise | Secure boot, flash/NVS encryption, protected identity, rotation |
| Cloud outage breaks schedules | Core feature failure | Execute schedules locally with time-quality safeguards |
| Broker retained or cross-device messages leak | Unauthorized control/config | Per-device ACLs, identity matching, retained policy, integration tests |
| Firmware/backend/mobile schema drift | Failed config/control | Versioned schema, generated types, contract tests, compatibility matrix |
| Unbounded telemetry cost | Service instability | Sampling policy, limits, retention/downsampling, capacity gates |
| Long controllers and coupled firmware main loop slow delivery | Regression risk | Modular service refactor tied to phases, not a big-bang rewrite |
| No current backend automated tests | Security/lifecycle regression | Test harness is a Phase 1 entrance requirement |
| Regulatory path discovered too late | Unsellable inventory | NTRA/lab engagement before design freeze and shipment contracts |
| Unknown team size/deadline | Unrealistic commitments | Estimate after Phase 0 decisions and staffing |

### Release Severity and Stop Rules

- `S0 Safety`: risk of shock, fire, overheating, unintended energization, failed
  cutoff, or unsafe certified-limit bypass. Stop manufacture/deployment; relay
  defaults off where remotely actionable.
- `S1 Security`: credential/signing compromise, cross-device access, ownership
  takeover, malicious firmware, or privacy breach. Stop affected service and
  execute incident/revocation plan.
- `S2 Fleet`: widespread onboarding, connectivity, OTA, config, or telemetry
  failure. Pause rollout and affected campaigns.
- `S3 Product`: localized UX/function defect with safe workaround. Triage into
  controlled release process.

No open S0 or S1 is accepted for commercial release. OTA campaigns automatically
pause when ratified rollback, offline, crash, safety, or error thresholds breach.

### Definition of Commercially Ready

The ESP32 smart plug is commercially ready only when all are true:

- Final hardware/BOM/enclosure has required Egyptian approval and compliance
  evidence.
- Serialized identity, secure credential lifecycle, secure boot/storage, and
  signed recoverable OTA are active on production units.
- Product schema/configuration, local schedules, metering, and safety behavior
  pass qualification.
- Manufacturing station produces traceable passing units and rejects failures.
- Mobile and backend meet functional, accessibility, localization, security,
  load, backup, and operational gates.
- Fleet monitoring, support, warranty, incident response, revocation, OTA pause,
  and recall procedures are staffed and rehearsed.
- Pilot results meet the approved KPI observation window.

### Reference Baseline

The comparison target is capability maturity, not Tuya protocol compatibility.
Useful primary references consulted for the plan:

- Tuya typed product/data-point model:
  <https://developer.tuya.com/en/docs/iot-device-dev/TuyaOS-iot_abi_dp_ctrl?id=Kcoglhn5r7ajr>
- Tuya per-device production authorization:
  <https://developer.tuya.com/en/docs/iot-device-dev/gateway-product-auth?id=Kd47momejnn6y>
- Tuya production testing model:
  <https://developer.tuya.com/en/docs/iot/product-test?id=Kbe6d39x78pvr>
- Tuya firmware deployment/canary model:
  <https://developer.tuya.com/en/docs/iot/firmware-upgrade-operation-guide?id=K93ixsft1w3to>
- Tuya reset lifecycle:
  <https://developer.tuya.com/en/docs/iot-device-dev/TuyaOS-iot_abi_device_reset?id=Kc67srci7m1jk>
- Egypt NTRA type approval:
  <https://www.tra.gov.eg/en/regulations/type-approval/>
- Egypt NTRA IoT regulatory framework:
  <https://www.tra.gov.eg/en/iot-regulatory-framework/>

### Next Planning Action

Do not begin by implementing all settings screens. Start Phase 0 and convert its
work packages into tracked issues. The first implementation epic after the
architecture decisions must be Phase 1 serialized identity and credential
separation, because configuration, OTA, manufacturing, support, and ownership
all depend on knowing which genuine physical unit is communicating.
