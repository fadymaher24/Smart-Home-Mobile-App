# Runtime MQTT credentials

Each claimed plug receives a distinct MQTT username and a randomly generated
password. The backend stores only a SHA-256 hash of the password in
`device_credentials`; the plaintext is returned once in the claim response.

## Required broker integration

Before enabling this flow in production, configure the MQTT broker to perform
device authentication against the `device_credentials` store (or an internal
authentication service backed by it). Authentication must accept a credential
only when all of these are true:

- the username matches an `active` credential;
- the supplied password hashes to `secretHash`;
- the credential has not expired; and
- the associated device remains claimed and active.

The broker ACL must scope a runtime credential for serial `S` to exactly
`devices/S/#`. It must not subscribe to another device's topics, wildcard
topics, or backend-only topics.

## Bootstrap boundary

The claim token is a single-use, short-lived bootstrap credential. The broker
needs a separate bootstrap rule that permits an unclaimed plug to publish its
claim announcement and receive its configuration response only while that
token is valid. Do not authenticate runtime sessions by treating a claim token
as a durable MQTT password.

The backend publishes the credential response as a retained QoS 1 message so a
reconnecting plug can receive it. After persisting the credential, the plug
acknowledges its credential ID; the backend validates that acknowledgement and
clears the retained response. Production broker ACLs must limit the response
and acknowledgement to that plug's identity. Do not enable this delivery path
on a shared or permissive broker.

## Operational requirements

- Keep backend broker credentials separate from device credentials.
- Rotate or revoke a device credential by marking it `revoked`; broker checks
  must take effect on the next connection attempt.
- Use TLS for every production device connection and reject plaintext MQTT.
- Alert on repeated failed authentication and bootstrap attempts per device.
- Do not log MQTT passwords, claim tokens, or raw claim-response payloads.
