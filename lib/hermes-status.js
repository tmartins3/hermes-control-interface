function grabLabel(raw, label) {
  const re = new RegExp(`${label}:\\s*(?:[✓✗]\\s*)?(.+)`);
  const m = String(raw || '').match(re);
  return m ? m[1].trim() : '';
}

function parseSection(raw, sectionName) {
  const re = new RegExp(`◆\\s*${sectionName}\\n([\\s\\S]*?)(?:\\n◆|\\n──|$)`, 'i');
  const m = String(raw || '').match(re);
  return m ? m[1] : '';
}

function parseCheckRows(sectionText) {
  const rows = [];
  for (const line of String(sectionText || '').split('\n')) {
    const m = line.match(/^\s+(.+?)\s+(✓|✗)\s+(.+)$/);
    if (m) {
      rows.push({ name: m[1].trim(), ok: m[2] === '✓', detail: m[3].trim() });
    }
  }
  return rows;
}

function parseGatewayStatus(raw) {
  const gatewaySection = parseSection(raw, 'Gateway Service');
  const status = grabLabel(gatewaySection, 'Status').toLowerCase();
  if (/running|active/.test(status)) return 'running';
  if (/stopped|inactive|failed/.test(status)) return 'stopped';
  return 'unknown';
}

function parseAgentStatus(raw) {
  const apiRows = parseCheckRows(parseSection(raw, 'API Keys'));
  const platformRows = parseCheckRows(parseSection(raw, 'Messaging Platforms'));
  const activeSessions = grabLabel(raw, 'Active').match(/\d+/)?.[0] || '0';
  const scheduledJobs = grabLabel(raw, 'Jobs').match(/\d+/)?.[0] || '0';

  return {
    model: grabLabel(raw, 'Model'),
    provider: grabLabel(raw, 'Provider'),
    gatewayStatus: parseGatewayStatus(raw),
    activeSessions: parseInt(activeSessions, 10) || 0,
    scheduledJobs: parseInt(scheduledJobs, 10) || 0,
    apiKeys: {
      active: apiRows.filter((row) => row.ok).length,
      total: apiRows.length,
    },
    platforms: platformRows.map((row) => ({
      name: row.name,
      configured: row.ok,
      detail: row.detail,
    })),
    authProviders: parseCheckRows(parseSection(raw, 'Auth Providers')).map((row) => ({
      name: row.name,
      loggedIn: row.ok,
      detail: row.detail,
    })),
  };
}

module.exports = {
  grabLabel,
  parseAgentStatus,
  parseGatewayStatus,
  parseSection,
};
