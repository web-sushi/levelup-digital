# LevelUp Digital production launch plan

Prepared 9 November 2026 on branch `redesign/levelup-creative-agency`.

This is a readiness plan. It does not deploy the site, change DNS, change production environment variables, or enable public inquiry submissions.

## How to read this document

**Verified** means it was observed in this repository, in a local production build, in a browser check, or in a read-only request during this audit.

**Assumption** means it is a reasonable reading that was not confirmed from the owner’s hosting account, registrar, or a live dashboard. Assumptions are labeled in place.

No secret values are recorded here. Local credentials were not copied into any deployment.

---

## 1. Hosting recommendation

**Recommendation, pending owner approval: host the redesigned Next.js application on Vercel, on a Pro or Enterprise plan. Do not use the Hobby plan for this site.**

This was not purchased, upgraded, or linked. The owner’s Vercel account was not inspected. There is no `vercel.json`, no Netlify config, and no GitHub Actions workflow in this repository, and no Vercel project is linked from the repo.

### Why Vercel fits this application

Verified from the repository:

- The redesign is a Next.js 16 App Router application. Public pages are statically generated. Two routes are dynamic: `POST /api/inquiries` (Node.js) and `GET /og` (Node.js, reads a font at request time and returns a 1200×630 PNG).
- Images use `next/image`. There is no custom image-optimization override in `next.config.ts`, so the host’s Next.js image optimizer is part of the intended runtime.
- Later inquiry activation, if approved, trusts only the first address in `x-vercel-forwarded-for`. `x-forwarded-for` is ignored because a caller can set it. The address is HMAC-SHA256 hashed and is not logged. A website-only launch does not need that header. An inquiry launch on a host that does not set `x-vercel-forwarded-for` would fail closed for rate limiting.

### Why Hobby is not the production plan

Reviewed from Vercel’s published plan and fair-use pages on 9 November 2026, not from an account:

- Hobby is restricted to non-commercial, personal use.
- Vercel’s fair-use guidance says commercial use of the platform requires Pro or Enterprise. The published examples include advertising the sale of a product or service, and receiving payment to create, update, or host a site.
- LevelUp Digital publishes service prices and is a freelance agency site. That is commercial use under the published examples.

Choosing Vercel therefore requires the owner to approve a Pro or Enterprise plan. This audit does not choose a price, a team, or a billing owner.

### What was not chosen

Netlify currently serves the live site, and Netlify can run Next.js. Moving the redesign there would still be a new deployment of a different application, and the inquiry rate limiter would not see `x-vercel-forwarded-for` unless that code is changed in a later phase. Staying on Netlify is an owner decision, not a recommendation of this plan.

A self-hosted Node server would also run `next start`, including the image optimizer and the inquiry route. It would add server administration that this site does not need for a first launch. It is not recommended unless the owner rejects both Vercel and Netlify.

---

## 2. Current production architecture

**Verified.**

| Item | Evidence |
| --- | --- |
| Production URL | `https://levelup-digital.dev/` |
| HTTP response | A read-only header request returned HTTP/2 200 with `server: Netlify` and `x-nf-request-id`. A later body request failed inside the audit sandbox. That failure is not evidence that the live site is down. |
| Application | The live site is the previous static website. `legacy/` in this repo contains 18 HTML pages, `legacy/style.css`, and image assets. Those files were not modified. |
| Contact form | Legacy contact markup uses Netlify Forms attributes (`netlify`, `data-netlify`, `netlify-honeypot`). The redesign does not use Netlify Forms. |
| DNS | Apex nameservers are `dns1.p09.nsone.net` through `dns4.p09.nsone.net`. Apex A records observed: `13.215.239.219` and `52.74.6.109`. A CNAME query for `www.levelup-digital.dev` returned no record in this check. |
| Repository remote | `https://github.com/web-sushi/levelup-digital.git` |
| Deployment config in the redesign | None. No `vercel.json`, `netlify.toml`, or `.github/workflows`. |

