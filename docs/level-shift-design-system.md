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

The homepage is five contrasting bands, then a footer signature. Inner page layouts are unchanged except stable Services anchors.

1. Black editorial hero — two-line display headline, supporting service copy, two CTAs, and a five-bar geometric field.
2. Charcoal services — four numbered rows from `homepageServiceOverview`, one link to `/services`.
3. Black selected work — one large concept project and two supporting projects (`tour-standard`, `cafe-standard`, `photo-standard`).
4. Charcoal studio — cropped portrait, one cobalt vertical bar, link to `/about`.
5. Full-width electric-green close — near-black type, near-black button with white text to `/contact`.

The LevelMark motif appears as the hero artwork (five ascending slabs). It is not repeated in every section. Header and footer keep the small mark.

### Hero

The headline spans the width. Copy and CTAs sit beside the five-bar artwork, without a full-viewport gap, so the primary CTA stays in the first desktop screen. Below 1200px the first line breaks after “don’t” so the type can stay large. The second line stays green. The artwork is inline SVG, `aria-hidden`, flat fills only.

### Service rows

Each row is one link. Destinations:

- Business Websites → `/services#business-websites`
- Custom Web Applications → `/services#custom-web-applications`
- Booking & Payment Systems → `/services#booking-and-payments`
- Website Improvements & Maintenance → `/services#website-improvements`

`scroll-padding-top` on `html` clears the sticky header. Descriptions use `#C8C8C8` on the charcoal band. Hover and focus lengthen the green rule. There is one link per row.

### Project showcase

At 1024px and up, the stage is 8 / 4. The featured title is larger than the two supporting titles. Screenshots stay at 960×454 and are not cropped. Each block is one link to `/work/[slug]` and always shows “Concept project” and “View case study”.

### Cobalt

One vertical cobalt bar beside the studio portrait. A decorative `04` sits above the studio heading and is hidden from assistive technology. No other blue decoration on the homepage.

### Footer signature

The footer description names websites, custom applications, and booking or payment-enabled work. An oversized `LEVELUP` wordmark sits above the copyright line, `aria-hidden`, and is clipped so it does not create horizontal scroll. Contact, navigation, and privacy links are unchanged.

### Closing CTA

Green field `#00F050`, near-black headline. The button is `#050505` with white text, 44px minimum height, and a white focus ring offset from the green field.

### Motion

Hover only: service rule, arrow translate, case-study label color. No scroll animation and no animation library.

## Future considerations

- Inner pages still use the foundation type and buttons, not this homepage composition.
- Do not add a motion library for the mark; it should read while static.
- Favicon is still the previous mark.
