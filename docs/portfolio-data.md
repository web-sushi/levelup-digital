# Portfolio data

Centralized concept demo records live in:

- `src/content/projects/types.ts` — shared types
- `src/content/projects/projects.ts` — eleven `kind: "concept"` entries with slugs, tiers, summaries, tags, demo URLs, and preview image paths
- `src/content/projects/case-study-details.ts` — section content migrated from `legacy/project-*.html` (hero overview, website sections, features, intended benefits, process, customization, SEO descriptions)

## Rules

- All eleven legacy demos remain **concept** work — not client case studies.
- External demo URLs on `https://web-sushi.github.io/*` are preserved exactly in `demoUrl`.
- Do not add fabricated performance stats, testimonials, or client outcomes.
- `clinic-standard` overview copy avoids presenting HIPAA compliance or live healthcare integrations as verified facts.

## Helpers

- `getProjectBySlug(slug)` — published project lookup
- `getCaseStudyDetail(slug)` — migrated section content
- `getRelatedConceptProjects(slug)` — same category first, stable slug order, max three
- `getPublishedConceptSlugs()` — static generation list for `/work/[slug]`

## Images

Preview assets: `public/images/work/*-desktop.jpeg` and `*-mobile.jpeg` (legacy assets unchanged under `legacy/assets/`).

## Known limitations

- Several non–tour legacy pages use generic “content tailored to your … needs” placeholder copy in “What’s in the Website” cards; titles are preserved, bodies are not expanded beyond legacy source.
- Legacy meta descriptions were often missing; case study `seoDescription` values are derived from page titles plus a consistent suffix unless manually adjusted (e.g. clinic-standard).
