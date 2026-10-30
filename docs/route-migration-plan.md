# Route migration plan

Production URL: `https://levelup-digital.dev`

Legacy baseline commit: `ee70ff0c9187b30dee2b29efa5d63af69bb8792a`

All legacy files live under `legacy/` with original relative paths preserved (`legacy/index.html`, `legacy/style.css`, etc.).

Permanent redirects are configured in `next.config.ts` (Phase 01C-B).

| Legacy URL | Legacy file | Next.js route | Status |
| --- | --- | --- | --- |
| `/` or `/index.html` | `legacy/index.html` | `/` | Migrated (homepage placeholder) |
| `/services.html` | `legacy/services.html` | `/services` | Migrated |
| `/work.html` | `legacy/work.html` | `/work` | Migrated |
| `/about.html` | `legacy/about.html` | `/about` | Migrated |
| `/contact.html` | `legacy/contact.html` | `/contact` | Migrated |
| `/privacy.html` | `legacy/privacy.html` | `/privacy` | Migrated |
| `/thank-you.html` | `legacy/thank-you.html` | `/thank-you` | Migrated |
| `/project-tour-basic.html` | `legacy/project-tour-basic.html` | `/work/tour-basic` | Migrated |
| `/project-tour-standard.html` | `legacy/project-tour-standard.html` | `/work/tour-standard` | Migrated |
| `/project-tour-pro.html` | `legacy/project-tour-pro.html` | `/work/tour-pro` | Migrated |
| `/project-cafe-basic.html` | `legacy/project-cafe-basic.html` | `/work/cafe-basic` | Migrated |
| `/project-cafe-standard.html` | `legacy/project-cafe-standard.html` | `/work/cafe-standard` | Migrated |
| `/project-photo-basic.html` | `legacy/project-photo-basic.html` | `/work/photo-basic` | Migrated |
| `/project-photo-standard.html` | `legacy/project-photo-standard.html` | `/work/photo-standard` | Migrated |
| `/project-home-service-basic.html` | `legacy/project-home-service-basic.html` | `/work/home-service-basic` | Migrated |
| `/project-clinic-basic.html` | `legacy/project-clinic-basic.html` | `/work/clinic-basic` | Migrated |
| `/project-home-service-standard.html` | `legacy/project-home-service-standard.html` | `/work/home-service-standard` | Migrated |
| `/project-clinic-standard.html` | `legacy/project-clinic-standard.html` | `/work/clinic-standard` | Migrated |

## Redirect mapping (active)

All sources are `.html` paths at the site root (same as legacy filenames):

- `/index.html` → `/`
- `/services.html` → `/services`
- `/work.html` → `/work`
- `/about.html` → `/about`
- `/contact.html` → `/contact`
- `/privacy.html` → `/privacy`
- `/thank-you.html` → `/thank-you`
- `/project-tour-basic.html` → `/work/tour-basic`
- `/project-tour-standard.html` → `/work/tour-standard`
- `/project-tour-pro.html` → `/work/tour-pro`
- `/project-cafe-basic.html` → `/work/cafe-basic`
- `/project-cafe-standard.html` → `/work/cafe-standard`
- `/project-photo-basic.html` → `/work/photo-basic`
- `/project-photo-standard.html` → `/work/photo-standard`
- `/project-home-service-basic.html` → `/work/home-service-basic`
- `/project-home-service-standard.html` → `/work/home-service-standard`
- `/project-clinic-basic.html` → `/work/clinic-basic`
- `/project-clinic-standard.html` → `/work/clinic-standard`

## Notes

- The `legacy/` directory is **not** served via `public/` and must not be exposed as static site assets from Next.js.
- External demo links remain on `https://web-sushi.github.io/*` (unchanged).
- Unknown `/work/[slug]` values return 404 via `notFound()`.
