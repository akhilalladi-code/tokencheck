import test from 'node:test';
import assert from 'node:assert/strict';
import { auditTokens, parseColor, contrastRatio, contrastGrade, toCsv } from '../src/core.js';

const valid = {
  color: {
    $type: 'color',
    brand: {
      primary: { $value: '#0B5D4A' },
      alias: { $value: '{color.brand.primary}' },
      surface: { $value: '#FFFFFF' }
    }
  },
  spacing: { small: { $type: 'dimension', $value: '8px' } }
};

test('parses nested DTCG-style tokens and resolves aliases', () => {
  const result = auditTokens(valid);
  assert.equal(result.ok, true);
  assert.equal(result.summary.total, 4);
  assert.equal(result.tokens.find(token => token.path === 'color.brand.alias').resolvedValue, '#0B5D4A');
  assert.equal(result.tokens.find(token => token.path === 'color.brand.alias').resolution, 'alias');
});

test('supports Token Studio-style value fields', () => {
  const result = auditTokens({ palette: { primary: { type: 'color', value: '#123456' } } });
  assert.equal(result.tokens[0].color, '#123456');
});

test('reports unresolved aliases and alias cycles', () => {
  const result = auditTokens({
    color: {
      $type: 'color',
      first: { $value: '{color.second}' },
      second: { $value: '{color.first}' },
      missing: { $value: '{color.unknown}' }
    }
  });
  assert.ok(result.issues.some(issue => issue.code === 'alias-cycle'));
  assert.ok(result.issues.some(issue => issue.code === 'unresolved-alias'));
});

test('reports missing values, invalid color values and naming warnings', () => {
  const result = auditTokens({
    color: {
      $type: 'color',
      Brand_Primary: { $value: 'not-a-color' },
      empty: { $type: 'color' }
    }
  });
  assert.ok(result.issues.some(issue => issue.code === 'missing-value'));
  assert.ok(result.issues.some(issue => issue.code === 'invalid-color'));
  assert.ok(result.issues.some(issue => issue.code === 'naming'));
});

test('detects duplicate normalized color values', () => {
  const result = auditTokens({ color: { a: { $value: '#fff' }, b: { $value: '#FFFFFF' } } });
  assert.equal(result.summary.duplicates, 1);
  assert.equal(result.issues.filter(issue => issue.code === 'duplicate-color').length, 2);
});

test('parses hex and rgb colors', () => {
  assert.equal(parseColor('#abc').hex, '#AABBCC');
  assert.equal(parseColor('rgb(255, 255, 255)').hex, '#FFFFFF');
  assert.equal(parseColor('rgba(1, 2, 3, 0.5)'), null);
});

test('calculates WCAG contrast and grades thresholds', () => {
  assert.equal(contrastRatio('#000000', '#FFFFFF'), 21);
  assert.deepEqual(contrastGrade(4.5), { aaNormal: true, aaLarge: true, aaaNormal: false, aaaLarge: true });
});

test('returns a useful parse error for invalid JSON', () => {
  const result = auditTokens('{nope');
  assert.equal(result.ok, false);
  assert.ok(result.parseError);
});

test('exports a CSV with quoted cells', () => {
  const csv = toCsv(auditTokens(valid));
  assert.match(csv, /\"path\",\"type\",\"value\"/);
  assert.match(csv, /color\.brand\.primary/);
});
