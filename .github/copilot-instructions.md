## Aversa website — Copilot instructions (short)

Summary
- This is a small static, RTL (Arabic) marketing site under `c:/xampp/htdocs/aversa_website`.
- Pages are assembled client-side from HTML partials located in `sections/` using a simple fetch loader in `index.html`.

Quick serve & preview
- Prefer serving over HTTP (file:// blocks fetch). The project lives in XAMPP `htdocs`, so Apache serves it at:
  - http://localhost/aversa_website/
- Quick alternative local server from the project root:
  ```powershell
  # from c:\xampp\htdocs\aversa_website
  python -m http.server 5500
  # then open http://localhost:5500
  ```

Key files & patterns (important to reference)
- `index.html` — entry point. Loads vendor CDNs (Bootstrap, AOS, icons, Google Fonts) and `assets/js/main.js`.
  - Partial loader: elements use a `data-include="sections/..."` attribute. The loader fetches and replaces each element with the partial HTML.
- `sections/*.html` — small HTML fragments (header, hero, contact, footer, etc.). They are not standalone pages but fragments inserted into `index.html`.
- `assets/js/main.js` — single client script. Contains UI behaviors and DOM IDs/classes relied upon by partials (see "Useful element IDs" below).
- `assets/css/style.css` — project styles (RTL-aware; uses Cairo font).
- `sections/head-ld.jsonld` — full JSON-LD structured data referenced from `index.html`.

Useful element IDs / integrations (do not rename without updating JS or index.html)
- `preloader` — element hidden on window load.
- `backToTop` — button toggled by scroll; used for smooth-scroll.
- `cookieBar`, `acceptCookies` — cookie banner behavior stored in `localStorage`.
- `contactForm`, `name`, `email`, `phone`, `service`, `website` (honeypot), `details`, `formMsg`, `successModal` — client-side contact flow is a demo simulation handled in `assets/js/main.js`.
- `.sticky-cta` — visibility toggled by window width.

Vendor ordering and dependencies
- `index.html` includes vendor CSS/JS via CDN. `assets/js/main.js` expects Bootstrap and AOS to be available globally before it runs. Keep script order unchanged when editing.

Project conventions and gotchas
- Partial filenames are referenced exactly from `index.html` (example: `sections/ourServerce.html` — note the unusual spelling). Renaming a partial must be reflected in `index.html`.
- The site is RTL (`<html lang="ar" dir="rtl">`) — CSS/layout changes should be tested in RTL mode.
- There is no package.json or build step; this is a pure static site. Keep changes simple and test in-browser over HTTP.
- Because partials are loaded with fetch, editing a partial while previewing may require a full page reload (or clearing cache) to see changes.

Debugging tips
- If a partial fails to load: check browser console for 404s or CORS/fetch errors (common when opened via `file://`).
- If UI behavior breaks after edits: verify IDs listed above exist in the modified partial; `main.js` accesses them directly by `getElementById` or query selectors.

When making changes
- Small UI change: edit the relevant `sections/*.html` fragment and reload via HTTP.
- New interactive component: add markup in a section and update `assets/js/main.js` to initialize it. Keep initialization idempotent (check for element presence before attaching handlers).

References
- See: `index.html`, `assets/js/main.js`, `sections/` (all partials), `assets/css/style.css`, `sections/head-ld.jsonld`.

If anything above is unclear or you want me to include additional conventions (naming rules, testing commands, or CI hooks), tell me which area to expand.
