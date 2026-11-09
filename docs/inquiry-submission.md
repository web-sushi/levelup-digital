# Inquiry submission foundation

Phase LS-08B adds the server-side contract for project inquiries. Phase LS-08D.1 adds a browser client that can `POST` to this endpoint. The public contact page does not show a working send button, and the public route still cannot report a successful submission.

## Endpoint

`POST /api/inquiries`

The route uses the Node.js runtime. `GET`, `PUT`, `PATCH`, and `DELETE` return `405`.

Requests must use `Content-Type: application/json`. A charset parameter is allowed. The body is read with a hard limit of 16 KB. A `Content-Length` larger than that limit is rejected before the body is parsed, and the reader also stops if the stream itself exceeds 16 KB.

Every response includes `Cache-Control: no-store`. Error responses do not include submitted values, stack traces, environment variables, or provider details.

## Request fields

The JSON body must be an object. Arrays and other top-level values are rejected. Unknown properties are rejected. Reference objects may contain only `url` and `note`. The wizard's client-only `id` is not part of this contract.

| Field | Required | Rules |
| --- | --- | --- |
| `projectType` | Yes | `website`, `application`, `booking`, `redesign`, or `other` |
| `budget` | Yes | `range-50`, `range-100`, `range-200`, `range-500`, or `unsure` |
| `timeline` | Yes | `asap`, `month`, `quarter`, or `exploring` |
| `name` | Yes | Trimmed text, 1 to 80 characters |
| `email` | Yes | Trimmed text, reasonable `local@domain` syntax, at most 254 characters. The domain is lowercased. Mailbox ownership is not checked. |
| `business` | No | Trimmed text, at most 120 characters. Blank values are omitted. |
| `details` | No | At most 3,000 characters. Blank values are omitted. |
| `references` | No | At most three objects. Each needs an `http` or `https` URL of at most 500 characters and may include a note of at most 300 characters. |
| `companyWebsite` | No | Honeypot. Leave it empty. It is not the business-name field. |

Reference URLs must have a hostname and must not include a username or password. `javascript:`, `data:`, `file:`, and other schemes are rejected. Submitted URLs are not fetched, previewed, or resolved.

## Responses

| Status | Code | When |
| --- | --- | --- |
| 200 | none | `{ "ok": true }` when a delivery adapter returns `accepted` without a confirmation split. When the adapter also reports the customer confirmation, the body is `{ "ok": true, "confirmation": "accepted" | "rejected" | "unknown" }`. That means Brevo accepted the business notification. It does not prove the message reached an inbox. The public route cannot reach this state in this phase. |
| 400 | `INVALID_REQUEST` | Malformed JSON, a non-object payload, unexpected fields, invalid types, or a suspicious honeypot value. |
| 403 | `FORBIDDEN_ORIGIN` | The `Origin` header is missing, malformed, or not on the trusted list. |
| 405 | `METHOD_NOT_ALLOWED` | Any method other than `POST`. |
| 413 | `PAYLOAD_TOO_LARGE` | The body exceeds 16 KB. |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | The content type is not JSON. |
| 422 | `VALIDATION_ERROR` | A field fails validation. `fieldErrors` names the fields. |
| 429 | `RATE_LIMITED` | A configured limiter rejects the client key. `Retry-After` is set from the limiter result. |
| 500 | `INTERNAL_ERROR` | An unexpected failure. The log line is `inquiry request failed` and does not include the inquiry. |
| 503 | `SUBMISSIONS_UNAVAILABLE` | `INQUIRY_SUBMISSIONS_ENABLED` is not `true`. |
| 503 | `RATE_LIMIT_UNAVAILABLE` | Submissions are enabled, but there is no trustworthy client address, no key secret, or the limiter cannot make a decision. |
| 503 | `DELIVERY_UNAVAILABLE` | The delivery adapter does not return `accepted`. |

Validation failure:

```json
{
  "ok": false,
  "code": "VALIDATION_ERROR",
  "message": "Please check the highlighted fields.",
  "fieldErrors": {
    "email": "Enter a valid email address."
  }
}
```

