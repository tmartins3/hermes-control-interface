const test = require('node:test');
const assert = require('node:assert/strict');

const { shell } = require('../lib/shell-utils');

test('shell runs commands without requiring GNU timeout on macOS', async () => {
  const output = await shell('printf ok', '1s');

  assert.equal(output, 'ok');
});

test('shell returns combined stdout and stderr when a command exits non-zero', async () => {
  const output = await shell('printf out; printf err >&2; exit 7', '1s');

  assert.match(output, /out/);
  assert.match(output, /err/);
});

test('shell enforces timeout using Node instead of a timeout executable', async () => {
  const started = Date.now();
  const output = await shell('sleep 2; printf late', '100ms');
  const elapsed = Date.now() - started;

  assert.equal(output, '');
  assert.ok(elapsed < 1500, `expected Node timeout before command completion, got ${elapsed}ms`);
});
