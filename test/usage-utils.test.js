const test = require('node:test');
const assert = require('node:assert/strict');

const { extractToolNamesFromToolCalls, summarizeTopTools } = require('../lib/usage-utils');

test('extractToolNamesFromToolCalls reads OpenAI-style function names from message tool_calls JSON', () => {
  const raw = JSON.stringify([
    { type: 'function', function: { name: 'terminal', arguments: '{}' } },
    { type: 'function', function: { name: 'read_file', arguments: '{}' } },
  ]);

  assert.deepEqual(extractToolNamesFromToolCalls(raw), ['terminal', 'read_file']);
});

test('extractToolNamesFromToolCalls ignores malformed or empty tool_calls payloads', () => {
  assert.deepEqual(extractToolNamesFromToolCalls('not json'), []);
  assert.deepEqual(extractToolNamesFromToolCalls(''), []);
  assert.deepEqual(extractToolNamesFromToolCalls(JSON.stringify([{ type: 'message' }])), []);
});

test('summarizeTopTools aggregates tool_name and JSON tool_calls rows', () => {
  const rows = [
    { tool_name: 'terminal', tool_calls: null },
    { tool_name: '', tool_calls: JSON.stringify([{ function: { name: 'terminal' } }, { function: { name: 'read_file' } }]) },
    { tool_name: null, tool_calls: JSON.stringify([{ function: { name: 'terminal' } }]) },
  ];

  assert.deepEqual(summarizeTopTools(rows, 4).slice(0, 2), [
    { name: 'terminal', calls: 3, pct: '75.0%' },
    { name: 'read_file', calls: 1, pct: '25.0%' },
  ]);
});