Disabled submissions:

```json
{
  "ok": false,
  "code": "SUBMISSIONS_UNAVAILABLE",
  "message": "Online inquiries are temporarily unavailable. Please contact us directly by email."
}
```

## Environment variables

All of these are server-only. Do not put them in `NEXT_PUBLIC_` variables. `.env.example` contains placeholders only.

| Variable | Default | Meaning |
| --- | --- | --- |
| `INQUIRY_SUBMISSIONS_ENABLED` | disabled | Must be the exact string `true` before the handler will consider delivery. The route still cannot succeed while the production delivery adapter is unavailable. |
| `INQUIRY_TRUSTED_ORIGINS` | none | Comma-separated origins, for example `https://levelup-digital.dev`. Compared with `URL.origin`. |
| `INQUIRY_RATE_LIMIT_KEY_SECRET` | none | At least 16 characters. Used as the HMAC key for client identifiers. |
| `BREVO_API_KEY` | none | Server-only Brevo transactional API key. Presence does not enable submissions or select the public delivery adapter. |
| `BREVO_SENDER_EMAIL` | none | From address. Must be verified in Brevo before any live send. |
| `BREVO_SENDER_NAME` | none | Display name for the from address. |
| `INQUIRY_NOTIFICATION_EMAIL` | none | Inbox that receives the business notification. Also used as the customer confirmation reply-to. |
| `UPSTASH_REDIS_REST_URL` | none | HTTPS Upstash Redis REST URL. Presence does not enable submissions or attach the adapter. |
| `UPSTASH_REDIS_REST_TOKEN` | none | Upstash REST token. Server-only. |
| `INQUIRY_IDEMPOTENCY_KEY_SECRET` | none | HMAC secret for idempotency keys. At least 16 characters. Separate from the rate-limit secret. |

`NODE_ENV=development` also allows these origins: `http://localhost:3000`, `http://127.0.0.1:3000`, `http://localhost:3001`, and `http://127.0.0.1:3001`. A missing `Origin` header is allowed only in that development mode, so local `curl` can exercise the route. Production rejects a missing or malformed origin. Localhost is not added to the production allow list. The `Host` header is not used.

## Origin policy

Browser requests are checked against the configured origin list. There is no permissive CORS header. A future same-origin wizard does not need cross-origin access.

## Rate limiting

The production handler does not use an in-memory map. This site is intended for serverless hosting, so a process-local counter would not be a real limit.

The public route still uses `UnavailableRateLimiter`. A Redis-backed limiter now exists in `src/lib/inquiries/redis-store.ts`, and it is not attached to the route. Upstash credentials do not enable it. When submissions are enabled without that limiter, the handler still fails closed with `503`.

The starting policy is 5 requests per hour for each client key. It is a fixed window, so a client can be allowed five times at the end of one window and five times at the start of the next. The check and increment run in one Redis `EVAL` script. That script reads Redis server time with `TIME`, builds the window id as `floor(server seconds / window seconds)`, then runs `INCR` and sets `EXPIRE` to the full window length when the counter is created. Expiration starts at the first hit. It is not aligned to a UTC hour boundary. The caller clock is not used for the live window or for the idempotency lease. The in-memory limiter used by unit tests still accepts an injected clock so those tests stay deterministic. It is not used by the route.

Origin failures, malformed payloads, and honeypot hits are rejected before the limiter and before email. They cannot reach Brevo. An invalid idempotency key does consume one slot, so that header cannot be used for an unlimited probe. An accepted replay returns the stored result and does not consume another slot. Five requests an hour is a fixed window sized for a low-volume contact form. A client can still be allowed five times at the end of one window and five times at the start of the next. That burst is acceptable for this form, so the window was not replaced.

Client keys come only from the first address in `x-vercel-forwarded-for`, and only when that address matches a simple IP character check. `x-forwarded-for` is ignored because a caller can set it. The address is HMAC-SHA256 hashed with `INQUIRY_RATE_LIMIT_KEY_SECRET` before it is passed to the limiter. Raw addresses are not logged.

