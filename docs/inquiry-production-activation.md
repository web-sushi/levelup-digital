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

## Git deployment safeguard

`vercel.json` on this feature branch sets `git.deploymentEnabled` to false. That is Vercel’s documented control for Git-triggered deployments. It does not change domains, protection, environment variables, or the inquiry source gate. A manual `vercel deploy` is a separate action and is not blocked by this file.

The setting is committed only on `feature/inquiry-production-activation`. `main` does not contain it, so a push to `main` can still create a production deployment until an approved release puts this file on `main`. This phase does not push.

`gitProviderOptions.createDeployments: disabled` remains a different project option. It did not stop the earlier Git production build.

## Origin validation

`POST /api/inquiries` checks `Origin` before it checks whether submissions are enabled. Production still has no `INQUIRY_TRUSTED_ORIGINS` value. Preview now has that variable set to `https://levelup-digital.dev` only. No submission flag, activation gate, Brevo credential, or Upstash credential was added.

On the protected Preview, `Origin: https://levelup-digital.dev` passes validation and returns 503 `SUBMISSIONS_UNAVAILABLE`. `Origin: https://example.invalid` returns 403 `FORBIDDEN_ORIGIN`. The source gate remains false, so the accepted origin does not deliver an inquiry. An isolated local harness can still return success only when the launch configuration and source gate are simulated together. The allow-list is unchanged: other origins, wildcards, and localhost stay rejected.

## Client identity

The handler trusts one `x-vercel-forwarded-for` address, hashes it, and ignores `x-forwarded-for` and `x-real-ip`. A missing header, a comma-separated list, and a malformed value fail closed. Vercel’s request-header documentation says the platform overwrites `x-forwarded-for` and does not forward a caller-supplied address. It describes `x-vercel-forwarded-for` and `x-real-ip` as that same platform address. `src/proxy.ts` does not rewrite any of those headers.

A protected Preview confirmed that behavior without enabling delivery. The temporary comparison returned only booleans. A caller-controlled probe header arrived unchanged, which shows the test request could carry a chosen value. Forged `x-vercel-forwarded-for`, `x-forwarded-for`, and `x-real-ip` values, including a comma-separated list, did not. The function saw one address in all three headers, those three values matched each other, and none matched the forged candidate. The rate-limit identity therefore comes from the platform address. The diagnostic route and its secret were removed after that check.

## Redis and Brevo verification

An empty Upstash REST database, present only in local configuration and absent from the Vercel project, accepted the isolated checks. It contained no `inquiry:` keys before the run. Every test key used a `levelup:test:` prefix, and the database was empty again afterward.

The live Redis script confirmed HTTPS authentication, atomic `EVAL`, five allowed attempts and a sixth rejection inside one hour, eight concurrent attempts resolving to five allowed and three limited, one winner for a concurrent claim, a payload conflict that preserved the first fingerprint, owner-only finalization, replay of accepted, rejected, and unknown outcomes, and a reported TTL inside the seven-day marker window. The TTL was read immediately. The test did not wait seven days. A malformed result and a closed network connection both failed closed.

The handler pipeline used that same database with a mock delivery adapter. It checked the production origin, rejected an untrusted origin, reserved a rate-limit slot, claimed an idempotency key, replayed the stored result, and did not call Brevo. A lost finalization returned `IDEMPOTENCY_PERSISTENCE_FAILED` and a repeat returned `INQUIRY_PROCESSING` without a second delivery. The public route stayed closed. These results matched the mock contracts for the cases above.

The Brevo dry-run made two read requests and zero send requests. The account authenticated, transactional relay was enabled, and the sender `levelupdigital.support@gmail.com` with the name `LevelUp Digital` was listed and active. The account has two sender records.

LS-12B.5 then sent one approved verification message. Brevo returned HTTP 201 and message ID `<202611120355.69813901658@smtp-relay.mailin.fr>`. The owner confirmed that message arrived in the business mailbox. No customer acknowledgement was sent. That confirmation covers the verification message only. It is not a new inquiry submission.