**Assumption.** The NS1 nameservers are consistent with Netlify DNS, which matches the Netlify server header. The registrar, the DNS editor, and the exact Netlify site name were not opened. Do not treat the A records above as a permanent rollback target without confirming them in the DNS editor at cutover time, because a host can change edge addresses.

The current site must stay in place until the owner explicitly approves replacing it.

---

## 3. Proposed deployment architecture

Keep one straightforward production setup:

1. Leave the current Netlify site deployed and serving `levelup-digital.dev`.
2. After owner approval, create a separate Vercel project from this GitHub repository. Do not attach the production domain in that first step.
3. Deploy the redesign to a Vercel preview or staging URL that is not the production domain.
4. Keep public inquiry submissions disabled in that environment.
5. Run the staging checks in section 10.
6. Only after a separate approval, attach `levelup-digital.dev` and change DNS.
7. Treat inquiry activation as a later decision, after the website itself is stable.

Proposed production shape:

- Vercel project, Pro or Enterprise, Node.js runtime for the App Router.
- Production domain `https://levelup-digital.dev`, no trailing slash. This matches `trailingSlash: false` and the canonical URLs already emitted by the app.
- No separate database, queue, or email service for the website-only launch.
- Upstash Redis and Brevo remain unwired from the public route until the activation checklist in section 9 is complete.
- Google Analytics 4 stays in the existing consent flow. The measurement ID `G-8S5ZWSYC00` is in source. It is not an environment variable. The script does not load before consent.

Preview deployments must stay off the production domain, must not receive production Redis or Brevo credentials unless a specific controlled test justifies it, and must not send customer email.

---

## 4. Required environment variables

Every variable below is server-only. None use a `NEXT_PUBLIC_` prefix. `.gitignore` ignores `.env*`, including `.env.local`. Do not commit environment files, and do not paste local values into production.

A website-only launch needs none of these. The safe production default is to omit the inquiry variables, or to set the two switches to their disabled values and leave the secrets unset.

| Variable | Purpose | Website-only launch | Inquiry activation | Safe disabled state | Security |
| --- | --- | --- | --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | HTTPS endpoint for the Upstash Redis REST API used by rate limiting and idempotency. | Not required | Required | Omit | Server-only. Must be an HTTPS Upstash URL. Do not log it. |
| `UPSTASH_REDIS_REST_TOKEN` | Authenticates that Redis endpoint. | Not required | Required | Omit | Secret. Server-only. Distinct from the HMAC secrets. |
| `INQUIRY_RATE_LIMIT_KEY_SECRET` | HMAC key for hashing the client address before it is used as a rate-limit key. Raw addresses are not stored. | Not required | Required | Omit | Secret, at least 16 characters. Must differ from the idempotency secret. |
| `INQUIRY_IDEMPOTENCY_KEY_SECRET` | HMAC key for the idempotency marker. The marker expires after seven days and is not an email retention period. | Not required | Required | Omit | Secret, at least 16 characters. Must differ from the rate-limit secret. |
| `BREVO_API_KEY` | Authenticates the Brevo transactional API. | Not required | Required | Omit | Secret. Server-only. |
| `BREVO_SENDER_EMAIL` | From address. Readiness expects `levelupdigital.support@gmail.com`. | Not required | Required, exact expected value | Omit | Not a public client variable. A mismatch is invalid configuration. |
| `BREVO_SENDER_NAME` | From name. Readiness expects `LevelUp Digital`. | Not required | Required, exact expected value | Omit | Same as the sender email. |
| `INQUIRY_NOTIFICATION_EMAIL` | Business inbox for a future inquiry. Readiness expects `levelupdigital.support@gmail.com`. | Not required | Required, exact expected value | Omit | Same mailbox as the public contact address. |
| `INQUIRY_TRUSTED_ORIGINS` | HTTPS origins allowed to call the inquiry route. No wildcards. Localhost is not accepted in this production list. Preview hosts are not added automatically. | Not required | Required. Production value should be exactly `https://levelup-digital.dev` | Omit | A wrong origin fails closed. Do not add a preview origin to the production value. |
| `INQUIRY_ACTIVATION_GATE` | Exact tokens: `disabled`, `testing`, or `launch`. Unset means missing, not disabled. | Not required | `testing` only for a controlled staging test. `launch` only for the later launch review. | `disabled`, or omit | `launch` alone does not show the Send button. See section 9. |
| `INQUIRY_SUBMISSIONS_ENABLED` | Must be the string `true` before a prepared runtime will treat submissions as enabled. Any other value is disabled. | Not required | `false` until the activation checklist is complete, then `true` only with the other gates | `false`, or omit | Fail closed. Setting this to `true` in production today still does not attach live adapters to the public route. |

