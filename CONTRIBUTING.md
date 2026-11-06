# Contributing

Thanks for helping improve TokenCheck.

## Local setup

- Node.js 18 or newer
- No third-party dependencies are required

```bash
npm test
npm run check
npm run dev
```

## Contribution guidelines

- Keep imported token data local to the browser.
- Do not add analytics, telemetry, or remote upload behavior without an explicit, documented opt-in design.
- Keep the core parser independent from the DOM so it can be tested with Node.
- Add tests for parser, alias, color, and reporting changes.
- Document unsupported formats and edge cases honestly.
- Avoid claiming full DTCG or Token Studio conformance unless the relevant specification cases are tested.

## Pull requests

Describe the problem, the expected behavior, the input format affected, and the tests you ran. Include a small anonymized JSON fixture when it clarifies a parser change.
