const test = require('node:test');
const assert = require('node:assert/strict');

async function load() {
  return await import('../src/js/route-utils.mjs');
}

test('routeFromHash returns page from URL hash', async () => {
  const { routeFromHash } = await load();
  assert.deepEqual(routeFromHash('#usage'), { page: 'usage', params: {} });
});

test('routeFromHash preserves slash parameter for detail pages', async () => {
  const { routeFromHash } = await load();
  assert.deepEqual(routeFromHash('#agent-detail/default'), { page: 'agent-detail', params: { name: 'default' } });
});

test('routeFromHash falls back to home for empty hash', async () => {
  const { routeFromHash } = await load();
  assert.deepEqual(routeFromHash(''), { page: 'home', params: {} });
});