Automated tests use a small in-memory limiter inside the test file. That class is not used by the route.

## Delivery boundary

```ts
interface InquiryDelivery {
  deliver(inquiry: ValidatedInquiry): Promise<DeliveryResult>;
}
```

`DeliveryResult` is `accepted`, `unavailable`, `rejected`, or `unknown`. An accepted result may include a customer `confirmation` of `accepted`, `rejected`, or `unknown`. The handler returns a success body only for `accepted`. A legacy test adapter that returns `accepted` without a confirmation still produces exactly `{ "ok": true }`.

`UnavailableInquiryDelivery` is the only adapter created by the production runtime. It does not call Brevo, send mail, write a database row, or log the inquiry. Tests may inject another adapter. There is no environment flag that swaps in a fake accepting adapter. Brevo credentials do not change this.

## Brevo adapter

Phase LS-08C adds `BrevoInquiryDelivery` in `src/lib/inquiries/brevo-delivery.ts`. It is not constructed by `createInquiryRuntime`. The public route cannot select it from a request parameter. Automated tests inject a mock `fetch`. They do not call `https://api.brevo.com`.

`createBrevoInquiryDelivery(env)` reads server-only configuration. If any required value is missing or invalid, `deliver()` returns `{ "status": "unavailable", "category": "configuration" }` and does not call the network.

When configuration is valid, the adapter:

1. Builds the business notification and the customer confirmation from `src/lib/inquiries/email-templates.ts`.
2. POSTs the business notification to `https://api.brevo.com/v3/smtp/email` with the `api-key` header, a 10 second timeout, and `redirect: "error"`.
3. Treats HTTP 201 with a non-empty `messageId` as accepted for delivery by Brevo. The message id is discarded and is never returned to visitors.
4. Sends the customer confirmation only after that acceptance.
5. Does not retry.

Provider acceptance means Brevo accepted the API request. It does not mean the message reached an inbox.

### Email configuration

| Variable | Intended value | Role |
| --- | --- | --- |
| `BREVO_SENDER_EMAIL` | `levelupdigital.support@gmail.com` | From address for both messages |
| `BREVO_SENDER_NAME` | `LevelUp Digital` | From name for both messages |
| `INQUIRY_NOTIFICATION_EMAIL` | `levelupdigital.support@gmail.com` | Business notification recipient and customer confirmation reply-to |

The customer confirmation is addressed to the validated inquiry email. The business notification reply-to is that same customer address. None of these addresses are hardcoded in the adapter. The sender can later move to a mailbox on `levelup-digital.dev`, such as `support@levelup-digital.dev`, by changing `BREVO_SENDER_EMAIL`. That mailbox is not assumed to exist.

Brevo has verified the sender `levelupdigital.support@gmail.com`. That address is a free-email mailbox, and Brevo still shows DKIM and DMARC warnings for it. A Gmail address cannot publish the domain authentication that a mailbox on `levelup-digital.dev` can. SPF, DKIM, and DMARC for the site domain remain the recommended setup before launch. This phase did not send a live email.

### Templates

Both messages have HTML and plain text. HTML uses a simple table layout, the site background `#050505`, surface `#151515`, and accent `#00f050`. There are no images, tracking pixels, or scripts.

User-entered text is escaped before it is placed in HTML. Line breaks in the project description become `<br>` elements. Reference links are rendered only for `http` and `https` URLs without embedded credentials. Other URLs are shown as text. The templates do not fetch submitted URLs.

The business subject is `New Project Inquiry — LevelUp Digital`. The message includes the name, email, business, project type, budget, timeline, description, and up to three references. Missing optional sections say `Not provided` or `None provided`.

The customer subject is `We Received Your Project Inquiry — LevelUp Digital`. It thanks the customer, names the project type, and says the inquiry will be reviewed. It does not promise a response time. It includes the configured business email and `https://levelup-digital.dev/`. It does not repeat the customer's email, budget, description, or reference links.

### Partial delivery

