# Navigation route status

Production URL: `https://levelup-digital.dev`

## Core routes (Phase 01C-A)

| Route | Implemented | Notes |
| --- | --- | --- |
| `/` | Yes | Foundation placeholder homepage |
| `/services` | Yes | Approved ¥ pricing |
| `/work` | Yes | Concept Lab only (11 demos) |
| `/about` | Yes | Founder story + portrait |
| `/contact` | Yes | Direct channels; wizard coming later |
| `/privacy` | Yes | Review notes for owner/legal |
| `/thank-you` | Yes | Future post-submit; not wired to a form |

Header, footer, and primary navigation link to all routes above.

## Not implemented

| Legacy path | Planned Next route | Status |
| --- | --- | --- |
| `/project-*.html` (11 files) | `/work/[slug]` (Phase 01C-B) | Not implemented |
| `*.html` redirects | `next.config` | Disabled until cutover plan |

Legacy static site remains under `legacy/` and is not served by Next.js.

## Reserved (future)

- `src/components/contact/InquiryWizard.tsx` — documented on `/contact`, file not created yet
