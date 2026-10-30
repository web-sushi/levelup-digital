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

`NODE_ENV=development` also allows these origins: `http://localhost:3000`, `http://127.0.0.1:3000`, `http://localhost:3001`, and `http://127.0.0.1:3001`. A missing `Origin` header is allowed only in that development mode, so local `curl` can exercise the route. Production rejects a missing or malformed origin. Localhost is not added to the production allow list. The `Host` header is not used.

## Origin policy

Browser requests are checked against the configured origin list. There is no permissive CORS header. A future same-origin wizard does not need cross-origin access.

## Rate limiting

The production handler does not use an in-memory map. This site is intended for serverless hosting, so a process-local counter would not be a real limit.

No persistent rate-limit provider is configured. The production adapter is `UnavailableRateLimiter`, which always reports that a decision is unavailable. When submissions are enabled, that result fails closed with `503`.

The recommended provider, when it is approved and installed, is Upstash Ratelimit through the Vercel Marketplace. It is not installed in this phase. A starting policy for that later review is 5 requests per hour for each client key, plus any broader controls the provider supports. Distributed limiting is not active until that provider is configured and tested.

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

This phase has no durable store, so it cannot provide exactly-once delivery. An in-memory key would not survive serverless retries and is not used.

Repeated clicks, browser retries, a timeout after Brevo has already accepted the message, and a customer-confirmation failure can all produce more than one business notification. Automatic retries after an unknown outcome are intentionally absent.

Before public launch, a durable idempotency record is a production prerequisite. The future contract is an `Idempotency-Key` request header of 16 to 128 characters matching `[A-Za-z0-9_-]`. The server would store a hash of that key with the delivery result for at least 24 hours and return the stored result on a replay. That store is not implemented here.

### Remaining production prerequisites

- Keep `INQUIRY_SUBMISSIONS_ENABLED` false.
- Verify `BREVO_SENDER_EMAIL` inside Brevo. Do not assume the Gmail sender is already verified.
- Store `BREVO_API_KEY` only in the host environment.
- Add a persistent rate limiter. The production limiter is still unavailable, and this phase does not install one.
- Attach `createBrevoInquiryDelivery` to the runtime only after that limiter is in place. Credentials alone must not enable sending.
- Add durable idempotency before public launch if duplicate mail must be prevented.
- Prefer a verified sender on `levelup-digital.dev` once that mailbox exists, with SPF, DKIM, and DMARC.
- The wizard stays disconnected. There is no public test-send route.

## Security limitations

- The endpoint does not verify that an email inbox exists.
- The endpoint does not fetch or inspect reference URLs.
- Origin checks apply to browser `Origin` headers. A non-browser client can omit that header; production rejects the omission, and development allows it for local testing.
- Rate limiting does not run in production yet. The unavailable limiter blocks delivery rather than pretending a limit was enforced.
- Turning `INQUIRY_SUBMISSIONS_ENABLED` on does not create a successful submission while delivery and the production limiter stay unavailable.
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