## Owner decisions before activation

These are recommendations for the owner to accept or replace. They are not measured retention settings and they are not a compliance claim.

- Business mailbox: choose and write down how long inquiry email stays in `levelupdigital.support@gmail.com`. A practical start is to keep it with the other client correspondence and name the period in the policy before the Send button appears.
- Brevo: open the transactional-email settings and record the account’s actual log and content retention. This repository does not know that number.
- Hosting logs: the live site is served by Vercel. Connection logs can include IP addresses. Record the Vercel log product and its retention, then say that in the policy if the owner wants the host named.
- Privacy contact: keep `levelupdigital.support@gmail.com` unless the owner names a different address.
- Access, correction, and deletion: receive those requests at the privacy contact, confirm the person controls the email address on the inquiry, and delete or correct the mailbox copies the studio controls. Provider copies need a separate request to that provider.
- Visitors outside Japan: say that an inquiry may be processed in Japan and by the email and Redis providers in the regions of those accounts, after the owner confirms those regions. Do not name a region that has not been checked.

The seven-day Redis TTL remains the marker lifetime only.

## Remaining launch blockers

- `publicInquirySubmissionsAvailable` is false, so the live route and the Send button stay off.
- Production env for Brevo and Upstash is not part of this phase and must be configured separately. The local Upstash database and Brevo account used for this check are not production environment variables.
- The privacy decisions above are unresolved. Brevo and Upstash retention periods and data regions were not read from those accounts.
- `git.deploymentEnabled` is false only on this feature branch. Do not push to `main` until that safeguard is part of the approved release.
- The owner confirmed inbox receipt of the one LS-12B.5 verification message. That is not approval to send inquiry mail from production.
- No CAPTCHA is added. The origin allow-list, honeypot, rate limit, and idempotency remain the controls. Add a CAPTCHA only if abuse after activation shows those are insufficient.
- CSRF: the endpoint has no session cookie. The trusted `Origin` check is the cross-site control for this stateless JSON post. A browser page on another origin cannot pass it.

## LS-12C.1 release candidate

This section prepares the release. It does not activate submissions, change Vercel, push `main`, or send mail. The live site remains `dpl_3WDgPNEuUibC1csuPjAzwdDLSuZ4`. The protected Preview remains `dpl_BcrREtsTdSunwD1bhQxUfyoLdrQm`.

The feature HEAD for this candidate keeps `publicInquirySubmissionsAvailable` false. The contact page therefore keeps the review step, the mailto fallback `mailto:levelupdigital.support@gmail.com`, and the WhatsApp link `https://wa.me/818074310125`. It does not render Send and does not post.

### Stage A and Stage B

Stage A deploys this disabled candidate to production. The source gate stays false, `INQUIRY_SUBMISSIONS_ENABLED` stays `false`, and `INQUIRY_ACTIVATION_GATE` stays `disabled`. `createInquiryRuntime()` returns before it constructs Redis or Brevo, so a customer acknowledgement cannot be sent. The Send button stays off because `resolvePublicInquirySubmissionsAvailable()` returns false while the source gate is false, even if the launch values are present.

Stage B is a later, separately approved change. It is not part of this candidate. The safe order is:

1. Create a separate production Upstash database and rotate its token so the local test token cannot read it.
2. Add the production secrets and the launch values in the Vercel Production environment while the deployed source gate is still false. The current build ignores those values.
3. Confirm the saved Production values assess as `ready_for_launch_review` and include `https://levelup-digital.dev`. Do not print the secrets. If a required value is missing, stop. The Send button would otherwise appear while the API stayed closed, because the page checks only the source gate, the launch gate, and the submissions flag, while the API also requires a complete provider configuration.
4. Change `publicInquirySubmissionsAvailable` to true in one reviewed commit and deploy that commit manually. The page and the route ship in the same build.
5. Run one separately approved synthetic submission. Confirm the business mailbox received it and the customer acknowledgement matched the API confirmation.