`createInquiryRuntime`, which the public route uses, always returns unavailable rate limiting and unavailable email delivery. Credentials and the activation gate do not change that. `createPreparedInquiryRuntime` can attach Upstash and Brevo, and only when readiness is `ready_for_controlled_testing` or `ready_for_launch_review`. The public route does not call the prepared factory.

---

## 5. Domain migration plan

Do this only after the owner approves the production release. DNS changes are not instantly reversible. Cached resolvers can keep the old answer until TTL expires, and the TTL was not recorded in this audit.

1. Confirm the current Netlify deployment is still the live site and that its rollback artifact is retained. Do not delete it.
2. In the DNS editor, record the current nameservers, apex records, and any `www` record before changing them.
3. Deploy the redesign to Vercel without the production domain.
4. Complete staging verification on that non-production URL.
5. Add `levelup-digital.dev` to the Vercel project and use the DNS records Vercel displays at that time. Prefer the records shown in the dashboard over the A records copied into this document.
6. Lower TTL before the change if the DNS editor allows it, then restore a normal TTL after the new site is confirmed.
7. Verify the smoke tests in section 11 on the production domain.
8. If verification fails, restore the previous DNS records and confirm the Netlify site is serving again. See section 12.

**Assumption.** The registrar login and the Netlify DNS login are available to the owner. This audit did not sign in to either.

`www` had no CNAME in the public query used here. Decide explicitly whether `www` should redirect to the apex before cutover. Do not add that host silently.

---

## 6. Legacy URL redirects

**Verified.** `next.config.ts` already permanent-redirects every HTML file present under `legacy/` to a redesigned route. These redirects are appropriate because each destination exists.

| Current URL | Redesigned destination |
| --- | --- |
| `/index.html` | `/` |
| `/services.html` | `/services` |
| `/work.html` | `/work` |
| `/about.html` | `/about` |
| `/contact.html` | `/contact` |
| `/privacy.html` | `/privacy` |
| `/thank-you.html` | `/thank-you` |
| `/project-tour-basic.html` | `/work/tour-basic` |
| `/project-tour-standard.html` | `/work/tour-standard` |
| `/project-tour-pro.html` | `/work/tour-pro` |
| `/project-cafe-basic.html` | `/work/cafe-basic` |
| `/project-cafe-standard.html` | `/work/cafe-standard` |
| `/project-photo-basic.html` | `/work/photo-basic` |
| `/project-photo-standard.html` | `/work/photo-standard` |
| `/project-home-service-basic.html` | `/work/home-service-basic` |
| `/project-home-service-standard.html` | `/work/home-service-standard` |
| `/project-clinic-basic.html` | `/work/clinic-basic` |
| `/project-clinic-standard.html` | `/work/clinic-standard` |

Next.js keeps the query string on these redirects. `/contact.html?project=photo-basic` would become `/contact?project=photo-basic`. The inquiry wizard does not read that query, so the old project hint is not applied. Mapping those query values into the wizard would be a separate product decision. It is not implemented.

Not redirected, because no replacement URL was confirmed:

- `/style.css`
- files under the legacy `/assets/` paths, including the old favicon, logo, and page images

