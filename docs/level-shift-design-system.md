# Level Shift design system

Phase 02B brand foundation for LevelUp Digital. Homepage section layouts are unchanged except shared type, buttons, header, and footer.

## Brand philosophy

Level Shift pairs a structural progression mark with expressive display type and flat brand color. The five ascending bars mean movement to the next level. Color is used in fields and controls, not as decoration gradients.

## Typography

Loaded with `next/font/google` (`display: swap`, latin subset):

| Role | Family | Where |
| --- | --- | --- |
| Display | Space Grotesk | Hero, page titles, section headings, card titles |
| Body / UI | Geist Sans | Paragraphs, navigation, buttons, labels |

| Token | Size | Use |
| --- | --- | --- |
| `--text-display` | `clamp(2.5rem, 9vw, 8rem)` | Homepage hero only |
| `--text-page-title` | `clamp(2.25rem, 4vw, 3.5rem)` | Inner page `h1` (`.page-title`) |
| `--text-section` | `clamp(1.5rem, 2.2vw, 2rem)` | Section headings |
| `--text-card` | `1.125rem` | Card and project titles |
| `--text-body` | `1rem` | Body |
| `--text-label` | `0.75rem` | Eyebrows, footer headings |

The display floor is `2.5rem` rather than `3.5rem` so long words stay inside a 320px viewport. Desktop still reaches `8rem`.

## Color tokens

Base:

- Background `#050505`
- Surface `#151515`
- Electric green `#00F050`
- Cobalt `#304FFE`
- White `#FFFFFF`
- Muted `#A3A3A3`

Semantic:

- `--color-text`, `--color-border`, `--color-border-strong`
- `--color-interactive`, `--color-interactive-hover`, `--color-on-accent`

Green is for controls, the mark, and underlines. Body copy stays white or muted on near-black. Black text sits on green buttons.

## Spacing, radius, motion

- `--space-section` — vertical padding for `.page-section`
- `--radius-control: 2px`
- `--motion-duration: 200ms`
- `--motion-ease: cubic-bezier(0.2, 0, 0, 1)`

Existing `prefers-reduced-motion` rules collapse animation and transitions.

## Buttons and links

- Primary (`.page-link-button`, `.nav-cta`): green fill, near-black text, min-height 44px, no hover translation.
- Secondary (`.page-link-button-secondary`, `.page-inline-cta-secondary`): transparent, light border, white text, green border and text on hover.
- Text links (footer, `.page-prose a`): underline that becomes green on hover. Focus uses `.focus-ring`.

## Brand mark

`src/components/brand/LevelMark.tsx`

- Five bottom-aligned bars, ascending left to right.
- Variants: `green`, `white`, `mono` (`currentColor`).
- `decorative` (default) sets `aria-hidden` so the mark is not announced.
- Set `decorative={false}` and `title` only when the mark is the sole label.

The favicon is unchanged.

## Header and footer

- Header is sticky, solid background, no gradient bar and no blur.
- Active desktop links use weight plus a green underline, not color alone.
- Active mobile links use a green left border plus weight, with `aria-current="page"`.
- Footer keeps verified email, WhatsApp, social, nav, privacy, and the dynamic year. The cobalt grid overlay is removed. The mark sits with the wordmark.

## Responsive rules

- Container remains `72rem` with `1.25rem` / `2rem` padding.
- Display type uses `overflow-wrap: break-word`.
- Touch targets for primary controls and footer links stay at least 44px.
- Mobile navigation behavior (Escape, outside click, scroll lock, route close) is unchanged.

## Accessibility

- Skip link and focus-visible rings remain.
- Active navigation is indicated by position (underline or bar) and weight, with `aria-current`.
- Decorative marks are hidden from assistive technology.
- Do not set long text in `#00F050` on `#050505`.

## Creative balance

Level Shift is about 60% creative agency and 40% software studio. Display type, the five-bar field, and the green close carry the creative side. Service copy, concept-project labels, and the footer description carry the engineering side: websites, custom applications, and booking or payment systems, scoped in discovery.

## Homepage composition (Phase 02C, refined in 02C.1)

The homepage is five contrasting bands, then a footer signature. Services, Work, About, and Contact each have their own editorial composition.

