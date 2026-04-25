const test = require('node:test');
const assert = require('node:assert/strict');

const { parseHermesProfileList, assignUniqueGatewayPort } = require('../lib/hermes-profiles');

test('parseHermesProfileList handles long profile names that overflow fixed-width Profile column', () => {
  const raw = `Profile          Model                        Gateway      Alias
 ───────────────    ───────────────────────────    ───────────    ────────────
 ◆default         gpt-5.4                      running      —
  hciqa_0425085156 gpt-5.4                      stopped      hciqa_0425085156
`;

  assert.deepEqual(parseHermesProfileList(raw), [
    { name: 'default', model: 'gpt-5.4', gateway: 'running', alias: null, active: true },
    { name: 'hciqa_0425085156', model: 'gpt-5.4', gateway: 'stopped', alias: 'hciqa_0425085156', active: false },
  ]);
});

test('assignUniqueGatewayPort rewrites a cloned duplicate api_server port', () => {
  const cfg = {
    platforms: {
      api_server: {
        enabled: true,
        extra: { host: '127.0.0.1', port: 8642, key: 'keep', cors_origins: 'http://127.0.0.1:10272' },
      },
    },
  };

  const changed = assignUniqueGatewayPort(cfg, new Set([8642, 8650]), { start: 8650 });

  assert.equal(changed, true);
  assert.equal(cfg.platforms.api_server.extra.port, 8651);
  assert.equal(cfg.platforms.api_server.extra.key, 'keep');
});

test('assignUniqueGatewayPort initializes missing api_server config', () => {
  const cfg = {};
  const changed = assignUniqueGatewayPort(cfg, new Set([8650]), { start: 8650, key: 'gateway-key', corsOrigins: 'http://127.0.0.1:10272' });

  assert.equal(changed, true);
  assert.deepEqual(cfg.platforms.api_server, {
    enabled: true,
    extra: {
      host: '127.0.0.1',
      port: 8651,
      key: 'gateway-key',
      cors_origins: 'http://127.0.0.1:10272',
    },
  });
});
