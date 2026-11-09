![TOKENCHECK — Diwali 2026](./assets/diwali-banner.svg)

<p align="center"><a href="https://akhilalladi-code.github.io/diwali-universe/"><strong>🪔 Explore Diwali Universe 2026 · Interactive celebration ↗</strong></a></p>

# TokenCheck 2.0

**A local-first design-token quality-control workspace.** Audit token JSON, inspect accessibility, compare versions and export developer-ready artifacts without uploading source files.

Live app: https://akhilalladi-code.github.io/tokencheck/

## Features
- Paste, browse or drag-and-drop JSON token files.
- Parse nested DTCG-shaped $type / $value and Token Studio-shaped type / value leaves.
- Resolve whole-value aliases; report unresolved references and cycles.
- Flag missing values, naming inconsistencies, invalid colors, selected token-type mismatches, duplicate and near-duplicate colors.
- Inspect WCAG contrast for selected color pairs.
- Search, sort and inspect token inventory; jump from findings to affected tokens.
- Compare an earlier JSON file with the current audit (added, removed, changed and unchanged).
- Export JSON, CSV, CSS custom properties, a Tailwind theme extension and a standalone HTML report.
- Run local CLI audits and consuming-repository CI checks.

## Local-first privacy
Token files are read in the browser or local Node process. There is no upload endpoint, account system, analytics SDK or remote token-processing service. Comparison reads files locally. Exported reports contain token paths and values; protect them like source files.

## Quick start
Requires Node.js 18+.
\`\`\`bash
git clone https://github.com/akhilalladi-code/tokencheck.git
cd tokencheck
npm run dev
\`\`\`
Open http://localhost:4179.

## CLI
\`\`\`bash
npm run audit -- samples/tokens.json
node scripts/tokencheck.mjs ./tokens.json --format json --out audit.json
node scripts/tokencheck.mjs ./tokens.json --format summary --fail-on error
\`\`\`
Formats: summary, json, css, tailwind. Exit code is non-zero for invalid JSON or when --fail-on threshold is reached.

## Compatibility boundaries
The parser accepts common nested DTCG-shaped and Token Studio-shaped JSON leaves. It resolves whole-value aliases within one document. Common dimension, number, fontWeight, duration and cubicBezier values receive basic shape checks. Composite-value references are flagged for manual review, not rewritten. This is a practical adapter, not complete formal DTCG conformance or support for every vendor extension. Near-color detection uses RGB distance, not Delta-E. Alpha blending, HSL, gradients and wide-gamut color spaces are not included in contrast calculations.

## Exports
JSON / CSV audit data; CSS variables; Tailwind theme extension; standalone HTML findings report. Review generated naming and framework conventions before production use.

## CI and quality checks
The CI workflow runs Node tests, static HTML checks and sample-token CLI validation. Consumer workflow example: .github/workflows/tokencheck-consumer.example.yml.
\`\`\`bash
npm test
npm run check
npm run validate
\`\`\`

Full formal DTCG conformance, composite alias substitution, perceptual color comparison, richer visual token editors, multi-file batch audits and cross-browser E2E tests remain future work.

MIT License.
