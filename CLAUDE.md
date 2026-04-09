# Kong JWT Demo — Claude Context

## What this is
A self-contained Docker Compose proof of concept demonstrating Kong API Gateway enforcing JWT validation. Built for client demos.

## Services
| Service | Port | Notes |
|---|---|---|
| `web` | 3000 | Static React UI served by nginx — no build step |
| `kong` | 8000 | DB-less Kong, config lives entirely in `kong/kong.yml` |
| `kong-admin` | 8001 | Kong admin API — useful for inspection |
| `api` | internal | Node.js/Express — not exposed directly, only reachable via Kong |

## Running
```bash
docker compose up --build
```
After changes to `kong/kong.yml`: `docker compose restart kong` (no rebuild needed).

## Key design decisions
- **Kong is DB-less** — all config is declarative in `kong/kong.yml`. No Postgres, no migrations.
- **API has no auth code** — Kong handles all JWT validation. The API trusts `X-Consumer-*` and `X-JWT-Claims-*` headers Kong injects.
- **JWT issuance is in the Node API** (`/auth/login`) — this is a demo stand-in for a real IdP (Auth0, Keycloak, etc.). The `iss` claim and signing secret must match the consumer credential in `kong/kong.yml`.
- **CORS plugin is global** in `kong.yml` — it must be global (not per-route) because preflight OPTIONS requests need to be handled before route-level plugins run. All routes also include `OPTIONS` in their methods list for the same reason.

## Demo accounts
| Username | Password | Role |
|---|---|---|
| alice | password123 | admin |
| bob | letmein | viewer |

## Shared secret
Kong and the Node API share `demo-secret-change-in-production`. In production this would come from a secrets manager, not hardcoded config.

## Gotchas encountered
- **CORS preflight (OPTIONS) returning 404** — Kong route `methods` lists must include `OPTIONS`, and the CORS plugin must be global, not per-route.
