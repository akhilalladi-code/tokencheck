import {readFile,access} from 'node:fs/promises';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const required=['id="json-input"','id="analyze-button"','id="results"','id="export-css"','id="export-tailwind"','id="export-report"','id="compare-file"','src="./src/app.js"','href="./src/styles.css"'];
const missing=required.filter(x=>!html.includes(x));
for(const path of ['src/advanced.js','scripts/tokencheck.mjs','tests/advanced.test.js'])try{await access(new URL('../'+path,import.meta.url));}catch{missing.push(path);}
if(missing.length){console.error('Project check failed. Missing: '+missing.join(', '));process.exitCode=1;}else console.log('HTML structure and TokenCheck 2.0 files check passed.');