| Business notification | Customer confirmation | Internal result | Public HTTP, if delivery is reached |
| --- | --- | --- | --- |
| Accepted | Accepted | `accepted`, confirmation `accepted` | `200` `{ "ok": true, "confirmation": "accepted" }` |
| Accepted | Rejected | `accepted`, confirmation `rejected` | `200` `{ "ok": true, "confirmation": "rejected" }` |
| Accepted | Unknown | `accepted`, confirmation `unknown` | `200` `{ "ok": true, "confirmation": "unknown" }` |
| Rejected | Not sent | `rejected` | `503` `DELIVERY_UNAVAILABLE` |
| Unknown | Not sent | `unknown` | `503` `DELIVERY_UNAVAILABLE` |
| Not attempted | Not sent | `unavailable` | `503` `DELIVERY_UNAVAILABLE` |

`ok: true` means the business notification was accepted by Brevo. A rejected or unknown confirmation must not be described as a failed inquiry, and it must not be used as a reason to ask the visitor to submit again. Failure categories stay internal. Raw Brevo bodies are not logged or returned.

A timeout, a network error, or an HTTP 201 body without a usable `messageId` is an unknown outcome. The request may already have reached Brevo. The adapter does not send the confirmation after an unknown business outcome, and it does not try the same request again.

### Idempotency

Phase LS-08C.1 adds a durable idempotency store. The public route does not call it yet. The isolated handler harness does. Until the store is attached to the public route, repeated clicks, browser retries, and a timeout after Brevo has accepted a message can still produce more than one business notification. The handler does not retry an unknown outcome by itself.

### Remaining production prerequisites

- Keep `INQUIRY_SUBMISSIONS_ENABLED` false and `INQUIRY_ACTIVATION_GATE` at `disabled` until a later phase changes both deliberately.
- Store `BREVO_API_KEY` only in the host environment. This phase does not send a live email. A present API key does not prove DKIM, DMARC, or inbox delivery.
- The sender `levelupdigital.support@gmail.com` is verified in Brevo. DKIM and DMARC warnings remain because it is a free-email domain.
- Set `INQUIRY_TRUSTED_ORIGINS` to `https://levelup-digital.dev`. Do not add localhost, a wildcard, or every Vercel preview domain.
- Keep the Upstash REST URL and token only in the host environment. Adding a payment method moves a free database onto a paid plan.
- A future phase can call `createPreparedInquiryRuntime` from the public route. Credentials alone must not enable sending.
- Prefer a verified sender on `levelup-digital.dev` once that mailbox exists, with SPF, DKIM, and DMARC.
- The public wizard can prepare a request, and the public page still hides the send button. There is no public test-send route.

## Distributed storage

Upstash Redis is the selected store for both the rate limit and the idempotency record. Its REST API works from a Vercel serverless function, and `EVAL` runs a Lua script as one atomic step. `SET` with `NX` and `EX` is also available. The scripts in `src/lib/inquiries/redis-scripts.ts` use `EVAL` so a claim is not a separate `GET` followed by `SET`.

Pricing was read from Upstash's pricing and billing pages on 30 October 2026. The free tier listed 250 MB, 500,000 commands per month, and 10 GB of bandwidth, with no credit card. Pay as you go was listed at $0.20 per 100,000 commands. An `EVAL` script is billed as one command plus one command for each `redis.call`. Those figures can change.

The owner created an Upstash Redis database for local verification. `npm test` still uses the in-memory limiter and a mocked `fetch`. It does not contact Upstash. Live checks are a separate command, `npm run test:upstash`, and they read `.env.local` only inside that process. On 9 November 2026 that command passed against the real REST endpoint:

- `PING` returned `PONG`, `TIME` returned a server clock, and `RATE_LIMIT_SCRIPT` ran through `EVAL`.
- Five serial attempts were allowed and the sixth was limited. The counter key used the Redis server window, and its TTL was greater than 0 and at most 3600 seconds.
- Eight concurrent attempts allowed exactly five and limited three. One counter key was created.
- Two concurrent claims with the same fingerprint produced one `claimed` result and one `processing` result. A different fingerprint returned `conflict` and left the original record in place.
- A mismatched owner token returned `not_owner` and did not change the record. The real owner could finalize `accepted`, `rejected`, and `unknown`. A later begin replayed that outcome and did not create a new claim.
- A 4 second processing lease became `replay_unknown` after it expired. A second begin after that expiry stayed `replay_unknown`. A separate record written with the 7 day retention constant had a TTL inside the last 30 seconds of 604800 seconds. The harness deleted that key. It did not wait seven days.
- A live `EVAL` that returned a string was treated as unavailable storage. A Lua syntax error returned no result. A client pointed at `https://127.0.0.1:9` with a dummy token returned unavailable. The real token was not sent to that address.

The harness used the namespace `levelup:test:ls08d2a:` plus a random suffix, synthetic fingerprints, and synthetic owner tokens. It did not flush the database. Cleanup used `SCAN` and `DEL` only for keys under that namespace. The public route was not used, and no email was sent. Mocked unit tests still do not prove live atomicity. The live suite above is the evidence for Lua compatibility and for these concurrent cases.

Low inquiry volume, on the order of a few submissions an hour, stays far inside the free command allowance.

Redis keys use two namespaces:

- `inquiry:ratelimit:v1:<client hash>:<window>`
- `inquiry:idempotency:v1:<idempotency hash>`

The idempotency hash is HMAC-SHA256 of the header value with `INQUIRY_IDEMPOTENCY_KEY_SECRET`. That secret is separate from `INQUIRY_RATE_LIMIT_KEY_SECRET` so disclosing one does not forge the other. The raw header and the raw IP address are not used as Redis keys and are not logged.

The payload fingerprint is a SHA-256 hash of the validated fields in a fixed order: project type, budget, timeline, name, email, business name, details, and each reference URL with its note. Optional text becomes an empty string. Reference order is part of the fingerprint. HTTP headers are not included. The stored record keeps that hash, the state, and the confirmation outcome. It does not keep the name, email, or message text.

### Operation order

When the idempotency store is injected, the handler keeps the existing parse, origin, honeypot, and validation steps. A disabled submission flag returns `503` before Redis or email. After that:

1. Require a trusted client address and both secrets. A missing address is `503` `RATE_LIMIT_UNAVAILABLE`. A missing idempotency secret is `503` `INQUIRY_STORAGE_UNAVAILABLE`.
2. Read `Idempotency-Key` from the header only. A missing or invalid key consumes one rate-limit slot, then returns `400` `INVALID_IDEMPOTENCY_KEY`. The query string is ignored.
3. Run one atomic script. A finalized record with the same payload fingerprint is returned without consuming a slot and without sending mail. A new claim, a conflict, and an in-progress duplicate consume a slot. The new claim is written only when the slot is available.
4. The claim owner calls the delivery adapter once.
5. The owner finalizes the record with a second atomic script. A different owner cannot overwrite it.

Accepted replays stay available after the hourly budget is exhausted. In-progress polling and invalid keys do use the budget, so they cannot be an unlimited path into delivery. A double-click can spend two of the five hourly attempts.

The public route does not inject the store, so it never reaches this sequence.

### Idempotency state

| State | Meaning | Later request with the same key and payload |
| --- | --- | --- |
| `processing` | A claim is inside its 120 second lease. | `409` `INQUIRY_PROCESSING`. No email. |
| `accepted` | Brevo accepted the business notification. The confirmation may have failed. | The stored `200` result. No email. |
| `rejected` | The provider definitively did not accept the business notification. | `503` `DELIVERY_UNAVAILABLE`. No email. A retry needs a new key. |
| `unknown` | The outcome is uncertain, or the processing lease expired before finalization. | `503` `DELIVERY_OUTCOME_UNKNOWN`. No email. |

A different payload with the same key returns `409` `IDEMPOTENCY_CONFLICT` and does not send mail or replace the original record.