Do not reverse steps 3 and 4. Do not set the launch values on the activation build until the assessment is complete.

### Git deployment safeguard

`vercel.json` on this branch is valid and contains only `git.deploymentEnabled: false`. Vercel documents that key as the control for Git-triggered deployments. It does not block `vercel deploy`. It is not on `main`. A push to `main` can still create a production deployment, which is what happened before this file existed.

The release does not use a Git push as the deployment mechanism. LS-12C.2 deploys the reviewed local commit with the CLI. Pushing this file to `main` can be a later cleanup. Until that push is observed to skip a Git deployment, do not treat the setting as protection for `main`.

Manual release checks, from the repository root:

```bash
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
git merge-base --is-ancestor 3c0b6e2a074da1061dbb4f401378efe55204cb95 HEAD
vercel whoami --scope levelupdigital
vercel project inspect --non-interactive --scope levelupdigital
```

Stop unless the branch is `feature/inquiry-production-activation`, the owner is LevelUp Digital, the project name is `levelup-digital-redesign`, and the project ID is `prj_BhIRZUVTISSwSek8iqGz8qOw41Ad`. The linked team in `.vercel/project.json` must be `team_Dl3eVmSI7j92y0qlXqYer1zG`. For Stage A, `publicInquirySubmissionsAvailable` must still be false.

Stage A deploy, only after those checks and the owner’s approval:

```bash
vercel deploy --scope levelupdigital --yes --prod
vercel inspect <printed-url> --scope levelupdigital
```

The inspect target must be `production`, and the deployment must be the commit just built. Then check `https://levelup-digital.dev/contact` and a direct POST as listed below. Do not add `--prod` to any other command.

Rollback is `vercel rollback <stage-a-or-current-production-url> --scope levelupdigital` after confirming that URL belongs to this project. Today’s known-good production deployment is `dpl_3WDgPNEuUibC1csuPjAzwdDLSuZ4`.

### Environment inventory

Each deployment captures the environment present when it is created. A later dashboard edit applies to the next deployment. Do not treat a dashboard edit of an already deployed build as the disable switch. The source gate is compiled into the build, so changing it always requires a new deployment.

| Name | Purpose | Format | Scope | Class | Required | Verified | If missing | Next deployment |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `publicInquirySubmissionsAvailable` | Source gate for the page and `createInquiryRuntime()` | Boolean constant in `src/lib/inquiries/public-availability.ts` | Build | Source | Stage A false; Stage B true | False in this candidate | Page and route stay closed | Required to change it |
| `INQUIRY_SUBMISSIONS_ENABLED` | Submission flag | Exact `true` or `false` | Production | Config | Stage A `false`; Stage B `true` | Local value is `false`. Not set in Vercel Production | Readiness stays incomplete and the launch route stays closed | Set before the deployment that should observe it |
| `INQUIRY_ACTIVATION_GATE` | `disabled`, `testing`, or `launch` | One of those three tokens | Production | Config | Stage A `disabled`; Stage B `launch` | Local value is `testing`. Not set in Vercel Production | Readiness stays incomplete | Set before the deployment that should observe it |
| `INQUIRY_TRUSTED_ORIGINS` | Allowed browser origins | Comma-separated exact HTTPS origins. No wildcard, localhost, or credentials. Production value is `https://levelup-digital.dev` | Preview has the canonical origin. Production does not | Config | Required for a request to pass the origin check | Preview behavior verified. Production not set | Present `Origin` returns 403 `FORBIDDEN_ORIGIN` | Set before the deployment that should observe it |
| `INQUIRY_RATE_LIMIT_KEY_SECRET` | HMAC for the client-address key | At least 16 characters and different from the idempotency secret | Production at Stage B | Secret | Required before Stage B | Present locally. Not in Vercel | Launch runtime stays closed | Set before the Stage B deployment |
| `INQUIRY_IDEMPOTENCY_KEY_SECRET` | HMAC for the idempotency key | At least 16 characters and different from the rate-limit secret | Production at Stage B | Secret | Required before Stage B | Present locally. Not in Vercel | Launch runtime stays closed | Set before the Stage B deployment |
| `UPSTASH_REDIS_REST_URL` | Redis REST endpoint | `https` URL on `upstash.io`, without userinfo or a query | Production at Stage B | Secret | Required before Stage B | Isolated empty database verified. Not in Vercel | Launch runtime stays closed | Set before the Stage B deployment |
| `UPSTASH_REDIS_REST_TOKEN` | Redis REST credential | Provider token | Production at Stage B | Secret | Required before Stage B | Used for the isolated tests. Not in Vercel | Launch runtime stays closed | Set before the Stage B deployment |
| `BREVO_API_KEY` | Transactional API credential | Provider key | Production at Stage B | Secret | Required before Stage B | Account read and one approved send succeeded locally. Not in Vercel | Launch runtime stays closed | Set before the Stage B deployment |
| `BREVO_SENDER_EMAIL` | From address | Exact `levelupdigital.support@gmail.com` | Production at Stage B | Config | Required before Stage B | Active in Brevo | Launch runtime stays closed | Set before the Stage B deployment |
| `BREVO_SENDER_NAME` | From name | Exact `LevelUp Digital` | Production at Stage B | Config | Required before Stage B | Matched the Brevo sender record | Launch runtime stays closed | Set before the Stage B deployment |
| `INQUIRY_NOTIFICATION_EMAIL` | Business recipient and customer reply-to | Exact `levelupdigital.support@gmail.com` | Production at Stage B | Config | Required before Stage B | Received the one approved verification message | Launch runtime stays closed | Set before the Stage B deployment |

