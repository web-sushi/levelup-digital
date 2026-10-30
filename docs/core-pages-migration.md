# Core pages migration (Phase 01C-A)

## Routes migrated

| Route | Source legacy file | Status |
| --- | --- | --- |
| `/services` | `legacy/services.html` | Migrated with **approved pricing** |
| `/work` | `legacy/work.html` | Migrated; all 11 demos = **concept** |
| `/about` | `legacy/about.html` | Migrated; portrait from `public/images/portrait.jpg` |
| `/contact` | `legacy/contact.html` | Direct contact only; **no form** |
| `/privacy` | `legacy/privacy.html` | Migrated with review flags |
| `/thank-you` | `legacy/thank-you.html` | Future destination; not linked from live submit |

Homepage (`/`) — Phase 01D content migration (hero, services intro, selected concept work, studio intro, closing CTA).

## Approved pricing (services page only)

- Basic: **¥50,000**
- Standard: **¥100,000**
- Pro: **from ¥200,000** (final quote depends on complexity)

Legacy HTML pricing is unchanged under `legacy/`.

## Portfolio classification

- All eleven `web-sushi.github.io` demos are `kind: "concept"` in `src/content/projects/projects.ts`.
- **No client projects** are listed — repository lacks verified client case study data.
- Legacy “Featured Work / real client” copy was **not** reproduced.

## Preserved external demo URLs

All eleven legacy demo URLs are in `portfolioProjects` with matching slugs.

## Phase 01C-B (case studies + redirects)

- `/work/[slug]` — eleven static concept case studies (`src/app/work/[slug]/page.tsx`)
- Section content — `src/content/projects/case-study-details.ts` (from legacy `project-*.html`)
- Eighteen permanent `.html` redirects — `next.config.ts` (see `docs/route-migration-plan.md`)

## Known gaps

- Inquiry wizard + Brevo (`src/components/contact/InquiryWizard.tsx`) — not implemented
- Sitemap / structured data — later phase
- Privacy policy — owner/legal review required (Netlify → Brevo, emails, dates)

## Future Brevo wizard (requirements capture)

Steps: project type → budget → timeline → name/email → optional details → review/submit.

Server-side: validation, spam protection, rate limiting, business + customer emails, partial failure handling.

## Assets copied for Next.js (legacy originals unchanged)

- `public/images/portrait.jpg`
- `public/images/work/*.jpeg`
