# Navigation route status (Phase 01B)

Primary navigation and footer links target the following App Router paths.

| Route | Implemented | Notes |
| --- | --- | --- |
| `/` | Yes | Foundation placeholder homepage |
| `/services` | No | Link present; returns 404 until Services page ships |
| `/work` | No | Link present; returns 404 until Work page ships |
| `/about` | No | Link present; returns 404 until About page ships |
| `/contact` | No | CTA and nav link present; returns 404 until Contact page ships |
| `/privacy` | No | Footer link only; returns 404 until Privacy page ships |

Legacy static site remains under `legacy/` and is not served by Next.js.

Redirects from `*.html` URLs are documented in `docs/route-migration-plan.md` and remain disabled until destination routes exist.
