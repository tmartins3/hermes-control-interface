const test = require('node:test');
const assert = require('node:assert/strict');

async function loadUtils() {
  return import('../src/js/chat-message-utils.mjs');
}

test('shouldRenderChatMessage hides raw tool result transcript rows', async () => {
  const { shouldRenderChatMessage } = await loadUtils();
  assert.equal(shouldRenderChatMessage({ role: 'tool', content: '{"success":true}' }), false);
});

test('shouldRenderChatMessage hides assistant rows that only contain reasoning', async () => {
  const { shouldRenderChatMessage } = await loadUtils();
  assert.equal(shouldRenderChatMessage({ role: 'assistant', content: '', reasoning: 'internal reasoning' }), false);
  assert.equal(shouldRenderChatMessage({ role: 'assistant', content: null, tool_calls: [{ name: 'skill_view' }] }), false);
});

test('shouldRenderChatMessage keeps normal user and assistant messages', async () => {
  const { shouldRenderChatMessage } = await loadUtils();
  assert.equal(shouldRenderChatMessage({ role: 'user', content: 'hello' }), true);
  assert.equal(shouldRenderChatMessage({ role: 'assistant', content: 'Final answer' }), true);
});
