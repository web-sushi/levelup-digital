# Navigation route status

Production URL: `https://levelup-digital.dev`

## Core routes

| Route | Implemented | Notes |
| --- | --- | --- |
| `/` | Yes | Foundation placeholder homepage |
| `/services` | Yes | Approved ¥ pricing |
| `/work` | Yes | Concept Lab; cards link to case studies |
| `/about` | Yes | Founder story + portrait |
| `/contact` | Yes | Direct channels; wizard coming later |
| `/privacy` | Yes | Review notes for owner/legal |
| `/thank-you` | Yes | Future post-submit; not wired to a form |

## Case study routes (Phase 01C-B)

| Route pattern | Count | Notes |
| --- | --- | --- |
| `/work/[slug]` | 11 | Static concept case studies; external demo CTA on each page |

Header, footer, and primary navigation link to core routes. Work → case study → live demo is the intended concept journey.

## Legacy redirects

Eighteen permanent `.html` → clean URL redirects are active in `next.config.ts` (seven core pages + eleven project pages). See `docs/route-migration-plan.md`.

## Reserved (future)

- `src/components/contact/InquiryWizard.tsx` — documented on `/contact`, file not created yet
- Experimental creative agency visual redesign — not started

Legacy static site remains under `legacy/` and is not served by Next.js.
