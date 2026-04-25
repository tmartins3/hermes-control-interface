const test = require('node:test');
const assert = require('node:assert/strict');
const { summarizeGatewayService } = require('../lib/gateway-status');

test('summarizeGatewayService treats reachable Gateway API as running on macOS/launchd', () => {
  assert.deepEqual(summarizeGatewayService({ profile: 'default', port: 8642, apiReachable: true, configExists: true, platform: 'darwin' }), {
    ok: true,
    profile: 'default',
    service: 'ai.hermes.gateway',
    active: true,
    enabled: true,
    status: 'Gateway API reachable on 127.0.0.1:8642',
    manager: 'launchd',
  });
});

test('summarizeGatewayService reports stopped when no port/api is available', () => {
  const s = summarizeGatewayService({ profile: 'worker', port: null, apiReachable: false, configExists: false, platform: 'darwin' });
  assert.equal(s.active, false);
  assert.equal(s.enabled, false);
  assert.equal(s.manager, 'launchd');
});