1. Black editorial hero — two-line display headline, supporting service copy, two CTAs, and a five-bar geometric field.
2. Charcoal services — four numbered rows from `homepageServiceOverview`, one link to `/services`.
3. Black selected work — the two real client projects, then a separate invitation to the Concept Lab.
4. Charcoal studio — cropped portrait, one cobalt vertical bar, link to `/about`.
5. Full-width electric-green close — near-black type, near-black button with white text to `/contact`.

The LevelMark motif appears as the hero artwork (five ascending slabs). It is not repeated in every section. Header and footer keep the small mark.

### Hero

From 1024px up, the headline and five-bar artwork share the first row. The artwork column starts at the same top edge as the headline, so the tallest green bar sits with the first line. Supporting copy and CTAs stay in the left column beneath the headline. The first line breaks after “don’t” so the type can stay large beside the artwork. The second line stays green. The artwork is inline SVG, `aria-hidden`, flat fills only. Below 1024px the stack is headline, copy, CTAs, then artwork.

## Editorial copy

Do not use em dashes in user-facing website copy. Use a comma, colon, period, or a rewritten sentence. Keep meaning and factual limits intact, including concept-project labels, pricing, and package scope. Hyphenated words, URLs, code, and technical identifiers stay as they are. Privacy and legal sentences should change by punctuation only.

### Service rows

Each row is one link. Destinations:

- Business Websites → `/services#business-websites`
- Custom Web Applications → `/services#custom-web-applications`
- Booking & Payment Systems → `/services#booking-and-payments`
- Website Improvements & Maintenance → `/services#website-improvements`

`scroll-padding-top` on `html` clears the sticky header. Descriptions use `#C8C8C8` on the charcoal band. Hover and focus lengthen the green rule. There is one link per row.

### Project showcase

Selected work leads with the two commissioned projects from `clientProjects`. Each block is one link to its case study, with an oversized number, the project category, a status badge, the existing summary, a short capability list, and the published homepage WebP at 1600×742. From 1024px, Enjoy Travel sits text-left and image-right. Mark Maeda reverses that. Below that, “Beyond client work.” links to `/work#work-lab-heading` and labels those pieces as concepts.

### Cobalt

One vertical cobalt bar beside the studio portrait. A decorative `04` sits above the studio heading and is hidden from assistive technology. The second homepage project uses a cobalt rule and cobalt ticks so the two client features are not identical.

### Footer signature

The footer description names websites, custom applications, and booking or payment-enabled work. An oversized `LEVELUP` wordmark sits above the copyright line, `aria-hidden`, and is clipped so it does not create horizontal scroll. Contact, navigation, and privacy links are unchanged.

### Closing CTA

Green field `#00F050`, near-black headline. The button is `#050505` with white text, 44px minimum height, and a white focus ring offset from the green field.

### Motion

Hover only: service rule, arrow translate, case-study label color. No scroll animation and no animation library.

## Services page (Phase 02D)

`/services` uses the same tokens, type, and buttons. It does not reuse the homepage green close.

- Hero: “Digital solutions.” in white, “Built to move you forward.” in green. The factual intro covers websites, custom applications, booking, payments, and scoped delivery.
- Numbered bands: 01 Business websites (includes the three package columns), 02 Custom web applications, 03 Booking and payment systems, 04 Website improvements and maintenance.
- Anchors stay `#business-websites`, `#custom-web-applications`, `#booking-and-payments`, and `#website-improvements`. `scroll-padding-top` on `html` clears the sticky header. No extra `scroll-margin` on these ids, so the offset is not doubled.
- Prices stay From ¥50,000, From ¥100,000, and From ¥200,000. Package inclusions and the Pro quote note are unchanged. Booking and payment work stays outside those website packages.
- Process steps stay Discovery, Build, Review, and Launch.
- The closing band is near-black with a green button to `/contact`. Copy points to email or WhatsApp, not an inquiry form.
- Styles are prefixed `services-` so shared page cards on other routes are unchanged.

## Work page (Phase 02E)

`/work` uses the same tokens and buttons. Styles are prefixed `work-`.