Those asset URLs will 404 after cutover. They are not the public pages. Do not add speculative asset redirects.

`legacy/` stays in the repository. It is the reference copy of the current site, not the deployment.

### What remains available without the old Netlify form

The redesigned pages keep the public information and the non-form contact paths:

- Home, services, work, about, contact, and privacy.
- Both client projects, with their live site links.
- All 11 Concept Lab projects, labeled as concepts, with their existing demo links.
- Email `mailto:levelupdigital.support@gmail.com`.
- WhatsApp `https://wa.me/818074310125`.
- LinkedIn, Facebook, and Instagram links already in the footer.

At cutover, the old Netlify form stops receiving submissions because the redesign does not post to Netlify Forms. Until inquiry activation, email and WhatsApp are the working inquiry paths. The contact page already says typed answers are not sent.

---

## 7. SEO migration checklist

**Verified in the current source and production build.**

- Canonical origin is `https://levelup-digital.dev`. The homepage canonical has no trailing slash. Inner paths have no trailing slash. No localhost or preview host is used as a canonical.
- `createPageMetadata` sets an absolute title, description, canonical, robots, Open Graph, and Twitter `summary_large_image`.
- `/og` serves one 1200×630 PNG. `/icon` is 32×32. `/apple-icon` is 180×180.
- JSON-LD is Organization, WebSite, and ProfessionalService, plus BreadcrumbList on case studies. It includes Tokyo and the public email. It does not include a street address, rating, review, or award.
- `/sitemap.xml` lists 19 indexable URLs once, without `lastmod` or `changefreq`.
- `/robots.txt` allows `/`, disallows `/api/` and `/thank-you`, and points to `https://levelup-digital.dev/sitemap.xml`.
- `/thank-you` is `noindex, follow`.
- The 18 legacy HTML redirects above are the migration map for URLs the old static site exposed.
- Internal links use the new routes. Client project links point at the two live client sites. Concept Lab links point at the existing demo URLs.

### Visibility risks

- Preview URLs are not separately marked `noindex`. Production `robots.txt` allows `/`. A shared Vercel preview could be indexed if it is linked. Before sharing a preview, add a host check that sends `X-Robots-Tag: noindex` for every host other than `levelup-digital.dev`, and confirm the production host does not receive that header. That change is not in this commit, because a mistaken rule could noindex production.
- The first homepage Lighthouse run was a cold start and looked much slower than a repeat. Use field data after launch rather than that first lab run. See the performance section.
- Permanent redirects are strong. They should be in place before the domain is switched, which they already are in this app. They do nothing for the current Netlify site until the domain points at the redesign.

### After launch, in Google Search Console

Do not do these during this phase.

- Add or confirm the `https://levelup-digital.dev/` property and complete the verification method the owner controls.
- Inspect the live homepage after DNS serves the redesign.
- Submit `https://levelup-digital.dev/sitemap.xml`.
- Inspect a sample of old `.html` URLs and confirm they redirect.
- Watch coverage for unexpected `noindex`, soft 404s, and the legacy asset 404s.
- Do not request indexing of preview URLs.

---

## 8. Privacy decisions

**Verified.** The privacy page, last updated 9 November 2026, matches the current implementation:

- It says online inquiry submission is not enabled, typed answers are not sent, and the Brevo check was not a customer inquiry.
- It does not set an inquiry-email retention period.
- It says the seven-day Redis marker is not an email retention period.
- It does not name a hosting provider or a hosting-log retention period.
- Analytics is described as off until acceptance, with measurement ID `G-8S5ZWSYC00`.
- The page says it is not a legal certification and does not decide which privacy law applies.

Browser checks in this phase confirmed the implemented behavior: no Google Analytics request before consent, Reject stores a rejection, the footer opens a native “Privacy preferences” dialog, and Escape returns focus to the footer control. Earlier committed checks also covered Accept, withdrawal, and one pageview per navigation after consent. This phase did not repeat the live Google request sequence.

