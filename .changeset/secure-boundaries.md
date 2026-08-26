---
"@karsa/auth": minor
"@karsa/booking": minor
"@karsa/catalog": minor
"@karsa/core": minor
"@karsa/orders": minor
"create-karsa": minor
---

Harden first-run authentication, internal redirects, media and proof uploads, public booking, checkout idempotency, and confirmation-time inventory allocation. Existing installations must apply the new append-only migrations and configure the setup and (when booking is enabled) Turnstile secrets before deployment.
