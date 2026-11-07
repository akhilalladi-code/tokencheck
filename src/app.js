import { auditTokens, contrastRatio, contrastGrade, toCsv } from './core.js';
const $ = (selector) => document.querySelector(selector);
const input = $('#json-input');
let latest = null;
let sample = '';
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function status(message, kind = '') {
  const node = $('#status-message');
  node.textContent = message;
  node.className = `status-message ${kind}`;
}
function download(name, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function updateContrast() {
  if (!latest) return;
  const fg = latest.tokens.find((t) => t.path === $('#foreground').value);
  const bg = latest.tokens.find((t) => t.path === $('#background').value);
  if (!fg?.color || !bg?.color) { $('#contrast-result').textContent = 'Choose two valid color tokens.'; return; }
  const ratio = contrastRatio(fg.color, bg.color);
  const grade = contrastGrade(ratio);
  const checks = [['AA normal', grade.aaNormal], ['AA large', grade.aaLarge], ['AAA normal', grade.aaaNormal], ['AAA large', grade.aaaLarge]];
  $('#contrast-result').innerHTML = `<div class="contrast-score"><strong>${ratio.toFixed(2)}:1</strong><span>Contrast ratio</span></div><div class="grade-grid">${checks.map(([name, pass]) => `<span class="${pass ? 'pass' : 'fail'}">${pass ? '✓' : '×'} ${name}</span>`).join('')}</div>`;
}
function render(audit) {
  latest = audit;
  $('#results').hidden = false;
  $('#summary').innerHTML = [
    ['TOKENS FOUND', audit.summary.total, ''], ['COLOR TOKENS', audit.summary.colors, ''],
    ['ERRORS', audit.summary.errors, audit.summary.errors ? 'stat-error' : 'stat-good'],
    ['WARNINGS', audit.summary.warnings, audit.summary.warnings ? 'stat-warn' : 'stat-good']
  ].map(([label, value, cls]) => `<div class="stat ${cls}"><span>${label}</span><strong>${value}</strong></div>`).join('');
  $('#issues').innerHTML = audit.issues.length ? audit.issues.map((issue) => `<article class="issue issue-${issue.severity}"><span class="issue-badge">${issue.severity.toUpperCase()}</span><div><strong>${escapeHtml(issue.path || 'Document')}</strong><p>${escapeHtml(issue.message)}</p></div><code>${escapeHtml(issue.code)}</code></article>`).join('') : '<div class="empty-state">No issues found. Your token file passed these checks.</div>';
  $('#token-count').textContent = `${audit.tokens.length} token${audit.tokens.length === 1 ? '' : 's'}`;
  $('#token-table-body').innerHTML = audit.tokens.map((token) => `<tr><td><code>${escapeHtml(token.path)}</code></td><td>${escapeHtml(token.type || '—')}</td><td><code>${escapeHtml(typeof token.value === 'object' ? JSON.stringify(token.value) : token.value)}</code></td><td><code>${escapeHtml(token.resolvedValue ?? '—')}</code></td><td>${token.color ? `<span class="swatch" style="--swatch:${token.color}"></span>${token.color}` : escapeHtml(token.resolution)}</td></tr>`).join('');
  const colors = audit.tokens.filter((token) => token.color);
  const options = colors.map((token) => `<option value="${escapeHtml(token.path)}">${escapeHtml(token.path)} · ${token.color}</option>`).join('');
  $('#foreground').innerHTML = options; $('#background').innerHTML = options;
  if (colors.length > 1) { $('#foreground').selectedIndex = 0; $('#background').selectedIndex = 1; updateContrast(); }
  else $('#contrast-result').textContent = 'Add at least two valid color tokens to compare contrast.';
}
function analyze() {
  const audit = auditTokens(input.value);
  if (!audit.ok) { latest = null; $('#results').hidden = true; status(`Could not parse JSON: ${audit.parseError}`, 'error'); return; }
  render(audit);
  status(`Audit complete. ${audit.summary.total} token(s) inspected.`, audit.summary.errors ? 'error' : 'success');
}
$('#analyze-button').addEventListener('click', analyze);
$('#sample-button').addEventListener('click', () => { input.value = sample; analyze(); });
$('#clear-button').addEventListener('click', () => { input.value = ''; latest = null; $('#results').hidden = true; status('Paste a token JSON file or load the sample to begin.'); });
$('#browse-button').addEventListener('click', () => $('#file-input').click());
$('#file-input').addEventListener('change', async (event) => {
  const file = event.target.files?.[0]; if (!file) return;
  try { input.value = await file.text(); analyze(); status(`Loaded ${file.name}.`, 'success'); }
  catch { status('The selected file could not be read as text.', 'error'); }
  event.target.value = '';
});
$('#foreground').addEventListener('change', updateContrast);
$('#background').addEventListener('change', updateContrast);
$('#export-json').addEventListener('click', () => latest && download('tokencheck-report.json', JSON.stringify({ generatedAt: new Date().toISOString(), ...latest }, null, 2), 'application/json'));
$('#export-csv').addEventListener('click', () => latest && download('tokencheck-report.csv', toCsv(latest), 'text/csv;charset=utf-8'));
const drop = $('#drop-zone');
for (const eventName of ['dragenter', 'dragover']) drop.addEventListener(eventName, (event) => { event.preventDefault(); drop.classList.add('dragging'); });
for (const eventName of ['dragleave', 'drop']) drop.addEventListener(eventName, (event) => { event.preventDefault(); drop.classList.remove('dragging'); });
drop.addEventListener('drop', async (event) => {
  const file = event.dataTransfer.files?.[0]; if (!file) return;
  if (!file.name.toLowerCase().endsWith('.json')) { status('Please drop a .json file.', 'error'); return; }
  try { input.value = await file.text(); analyze(); status(`Loaded ${file.name}.`, 'success'); }
  catch { status('The dropped file could not be read as text.', 'error'); }
});
try { sample = await fetch('./samples/tokens.json').then((response) => { if (!response.ok) throw new Error('Sample unavailable'); return response.text(); }); }
catch { sample = '{"color":{"$type":"color","brand":{"primary":{"$value":"#0B5D4A"},"surface":{"$value":"#FFFFFF"}}}}'; }
input.value = sample;
analyze();