`NODE_ENV=production` is supplied by the platform. It is what keeps development origins off the public route. Do not copy `.env.local` into Vercel. Stage A needs only the disabled flag, the disabled gate, and the trusted origin. Add the secrets only for Stage B, into a new production Upstash database.

### Provider choice

Use a separate production Upstash database. The tested database proved the scripts, the five-per-hour limit, the concurrent claim, and the seven-day TTL reading. Its token is on a developer machine. Key prefixes do not limit that token, so a later test run could read or delete production markers. Create the production database in the region chosen in the Upstash console, store its token only in Vercel Production, and rotate the test token if it was exposed beyond that machine. The provider region, backup offering, and retention setting were not read. Record them from the console before Stage B. Atomic `EVAL` is already what the adapter uses.

Brevo sender and business recipient stay `levelupdigital.support@gmail.com`, display name `LevelUp Digital`. The one approved message returned HTTP 201, ID `<202611120355.69813901658@smtp-relay.mailin.fr>`, and the owner confirmed inbox receipt. Do not send another message for this release. The account’s second sender record was not selected. Brevo’s region and log retention were not read.

### Privacy decisions awaiting approval

These are proposed defaults for the owner to accept or replace. They are not published on the privacy page and they are not a compliance claim.

- Business mailbox: keep inquiry email for 12 months after the last meaningful reply, longer only when a contract, a business record, or a legal obligation requires it.
- Privacy contact: `levelupdigital.support@gmail.com`.
- Access, correction, and deletion: receive the request at that mailbox, confirm the person controls the inquiry email address, and avoid asking for extra personal data. Delete or correct the mailbox copies the studio controls. Brevo and Upstash copies need a separate provider request.
- Analytics: keep the existing separate consent choice. An inquiry does not opt the visitor into analytics.
- Redis: the idempotency marker TTL is seven days. The rate-limit key TTL is the one-hour window, set on the first increment. Those are technical records, not the mailbox period. No other inquiry key is written.
- Providers: record the actual Brevo, Upstash, and Vercel regions and retention settings from those accounts before Stage B. Do not invent them and do not claim a certification.
- International visitors: after those regions are known, say that an inquiry may be processed in Japan and in the recorded provider regions.

### Mail behavior

The business notification subject is `New Project Inquiry — LevelUp Digital`. It includes the name, email, business, project type, budget, timeline, description, and up to three reference URLs with notes. Blank optional fields say they were not provided. Reply-To is the visitor’s name and email. HTML and text are escaped.

