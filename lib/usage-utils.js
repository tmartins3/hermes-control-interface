function extractToolNamesFromToolCalls(raw) {
  if (!raw) return [];
  let parsed;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return [];
  }
  const calls = Array.isArray(parsed) ? parsed : [parsed];
  const names = [];
  for (const call of calls) {
    const name = call?.function?.name || call?.name || call?.tool_name;
    if (typeof name === 'string' && name.trim()) names.push(name.trim());
  }
  return names;
}

function summarizeTopTools(rows = [], limit = 5) {
  const counts = new Map();
  let total = 0;
  for (const row of rows || []) {
    const names = [];
    if (typeof row?.tool_name === 'string' && row.tool_name.trim()) names.push(row.tool_name.trim());
    names.push(...extractToolNamesFromToolCalls(row?.tool_calls));
    for (const name of names) {
      counts.set(name, (counts.get(name) || 0) + 1);
      total += 1;
    }
  }
  return Array.from(counts.entries())
    .map(([name, calls]) => ({ name, calls, pct: total > 0 ? ((calls / total) * 100).toFixed(1) + '%' : '0%' }))
    .sort((a, b) => b.calls - a.calls || a.name.localeCompare(b.name))
    .slice(0, limit);
}

module.exports = { extractToolNamesFromToolCalls, summarizeTopTools };
