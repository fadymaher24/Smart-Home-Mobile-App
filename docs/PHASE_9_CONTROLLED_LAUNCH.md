# Phase 9: Controlled Launch Operating Procedure

The implementation exposes the administrator-only endpoint below as an
operational evidence snapshot, not a commercial approval mechanism:

`GET /api/operations/launch-readiness`

It requires a valid Smartera user whose current database role is `admin`. The
endpoint reports database and MQTT connectivity, fleet online rate, active
runtime credentials, pending configuration acknowledgements, and seven-day
provisioning failure rate. It always returns `commercialLaunchApproved: false`
and `safeToExpand: false` until the external gates are replaced by real,
audited evidence.

## Cohort progression

1. Internal employees: use serialized, traceable units only; review the
   endpoint weekly alongside physical-unit and support evidence.
2. Invitation-only pilot: record batch, device serial, customer consent,
   support contact, replacement path, and every safety/security/OTA incident
   outside this customer-facing API.
3. Limited public cohort: expand only after the ratified observation window
   shows acceptable provisioning, safety, reliability, support, return, energy
   quality, and recovery results.
4. Stop immediately for any S0/S1 incident and pause expansion for S2 fleet
   failures. The source snapshot cannot make that decision automatically.

## Required evidence before setting a commercial launch approval

- Final NTRA and applicable Egyptian product approval evidence for the final
  hardware, BOM, enclosure, labels, and firmware.
- Pilot proof of signed OTA recovery/rollback and runtime credential revocation
  on real, traceable inventory.
- Manufacturing fixture, calibration, test, burn-in, rework, and batch
  evidence tied to every saleable serial number.
- Approved KPI thresholds and observation window, staffed support/replacement
  process, backups/restore exercise, and rehearsed security/recall incident
  response.

Do not change the endpoint response to "approved" merely because software
builds pass. Approval must be derived from a signed release dossier and the
real-world evidence above.
