# Format support and integration

TokenCheck is a static, local-first utility. It does not require an API key or a server-side token store.

## Current adapter
Nested JSON token leaves may use $value / $type or value / type. Parent token types are inherited. Whole-value aliases in {path.to.token} form are resolved within one document.

Checks include required values, unresolved aliases and cycles, kebab-case naming, opaque hex/RGB colors, duplicate and near-duplicate colors, and basic value-shape checks for dimension, number, fontWeight, duration and cubicBezier.

## Boundaries
This is not a formal full DTCG conformance implementation. Composite objects are preserved; nested aliases are flagged for manual review, not substituted. Cross-file references, vendor extensions, alpha compositing, perceptual color distance and every token type's full grammar are not covered.

## Consumer CI
Copy .github/workflows/tokencheck-consumer.example.yml into a consuming repository and set TOKEN_FILE to its JSON token path. The workflow checks out TokenCheck separately and runs its CLI.
