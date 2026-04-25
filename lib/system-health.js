function formatBytesMiB(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return 'N/A';
  return `${Math.round(bytes / 1024 / 1024)}MB`;
}

function formatMemoryUsage(totalBytes, freeBytes) {
  if (!Number.isFinite(totalBytes) || totalBytes <= 0 || !Number.isFinite(freeBytes)) return 'N/A';
  const usedBytes = Math.max(0, totalBytes - Math.max(0, freeBytes));
  const percent = Math.round((usedBytes / totalBytes) * 100);
  return `${formatBytesMiB(usedBytes)}/${formatBytesMiB(totalBytes)} (${percent}%)`;
}

function normalizeDiskUsage(raw) {
  const value = String(raw || '').trim();
  return value || 'N/A';
}

function formatCpuLoad(osModule) {
  const load = osModule.loadavg?.()[0];
  const cpus = osModule.cpus?.().length || 1;
  if (!Number.isFinite(load)) return 'N/A';
  return `${Math.min(100, Math.max(0, Math.round((load / cpus) * 100)))}%`;
}

module.exports = {
  formatBytesMiB,
  formatMemoryUsage,
  normalizeDiskUsage,
  formatCpuLoad,
};
