import test from 'node:test';
import assert from 'node:assert/strict';
import {auditAdvanced,compareAudits,exportCss,exportTailwind,exportHtmlReport} from '../src/advanced.js';
test('validates declared dimension values',()=>{const r=auditAdvanced({space:{$type:'dimension',good:{$value:'8px'},bad:{$value:'wide'}}});assert.ok(r.issues.some(i=>i.code==='invalid-token-type'&&i.path==='space.bad'));});
test('detects near duplicate colors',()=>{const r=auditAdvanced({color:{a:{$value:'#101010'},b:{$value:'#111111'},c:{$value:'#FFFFFF'}}});assert.ok(r.issues.some(i=>i.code==='near-duplicate-color'));});
test('exports CSS Tailwind and standalone HTML',()=>{const a=auditAdvanced({color:{brand:{$value:'#123456'}}});assert.match(exportCss(a),/--color-brand: #123456/);assert.match(exportTailwind(a),/theme/);assert.match(exportHtmlReport(a),/TokenCheck audit/);});
test('compares token versions',()=>{const a=auditAdvanced({color:{old:{$value:'#000'},keep:{$value:'#fff'}}}),b=auditAdvanced({color:{new:{$value:'#f00'},keep:{$value:'#eee'}}}),d=compareAudits(a,b);assert.equal(d.added.length,1);assert.equal(d.removed.length,1);assert.equal(d.changed.length,1);});
