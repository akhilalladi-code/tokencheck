const META_KEYS = new Set([
  '$type', 'type', '$description', 'description', '$schema', '$extensions', 'extensions', '$deprecated'
]);

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function normalizePath(path) {
  return path.filter(Boolean).join('.');
}

function collectTokens(document) {
  const tokens = [];

  function visit(node, path, inheritedType = '') {
    if (node && typeof node === 'object' && !Array.isArray(node)) {
      const type = String(node.$type ?? node.type ?? inheritedType ?? '');
      const valueKey = hasOwn(node, '$value') ? '$value' : (hasOwn(node, 'value') ? 'value' : null);
      if (valueKey) {
        tokens.push({ path: normalizePath(path), type, value: node[valueKey], source: valueKey });
        return;
      }

      const childKeys = Object.keys(node).filter(key => !META_KEYS.has(key));
      if (childKeys.length === 0 && path.length > 0 && (node.$type || node.type)) {
        tokens.push({ path: normalizePath(path), type, value: undefined, source: null });
        return;
      }
      for (const key of childKeys) visit(node[key], [...path, key], type);
      return;
    }

    if (path.length > 0) {
      tokens.push({ path: normalizePath(path), type: inheritedType, value: node, source: 'value' });
    }
  }

  visit(document, []);
  return tokens;
}

export function parseColor(input) {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  let match = value.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (match) {
    const hex = match[1].length === 3
      ? match[1].split('').map(char => char + char).join('')
      : match[1];
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      hex: `#${hex.toUpperCase()}`
    };
  }

  match = value.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(\d*\.?\d+)\s*)?\)$/i);
  if (match) {
    const [, r, g, b, alpha] = match;
    const channels = [Number(r), Number(g), Number(b)];
    if (channels.some(channel => channel > 255) || (alpha !== undefined && Number(alpha) !== 1)) return null;
    return { r: channels[0], g: channels[1], b: channels[2], hex: `#${channels.map(channel => channel.toString(16).padStart(2, '0')).join('').toUpperCase()}` };
  }
  return null;
}

function isColorToken(token) {
  return /color/i.test(token.type) || /(^|\.)colou?rs?(\.|$)/i.test(token.path) || Boolean(parseColor(String(token.value ?? '')));
}

function resolveAliases(tokens) {
  const byPath = new Map(tokens.map(token => [token.path, token]));
  const state = new Map();

  function resolve(token, stack = []) {
    if (state.has(token.path)) return state.get(token.path);
    if (stack.includes(token.path)) return { status: 'cycle', value: null, target: null };
    if (typeof token.value !== 'string') {
      const result = { status: token.value === undefined ? 'missing' : 'value', value: token.value, target: null };
      state.set(token.path, result);
      return result;
    }

    const alias = token.value.trim().match(/^\{\s*([^{}]+?)\s*\}$/);
    if (!alias) {
      const result = { status: 'value', value: token.value, target: null };
      state.set(token.path, result);
      return result;
    }

    const targetPath = alias[1].replace(/^\./, '');
    const target = byPath.get(targetPath);
    if (!target) {
      const result = { status: 'unresolved', value: null, target: targetPath };
      state.set(token.path, result);
      return result;
    }
    const nested = resolve(target, [...stack, token.path]);
    const result = nested.status === 'cycle'
      ? { status: 'cycle', value: null, target: targetPath }
      : nested.status === 'unresolved' || nested.status === 'missing'
        ? { status: 'unresolved', value: null, target: targetPath }
        : { status: 'alias', value: nested.value, target: targetPath };
    state.set(token.path, result);
    return result;
  }

  return new Map(tokens.map(token => [token.path, resolve(token)]));
}

function isValidSegment(segment) {
  return /^(?:[a-z][a-z0-9]*(?:-[a-z0-9]+)*|\d+)$/i.test(segment) && segment === segment.toLowerCase() && !segment.includes('_');
}

