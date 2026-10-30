# Inquiry submission foundation

Phase LS-08B adds a server-side contract for future project inquiries. The contact wizard stays in the browser. It does not call this endpoint, and the public route cannot report a successful submission.

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

The starting policy is 5 requests per hour for each client key. It is a fixed window, so a client can be allowed five times at the end of one hour and five times at the start of the next. The check and increment run in one Redis `EVAL` script: `INCR`, then `EXPIRE` when the counter is created. A separate in-memory limiter remains inside the older handler tests. It is not used by the route.

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

The Gmail sender must be verified and permitted in Brevo before a live send. A Gmail address cannot publish the domain authentication that a mailbox on `levelup-digital.dev` can. SPF, DKIM, and DMARC for the site domain are the recommended long-term setup. Until then, Gmail filtering and alignment limits can reduce deliverability even after Brevo accepts the request.

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

Phase LS-08C.1 adds a durable idempotency store. The public route does not call it yet. Until that store is attached, repeated clicks, browser retries, and a timeout after Brevo has accepted a message can still produce more than one business notification. The handler does not retry an unknown outcome by itself.

### Remaining production prerequisites

- Keep `INQUIRY_SUBMISSIONS_ENABLED` false.
- Verify `BREVO_SENDER_EMAIL` inside Brevo. Do not assume the Gmail sender is already verified.
- Store `BREVO_API_KEY` only in the host environment.
- Create an Upstash Redis database and set its REST URL and token only in the host environment. Adding a payment method moves a free database onto a paid plan.
- Attach the Redis rate limiter, the Redis idempotency store, and `createBrevoInquiryDelivery` together. Credentials alone must not enable sending.
- Prefer a verified sender on `levelup-digital.dev` once that mailbox exists, with SPF, DKIM, and DMARC.
- The wizard stays disconnected. There is no public test-send route.

## Distributed storage

Upstash Redis is the selected store for both the rate limit and the idempotency record. Its REST API works from a Vercel serverless function, and `EVAL` runs a Lua script as one atomic step. `SET` with `NX` and `EX` is also available. The scripts in `src/lib/inquiries/redis-scripts.ts` use `EVAL` so a claim is not a separate `GET` followed by `SET`.

Pricing was read from Upstash's pricing and billing pages on 30 October 2026. The free tier listed 250 MB, 500,000 commands per month, and 10 GB of bandwidth, with no credit card. Pay as you go was listed at $0.20 per 100,000 commands. An `EVAL` script is billed as one command plus one command for each `redis.call`. Those figures can change. No Upstash account was created for this phase, and the Lua scripts were not executed on a live Redis server. The automated tests run the same decisions against an in-memory map and check that the Upstash client sends one `EVAL` request. That does not prove live atomicity.

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

Redis and Brevo are not one transaction. If Brevo accepts the business notification and the finalize script fails, the response is `503` `IDEMPOTENCY_PERSISTENCE_FAILED`. It does not say the inquiry was rejected, and it does not send the email again. Until the lease expires, a duplicate receives `INQUIRY_PROCESSING`. After that, the record becomes `unknown` if Redis still has it. If Redis lost the key, a later request can send another email. That residual risk remains until the real database is tested.

Storage errors before delivery return `503` `INQUIRY_STORAGE_UNAVAILABLE` and do not send mail. Responses stay generic. They do not include Redis keys, fingerprints, IP hashes, tokens, or provider bodies. Every response still sends `Cache-Control: no-store`.

## Security limitations

- The endpoint does not verify that an email inbox exists.
- The endpoint does not fetch or inspect reference URLs.
- Origin checks apply to browser `Origin` headers. A non-browser client can omit that header; production rejects the omission, and development allows it for local testing.
- The public route still uses the unavailable rate limiter and the unavailable delivery adapter. Redis and Brevo credentials do not attach those adapters.
- Turning `INQUIRY_SUBMISSIONS_ENABLED` on does not create a successful submission while those production adapters stay unavailable.
- Honeypot hits use the same generic `400` body as other bad requests. They are not stored.
- This phase does not add a database, connect the wizard, or enable the public route to send mail.

## Local testing

Run the automated tests:

```bash
npm test
```

With the dev server running, a valid body still returns `503` because submissions are disabled:

```bash
curl -i -X POST http://localhost:3000/api/inquiries \
  -H 'content-type: application/json' \
  -H 'origin: http://localhost:3000' \
  --data '{"projectType":"website","budget":"range-100","timeline":"month","name":"Ada Lovelace","email":"ada@example.com"}'
```

Expect `SUBMISSIONS_UNAVAILABLE` and `Cache-Control: no-store`. Do not point this command at production.
