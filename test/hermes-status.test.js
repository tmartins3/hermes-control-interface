const test = require('node:test');
const assert = require('node:assert/strict');

const { parseAgentStatus } = require('../lib/hermes-status');

test('parseAgentStatus reads current rich Hermes status output', () => {
  const raw = `
◆ Environment
  Model:        gpt-5.4
  Provider:     OpenAI Codex

◆ API Keys
  OpenAI        ✓ sk-p...xxxx
  Anthropic     ✓ sk-a...xxxx

◆ Messaging Platforms
  Telegram      ✓ configured (home: 1014551193)
  Discord       ✗ not configured
  WhatsApp      ✓ configured

◆ Gateway Service
  Status:       ✓ running
  Manager:      launchd
  PID(s):       52903

◆ Scheduled Jobs
  Jobs:         0

◆ Sessions
  Active:       1 session(s)
`;

  const status = parseAgentStatus(raw);

  assert.equal(status.model, 'gpt-5.4');
  assert.equal(status.provider, 'OpenAI Codex');
  assert.equal(status.gatewayStatus, 'running');
  assert.equal(status.activeSessions, 1);
  assert.equal(status.scheduledJobs, 0);
  assert.deepEqual(status.apiKeys, { active: 2, total: 2 });
  assert.deepEqual(status.platforms.map((p) => [p.name, p.configured]), [
    ['Telegram', true],
    ['Discord', false],
    ['WhatsApp', true],
  ]);
});
