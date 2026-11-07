import { auditTokens, contrastRatio, contrastGrade, toCsv } from './core.js';
import { auditAdvanced } from './advanced.js';

const $ = (selector) => document.querySelector(selector);
const input = $('#json-input');
const heroVideo = document.querySelector('.hero__video');
if (heroVideo) {
  heroVideo.addEventListener('canplay', () => heroVideo.classList.add('is-ready'), { once: true });
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    heroVideo.pause();
    heroVideo.classList.add('is-ready');
  }
  heroVideo.addEventListener('error', () => heroVideo.classList.remove('is-ready'));
}
let latest = null;
let sample = '';
let activeFilter = 'all';
let highlightedPath = '';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const copyText = async (value) => {
  try {
    await navigator.clipboard.writeText(String(value ?? ''));
    status('Copied to clipboard.', 'success');
  } catch {
    status('Clipboard access was blocked by this browser.', 'error');
  }
};
function status(message, kind = '') {
  const node = $('#status-message');
  node.textContent = message;
  node.className = 'status-message ' + kind;
}
function download(name, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function bestContrastPair(colors) {
  let best = null;
  for (let i = 0; i < colors.length; i += 1) {
    for (let j = i + 1; j < colors.length; j += 1) {
      const ratio = contrastRatio(colors[i].color, colors[j].color);
      if (!best || ratio > best.ratio) best = { first: colors[i], second: colors[j], ratio };
    }
  }
  return best;
}
function updateContrast() {
  if (!latest) return;
  const fg = latest.tokens.find((t) => t.path === $('#foreground').value);
  const bg = latest.tokens.find((t) => t.path === $('#background').value);
  if (!fg?.color || !bg?.color) {
    $('#contrast-result').textContent = 'Choose two valid color tokens.';
    return;
  }
  const ratio = contrastRatio(fg.color, bg.color);
  const grade = contrastGrade(ratio);
  const checks = [['AA normal', grade.aaNormal], ['AA large', grade.aaLarge], ['AAA normal', grade.aaaNormal], ['AAA large', grade.aaaLarge]];
  $('#contrast-result').innerHTML = '<div class="contrast-score"><strong>' + ratio.toFixed(2) + ':1</strong><span>Contrast ratio</span></div><div class="grade-grid">' + checks.map(([name, pass]) => '<span class="' + (pass ? 'pass' : 'fail') + '">' + (pass ? '✓' : '×') + ' ' + name + '</span>').join('') + '</div>';
}
function renderSummary(audit) {
  $('#summary').innerHTML = [
    ['TOKENS FOUND', audit.summary.total, 'stat-total'],
    ['COLOR TOKENS', audit.summary.colors, 'stat-colors'],
    ['ERRORS', audit.summary.errors, 'stat-error'],
    ['WARNINGS', audit.summary.warnings, 'stat-warn']
  ].map(([label, value, cls], index) => '<div class="stat ' + cls + '" style="--stat-index:' + index + '"><span>' + label + '</span><strong>' + value + '</strong><i></i></div>').join('');
}
function renderIssues(audit) {
  const errors = audit.issues.filter((issue) => issue.severity === 'error').length;
  const warnings = audit.issues.filter((issue) => issue.severity === 'warning').length;
  $('#all-count').textContent = audit.issues.length;
  $('#error-count').textContent = errors;
  $('#warning-count').textContent = warnings;
  $('#finding-count').textContent = audit.issues.length + ' to review';
  document.querySelectorAll('[data-filter]').forEach((button) => button.classList.toggle('active', button.dataset.filter === activeFilter));
  const filtered = audit.issues.filter((issue) => activeFilter === 'all' || issue.severity === activeFilter);
  $('#issues').innerHTML = filtered.length ? filtered.map((issue, index) =>
    '<button type="button" class="issue issue-' + issue.severity + '" data-issue-path="' + escapeHtml(issue.path) + '" style="--issue-index:' + index + '">' +
      '<span class="issue-badge">' + issue.severity.toUpperCase() + '</span>' +
      '<span class="issue-copy"><strong>' + escapeHtml(issue.path || 'Document') + '</strong><span>' + escapeHtml(issue.message) + '</span></span>' +
      '<span class="issue-meta"><code>' + escapeHtml(issue.code) + '</code><b>↗</b></span>' +
    '</button>'
  ).join('') : '<div class="empty-state">' + (audit.issues.length ? 'Nothing in this filter. Nice work.' : 'No issues found. Your token file passed these checks.') + '</div>';
}
function renderInventory() {
  if (!latest) return;
  const query = $('#token-search').value.trim().toLowerCase();
  const sort = $('#token-sort').value;
  const issueCounts = new Map();
  latest.issues.forEach((issue) => issueCounts.set(issue.path, (issueCounts.get(issue.path) || 0) + 1));
  const tokens = latest.tokens.filter((token) => [token.path, token.type, token.value, token.resolvedValue, token.color, token.resolution].join(' ').toLowerCase().includes(query));
  tokens.sort((a, b) => {
    if (sort === 'path-desc') return b.path.localeCompare(a.path);
    if (sort === 'type-asc') return (a.type || '').localeCompare(b.type || '') || a.path.localeCompare(b.path);
    if (sort === 'issues-desc') return (issueCounts.get(b.path) || 0) - (issueCounts.get(a.path) || 0) || a.path.localeCompare(b.path);
    return a.path.localeCompare(b.path);
  });
  $('#visible-count').textContent = tokens.length + ' / ' + latest.tokens.length + ' shown';
  $('#token-table-body').innerHTML = tokens.length ? tokens.map((token) => {
    const value = typeof token.value === 'object' ? JSON.stringify(token.value) : token.value;
    const resolved = token.resolvedValue ?? '—';
    const colorCell = token.color
      ? '<span class="swatch" style="--swatch:' + token.color + '"></span><span>' + token.color + '</span>'
      : '<span class="state-pill state-' + escapeHtml(token.resolution) + '">' + escapeHtml(token.resolution) + '</span>';
    return '<tr data-token-path="' + escapeHtml(token.path) + '" class="' + (highlightedPath === token.path ? 'row-highlight' : '') + '">' +
      '<td><span class="cell-with-copy"><code>' + escapeHtml(token.path) + '</code><button class="copy-button" type="button" data-copy="' + escapeHtml(token.path) + '" aria-label="Copy token path" title="Copy path">⧉</button></span></td>' +
      '<td><span class="type-pill">' + escapeHtml(token.type || '—') + '</span></td>' +
      '<td><code>' + escapeHtml(value) + '</code></td>' +
      '<td><span class="cell-with-copy"><code>' + escapeHtml(resolved) + '</code><button class="copy-button" type="button" data-copy="' + escapeHtml(resolved) + '" aria-label="Copy resolved value" title="Copy value">⧉</button></span></td>' +
      '<td><span class="color-cell">' + colorCell + '</span></td></tr>';
  }).join('') : '<tr><td colspan="5" class="no-results">No tokens match your search. Try another term.</td></tr>';
}
function renderDesignPreview(audit) {
  const colors=audit.tokens.filter(t=>t.color);
  const typed=audit.tokens.filter(t=>/dimension|font|typography/i.test(t.type||''));
  const colorCards=colors.slice(0,36).map(t=>'<article class="preview-swatch"><span style="--preview-color:'+t.color+'"></span><strong>'+escapeHtml(t.path)+'</strong><code>'+t.color+'</code></article>').join('');
  const typeCards=typed.slice(0,12).map(t=>'<article class="preview-type"><span>'+escapeHtml(t.type||'token')+'</span><strong>'+escapeHtml(t.resolvedValue??t.value??'—')+'</strong><code>'+escapeHtml(t.path)+'</code></article>').join('');
  $('#preview-content').innerHTML=(colorCards?'<div class="preview-swatch-grid">'+colorCards+'</div>':'<p>No valid color tokens found.</p>')+(typeCards?'<div class="preview-type-grid">'+typeCards+'</div>':'');
}
function render(audit) {
  latest = audit;
  highlightedPath = '';
  activeFilter = 'all';
  $('#results').hidden = false;
  renderSummary(audit);
  renderIssues(audit);
  $('#token-count').textContent = audit.tokens.length + ' token' + (audit.tokens.length === 1 ? '' : 's');
  $('#token-search').value = '';
  $('#token-sort').value = 'path-asc';
  renderInventory();

  const colors = audit.tokens.filter((token) => token.color);
  const options = colors.map((token) => '<option value="' + escapeHtml(token.path) + '">' + escapeHtml(token.path) + ' · ' + token.color + '</option>').join('');
  $('#foreground').innerHTML = options;
  $('#background').innerHTML = options;
  const pair = bestContrastPair(colors);
  if (pair) {
    $('#foreground').value = pair.first.color === pair.second.color ? pair.first.path : pair.first.path;
    $('#background').value = pair.second.path;
    updateContrast();
  } else {
    $('#contrast-result').textContent = 'Add at least two valid color tokens to compare contrast.';
  }
}
function analyze() {
  const audit = auditAdvanced(input.value);
  if (!audit.ok) {
    latest = null;
    $('#results').hidden = true;
    status('Could not parse JSON: ' + audit.parseError, 'error');
    return;
  }
  render(audit);
  const findings = audit.summary.errors + audit.summary.warnings;
  status('Audit complete · ' + audit.summary.total + ' tokens inspected · ' + findings + ' finding' + (findings === 1 ? '' : 's') + ' to review.', '');
}
function focusToken(path) {
  if (!path) return;
  highlightedPath = path;
  $('#token-search').value = '';
  renderInventory();
  const row = document.querySelector('[data-token-path="' + CSS.escape(path) + '"]');
  if (row) {
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.classList.add('row-highlight');
  }
}
$('#analyze-button').addEventListener('click', analyze);
$('#sample-button').addEventListener('click', () => { input.value = sample; analyze(); });
$('#clear-button').addEventListener('click', () => {
  input.value = ''; latest = null; $('#results').hidden = true;
  status('Paste a token JSON file or load the sample to begin.');
});
$('#browse-button').addEventListener('click', () => $('#file-input').click());
$('#file-input').addEventListener('change', async (event) => {
  const file = event.target.files?.[0]; if (!file) return;
  try { input.value = await file.text(); analyze(); status('Loaded ' + file.name + ' · ' + (latest?.summary.total || 0) + ' tokens inspected.', ''); }
  catch { status('The selected file could not be read as text.', 'error'); }
  event.target.value = '';
});
$('#foreground').addEventListener('change', updateContrast);
$('#background').addEventListener('change', updateContrast);
$('#export-json').addEventListener('click', () => latest && download('tokencheck-report.json', JSON.stringify({ generatedAt: new Date().toISOString(), ...latest }, null, 2), 'application/json'));
$('#export-csv').addEventListener('click', () => latest && download('tokencheck-report.csv', toCsv(latest), 'text/csv;charset=utf-8'));
$('#issues').addEventListener('click', (event) => {
  const button = event.target.closest('[data-issue-path]');
  if (button) focusToken(button.dataset.issuePath);
});
document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => {
  activeFilter = button.dataset.filter;
  if (latest) renderIssues(latest);
}));
$('#token-search').addEventListener('input', renderInventory);
$('#token-sort').addEventListener('change', renderInventory);
$('#token-table-body').addEventListener('click', (event) => {
  const button = event.target.closest('[data-copy]');
  if (button) copyText(button.dataset.copy);
});
const drop = $('#drop-zone');
for (const eventName of ['dragenter', 'dragover']) drop.addEventListener(eventName, (event) => { event.preventDefault(); drop.classList.add('dragging'); });
for (const eventName of ['dragleave', 'drop']) drop.addEventListener(eventName, (event) => { event.preventDefault(); drop.classList.remove('dragging'); });
drop.addEventListener('drop', async (event) => {
  const file = event.dataTransfer.files?.[0]; if (!file) return;
  if (!file.name.toLowerCase().endsWith('.json')) { status('Please drop a .json file.', 'error'); return; }
  try { input.value = await file.text(); analyze(); status('Loaded ' + file.name + ' · ' + (latest?.summary.total || 0) + ' tokens inspected.', ''); }
  catch { status('The dropped file could not be read as text.', 'error'); }
});
try {
  sample = await fetch('./samples/tokens.json').then((response) => {
    if (!response.ok) throw new Error('Sample unavailable');
    return response.text();
  });
} catch {
  sample = '{"color":{"$type":"color","brand":{"primary":{"$value":"#0B5D4A"},"surface":{"$value":"#FFFFFF"}}}}';
}
input.value = sample;
analyze();

