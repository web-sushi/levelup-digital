# Privacy and analytics

Google Analytics 4 (`G-8S5ZWSYC00`) loads only after a visitor accepts analytics. The root layout renders `ConsentManager` and does not include the gtag script.

## Storage

The choice is kept in `localStorage` under `levelup.privacy.consent`. The record is version `1`, with `analytics` set to `accepted` or `rejected`, and an `updatedAt` timestamp. It does not store a name, email address, or inquiry. A missing record, invalid JSON, an unknown version, or a storage exception leaves analytics off. If the browser cannot save a new choice, analytics stays off.

The site does not set a cookie to remember this choice.

## Loading

`initializeGoogleAnalytics` adds `https://www.googletagmanager.com/gtag/js` once. Commands are pushed as `arguments` objects because gtag.js ignores plain arrays. The config call sets `send_page_view` to false, so the config itself does not send a page view. A second initialization does not add another script.

`GoogleAnalytics` sends one `page_view` for each pathname after acceptance. That includes the page where the visitor accepts, a stored acceptance restored on reload, ordinary link navigation, and browser Back and Forward. Repeating the same path, including a development remount, does not send another hit. A later return to that path does. There is no timer and no replacement of `history.pushState` or `history.replaceState`.

The app is the page-view source this site controls. GA4 also listens for browser history changes after its script loads. Those listeners still see Next.js client navigations and Back and Forward, and they send a second page view for the same URL.

The downloaded gtag script for `G-8S5ZWSYC00` includes the enhanced-measurement template `detect_history_change_events`. There is no config flag in this site's snippet that turns that template off. The GA4 property must keep "Page changes based on browser history events" turned off. Admin path: Google Analytics → Admin → Data streams → the web stream → Enhanced measurement → settings → turn off "Page changes based on browser history events."

While that setting stays on, a client-side route change sends the app page view immediately and a second page view for the same URL about three seconds later. The app hit includes the `dp` page path. The history hit has the same document location and no `dp`. A fresh acceptance or a reload of a stored acceptance sent one page view in the checks below. The history duplicate is not removed in code, because doing so would require replacing `history.pushState`.

## Browser verification

Checked with Playwright Chromium against the local dev server on 9 November 2026.

No Google Analytics or gtag request was sent before a choice, after Reject Analytics, after reloading that rejection, or after changing an accepted choice back to rejected and opening another page. A corrupt stored record showed the banner and sent nothing.

Accept Analytics on the homepage sent one `page_view` for `/`. Home → About, About → Work, Work → Services, Back, and Forward each sent the app `page_view` for the destination. After the gtag history listener was active, each of those navigations also produced a second `page_view` for the same URL. A reload with a stored acceptance sent one `page_view`.

Reject Analytics and Accept Analytics are in that tab order. Privacy Preferences opens a native modal dialog named "Privacy preferences," moves focus inside, and matches `:modal`. Escape closes it and returns focus to Privacy Preferences. The polite live region announces "Analytics rejected." With reduced motion, the dialog transition duration computes to `0.01ms`.

Playwright's Tab and Shift+Tab move through Close, Reject Analytics, Accept Analytics, and Privacy Policy. On the wrap, that synthetic Tab places focus on the document body for one step, then the next Tab returns to the dialog. The same step happens on a blank page whose only script opens a modal dialog with the same controls. No custom focus trap was added.

At 320, 375, 768, 1024, and 1440 pixels the banner does not cause horizontal overflow, and both banner buttons are 49 pixels tall. The preferences dialog fits at 320 pixels (282 pixels wide) and at 1440. The footer Privacy Preferences control is present. The mobile menu button is 44 pixels square and opens at 320 pixels without overflow. Its parent is hidden from 1024 pixels upward.

## Remaining limitations

Duplicate history page views remain until the GA4 setting above is turned off. Hits already received by Google, and cookies set on Google's domains, cannot be cleared from this site. The privacy policy does not certify compliance with Japanese or other privacy law. Public inquiry submissions stay disabled.

## Preferences dialog

The first-visit banner is not a modal. The page behind it stays usable, and Reject Analytics and Accept Analytics are both buttons.

Privacy Preferences opens a native modal `<dialog>` with `showModal()`. The dialog is named "Privacy preferences." Focus moves inside it. Escape closes it, and the browser returns focus to the control that opened it. Closing does not change the stored choice. The banner and dialog disable their transitions when the visitor prefers reduced motion. A real Tab key is left to the browser's modal focus behavior. Playwright's synthetic Tab key steps onto the document body once at the wrap, including on a blank modal dialog, so this site does not add its own focus trap.

## Withdrawal

Rejecting analytics before it has loaded does not install the script. Changing an accepted choice to rejected sets Google's disable flag, expires the first-party cookies `_ga`, `_gid`, `_gat`, `_ga_8S5ZWSYC00`, and `_gat_gtag_G-8S5ZWSYC00` on the current host, and reloads the page. The reload is what stops the script that already ran. Cookies on Google's domains, and hits already received by Google, are outside this site's control.

## Preferences

The first visit shows Accept Analytics and Reject Analytics together, plus a link to the privacy policy. Privacy Preferences in the footer reopens the same choice. Both actions stay available. Closing the dialog without choosing leaves the stored choice unchanged.

## Legal notes

The privacy policy states that analytics is optional and not anonymous, that public inquiries are not being submitted, and that the seven-day Redis marker is not an email retention period. It does not certify compliance with Japanese or other privacy law. The privacy contact, notices for visitors outside Japan, the hosting log retention period, and any inquiry retention period still need an owner or legal decision.