export function auditTokens(input) {
  let document;
  try {
    document = typeof input === 'string' ? JSON.parse(input) : input;
  } catch (error) {
    return { ok: false, parseError: error.message, tokens: [], issues: [], summary: { total: 0, colors: 0, errors: 1, warnings: 0 } };
  }
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    return { ok: false, parseError: 'The root value must be a JSON object.', tokens: [], issues: [], summary: { total: 0, colors: 0, errors: 1, warnings: 0 } };
  }

  const tokens = collectTokens(document);
  const resolutions = resolveAliases(tokens);
  const issues = [];
  const audited = tokens.map(token => {
    const resolution = resolutions.get(token.path);
    const resolvedValue = resolution?.value;
    const color = parseColor(String(resolvedValue ?? ''));
    const colorLike = isColorToken(token);
    const segments = token.path.split('.');

    if (token.value === undefined || token.value === null || token.value === '') {
      issues.push({ severity: 'error', code: 'missing-value', path: token.path, message: 'Token has no value.' });
    }
    if (segments.some(segment => !isValidSegment(segment))) {
      issues.push({ severity: 'warning', code: 'naming', path: token.path, message: 'Use lowercase kebab-case path segments (for example, color.brand-primary.500).' });
    }
    if (resolution?.status === 'unresolved') {
      issues.push({ severity: 'error', code: 'unresolved-alias', path: token.path, message: `Alias target “${resolution.target}” could not be resolved.` });
    }
    if (resolution?.status === 'cycle') {
      issues.push({ severity: 'error', code: 'alias-cycle', path: token.path, message: 'Alias cycle detected. Review the token references in this chain.' });
    }
    if (colorLike && resolution?.status !== 'unresolved' && resolution?.status !== 'cycle' && !color) {
      issues.push({ severity: 'error', code: 'invalid-color', path: token.path, message: 'Color token is not a supported opaque hex or rgb() value.' });
    }

    return { ...token, resolvedValue: resolvedValue ?? null, resolution: resolution?.status ?? 'missing', color: color?.hex ?? null, colorLike };
  });

  const colorGroups = new Map();
  for (const token of audited) {
    if (!token.color || token.resolution === 'alias') continue;
    const group = colorGroups.get(token.color) ?? [];
    group.push(token.path);
    colorGroups.set(token.color, group);
  }
  for (const [hex, paths] of colorGroups) {
    if (paths.length > 1) {
      for (const path of paths) {
        issues.push({ severity: 'warning', code: 'duplicate-color', path, message: `${hex} is also used by ${paths.filter(item => item !== path).join(', ')}.` });
      }
    }
  }

  issues.sort((a, b) => (a.severity === b.severity ? a.path.localeCompare(b.path) : a.severity === 'error' ? -1 : 1));
  const errors = issues.filter(issue => issue.severity === 'error').length;
  const warnings = issues.filter(issue => issue.severity === 'warning').length;
  return {
    ok: true,
    tokens: audited,
    issues,
    summary: {
      total: audited.length,
      colors: audited.filter(token => token.color).length,
      errors,
      warnings,
      duplicates: [...colorGroups.values()].filter(paths => paths.length > 1).length
    }
  };
}

function linearize(channel) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(color) {
  return 0.2126 * linearize(color.r) + 0.7152 * linearize(color.g) + 0.0722 * linearize(color.b);
}

export function contrastRatio(foreground, background) {
  const fg = typeof foreground === 'string' ? parseColor(foreground) : foreground;
  const bg = typeof background === 'string' ? parseColor(background) : background;
  if (!fg || !bg) throw new TypeError('Both colors must be supported opaque hex or rgb() values.');
  const values = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

export function contrastGrade(ratio) {
  return {
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
    aaaLarge: ratio >= 4.5
  };
}

export function toCsv(audit) {
  const quote = value => {
    const raw = String(value ?? '');
    // Prefix spreadsheet formula-leading cells to prevent CSV formula injection.
    const safe = /^[\u0000-\u0020]*[=+\-@]/.test(raw) ? "'" + raw : raw;
    return '"' + safe.replaceAll('"', '""') + '"';
  };
  const rows = [['path', 'type', 'value', 'resolved_value', 'color', 'resolution', 'issues']];
  for (const token of audit.tokens) {
    const tokenIssues = audit.issues.filter(issue => issue.path === token.path).map(issue => `${issue.severity}:${issue.code}`).join('; ');
    rows.push([token.path, token.type, token.value, token.resolvedValue, token.color, token.resolution, tokenIssues]);
  }
  return rows.map(row => row.map(quote).join(',')).join('\r\n');
}