### Owner decisions still required

These are decisions, not recommendations of a retention period or a legal conclusion:

- How long inquiry emails should be kept, at Brevo and in the business mailbox, before submissions are enabled.
- Which host to name in the privacy page, and what the owner wants to say about connection logs.
- Whether `levelupdigital.support@gmail.com` remains the privacy contact.
- What, if anything, to tell visitors outside Japan.
- Whether the current consent banner is enough for the regions the owner cares about. The page intentionally does not claim compliance with Japanese APPI or with laws outside Japan.
- Who handles access, correction, and deletion requests, and how those requests are fulfilled.
- When the “owner review” note on the privacy page can be removed. It should stay while those items are open.
- The privacy page must stay accurate if submissions remain off at launch. Do not say the form is active until it is.

---

## 9. Inquiry activation prerequisites

Public submissions stay off. The contact page does not render a Send button while `publicInquirySubmissionsAvailable` is `false`. That constant is `false`. `resolvePublicInquirySubmissionsAvailable()` returns false while the constant is false, even if the launch gate and `INQUIRY_SUBMISSIONS_ENABLED=true` are both set.

### What is already true

- `POST /api/inquiries` exists, uses the Node.js runtime, limits the body to 16 KB, validates input, checks origin, and honors the honeypot `companyWebsite`.
- The public route calls `createInquiryRuntime`, which always uses unavailable rate limiting and unavailable delivery.
- Real Upstash integration was tested in an earlier phase. This phase did not rerun it, because the inquiry code did not change.
- A controlled Brevo verification email was received by the owner in an earlier phase. This phase did not send email.
- The privacy page discloses that submissions are off.

### What would have to change later

All of the following, in a separate reviewed change. Not in this phase.

1. Explicit owner approval to accept public inquiries.
2. Production environment on the approved host, with the variables in section 4 set to new production values. Do not copy `.env.local`.
3. `INQUIRY_TRUSTED_ORIGINS` verified as exactly `https://levelup-digital.dev`.
4. `INQUIRY_ACTIVATION_GATE=testing` and a controlled staging test that uses `createPreparedInquiryRuntime` without exposing it as the public route. Confirm Redis and Brevo on that staging host.
5. Privacy copy updated for an active form, including the owner’s retention decision, before any Send button can appear.
6. A code change that points the public route at the prepared runtime only when readiness is `ready_for_launch_review`, and that changes `publicInquirySubmissionsAvailable` only in that same reviewed change.
7. `INQUIRY_ACTIVATION_GATE=launch` and `INQUIRY_SUBMISSIONS_ENABLED=true` only after that code is deployed and the staging test passed.
8. One real production test to the business inbox, then confirmation that a visitor confirmation is sent only when that path is intended.

Fail closed remains the default. Missing secrets, an invalid origin, a missing gate, or an unavailable Redis or Brevo call must not report success.

### Activation rollback

If a future activation misbehaves:

1. Set `INQUIRY_SUBMISSIONS_ENABLED=false`.
2. Set `INQUIRY_ACTIVATION_GATE=disabled`.
3. Redeploy the previous build if the public route was already switched to live adapters.
4. Confirm `POST /api/inquiries` does not return success and the contact page has no Send button.
5. Failed email delivery must stay a server error. Do not show a success message when Brevo did not accept the message.

---

## 10. Staging verification

Plan only. Do not create the project in this phase.

### Stage A — local, completed for this commit

- Unit tests, lint, typecheck, and a production build. Results belong in the phase report.
- Content checked against the source values in the content section below.
- Environment requirements documented above.
- Inquiry submissions left disabled. No Brevo send.

### Stage B — isolated preview

- A Vercel preview, or another host, on a URL that is not `levelup-digital.dev`.
- Inquiry variables omitted, or gate `disabled` and submissions `false`.
- No production Redis token or Brevo key unless the owner separately approves one controlled test.
- No customer email.
- `noindex` on that host before the URL is shared. See the SEO gap above.
- Repeat the smoke list in section 11 against the preview URL.
- Confirm the live domain still serves the current Netlify site throughout this stage.

