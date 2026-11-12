# Inquiry production activation

LS-12A prepares the existing inquiry system for a later activation. It does not enable public submissions, send email, change DNS, or change the Vercel project. The live site remains the deployment of `3c0b6e2a074da1061dbb4f401378efe55204cb95`.

The source gate in `src/lib/inquiries/public-availability.ts` stays `false`. Environment variables cannot turn it on.

## Existing architecture

The contact page renders the six-step wizard from LS-08A. The browser validates each step, then LS-08D can `POST` `/api/inquiries` only when the page is told submissions are available. That signal is `resolvePublicInquirySubmissionsAvailable()`, which returns false while the source gate is false. The review step keeps the unavailable message and the email fallback. It does not render Send and does not post.

The route in `src/app/api/inquiries/route.ts` is a Node.js function. It calls `handleInquiryPost`, which uses `createInquiryRuntime()` on each request. That factory does not construct Redis or Brevo clients at module import.

LS-08B supplies validation, the honeypot, origin checks, and the unavailable adapters. LS-08C supplies the Brevo adapter. LS-08C.1 supplies the Upstash rate-limit and idempotency scripts. LS-08E classifies configuration without contacting those services. LS-08F verified one controlled Brevo send. This phase does not repeat that send.

`createPreparedInquiryRuntime()` remains the explicit harness for a complete testing or launch-review configuration. The public route does not call it. A testing gate cannot open the public route.

## Request lifecycle

`handleInquiryPost` uses this order:

1. Require `Content-Type: application/json`. Other media types return 415.
2. Read at most 16 KB. A larger body returns 413.
3. Parse one JSON object. Reject unexpected fields, including `privacyAccepted`.
4. Reject a honeypot value that is not a string.
5. Require a trusted `Origin`. Failure returns 403 `FORBIDDEN_ORIGIN` before the submissions check.
6. Reject a filled honeypot with the same public 400 as other invalid requests.
7. Reject required fields whose JSON types are wrong.
8. Validate lengths and allowed values. Failure returns 422.
9. If `submissionsEnabled` is false, return 503 `SUBMISSIONS_UNAVAILABLE`.
10. When an idempotency store is attached, reserve the request before delivery. Otherwise apply the rate limit and then deliver.

The idempotency path also requires one platform client address and both HMAC secrets. It rate-limits a missing or invalid `Idempotency-Key` before returning 400. A valid key is reserved with an atomic Redis script. The script handles a new claim, a concurrent owner, a fingerprint conflict, a stored result, and the five-attempt window together.

Delivery runs only after a claim. The business notification is sent first. The handler returns success only when that notification is accepted. The customer acknowledgement is sent second and does not change the fact that the business notification was accepted. Its result is `confirmation`: `accepted`, `rejected`, or `unknown`.

If Brevo accepts the business notification and the customer request times out, the adapter returns `accepted` with `confirmation: "unknown"`. The handler can return 200 with that confirmation. It does not send the business notification again.

If the business request times out, or the network fails before a readable acceptance, the result is `unknown`. The handler returns 503 `DELIVERY_OUTCOME_UNKNOWN` and stores that state when finalization succeeds. A retry with the same key and body replays the unknown result and does not send again. A different body with the same key returns 409. The Brevo adapter itself does not retry.

If Redis finalization fails after an accepted business notification, the response is 503 `IDEMPOTENCY_PERSISTENCE_FAILED`. The handler does not send another business notification in that attempt. A later retry can claim the key again only if the marker is gone. That is not exactly-once delivery. The seven-day marker and the 120-second processing lease are unchanged.

Redis errors, a missing platform address, and an unavailable delivery adapter return 503 and do not report success. The public error body stays generic. Logs from the inquiry handler do not include the inquiry, the raw address, or secrets.

## Runtime selection

`createInquiryRuntime()` attaches the Upstash and Brevo adapters only when every condition below is true:

- `publicInquirySubmissionsAvailable` is true.
- `INQUIRY_ACTIVATION_GATE` is `launch`.
- `INQUIRY_SUBMISSIONS_ENABLED` is `true`.
- `assessInquiryActivation()` reports `ready_for_launch_review`.
- `https://levelup-digital.dev` is an exact trusted origin.
- The rate-limit secret and a different idempotency secret are each at least 16 characters.
- The Upstash REST URL is HTTPS and the token is present.
- The Brevo sender is `levelupdigital.support@gmail.com`, the sender name is `LevelUp Digital`, and the business recipient is `levelupdigital.support@gmail.com`.

Any miss returns unavailable adapters and forces `submissionsEnabled` to false. A complete set of environment variables does not attach adapters while the source gate is false. The `testing` value does not attach them on the public route. Construction of a selected runtime does not call Redis or Brevo.

The contact page uses the same source gate, so the Send button stays hidden while that constant is false.

## Required environment variables

Set these in Vercel only during a later approved phase. Do not put real values in git. Preview and Production are separate. A preview may use its own Upstash database and must not point at production Redis unless the owner explicitly accepts that.

| Name | Preview | Production | Rule |
| --- | --- | --- | --- |
| `INQUIRY_SUBMISSIONS_ENABLED` | `false` until a preview test is approved | `false` until launch approval | Exact `true` or `false`. Any other value is invalid. |
| `INQUIRY_ACTIVATION_GATE` | `disabled`, or `testing` for a controlled preview | `disabled` until launch approval, then `launch` | `testing` does not open the public route. |
| `INQUIRY_TRUSTED_ORIGINS` | The exact preview HTTPS origin, comma-separated if more than one | Must include `https://levelup-digital.dev` | HTTPS only. No wildcard, localhost, or credentials. |
| `INQUIRY_RATE_LIMIT_KEY_SECRET` | Preview secret | Different production secret | At least 16 characters. Server-only. |
| `INQUIRY_IDEMPOTENCY_KEY_SECRET` | Preview secret | Different production secret | At least 16 characters and different from the rate-limit secret. |
| `UPSTASH_REDIS_REST_URL` | Preview database | Production database | HTTPS REST URL. |
| `UPSTASH_REDIS_REST_TOKEN` | Preview token | Production token | Server-only. |
| `BREVO_API_KEY` | Test key only if a send is separately approved | Production key | Server-only. A key alone does not enable submissions. |
| `BREVO_SENDER_EMAIL` | `levelupdigital.support@gmail.com` | Same | Must match the verified sender. |
| `BREVO_SENDER_NAME` | `LevelUp Digital` | Same | No control characters. |
| `INQUIRY_NOTIFICATION_EMAIL` | `levelupdigital.support@gmail.com` | Same | Business recipient. |

None of these names use a `NEXT_PUBLIC_` prefix. The browser bundle must not receive them.

## Preview deployment procedure

Do not deploy this branch as part of LS-12A.

When a later phase is approved:

1. Confirm `publicInquirySubmissionsAvailable` is still false.
2. Confirm Production env is unchanged and the production gate remains `disabled`.
3. Put the preview values in the Vercel Preview environment only.
4. Deploy the branch as a Preview deployment. Leave the production alias on the current deployment.
5. Open the preview through the existing deployment protection. The contact page must still show the unavailable state and must not post.
6. Exercise the API with the local mock tests first. A live preview call is a separate approval and must use the preview Redis database.

## Activation prerequisites

All of these are required before the source gate can change:

- Owner approval for a production activation phase.
- Preview evidence for the disabled page and for mocked enabled behavior.
- Production env values present and valid, with the canonical origin listed.
- The Brevo sender still verified, without another unapproved live send.
- The production Upstash database reachable from the deployment.
- The privacy decisions below either accepted or written into the policy.
- A rollback owner and a time when the contact page can stay on the email fallback.

The activation change is a source change to `publicInquirySubmissionsAvailable`, together with `INQUIRY_ACTIVATION_GATE=launch` and `INQUIRY_SUBMISSIONS_ENABLED=true` in Production. One of those without the others stays closed.

## Safe testing approach

`npm test` uses local mocks. It does not read production Redis and does not send mail.

Do not run `npm run test:upstash`, `npm run test:inquiry-pipeline`, or `npm run test:brevo` against production services for this phase. The Brevo script can send only with an explicit confirmation, and that confirmation is not part of LS-12A.

