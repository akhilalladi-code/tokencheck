import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4179/',{waitUntil:'networkidle'});
 await page.locator('#results').waitFor({state:'visible'});
 assert.ok((await page.locator('#token-count').innerText()).includes('tokens'));
 assert.equal(await page.locator('#export-css').count(),1);
 await page.locator('#json-input').fill(JSON.stringify({color:{$type:'color',brand:{$value:'#123456'},near:{$value:'#123457'}}}));
 await page.locator('#analyze-button').click();
 await page.locator('#results').waitFor({state:'visible'});
 assert.ok((await page.locator('#summary').innerText()).includes('2'));
 const downloadPromise=page.waitForEvent('download');
 await page.locator('#export-css').click();
 const download=await downloadPromise;
 assert.ok(download.suggestedFilename().endsWith('.css'));
 await page.locator('#compare-file').setInputFiles({name:'previous.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({color:{old:{$value:'#000000'}}}))});
 await page.locator('#compare-result').getByText(/Version comparison/).waitFor();
 assert.deepEqual(errors,[]);
 console.log('Chromium smoke test passed: app load, audit, CSS export, version comparison.');
} finally {await browser.close();}