The processing lease is 120 seconds. The Redis key itself is kept for 7 days, which is longer than the 24 hour minimum. Lease expiry does not allow a second email. The next request turns an expired processing record into `unknown` and refreshes the 7 day retention. If the key then expires, a later request can claim it again. That is not exactly-once delivery.

Redis and Brevo are not one transaction. If Brevo accepts the business notification and the finalize script fails, the response is `503` `IDEMPOTENCY_PERSISTENCE_FAILED`. It does not say the inquiry was rejected, and it does not send the email again. Until the lease expires, a duplicate receives `INQUIRY_PROCESSING`. After that, the record becomes `unknown` if Redis still has it. The live Redis checks confirmed that an accepted, rejected, or unknown marker is replayed instead of claimed again, including after a short lease expires. No path in the handler sends another email while one of those markers remains.

Residual risks stay:

- A timeout or process stop before delivery does not send mail. A timeout after Brevo has accepted mail, while the finalize response is lost, can leave either a finalized marker or an expired lease. The handler does not retry that send. If Redis evicts the key or the 7 day retention ends, a later request can send again. That is not exactly-once delivery.
- The live suite inspected the 7 day TTL. It did not wait for expiry, and it did not call Brevo.
- The public route still does not inject this store, so these protections apply only after the production adapters are attached.

Storage errors before delivery return `503` `INQUIRY_STORAGE_UNAVAILABLE` and do not send mail. Responses stay generic. They do not include Redis keys, fingerprints, IP hashes, tokens, or provider bodies. Every response still sends `Cache-Control: no-store`.

## Wizard client

`src/lib/inquiries/client.ts` maps the wizard draft to the request fields above. It omits the step, reference ids, validation messages, and the privacy checkbox. Optional business name, project details, and references are included only when they have text. `companyWebsite` is always sent and stays empty unless a hidden field is filled.

The browser posts to the same-origin path `/api/inquiries` with `Content-Type: application/json` and `Idempotency-Key`. It does not set `Origin` or a forwarded IP header. The key comes from `crypto.randomUUID()`. One logical inquiry keeps that key while the normalized payload is unchanged. Editing the inquiry after a rejected or unavailable attempt creates a new key. An unknown outcome, a persistence failure, a processing response, or a payload conflict keeps the original key and does not send another request by itself. The key is not written to `localStorage`, `sessionStorage`, or the page URL, and it is not logged.

The client treats one status at a time:

| State | What the visitor sees |
| --- | --- |
| `success` | Shown only for HTTP 200 with `ok: true`. A confirmation value of `accepted` adds that a confirmation email was queued. `rejected`, `unknown`, or a missing confirmation still counts as an accepted inquiry and does not ask for another submission. |
| `validation_error` | HTTP 422 `VALIDATION_ERROR`. Known field messages are shown on the matching step. Unknown field names are ignored. |
| `rate_limited` | HTTP 429 `RATE_LIMITED`. No automatic retry. A numeric `Retry-After` header can be shown. No countdown is invented. |
| `unavailable` | HTTP 503 before delivery: `SUBMISSIONS_UNAVAILABLE`, `RATE_LIMIT_UNAVAILABLE`, `INQUIRY_STORAGE_UNAVAILABLE`, or `DELIVERY_UNAVAILABLE`. |
| `persistence_uncertain` | HTTP 503 `IDEMPOTENCY_PERSISTENCE_FAILED`. The inquiry may already have been received. |
| `unknown_outcome` | HTTP 503 `DELIVERY_OUTCOME_UNKNOWN`, or a network failure after the request was sent. |
| `processing` | HTTP 409 `INQUIRY_PROCESSING`. |
| `conflict` | HTTP 409 `IDEMPOTENCY_CONFLICT`. |
| `error` | An invalid idempotency key or a response that does not match this contract. The client does not loop on a new key. |

The review step asks the visitor to acknowledge that LevelUp Digital will use the inquiry to respond. The checkbox is unchecked until the visitor selects it, and it links to `/privacy`. It is not consent for marketing email.

