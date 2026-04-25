const test = require('node:test');
const assert = require('node:assert/strict');

const { formatBytesMiB, formatMemoryUsage, normalizeDiskUsage } = require('../lib/system-health');

test('formatBytesMiB renders whole MiB values', () => {
  assert.equal(formatBytesMiB(1024 * 1024 * 1536), '1536MB');
});

test('formatMemoryUsage renders used/total and percent from Node os values', () => {
  assert.equal(formatMemoryUsage(8 * 1024 * 1024, 2 * 1024 * 1024), '6MB/8MB (75%)');
});

test('normalizeDiskUsage returns N/A for empty command output', () => {
  assert.equal(normalizeDiskUsage(''), 'N/A');
});

test('normalizeDiskUsage trims valid df output', () => {
  assert.equal(normalizeDiskUsage('123G/456G (27%)\n'), '123G/456G (27%)');
});
