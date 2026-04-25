function parseHermesProfileList(raw) {
  const lines = String(raw || '').split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean);
  const profiles = [];
  let seenHeader = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/profile\s+model\s+gateway/i.test(line)) {
      seenHeader = true;
      continue;
    }
    if (!seenHeader) continue;
    if (/^[\s─━\-▪▫·∙¤]+$/.test(rawLine)) continue;
    if (line.toLowerCase().includes('python-dotenv')) continue;
    if (/^next steps:/i.test(line)) break;

    const active = line.includes('◆');
    const cleaned = line.replace(/◆/g, '').trim();
    if (!cleaned) continue;

    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length < 3) continue;

    // Current Hermes profile tables are visually fixed-width. Long profile names can
    // overflow the Profile column, reducing the name/model separator to one space.
    // Parse from token positions instead of requiring 2+ spaces between columns.
    const [name, model, gateway, ...aliasParts] = parts;
    if (!name || /^profile$/i.test(name)) continue;
    const aliasText = aliasParts.join(' ').trim();
    profiles.push({
      name,
      model: model || '—',
      gateway: (gateway || '').toLowerCase(),
      alias: aliasText && aliasText !== '—' ? aliasText : null,
      active,
    });
  }

  return profiles;
}

function nextAvailablePort(usedPorts, start = 8650) {
  const used = new Set([...usedPorts].map((p) => Number(p)).filter(Number.isFinite));
  let port = Number(start) || 8650;
  while (used.has(port)) port += 1;
  return port;
}

function assignUniqueGatewayPort(cfg, usedPorts, options = {}) {
  if (!cfg || typeof cfg !== 'object') return false;
  const start = options.start || 8650;
  const used = new Set([...usedPorts].map((p) => Number(p)).filter(Number.isFinite));
  cfg.platforms = cfg.platforms || {};
  const apiServer = cfg.platforms.api_server || {};
  const extra = apiServer.extra || {};
  const currentPort = Number(extra.port);

  if (apiServer.enabled && currentPort && !used.has(currentPort)) {
    return false;
  }

  const port = nextAvailablePort(used, start);
  cfg.platforms.api_server = {
    ...apiServer,
    enabled: true,
    extra: {
      host: extra.host || '127.0.0.1',
      ...extra,
      port,
      key: extra.key || options.key || '',
      cors_origins: extra.cors_origins || options.corsOrigins || '',
    },
  };
  return true;
}

module.exports = {
  assignUniqueGatewayPort,
  nextAvailablePort,
  parseHermesProfileList,
};