The honeypot is a visually hidden `companyWebsite` input outside the tab order. It is not the business-name field.

`publicInquirySubmissionsAvailable` is `false`. The contact page asks `resolvePublicInquirySubmissionsAvailable()` for that value, so ordinary visitors see the review, the acknowledgment, and an email link, without a send button. The resolver stays false while the hardcoded flag is false, including when the launch gate and the submissions flag are both set. Tests can inject a client and a true availability flag. There is no public query parameter, cookie, or header that reveals the send button.

`createInquiryRuntime` is the public route factory. It always uses the unavailable rate limiter and the unavailable delivery adapter. Redis credentials, Brevo credentials, and `INQUIRY_ACTIVATION_GATE` do not change that factory.

`createPreparedInquiryRuntime` is the server-only composition for a later phase. It builds the Upstash rate limiter, the Upstash idempotency store, and the Brevo adapter only when the readiness state is `ready_for_controlled_testing` or `ready_for_launch_review`. Any other state returns the same closed runtime. A test may inject a mock delivery or a namespaced Redis client as a function argument. No environment variable selects a mock. The public route does not call this function.

`assessInquiryActivation` reports one state:

| State | Meaning |
| --- | --- |
| `misconfigured` | A present value is invalid. Examples: a short or reused HMAC secret, an HTTP or wildcard origin, localhost in the trusted list, or an unknown activation gate. |
| `disabled` | The gates are off, or required values are still missing. |
| `configured` | Every required value is present and valid, submissions are explicitly false, and the activation gate is explicitly `disabled`. |
| `ready_for_controlled_testing` | Configuration is complete and the gate is explicitly `testing`. This does not send mail by itself. |
| `ready_for_launch_review` | Configuration is complete, the gate is explicitly `launch`, and submissions are explicitly true. The public page still stays closed in this phase. Brevo authentication and inbox delivery are not verified by this state. |

The assessment does not contact Redis or Brevo. An API key is not evidence that the sender is authenticated or that a message reached an inbox. The sender `levelupdigital.support@gmail.com` is verified in Brevo, and DKIM and DMARC warnings remain because it is a free-email domain.

Trusted origins are an explicit HTTPS list. The canonical origin is `https://levelup-digital.dev`. The matcher does not accept wildcards, forwarded host headers, or every Vercel preview domain. Localhost stays on the development-only list.

A future controlled email test has to set `INQUIRY_ACTIVATION_GATE=testing` in a server-only environment, keep the public page closed, and use a named recipient. This phase does not send that message. Launch still requires attaching the prepared runtime to the public route in a separate change, setting the submissions flag, and reviewing privacy and sender authentication.

## Security limitations

- The endpoint does not verify that an email inbox exists.
- The endpoint does not fetch or inspect reference URLs.
- Origin checks apply to browser `Origin` headers. A non-browser client can omit that header; production rejects the omission, and development allows it for local testing.
- The public route still uses the unavailable rate limiter and the unavailable delivery adapter. Redis and Brevo credentials do not attach those adapters.
- Turning `INQUIRY_SUBMISSIONS_ENABLED` on does not create a successful submission while those production adapters stay unavailable.
- Honeypot hits use the same generic `400` body as other bad requests. They are not stored.
- The public contact page does not offer a working send button. The wizard client can call this route only when a later phase turns on the server availability value. This phase does not add a database or enable the public route to send mail.

## Public contact and privacy

Public email links use `verifiedContactLinks.email`, which is `mailto:levelupdigital.support@gmail.com`. The contact page, inquiry fallback, footer, and privacy policy read that value. WhatsApp and the social profiles are unchanged. `legacy/` still contains the earlier personal address and was not edited.

The privacy policy matches the current system on these points: the inquiry fields, the purpose of replying to an inquiry, Brevo as an inactive mail processor, the Google Analytics measurement ID used in the layout, the business mailbox, and the statement that online submission is not enabled. It does not state a retention period. The 7 day Redis marker is not a published retention period, and that store is not attached to the public route.