The enabled-path tests call `createInquiryRuntime` with `ownerActivation: true` and a Redis double. That option exists for tests. The route does not pass it.

## Email delivery failure handling

| Outcome | Public result | Another business email on retry |
| --- | --- | --- |
| Business notification accepted, acknowledgement accepted | 200, `confirmation: "accepted"` | No, while the marker remains |
| Business notification accepted, acknowledgement rejected or timed out | 200, `confirmation: "rejected"` or `"unknown"` | No, while the marker remains |
| Business notification timed out or the network failed | 503 `DELIVERY_OUTCOME_UNKNOWN` | No, while the unknown marker remains |
| Brevo rejected the business notification | 503 `DELIVERY_UNAVAILABLE` | No, while the rejected marker remains |
| Redis failed before delivery | 503 `INQUIRY_STORAGE_UNAVAILABLE` | No send occurred |
| Finalization failed after acceptance | 503 `IDEMPOTENCY_PERSISTENCE_FAILED` | Not in that attempt. A lost marker can allow a later send. |

Customer acknowledgement failure does not hide an accepted business notification and does not schedule a marketing subscription.

## Production rollback

1. Set Production `INQUIRY_ACTIVATION_GATE` to `disabled` and `INQUIRY_SUBMISSIONS_ENABLED` to `false`.
2. Deploy a build whose `publicInquirySubmissionsAvailable` is false. The current production commit already has that value.
3. Confirm `POST /api/inquiries` returns a non-success response and the contact page has no Send button.
4. Leave the domain, DNS, and deployment protection unchanged.

Removing Redis or Brevo env values also fails closed, but the gate and the source constant are the explicit controls.

## Monitoring and alerts

Before activation, decide where these signals will be seen. The inquiry handler currently logs only `inquiry request failed` for an unexpected exception. It does not emit a metric.

Useful signals for the later phase:

- Count of 429 responses from `/api/inquiries`.
- Count of 503 responses, split by `RATE_LIMIT_UNAVAILABLE`, `INQUIRY_STORAGE_UNAVAILABLE`, `DELIVERY_UNAVAILABLE`, `DELIVERY_OUTCOME_UNKNOWN`, and `IDEMPOTENCY_PERSISTENCE_FAILED` if those codes are added to safe operational logs.
- Brevo bounce or block events for the transactional template.
- Upstash command errors. Do not log the REST token, the HMAC secrets, or the raw client address.
- Absence of inquiry content in function logs.

No alert is configured in this phase.

## Privacy decisions

The policy now describes the intended disabled and future path: fields collected, reply purpose, transactional Brevo mail, business notification before the acknowledgement, hashed rate-limit identity, five attempts an hour, seven-day idempotency marker, and analytics consent as a separate choice. It does not invent an email retention period.

Owner decisions still required before activation:

- How long inquiry email is kept in the business mailbox.
- Which Brevo retention setting applies to transactional messages.
- Whether the policy should name the host and any connection-log retention.
- Whether the published privacy contact remains `levelupdigital.support@gmail.com`.
- What notice, if any, is required for visitors outside Japan.
- Who handles access, correction, and deletion requests, and how a request is verified.

The seven-day Redis TTL is only the marker lifetime.

## Remaining launch blockers

- `publicInquirySubmissionsAvailable` is false, so the live route and the Send button stay off.
- Production env for Brevo and Upstash is not part of this phase and must be configured separately.
- The privacy decisions above are unresolved.
- A push to `main` can still create a Vercel production deployment. `git.deploymentEnabled` has not been set to false. This branch must not be pushed until the owner wants a deployment.
- The earlier controlled Brevo check is not repeated here and is not fresh evidence that the sender is still verified.
- No CAPTCHA is added. The origin allow-list, honeypot, rate limit, and idempotency remain the controls. Add a CAPTCHA only if abuse after activation shows those are insufficient.
- CSRF: the endpoint has no session cookie. The trusted `Origin` check is the cross-site control for this stateless JSON post. A browser page on another origin cannot pass it.