- Hero: “Ideas made” in white, “real.” in green, with a small five-bar mark. One H1.
- Client projects stay empty until verified records exist. No placeholder clients are shown.
- The Concept Lab keeps all 11 concept projects in published order, grouped by category. The first project is featured. Later rows alternate a wider and a narrower column from 1024px up.
- Each project is one link to its case study and shows the category, a visible “Concept project” label, and a decorative `01 / 11` index.
- Screenshots stay at 960×454 through `next/image`. Hover scales the image slightly, moves the arrow, and turns the top rule and title green. `prefers-reduced-motion` removes those transforms.
- The close is a charcoal band, not the homepage green field, and links to `/contact`.
- Concept case studies use the shared Level Shift template in Phase LS-07C. Real-client case studies stay on their own pages.

## About page (Phase LS-07B)

`/about` uses the same tokens, type, and buttons. Styles are prefixed `about-`. The page does not reuse the homepage green close or the five-bar hero artwork.

- Hero: “Independent by design.” in white, “Built for real businesses.” in green. The label “2026” is decorative and hidden from assistive technology so it is not read as a founding date.
- Founder: the existing portrait at `public/images/portrait.jpg` (704×1472), cropped with `object-fit: cover`. Biography, civil-engineering study, and the early music-quiz project stay as previously written. One cobalt bar sits on the portrait.
- Philosophy: a two-line statement. The second line is cobalt and is sized as large display type. Clarity, reliability, and growth stay as values, set as type rather than cards.
- Capabilities: four linked rows for business websites, custom applications, booking and payments, and business operations. The first three go to the matching Services anchors. Operations links to `/work`.
- Approach: Understand, Design, Build, Refine & Launch, described as a usual way of working rather than a fixed contract. “Who I work best with” keeps the previous four points.
- Close: near-black, with links to `/contact` and `/work`. Copy points to email, WhatsApp, and social channels.

## Concept case studies (Phase LS-07C)

All 11 concept routes use `src/app/work/[slug]/page.tsx` and the components in `src/components/work/`. Styles are prefixed `concept-study-`. Real-client pages are separate and unchanged.

- The hero shows Concept Lab, the published project number, the category, the existing title and summary, and a visible “Concept project” label. The live demo URL is unchanged. “All work” returns to `/work`.
- Desktop and mobile screenshots keep their original files and aspect ratios. From 1024px the phone sits beside the desktop image. Below that, they stack.
- Overview, website sections, features, benefits, process, and customization still come from `case-study-details.ts`. Empty lists render nothing.
- Related links stay inside the Concept Lab and use the same thumbnail treatment as the Work index.
- The close links to `/contact` and `/work`. Copy treats the demos as possibilities, not products for sale.
- Clinic Standard keeps its existing note that demo features are not verified HIPAA compliance or live healthcare integrations.

## Contact page (Phase LS-07D)

`/contact` uses the same tokens, type, and buttons. Styles are prefixed `contact-`. Destinations come from `verifiedContactLinks`.

- Hero: “Got a project?” in white, “Let’s make it happen.” in green.
- `ContactProjectIntro` places the inquiry wizard in `.contact-inquiry-slot`. LS-08A is the guided form only. It does not submit, store, or email the answers. LS-08B adds a disabled `POST /api/inquiries` foundation. LS-08C adds a Brevo email adapter that the public route does not call. LS-08C.1 adds an unwired Upstash Redis rate limit and idempotency store. The wizard is not connected to that route.
- Direct rows: email, WhatsApp, LinkedIn, Facebook, and Instagram. Tokyo, Japan stays as the location line.
- “What happens next?” is a usual first conversation, not a response-time or acceptance promise.
- The close links to `/work` and `/services`.

## Future considerations

- Real-client case studies still use their existing compositions. Concept case studies use the shared template from Phase LS-07C. About has its own editorial composition (Phase LS-07B). Contact has its own composition from Phase LS-07D. The inquiry wizard UI exists in Phase LS-08A and does not submit, store, or email answers. Phase LS-08B adds a fail-closed `POST /api/inquiries` handler. Phase LS-08C adds a Brevo adapter that the handler does not call. Phase LS-08C.1 adds Redis rate limiting and idempotency that the handler does not call. Submissions stay disabled. See `docs/inquiry-submission.md`.
- Do not add a motion library for the mark; it should read while static.
- Favicon is still the previous mark.