The root layout loads Google Analytics after the page becomes interactive. The tag uses the default `gtag('config', ...)` call. The site has no consent banner, no consent-mode flag, and no inquiry data in `localStorage` or `sessionStorage`. The inquiry client does not write browser storage.

Owner or legal review is still required before launch for the privacy contact, analytics consent or regional notices, and any retention statement. The policy names Google Analytics and does not describe the cookies that service sets or an opt-out. This phase does not add a cookie banner or a legal retention claim. If that review requires consent before analytics, the follow-up is to keep `GoogleAnalytics` from loading until a stored choice allows it. That is a separate change from enabling inquiries.

## Handler integration

`npm run test:inquiry-pipeline` calls `handleInquiryPost` with the real Upstash rate limiter and idempotency adapter, and with a mock delivery adapter. It does not call Brevo, and it is not part of `npm test`. Redis keys stay under `levelup:test:ls08d2b:` plus a random suffix. The harness deletes only those keys.

On 9 November 2026 that command passed:

- A wizard-mapped synthetic inquiry was accepted once. The same key and payload replayed the stored `200` result and did not deliver again.
- An untrusted or missing origin returned `403` `FORBIDDEN_ORIGIN`. A filled honeypot returned a generic `400`. An invalid email returned `422` and the wizard client mapped it onto the email field. A short idempotency key returned `400` `INVALID_IDEMPOTENCY_KEY`. A missing platform client address returned `503` `RATE_LIMIT_UNAVAILABLE`. None of those requests were delivered.
- Five new submissions from one synthetic client were accepted. A sixth new key was `429` `RATE_LIMITED`. Replaying the first accepted key stayed `200` and did not use another delivery.
- Two overlapping requests with the same key produced one `200` and one `409` `INQUIRY_PROCESSING`. Only one mock delivery ran. A later change of payload returned `409` `IDEMPOTENCY_CONFLICT`.
- Business acceptance with confirmation `accepted`, `rejected`, or `unknown` was stored and replayed without a second delivery.
- A rejected business notification and an unknown business outcome, including a timeout category, were stored and replayed as `503` without another delivery.
- A Redis client that could not connect returned `503` `INQUIRY_STORAGE_UNAVAILABLE` before delivery. A lost finalize response returned `503` `IDEMPOTENCY_PERSISTENCE_FAILED`, and the repeat while the lease remained returned `409` `INQUIRY_PROCESSING` without another delivery.
- Every checked response sent `Cache-Control: no-store`.

The same run kept `publicInquirySubmissionsAvailable` false. The handler calls in that suite go through `createPreparedInquiryRuntime` with the testing gate, a synthetic Brevo key, and a mock delivery. The public factory, given the same testing configuration, still uses `UnavailableRateLimiter` and `UnavailableInquiryDelivery`. No request was sent to `api.brevo.com`.

This is not exactly-once delivery. Redis and Brevo are separate systems. The handler does not retry when the outcome is accepted, rejected, unknown, or when finalization fails after delivery. A lost Redis record, or expiry after 7 days, can allow a later send.

## Local testing

Run the mocked unit tests:

```bash
npm test
```

Run the live Upstash script checks only when `.env.local` contains the Redis REST URL, the REST token, and the two distinct HMAC secrets. This command is not part of `npm test`. It writes and deletes only its own `levelup:test:ls08d2a:` keys.

```bash
npm run test:upstash
```

Run the full handler check separately. It uses the same Redis credentials, a mock email adapter, and synthetic inquiry data. It does not send mail.

```bash
npm run test:inquiry-pipeline
```

With the dev server running, a valid body still returns `503` because submissions are disabled:

```bash
curl -i -X POST http://localhost:3000/api/inquiries \
  -H 'content-type: application/json' \
  -H 'origin: http://localhost:3000' \
  --data '{"projectType":"website","budget":"range-100","timeline":"month","name":"Ada Lovelace","email":"ada@example.com"}'
```

Expect `SUBMISSIONS_UNAVAILABLE` and `Cache-Control: no-store`. Do not point this command at production.
