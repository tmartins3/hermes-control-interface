const { execFile } = require('child_process');

function parseTimeoutMs(timeout) {
  if (typeof timeout === 'number' && Number.isFinite(timeout)) return Math.max(0, timeout);
  const raw = String(timeout || '8000').trim();
  const match = raw.match(/^(\d+(?:\.\d+)?)(ms|s|m)?$/i);
  if (!match) return 8000;
  const value = Number(match[1]);
  const unit = (match[2] || 'ms').toLowerCase();
  if (unit === 'm') return Math.round(value * 60_000);
  if (unit === 's') return Math.round(value * 1_000);
  return Math.round(value);
}

function shell(cmd, timeout = '8s') {
  return new Promise((resolve) => {
    execFile('bash', ['-lc', `${cmd} 2>&1`], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024,
      timeout: parseTimeoutMs(timeout),
    }, (err, stdout, stderr) => {
      if (err?.killed || err?.signal === 'SIGTERM') {
        resolve('');
        return;
      }
      resolve(`${stdout || ''}${stderr || ''}`);
    });
  });
}

module.exports = {
  parseTimeoutMs,
  shell,
};
