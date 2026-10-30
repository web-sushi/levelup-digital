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
| 200 | none | Only `{ "ok": true }`, and only after a delivery adapter returns `accepted`. The public route cannot reach this state in this phase. |
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

`DeliveryResult` is `accepted`, `unavailable`, or `rejected`. The handler returns `{ "ok": true }` only for `accepted`.

`UnavailableInquiryDelivery` is the only adapter created by the production runtime. It does not call Brevo, send mail, write a database row, or log the inquiry. Tests may inject another adapter. There is no environment flag that swaps in a fake accepting adapter.

Brevo is the planned transactional-email provider. A later phase can implement `InquiryDelivery` with the Brevo API. That work is not part of LS-08B.

## Security limitations

- The endpoint does not verify that an email inbox exists.
- The endpoint does not fetch or inspect reference URLs.
- Origin checks apply to browser `Origin` headers. A non-browser client can omit that header; production rejects the omission, and development allows it for local testing.
- Rate limiting does not run in production yet. The unavailable limiter blocks delivery rather than pretending a limit was enforced.
- Turning `INQUIRY_SUBMISSIONS_ENABLED` on does not create a successful submission while delivery and the production limiter stay unavailable.
- Honeypot hits use the same generic `400` body as other bad requests. They are not stored.
- This phase does not add a database, email sending, or a connection from the wizard.

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
