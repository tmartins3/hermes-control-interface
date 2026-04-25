function summarizeGatewayService({ profile, port, apiReachable, configExists, platform }) {
  const isDarwin = platform === 'darwin';
  const active = Boolean(apiReachable);
  const enabled = Boolean(configExists && port);
  const manager = isDarwin ? 'launchd' : 'systemd';
  const service = isDarwin
    ? 'ai.hermes.gateway'
    : (profile === 'default' ? 'hermes-gateway' : `hermes-gateway-${profile}`);

  return {
    ok: true,
    profile,
    service,
    active,
    enabled,
    status: active
      ? `Gateway API reachable on 127.0.0.1:${port}`
      : (port ? `Gateway API not reachable on 127.0.0.1:${port}` : 'Gateway API port not configured'),
    manager,
  };
}

module.exports = { summarizeGatewayService };
