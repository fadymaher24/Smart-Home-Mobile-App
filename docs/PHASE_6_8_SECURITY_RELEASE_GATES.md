# Phase 6–8 Security and Production Gates

This repository deliberately rejects MQTT `ota_update` commands until the
following production controls are present. A successful download is not an OTA
implementation: without all of these controls it can permanently compromise a
customer device.

## Phase 6: OTA release gate

Required before enabling an OTA endpoint or firmware command:

- Offline or HSM-protected signing key, distinct release and emergency-revoke
  roles, key identifiers, rotation procedure, and compromise drill evidence.
- Immutable HTTPS artifact registry containing product, hardware revision,
  semantic version, SHA-256 digest, detached signature, size, and compatibility
  constraints. Artifact bytes must be retained and access logged.
- Firmware verification of HTTPS trust anchor, artifact size/digest/signature,
  product and board revision, minimum accepted version, and inactive-partition
  capacity before writing flash.
- Boot health confirmation, rollback after a failed health window, and an
  anti-downgrade counter stored in protected device state.
- Campaign cohorts, pause/stop rules, audit events, result aggregation, and
  power-cut/corrupt-image/wrong-board/rollback hardware evidence.

The current PlatformIO `huge_app.csv` partition layout is not evidence of an
inactive OTA partition. It must be replaced only after a tested partition and
rollback design is approved for the production ESP32 module.

## Phase 8: manufacturing and Egypt launch gate

Required before a pilot batch can be sold or represented as production:

- A locked manufacturing station that issues one immutable device identity per
  unit and records operator, fixture, firmware digest, calibration constants,
  measured values, pass/fail reason, rework lineage, and printed label ID.
- Fixture-controlled electrical, relay, metering, Wi-Fi, BLE, safety-latch,
  burn-in, and reset tests with retained per-unit evidence.
- Ratified yield, false-pass, false-fail, calibration-drift, and burn-in escape
  thresholds; a failed unit cannot receive a saleable label.
- Completed NTRA and applicable electrical, EMC, RF, safety, import, warranty,
  Arabic labeling, and consumer-documentation obligations for the final bill of
  materials and enclosure.
- Rehearsed incident, recall, credential-compromise, emergency-firmware,
  warranty, replacement, and support runbooks.

These are external security, hardware, and regulatory evidence gates. They
cannot be truthfully completed by source changes or simulator tests alone.
