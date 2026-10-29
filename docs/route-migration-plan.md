# Route migration plan

Production URL: `https://levelup-digital.dev`

Legacy baseline commit: `ee70ff0c9187b30dee2b29efa5d63af69bb8792a`

All legacy files live under `legacy/` with original relative paths preserved (`legacy/index.html`, `legacy/style.css`, etc.).

**Do not enable redirects in `next.config.ts` until each destination route is implemented.**

| Legacy URL | Legacy file | Planned Next.js route | Status |
| --- | --- | --- | --- |
| `/` or `/index.html` | `legacy/index.html` | `/` | Foundation placeholder only |
| `/services.html` | `legacy/services.html` | `/services` | Not implemented |
| `/work.html` | `legacy/work.html` | `/work` | Not implemented |
| `/about.html` | `legacy/about.html` | `/about` | Not implemented |
| `/contact.html` | `legacy/contact.html` | `/contact` | Not implemented |
| `/privacy.html` | `legacy/privacy.html` | `/privacy` | Not implemented |
| `/thank-you.html` | `legacy/thank-you.html` | `/thank-you` | Not implemented |
| `/project-tour-basic.html` | `legacy/project-tour-basic.html` | `/work/tour-basic` | Not implemented |
| `/project-tour-standard.html` | `legacy/project-tour-standard.html` | `/work/tour-standard` | Not implemented |
| `/project-tour-pro.html` | `legacy/project-tour-pro.html` | `/work/tour-pro` | Not implemented |
| `/project-cafe-basic.html` | `legacy/project-cafe-basic.html` | `/work/cafe-basic` | Not implemented |
| `/project-cafe-standard.html` | `legacy/project-cafe-standard.html` | `/work/cafe-standard` | Not implemented |
| `/project-photo-basic.html` | `legacy/project-photo-basic.html` | `/work/photo-basic` | Not implemented |
| `/project-photo-standard.html` | `legacy/project-photo-standard.html` | `/work/photo-standard` | Not implemented |
| `/project-home-service-basic.html` | `legacy/project-home-service-basic.html` | `/work/home-service-basic` | Not implemented |
| `/project-home-service-standard.html` | `legacy/project-home-service-standard.html` | `/work/home-service-standard` | Not implemented |
| `/project-clinic-basic.html` | `legacy/project-clinic-basic.html` | `/work/clinic-basic` | Not implemented |
| `/project-clinic-standard.html` | `legacy/project-clinic-standard.html` | `/work/clinic-standard` | Not implemented |

## Future redirect pattern (not active)

When routes exist, add permanent redirects, for example:

- `/index.html` → `/`
- `/:page.html` → `/:page` (with explicit mappings for `project-*` → `/work/*`)

## Notes

- The `legacy/` directory is **not** served via `public/` and must not be exposed as static site assets from Next.js.
- External demo links remain on `https://web-sushi.github.io/*` (unchanged in legacy content).