$('#export-css')?.addEventListener('click',async()=>{if(!latest)return;const m=await import('./advanced.js');download('tokencheck-tokens.css',m.exportCss(latest),'text/css;charset=utf-8');});
$('#export-tailwind')?.addEventListener('click',async()=>{if(!latest)return;const m=await import('./advanced.js');download('tokencheck-tailwind.config.js',m.exportTailwind(latest),'text/javascript;charset=utf-8');});
$('#export-report')?.addEventListener('click',async()=>{if(!latest)return;const m=await import('./advanced.js');download('tokencheck-audit-report.html',m.exportHtmlReport(latest),'text/html;charset=utf-8');});
$('#compare-file')?.addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file||!latest)return;try{const old=auditTokens(await file.text());if(!old.ok)throw new Error(old.parseError);const m=await import('./advanced.js'),d=m.compareAudits(old,latest);$('#compare-result').innerHTML='<strong>Version comparison</strong><div class="compare-metrics"><span>+'+d.added.length+' added</span><span>−'+d.removed.length+' removed</span><span>'+d.changed.length+' changed</span><span>'+d.unchanged+' unchanged</span></div><p>Compared '+String(file.name).replace(/[&<>"]/g,'')+' with the current editor contents.</p>';status('Comparison complete · '+(d.added.length+d.removed.length+d.changed.length)+' changes found.','success');}catch(error){status('Could not compare file: '+error.message,'error');}event.target.value='';});
