# Contact form preservation

Source of truth during migration: `legacy/contact.html`, modal forms in legacy main pages, and `legacy/js/main.js`.

## Netlify form

| Item | Value |
| --- | --- |
| Form name | `project-inquiry` |
| HTTP method | `POST` |
| Netlify attribute | `netlify` or `data-netlify="true"` |
| Honeypot | `netlify-honeypot="bot-field"` with hidden field `name="bot-field"` |
| Hidden field | `form-name` = `project-inquiry` |

## Field names (do not rename until a verified replacement exists)

| Field name | Required in legacy UI | Notes |
| --- | --- | --- |
| `name` | Yes | |
| `email` | Yes | |
| `business-type` | Yes | Select |
| `message` | No on contact page | Optional textarea |
| `timeline` | No | Optional select |
| `bot-field` | Honeypot | Must stay empty |
| `form-name` | Yes (hidden) | Must be `project-inquiry` |

## Submission behavior (legacy)

- Client-side validation in `legacy/js/main.js` before submit.
- AJAX: `fetch('/')` with `FormData`; default form submit prevented.
- Success: hide form, show inline success message (`#contact-form-success` or `#form-success`).
- Error: re-enable submit button, show `role="alert"` message.
- Legacy `#contact-form` handler redirects to `/thank-you.html` if present without Netlify attribute (no matching id in current HTML).

## Static form detection (Netlify + Next.js)

Netlify discovers forms from **static HTML in the deploy output**. A React-only form may not be detected unless:

1. A static HTML stub (e.g. under `public/forms/`) contains the full `netlify` form markup with all fields, or
2. Another host-supported detection method is confirmed at deploy time.

**Do not assume** the current AJAX POST to `/` works unchanged after migration without verification on a preview deploy.

## Verification (later phases; no live enquiry in foundation phase)

- Netlify dashboard → Forms → `project-inquiry` listed after deploy.
- Deploy log mentions forms detected.
- Staging test submission only when explicitly approved.

## Future interactive inquiry wizard (not implemented in Phase 01A)

Proposed steps:

1. Project type  
2. Budget range  
3. Timeline  
4. Name and email  
5. Optional project details  
6. Review and submission  

UI: selectable cards, progress indicator, accessible transitions. Final submit must map to the **same Netlify field names** (or new fields added only after dashboard + detection are verified). Until then, keep legacy form contract intact under `legacy/`.

## Phase 01A scope

- No new submission endpoint.
- No form implementation in Next.js app.
- No changes to field names inside `legacy/`.

## Phase LS-08B

`POST /api/inquiries` is a separate, disabled Next.js contract. It is documented in `docs/inquiry-submission.md`. It does not replace the legacy Netlify field names above. The current public wizard does not send a request while submissions stay unavailable.
