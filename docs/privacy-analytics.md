# Privacy and analytics

Google Analytics 4 (`G-8S5ZWSYC00`) loads only after a visitor accepts analytics. The root layout renders `ConsentManager` and does not include the gtag script.

## Storage

The choice is kept in `localStorage` under `levelup.privacy.consent`. The record is version `1`, with `analytics` set to `accepted` or `rejected`, and an `updatedAt` timestamp. It does not store a name, email address, or inquiry. A missing record, invalid JSON, an unknown version, or a storage exception leaves analytics off. If the browser cannot save a new choice, analytics stays off.

The site does not set a cookie to remember this choice.

## Loading

`initializeGoogleAnalytics` adds `https://www.googletagmanager.com/gtag/js` once. Commands are pushed as `arguments` objects because gtag.js ignores plain arrays. The config call sets `send_page_view` to false. The page then sends one `page_view` for the current path. The same path is ignored when it is requested again within 50 milliseconds, which covers a development double render. A later visit to a different path, or the same path after that window, is tracked. Client-side navigation does not reload the page. After the Google tag loads, the native `history.pushState` and `history.replaceState` methods are restored so the tag's own browser-history page view does not duplicate the page view sent by this site. A browser Back or Forward action can still emit Google's history page view as well as this site's page view.

## Withdrawal

Rejecting analytics before it has loaded does not install the script. Changing an accepted choice to rejected sets Google's disable flag, expires the first-party cookies `_ga`, `_gid`, `_gat`, `_ga_8S5ZWSYC00`, and `_gat_gtag_G-8S5ZWSYC00` on the current host, and reloads the page. The reload is what stops the script that already ran. Cookies on Google's domains, and hits already received by Google, are outside this site's control.

## Preferences

The first visit shows Accept Analytics and Reject Analytics together, plus a link to the privacy policy. Privacy Preferences in the footer reopens the same choice. Both actions stay available.

## Legal notes

The privacy policy states that analytics is optional and not anonymous, that public inquiries are not being submitted, and that the seven-day Redis marker is not an email retention period. It does not certify compliance with Japanese or other privacy law. The privacy contact, notices for visitors outside Japan, the hosting log retention period, and any inquiry retention period still need an owner or legal decision.
