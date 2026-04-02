// tests/safeParseJSON.test.js
// Run with: node tests/safeParseJSON.test.js
'use strict';
const assert = require('assert');

// ── safeParseJSON (copied from background.js — pure function, no browser APIs) ──
function safeParseJSON(text, fallback) {
  try {
    const cleaned = text.replace(/```json\b|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (_) {
    const firstBracket = text.indexOf('[');
    const firstBrace   = text.indexOf('{');
    const start =
      firstBracket === -1 ? firstBrace :
      firstBrace   === -1 ? firstBracket :
      Math.min(firstBracket, firstBrace);
    if (start === -1) return fallback;

    const open  = text[start];
    const close = open === '[' ? ']' : '}';
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (escape)             { escape = false; continue; }
      if (ch === '\\')        { escape = true;  continue; }
      if (ch === '"')         { inString = !inString; continue; }
      if (inString)           continue;
      if (ch === open)        depth++;
      else if (ch === close)  depth--;
      if (depth === 0) {
        try { return JSON.parse(text.slice(start, i + 1)); } catch (_) {}
        break;
      }
    }
    return fallback;
  }
}

// ── test harness ──
let pass = 0, fail = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    pass++;
  } catch (e) {
    console.error(`  ✗ ${name}: ${e.message}`);
    fail++;
  }
}

console.log('safeParseJSON');

test('parses a clean JSON array', () => {
  assert.deepStrictEqual(safeParseJSON('["IFRS 9", "IAS 32"]', []), ['IFRS 9', 'IAS 32']);
});

test('parses a clean JSON object', () => {
  assert.deepStrictEqual(
    safeParseJSON('{"standards":["IFRS 9"],"topic":"classification","hint":"See IFRS 9."}', {}),
    { standards: ['IFRS 9'], topic: 'classification', hint: 'See IFRS 9.' }
  );
});

test('strips markdown code fences before parsing', () => {
  assert.deepStrictEqual(
    safeParseJSON('```json\n["IFRS 16"]\n```', []),
    ['IFRS 16']
  );
});

test('extracts JSON array preceded by prose', () => {
  assert.deepStrictEqual(
    safeParseJSON('Sure! Here you go: ["IAS 36", "IFRS 3"] Hope that helps.', []),
    ['IAS 36', 'IFRS 3']
  );
});

test('handles nested arrays/objects without truncation', () => {
  const input = 'Result: [{"id":1,"tags":["a","b"]},{"id":2,"tags":["c"]}]';
  assert.deepStrictEqual(safeParseJSON(input, []), [
    { id: 1, tags: ['a', 'b'] },
    { id: 2, tags: ['c'] },
  ]);
});

test('handles escaped quotes inside strings', () => {
  assert.deepStrictEqual(
    safeParseJSON('["He said \\"hello\\""]', []),
    ['He said "hello"']
  );
});

test('returns fallback for empty string', () => {
  assert.deepStrictEqual(safeParseJSON('', []), []);
});

test('returns fallback for plain prose with no JSON', () => {
  assert.deepStrictEqual(safeParseJSON('No relevant standards found.', []), []);
});

test('returns fallback for malformed JSON', () => {
  assert.deepStrictEqual(safeParseJSON('[unclosed', null), null);
});

test('returns fallback for object with missing value', () => {
  assert.deepStrictEqual(safeParseJSON('{bad json}', null), null);
});

// ── summary ──
console.log('');
if (fail > 0) {
  console.error(`${fail} test(s) failed, ${pass} passed`);
  process.exit(1);
} else {
  console.log(`${pass} test(s) passed`);
}
