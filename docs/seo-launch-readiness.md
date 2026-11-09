# SEO and launch readiness

Checked on 9 November 2026 against the local dev server. Nothing in this pass was deployed, and public inquiry submissions stayed disabled.

## Route inventory

Public indexable pages:

- `/`
- `/services`
- `/work`
- `/about`
- `/contact`
- `/privacy`
- `/work/enjoy-travel-and-tours`
- `/work/mark-maeda-travel-and-tour`
- Concept Lab studies: `tour-basic`, `tour-standard`, `tour-pro`, `cafe-basic`, `cafe-standard`, `photo-basic`, `photo-standard`, `home-service-basic`, `home-service-standard`, `clinic-basic`, `clinic-standard`

Other routes:

- `/thank-you` renders, with `noindex, follow`. Visiting it does not send an inquiry. It is omitted from the sitemap and disallowed in robots.txt.
- `/api/inquiries` is the closed submission endpoint. It is not in the sitemap. robots.txt disallows `/api/`.
- `/work/missing-study` returns 404 with `noindex`.
- Legacy `.html` paths redirect to these routes. Those redirects are not separate sitemap entries.

Client case studies are static routes. Concept studies use `/work/[slug]`. A client slug does not also render through the dynamic route.

## Analytics verification

The GA4 web stream setting "Page changes based on browser history events" was checked after it was turned off. Playwright waited 8 seconds after each step.

- Before consent: no Google request.
- After Reject Analytics, including a later page load: no Google request.
- Accept Analytics on the homepage: one `page_view` for `/`.
- Home → About, About → Work, Work → Services, Back, and Forward: one `page_view` each, with `dp` set to the destination. No second history hit arrived during the wait.
- A reload of a stored acceptance requested `gtag/js` once and one `page_view`.
- Changing an accepted choice to rejected can still flush an in-flight `scroll` hit from the page that was already tracking. The reloaded page and a following visit sent no Google request.

The tracking code was not changed.

## Metadata

`createPageMetadata` sets a unique absolute title, description, canonical URL, `index` or `noindex`, Open Graph title, description, URL, site name, type, and image, and a `summary_large_image` Twitter card.

The canonical origin is `https://levelup-digital.dev`. Inner paths have no trailing slash, matching the App Router default. The homepage canonical is `https://levelup-digital.dev`, the same form Next.js emits and the same form used in the sitemap. No localhost or Vercel preview URL is used.

General pages share `/og` (1200×630 PNG). Client and concept studies use their own preview image. Checked pages exposed one `h1`, image alt text, and named links and buttons.

## Sitemap and robots

`/sitemap.xml` lists the 19 indexable URLs above once each, as absolute `https://levelup-digital.dev` URLs. It has no `lastmod` and no change frequency. `/thank-you` and `/api/inquiries` are absent.

`/robots.txt` allows `/`, disallows `/api/` and `/thank-you`, and points to `https://levelup-digital.dev/sitemap.xml`.

## Social image and icons

`/og` is a generated PNG: near-black background, the five-bar Level Shift mark in neon green, "LevelUp Digital", the line "Websites and custom digital products.", and `levelup-digital.dev`. The response is `image/png` at 1200×630, cached for one day.

`/icon` is a 32×32 PNG and `/apple-icon` is a 180×180 PNG of the same mark on `#050505`, so the bars stay visible on light and dark browser chrome. Space Grotesk Medium is stored under `src/assets/fonts/` with its OFL license for the social image only.

## Structured data

The root layout emits one JSON-LD graph:

- `Organization` for LevelUp Digital, Tokyo, Japan, with `levelupdigital.support@gmail.com`
- `WebSite` published by that organization
- `ProfessionalService` for business websites, custom web applications, and booking and payment systems

Case studies add one `BreadcrumbList`: Home, Work, and the study title.

The graph does not include a street address, postal code, rating, review, employee count, or award.

## Link check

These returned HTTP 200:

- `https://www.enjoytravelandtoursjapan.com/`
- `https://www.markmaedatravelandtour.com/`
- All eleven Concept Lab GitHub Pages demos
- WhatsApp, which redirects to `api.whatsapp.com`
- Facebook and Instagram

LinkedIn responded `999` to this client. That is LinkedIn's automated-request block, not evidence that the profile URL is wrong. The URL was left unchanged.

Checked internal routes returned 200, except the unknown case-study slug, which returned 404.

## Content notes

Services prices on the page are "From ¥50,000", "From ¥100,000", and "From ¥200,000". Pro says the final quote depends on complexity. Those starting amounts match the current Basic, Standard, and Pro prices. The "From" wording was left as published.

Enjoy Travel & Tours is described as a launched public site with backend work still in progress. Mark Maeda Travel & Tour is described as launched. Concept Lab studies are separate from those client projects. Concept copy that mentions testimonials, payments, or portals is describing the demo, not a measured client result.

The privacy page still says an owner review is required. It does not certify compliance with Japanese or other privacy law.

## Accessibility

Checked pages have `lang="en"`, a skip link, one `h1`, header navigation, `main#main-content`, and a footer. The mobile menu opened at 320px after hydration and did not overflow. The consent banner at 390px did not overflow, and the preferences dialog fit that width.

This was not a full WCAG audit. Contrast was not measured with a certified tool. Playwright's synthetic Tab key still steps onto the document body once when wrapping inside the native preferences dialog, as recorded in `docs/privacy-analytics.md`.

Local screenshots include the Next.js development badge at the bottom left. That badge is not part of the production page.

Reduced motion is already handled in the global stylesheet, including the consent banner and dialog.

## Responsive checks

At 320, 375, 768, 1024, and 1440 pixels, the homepage, services, work, about, contact, privacy, Enjoy Travel study, and Tour Guide: Basic study did not overflow horizontally. Separate screenshots without the consent banner showed the contact wizard, desktop navigation, and client study layout. No Send control was present.

## Performance observations

Lighthouse was not run, so there is no score to report. The public pages, `/sitemap.xml`, `/robots.txt`, `/icon`, and `/apple-icon` are statically generated. `/api/inquiries` stays dynamic. `/og` is generated on request because it reads the font file, and the response is cached for one day.

Pages use `next/image`. Source files under `public/images` are about 8.6 MB, of which the concept JPEGs are about 6.2 MB before Next's image optimization. Geist and Space Grotesk load with `display: swap`. Google Analytics is not on the page until analytics consent.

## Privacy and security

`publicInquirySubmissionsAvailable` remains false. The contact wizard says typed answers are not sent, and no Send button is rendered. The public inquiry runtime still uses the unavailable adapters. Analytics still loads only after acceptance. No new public debug route was added. `.env.local` remains gitignored.

## Remaining launch blockers

- Public inquiry submission is intentionally off until a later activation decision.
- The privacy policy still needs the owner's legal review, including the privacy contact, notices for visitors outside Japan, and retention periods.
- Google Analytics can receive a `scroll` hit that was already queued if someone withdraws consent on a page that was tracking. The reload after withdrawal does not start a new page view.
- LinkedIn could not be confirmed with this automated client because LinkedIn returned `999`.
