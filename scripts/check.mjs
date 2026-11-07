import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const required = ['id="json-input"', 'id="analyze-button"', 'id="results"', 'src="./src/app.js"', 'href="./src/styles.css"'];
const missing = required.filter(fragment => !html.includes(fragment));
if (missing.length) {
  console.error(`HTML check failed. Missing: ${missing.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log('HTML structure check passed.');
}
