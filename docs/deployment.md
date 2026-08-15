# Deployment Architecture

This document describes the supported multi-bridge deployment shape and the operator workflow. Keep
deployment targets in the ignored `.deploy-web-targets` file and other environment-specific notes
in the ignored `docs/deployment.local.md` file.

## Runtime Shape

The browser connects directly to every enabled bridge. The portal serves the Web UI; it does not
proxy API or WebSocket traffic to the other hosts.

```text
Browser
  |-- portal bridge: static Web UI and optional local Herdr session
  |-- development bridge A: Herdr API and terminal WebSockets
  `-- development bridge B: Herdr API and terminal WebSockets
```

Every bridge must run on the same host as the Herdr socket it controls. A bridge cannot control a
remote Herdr daemon through the browser multi-host feature.

## Cross-Origin Contract

The page-serving portal must allow the browser to connect to every remote bridge:

```text
--allow-connect-origin http://bridge-a.example:8787
--allow-connect-origin http://bridge-b.example:8787
```

Each remote bridge must accept browser requests from the portal origin:

```text
--allow-host bridge-a.example
--allow-origin http://portal.example:8788
```

`--allow-connect-origin` expands the portal Content Security Policy for HTTP and WebSocket traffic.
`--allow-origin` controls cross-origin requests received by a bridge. Both directions are required.

## Filesystem Layout

For a system service, use a versioned installation with a stable `current` symlink:

```text
/opt/herdr-web/
  current -> vX.Y.Z
  vX.Y.Z/
    bin/herdr-web
    bin/herdr-web-bridge
    share/herdr-web/web/
```

For a user-owned Herdr session, use:

```text
~/.local/share/herdr-web/vX.Y.Z/
~/.local/share/herdr-web/web -> vX.Y.Z/share/herdr-web/web
~/.local/bin/herdr-web
~/.local/bin/herdr-web-bridge
```

Set `HOME` explicitly in systemd services so Herdr and herdr-web use their documented locations:

```text
~/.config/herdr/
  herdr.sock
  herdr-client.sock
  herdr-server.log
  herdr-web.log
  .plugins.lock

~/.local/share/herdr-web/
  notes/
  agent-pins/
  uploads/
```

## Service Model

The portal host may run Herdr and herdr-web as systemd services. Start Herdr first and point the
bridge at its socket:

```ini
[Service]
Environment=HOME=/root
Environment=HERDR_SOCKET_PATH=/root/.config/herdr/herdr.sock
```

Developer machines without systemd may run `herdr-web` in a dedicated Herdr tab. Detaching the
Herdr client leaves the bridge process running for the lifetime of the Herdr server.

## Web-Only Deployment

When changes are limited to the Web UI, use the focused check:

```bash
npm run check:web
```

List deployment targets in `.deploy-web-targets`, one pipe-delimited target per line:

```text
local|||/absolute/path/share/herdr-web/web|http://bridge.example:8787
ssh|user@bridge.example|22|/absolute/path/share/herdr-web/web|http://bridge.example:8787
```

Deploy an existing build with `npm run deploy:web`, or check and deploy in one command:

```bash
npm run ship:web
```

The script uses `rsync --delay-updates --delete-delay`, creates no deployment backup, and verifies
that every served `index.html` matches the local build. The bridge normally reads static files per
request, so a Web-only deployment does not require a bridge restart. If users always open only the
portal URL, the private target list can contain only that portal.

## Bridge Deployment

Changes under `bridge/` or `vendor/herdr-compat/` require rebuilding and replacing the bridge binary
on every affected host. Run the full checks before deployment:

```bash
npm run vendor:check
npm run lint
npm run test
npm run build
```

Build on the oldest supported glibc host, use a compatible build environment, or produce a suitable
static binary. A binary built on a newer Linux distribution may not start on an older glibc host.

## Verification

For each bridge:

```bash
curl -fsS http://HOST:PORT/api/capabilities
curl -fsS http://HOST:PORT/api/snapshot
curl -fsS http://HOST:PORT/ | sha256sum
```

For multi-bridge deployments, also test requests with the portal `Origin` header and confirm the
portal CSP contains every remote HTTP and WebSocket origin.

## Rollback

The fast Web path does not retain a deployment backup. To roll it back, check out or rebuild a known
good revision and run `npm run deploy:web` again. For a full package deployment, repoint `current`
to the previous version and restart the bridge service or Herdr tab.

## Security

herdr-web does not provide full browser authentication. Anyone who can reach an allowed bridge may
be able to read terminals, send input, create shells, upload files, and mutate Herdr state. Restrict
access with a trusted network, firewall or ACL, VPN, or an authenticated reverse proxy. Do not commit
private host inventory to a public repository.
