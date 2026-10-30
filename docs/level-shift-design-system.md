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

## Future considerations

- Homepage section composition (asymmetric work, numbered services, poster fields) is a later phase.
- Do not add a motion library for the mark; it should read while static.
- Cobalt stays a secondary accent until a later composition phase uses it as a field.