The customer acknowledgement subject is `We Received Your Project Inquiry — LevelUp Digital`. It names the project type, says the inquiry was received for review, and lists LevelUp Digital, the business email, and `https://levelup-digital.dev/`. It does not repeat the description, budget, or references, and it does not describe a marketing subscription.

The API returns success only after Brevo accepts the business notification. A timeout or network failure on that first send is `unknown`: the response is 503 `DELIVERY_OUTCOME_UNKNOWN`, the adapter does not retry, and a stored marker makes the same submission replay that unknown result. If the business send is accepted and the acknowledgement fails, the response can still be success, with `confirmation` of `rejected` or `unknown`. The page says a confirmation email was queued only when `confirmation` is `accepted`. The handler log line for an unexpected exception is `inquiry request failed`. It does not log the inquiry body, the address, or a secret.

### Operations

| Situation | What the visitor sees | What to do |
| --- | --- | --- |
| Brevo rejects the business notification | 503, no success claim | Check the Brevo sender and API status. The same key will not send a second business message after a rejected marker is stored. |
| Redis is unavailable | 503 `INQUIRY_STORAGE_UNAVAILABLE` or `RATE_LIMIT_UNAVAILABLE` before delivery | Restore Redis. No mail has been sent for that attempt. |
| Rate limit | 429 after five attempts in the one-hour window | Expected. The hashed key is not a raw address. |
| Duplicate submission | Stored result replays, or 409 while the 120-second lease is open | Ask the visitor to wait. Do not send a second copy by hand unless the mailbox has no matching message. |
| Unknown business outcome | 503 and no success claim | Check the mailbox for the message ID before asking the visitor to resubmit. The adapter will not retry automatically. |
| Acknowledgement fails after acceptance | Success without the queued-mail sentence | The business mailbox has the inquiry. Reply from there if the visitor needs confirmation. |
| Sudden volume | Rising 429 or 503 counts | Disable with the rollback below. Add a CAPTCHA only after that evidence. |
| Mailbox has no notification after a success response | Visitor was told the inquiry was accepted | Search Brevo for the message ID and the business mailbox, including spam. If Brevo accepted it and the mailbox did not, treat that as a provider delivery issue, not a second send. |

Emergency disable: roll production back to the Stage A deployment, or to `dpl_3WDgPNEuUibC1csuPjAzwdDLSuZ4` before Stage A exists. Create a new deployment only after the source gate is false and the launch values are not the values captured by that deployment. Do not rely on editing an environment variable in place.

### Checklists

Stage A, after the manual production deploy:

- Inspect shows this project, target production, and the approved commit.
- `/` and `/contact` return 200 on `https://levelup-digital.dev`.
- The wizard has no Send button and says nothing typed is sent.
- The mailto and WhatsApp links are the published addresses.
- A direct POST does not return success. With the trusted origin set and the source gate false, the expected code is 503 `SUBMISSIONS_UNAVAILABLE`.
- The production response has no `noindex` robots header. Preview URLs still require Vercel Authentication.
- No Brevo message and no Redis inquiry key appear.

Stage B, only after a separate approval:

- Production secrets exist and the assessment is `ready_for_launch_review`.
- Trusted origin, sender, recipient, and sender name match the values above.
- The activation deploy is the commit that sets the source gate true.
- One synthetic submission is rate-limited, stored once, accepted by Brevo, and visible in the business mailbox.
- The acknowledgement matches the response confirmation.
- The privacy page contains the approved retention and region text before the Send button is used by the public.
- Rollback to the Stage A deployment is still available.

### Owner decision checklist

- Accept or replace the 12-month mailbox proposal.
- Confirm the privacy contact and the request-handling steps.
- Read and record Brevo, Upstash, and Vercel regions and retention.
- Choose the separate production Upstash database and its region.
- Approve Stage A before any production deploy.
- Approve Stage B separately, including one synthetic public submission.