### Stage C — production approval

Require a separate yes before any of these: pushing the deployment branch, creating the hosting project, attaching the production domain, changing DNS, or removing the current site.

### Stage D — production smoke tests

Section 11. Run them after the domain serves the redesign, before telling anyone the launch is finished.

### Stage E — inquiry activation

A separate decision. The website launch does not require it. Section 9 is the gate.

---

## 11. Production smoke tests

On the production domain, after cutover:

- Homepage returns the redesign, not the old static page.
- Header navigation reaches Services, Work, About, Contact, and Privacy.
- Mobile menu opens and closes.
- Skip link moves focus to main content.
- A client case study and a Concept Lab case study open, and their external links still point at the existing destinations.
- Contact shows the business email and WhatsApp, shows no Send button, and says typed answers are not sent.
- Privacy still says submissions are not enabled.
- Rejecting analytics loads no Google Analytics script. Accepting it loads analytics only after that choice.
- `/sitemap.xml` lists the 19 production URLs.
- `/robots.txt` allows `/`, disallows `/api/` and `/thank-you`, and names the production sitemap.
- The favicon, apple icon, and Open Graph image respond.
- One old URL, such as `/contact.html`, redirects to its new path.
- `POST /api/inquiries` does not report a successful submission.

---

## 12. Rollback procedure

The rollback target is the current Netlify site. Do not delete that site, its deploy, or its form configuration before the redesign has been stable.

1. If the domain was not moved yet, do nothing to DNS. The current site is still live.
2. If the domain was moved, put back the DNS records recorded in step 2 of section 5. Use the values saved at cutover, not a memory of the A records in this document.
3. Wait for the DNS change to propagate. Do not assume it is immediate.
4. Confirm `https://levelup-digital.dev/` shows the previous site, a legacy HTML URL such as `/contact.html` serves the old page or the old host’s own behavior, and the old contact path is available again.
5. Leave the Vercel deployment in place but detached from the production domain, so it can be inspected without serving visitors.
6. If the failure is only the inquiry API or email, do not roll back the whole site. Use the activation rollback in section 9. Visitors can still use email and WhatsApp.
7. If a Vercel rollback of the redesign itself is needed while it is the live site, promote the last known good Vercel deployment, then rerun the smoke tests. That rollback does not restore the old static site. Only the DNS restore does that.

---

## 13. Owner approvals required

- Host: Vercel Pro or Enterprise, stay on Netlify with a new Next.js deployment, or another host.
- Who pays for the plan, and who owns the Vercel team. No upgrade was made.
- When a preview may be created.
- When the deployment branch may be pushed.
- When DNS may change, and whether `www` should exist.
- Whether the website launches while inquiries stay disabled. This plan says yes, that is the safe order.
- Inquiry retention, hosting disclosure, privacy contact, international visitors, analytics regions, and access or deletion handling.
- Whether `/contact?project=` should preselect a wizard project. It does not today.
- When the privacy-page review note can come off.

---

## 14. Known risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Hobby plan used for a commercial site | Do not launch on Hobby. Owner approves Pro or Enterprise first. |
| DNS cutover is hard to undo quickly | Keep the Netlify site. Record live DNS first. Switch only after preview checks. |
| Old Netlify form disappears at cutover | Launch with submissions disabled and with email plus WhatsApp visible. Say so on the contact and privacy pages, which they already do. |
| Preview URL gets indexed | Add `noindex` for non-production hosts before sharing the preview. Confirm production does not send that header. |
| Inquiry switches flipped too early | The public route still uses unavailable adapters, and the Send button is hardcoded off. Both must be changed on purpose. |
| Secrets copied from a laptop into production | Create production secrets in the host. Do not commit `.env.local`. |
| Homepage lab score looks poor | The first local Lighthouse run was a cold start. The repeat did not justify a homepage change. Re-measure on the preview. |
| Legacy image and CSS URLs 404 | Accepted. Page redirects exist. Asset redirects were not invented. |
| LinkedIn may block automated checks | An earlier check got HTTP 999, which is a bot response, not proof the profile URL is wrong. Leave the link. |

