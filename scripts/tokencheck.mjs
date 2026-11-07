#!/usr/bin/env node
import {readFile,writeFile} from 'node:fs/promises';
import {auditAdvanced,exportCss,exportTailwind} from '../src/advanced.js';
const args=process.argv.slice(2),file=args.find(x=>!x.startsWith('--'));
const opt=(k,d)=>{const i=args.indexOf(k);return i<0?d:(args[i+1]??d);};
if(!file){console.error('Usage: node scripts/tokencheck.mjs <tokens.json> [--format summary|json|css|tailwind] [--out file] [--fail-on error|warning]');process.exit(2);}
let audit;try{audit=auditAdvanced(await readFile(file,'utf8'));}catch(e){console.error(e.message);process.exit(2);}
if(!audit.ok){console.error('Invalid token JSON: '+audit.parseError);process.exit(2);}
const format=opt('--format','summary');let out;
if(format==='json')out=JSON.stringify({generatedAt:new Date().toISOString(),...audit},null,2);
else if(format==='css')out=exportCss(audit);
else if(format==='tailwind')out=exportTailwind(audit);
else out='TokenCheck audit: '+file+'\nTokens: '+audit.summary.total+'\nErrors: '+audit.summary.errors+'\nWarnings: '+audit.summary.warnings+'\n'+audit.issues.map(i=>'['+i.severity+'] '+i.code+' · '+i.path+' — '+i.message).join('\n');
const dest=opt('--out',null);if(dest)await writeFile(dest,out+'\n');else process.stdout.write(out+'\n');
const fail=opt('--fail-on','');if(fail==='error'&&audit.summary.errors>0)process.exitCode=1;if(fail==='warning'&&audit.issues.length>0)process.exitCode=1;
