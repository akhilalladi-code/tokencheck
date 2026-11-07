# TokenCheck

**A local-first design-token auditor for cleaner design-to-development handoffs.** TokenCheck reads a JSON token file, resolves common `{path.to.token}` aliases, flags missing values and inconsistent names, finds repeated color values, and lets you compare two color tokens against WCAG contrast thresholds.

It is intentionally focused: TokenCheck audits token data; it does not replace a design-system manager, render a website, or claim to validate every design-token format.

## Why TokenCheck?

Designers often hand off token exports that look structurally correct but contain broken aliases, duplicate colors, missing values, or naming drift. Those issues become harder to trace after tokens are wired into components. TokenCheck adds a quick, repeatable review step before handoff.

## Features in this MVP

- Import JSON by pasting, browsing, or dropping a local file.
- Read nested token groups with DTCG-style `$type` / `$value` and Token Studio-style `type` / `value` leaves.
- Resolve simple aliases such as `{color.brand.primary}` and report unresolved references or cycles.
- Flag missing values, invalid values on color-typed tokens, and non-kebab-case path segments.
- Find repeated normalized color values.
- Compare any two parsed opaque colors and calculate WCAG contrast ratios for AA/AAA normal and large text thresholds.
- Export the audit as JSON or CSV.
- Keep source files in the browser; there is no upload endpoint, account, analytics SDK, API key, or runtime dependency.

## Quick start

Requirements: Node.js 18 or newer.

```bash
git clone https://github.com/akhilalladi-code/tokencheck.git
cd tokencheck
npm run dev
```

Open <http://localhost:4179>.

You can also serve the folder with any static HTTP server. A local server is recommended because the app loads its sample JSON using `fetch()` and uses JavaScript modules.

## How to use

1. Open TokenCheck and paste a JSON token document, or choose a `.json` file.
2. Select **Run audit**. The sample button loads a small example containing both valid and intentionally problematic tokens.
3. Review errors first, then warnings. Use the token inventory to inspect each source path, source value, and resolved value.
4. In **Color contrast**, select a foreground and background token to inspect the ratio and WCAG threshold results.
5. Export JSON for a machine-readable report or CSV for a spreadsheet review.

## Supported input shape

TokenCheck recursively reads JSON objects. A token leaf can use either `$value` or `value`; `$type` / `type` can be inherited from a parent group.

```json
{
  "color": {
    "$type": "color",
    "brand": {
      "primary": { "$value": "#0B5D4A" },
      "on-primary": { "$value": "{color.brand.primary}" }
    }
  }
}
```

The MVP resolves a whole-value alias in `{path.to.token}` form. It does not yet resolve composite values containing embedded aliases, cross-file references, or every extension used by individual token tools.

## Checks and interpretation

| Check | Result |
| --- | --- |
| Missing value | Error |
| Unresolved alias or alias cycle | Error |
| Invalid value on a color-typed token | Error |
| Non-lowercase-kebab-case path segment | Warning |
| Duplicate normalized color value | Warning |
| Contrast below WCAG thresholds | Displayed in the contrast panel; it is not a token-structure error |

Supported color syntax is opaque `#RGB`, `#RRGGBB`, `rgb(r, g, b)`, and `rgba(r, g, b, 1)`. Alpha blending, named colors, HSL, gradients, color spaces, and perceptual color-difference checks are not included. Contrast ratios follow the WCAG relative-luminance formula for opaque sRGB colors. The contrast panel checks only the pair selected by the user; it cannot infer which tokens are actually used together in a UI.

The parser accepts common DTCG-style and Token Studio-style leaf fields, but this is not a claim of full conformance to either specification. Test a real export from your exact tool/version before relying on it in production.

## Publish with GitHub Pages

The app is a static site and is prepared for a project-page URL. To publish it:

1. Open **Settings → Pages** in this repository.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select branch `main` and folder `/(root)`, then save.
4. After GitHub finishes its Pages deployment, open <https://akhilalladi-code.github.io/tokencheck/>.

The HTML uses relative asset paths and the repository includes `.nojekyll`, so the app can run from the `/tokencheck/` project subpath. GitHub Pages must still be enabled in repository settings before that public URL becomes available.

## Quality checks

```bash
npm test
npm run check
```

Tests use Node's built-in test runner. There are no package dependencies to install.

## Privacy and security

- JSON is read with the browser File API or from the text area; files are not sent to a server.
- The app does not persist imported tokens in local storage.
- Do not paste confidential client tokens into a browser profile or device you do not control.
- Exported reports contain token paths and values; store them with the same care as the source file.
- See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## Project structure

```text
tokencheck/
├── .github/workflows/ci.yml
├── samples/tokens.json
├── scripts/check.mjs
├── src/
│   ├── app.js
│   ├── core.js
│   └── styles.css
├── tests/core.test.js
├── index.html
├── server.mjs
├── package.json
├── LICENSE
└── README.md
```

## Roadmap

- [ ] Add a documented import adapter for more token-export variants.
- [ ] Add optional user-defined naming rules and semantic token conventions.
- [ ] Add composite-value reference detection and richer alias diagnostics.
- [ ] Add a downloadable HTML report and batch-file comparison.

These are proposed improvements, not implemented features.

## License

MIT. See [LICENSE](LICENSE).