---

## Measured performance

Environment: local `next start` on port 3013, production build of the commit before the skip-link focus change, Lighthouse 12.8.2, headless Chrome for Testing, mobile form factor, simulated slow 4G, 4× CPU. One run per page, plus a second homepage run. This is a lab result on a laptop, not field data from the production domain. No score below was estimated.

The homepage was the first URL, while Lighthouse was still starting, and it is not the representative result. The repeat is.

| Page | Performance | Accessibility | LCP | CLS | TBT | Transfer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Homepage, first run | 0.58 | 0.96 | 3.40 s | 0 | 4.76 s | 431 KiB |
| Homepage, repeat | 0.98 | not rerun | 2.43 s | 0 | 0.06 s | not rerun |
| Services | 0.94 | 0.96 | 1.42 s | 0 | 0.30 s | 394 KiB |
| Work | 0.98 | 0.96 | 1.68 s | 0 | 0.16 s | 527 KiB |
| Contact | 0.86 | 0.96 | 1.94 s | 0 | 0.52 s | 393 KiB |
| Enjoy Travel case study | 0.94 | 0.96 | 2.82 s | 0 | 0.14 s | 503 KiB |
| Tour Basic concept | 0.92 | 0.96 | 2.50 s | 0 | 0.28 s | 446 KiB |

On the first pass, every page transferred about 288 KiB of JavaScript, 14 KiB of CSS, and 51 KiB of fonts. Image transfer was 0 KiB on Services and Contact, 36 KiB on the homepage, 126 KiB on Work, 106 KiB on the Enjoy Travel study, and 48 KiB on Tour Basic. `next/image` is doing that resizing. Fonts use `font-display: swap`, and the font-display audit passed. Google Analytics was not loaded, because the runs did not accept consent.

The first homepage run spent most of its main-thread time in an unattributable task categorized as “Other,” with script evaluation under one second. The repeat’s longest task was 128 ms. That pattern fits a cold local server, not a stable homepage defect. No homepage change was made.

Lighthouse accessibility was 0.96 on all six first-run pages because of contrast on decorative text. See below. These scores are not a WCAG conformance claim.

---

## Accessibility findings

Checked in Chromium against the local dev server after the focus fix, and against the local production server for the consent flow.

Verified:

- The skip link is the first Tab stop. Enter moves focus to `main#main-content` and shows a 2px accent outline. Before this change, the hash changed and focus stayed on `body`, because the target was not focusable.
- The mobile menu opens after hydration. Escape removes it and returns focus to “Open menu.”
- An empty Continue on the inquiry wizard shows “Choose a project type to continue.” and marks one field `aria-invalid`. An earlier failure was a click before hydration.
- Contact has no Send button and shows “Nothing you type is sent.”
- The privacy banner can be rejected. The choice is stored. Footer preferences open a native dialog named “Privacy preferences.” Escape restores focus to the footer button.
- No Google Analytics resource is requested before consent.
- The stylesheet shortens animation and transition durations and sets `scroll-behavior: auto` under `prefers-reduced-motion: reduce`. The browser check confirmed the media query matches. Individual animations were not filmed one by one.

Remaining, and not changed, because they are intentional low-contrast decoration:

- The footer wordmark (`.footer-signature`, `aria-hidden`) measured about 1.4:1, `#313131` on `#151515`. Lighthouse still flags it. It is a watermark, and raising it would change the design.
- Concept study index numbers (`.concept-study-index`, `aria-hidden`) measured about 3.99:1 and 4.07:1, below the 4.5:1 Lighthouse expects for that text size.

Automated contrast checks and a keyboard pass are not a full WCAG audit. Screen readers were not used.
