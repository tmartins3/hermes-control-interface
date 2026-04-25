# Tomas macOS / current-Hermes compatibility patch set

This branch preserves local compatibility fixes for running `xaspx/hermes-control-interface` on Tomas's macOS Hermes environment.

## Scope

These changes are HCI-only. They do not modify Hermes Agent itself.

## Main fixes preserved here

- Load `.env` from the HCI application directory so LaunchAgent working-directory differences do not break configuration.
- Replace the GNU `timeout` shell wrapper with a Node `execFile(..., { timeout })` helper that works on macOS.
- Use Node/macOS-compatible CPU/RAM stats and portable `df -h /` disk formatting.
- Parse current rich `hermes status` output for model/provider/gateway/platform data.
- Parse current `hermes skills browse` and `hermes skills list` rich table output.
- Filter raw internal chat transcript rows from normal Chat rendering, especially tool-result rows and reasoning-only placeholders.
- Parse current `hermes profile list` rows robustly, including long generated profile names and active `◆` markers.
- When creating/cloning an agent profile, assign a unique `platforms.api_server.port` instead of duplicating the source profile's port.
- On macOS gateway health checks, use `lsof -nP -iTCP:$PORT -sTCP:LISTEN` as a fallback because `ss` is normally unavailable.
- Make gateway service UI launchd-aware and avoid showing Start/Stop/Restart buttons on macOS until launchd service-management routes are implemented.

## Validation

Before pushing/updating this branch, run:

```bash
npm test
npm run build
launchctl kickstart -k gui/$(id -u)/ai.hermes.control-interface
python3 - <<'PY'
import urllib.request
with urllib.request.urlopen('http://127.0.0.1:10272/api/health', timeout=5) as r:
    print(r.status, r.read().decode())
PY
```

Expected health output includes:

```json
{"ok":true,"title":"Hermes Control Interface","auth":true,"ws":"/ws"}
```

## Updating for a new upstream HCI release

```bash
cd ~/.hermes/control-interface
git fetch upstream
git checkout tomas-macos-hermes-compat
git rebase upstream/main
npm test
npm run build
launchctl kickstart -k gui/$(id -u)/ai.hermes.control-interface
```

If rebase conflicts occur, keep the upstream implementation where it now handles the same issue correctly; otherwise preserve the macOS/current-Hermes compatibility behavior described above.

## Security notes

Do not commit `.env`, HCI auth/user files, cookies, API keys, passwords, or generated tokens.

The local LaunchAgent wrapper `run-hci.sh` contains machine-specific paths but no credentials.
