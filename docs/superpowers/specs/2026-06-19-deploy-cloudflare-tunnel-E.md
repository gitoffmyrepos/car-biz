# Car-Biz Sub-project E — Deploy + Cloudflare Tunnel (runbook)

2026-06-19. Deploy car-biz to k8s and expose publicly via the existing Cloudflare
tunnel (same tunnel that fronts jenkins/gitea/plane), like the FX apps.

## What's DONE (autonomous)

- **Argo CI** builds car-biz images (sub-project A+B work): `23-car-biz-build-sensor`
  → `external-repo-kaniko-build` → harbor `car-biz-backend` / `car-biz-frontend:prod-latest`.
- Manual branch build submitted (git-ref `overhaul/fleet-redesign`) to populate harbor
  before the master-merge — validates the pipeline end-to-end.
- Deployment manifests repointed nexus → harbor.

## Cloudflare tunnel facts (discovered)

- Tunnel runs in a docker container on the **docker-host VM `192.168.119.246`**
  (`ssh -i ~/.ssh/strategybase-dev ubuntu@192.168.119.246`), compose dir
  `/home/ubuntu/migration-stacks/36`, container `36-cloudflared-1`.
- It is **token-managed** (`TUNNEL_TOKEN`, `cloudflared tunnel run`, no local config) →
  ingress public-hostname rules live in the **Cloudflare Zero Trust dashboard / API**,
  NOT a file on the host. Editing them needs a CF API token with **Tunnel:Edit + DNS:Edit**,
  or the dashboard. (The host connector token cannot edit ingress; the cert-manager
  CF token is DNS-01-scoped and off-limits.)
- **Tunnel ID: `ad079afd-e944-4a7b-bfd8-339e80b36e39`** (CNAME target
  `ad079afd-e944-4a7b-bfd8-339e80b36e39.cfargotunnel.com`).
- Existing origins point at the cluster gateway (kgateway VIP `192.168.119.240:443`,
  Host-preserved) — e.g. `jenkins.strategybase.io`.

## Public hostnames to add (operator-gated — CF dashboard or Tunnel:Edit token)

| Hostname | Service (origin) | Notes |
|---|---|---|
| `weekly-lease.strategybase.io` | `https://192.168.119.240:443` (kgateway) Host-preserved | → car-biz `frontend-service` via the k8s Ingress host rule |
| `api.weekly-lease.strategybase.io` | same origin | → car-biz `backend-service` |

DNS: CNAME both → `ad079afd-e944-4a7b-bfd8-339e80b36e39.cfargotunnel.com` (proxied).
The k8s Ingress (`04-ingress.yaml`) already host-routes both names to the right service.

## k8s deploy prerequisites (NOT yet in place)

The current `k8s/manifests/` deploys only backend + frontend. To run, it also needs:

1. **Namespace** `fx-weekly-lease-prod` (manifest 00 has it).
2. **Postgres** (`postgresql-service.fx-weekly-lease-prod`, db `fx_weekly_lease`) — NO manifest
   exists. Add a Postgres Deployment+PVC+Service (or point at a shared instance). Run alembic
   migrations (incl. `002` vehicle_images) on first boot.
3. **Redis** (`redis-service.fx-weekly-lease-prod`) — NO manifest exists. Add Redis
   Deployment+Service.
4. **MinIO** — reuses shared `minio.prod-forex` (exists). Needs the new public bucket
   `car-biz-vehicle-images` (backend `ensure_public_bucket` creates it at startup) + creds.
5. **Harbor pull secret** in the namespace (currently the manifest references a nexus
   registry secret — replace with a harbor `dockerconfigjson`).
6. **Vault secrets** `fx-weekly-lease/prod/{database,redis,vault,email,minio,oidc}`
   (external-secrets pulls these): DB + Redis passwords (generate), MinIO access/secret
   (reuse prod-forex bucket creds or a scoped key), email = **Proton SMTP** (sub-project C),
   oidc = Keycloak client.
7. **Keycloak realm** `fx-weekly-lease` + OIDC client (issuer
   `https://auth.strategybase.io/realms/fx-weekly-lease`) — for admin/login. The **public
   fleet + landing are no-auth and work without this**; only the admin/customer login needs it.

## Phasing (recommended)

- **E1 — public site live (no login):** stand up Postgres + Redis + harbor pull-secret +
  DB/Redis/MinIO Vault secrets → apply manifests → backend+frontend run → add the two CF
  public hostnames + DNS. Public marketing + fleet grid + car detail are live. Admin/login
  shows "auth unavailable" until E2.
- **E2 — auth:** create the Keycloak realm + client, populate the oidc + email secrets,
  enable admin/customer login + image-upload admin.

## Operator decisions needed

1. **Cloudflare access:** add the two public hostnames + DNS yourself in the Zero Trust
   dashboard, OR provide a CF API token (Tunnel:Edit + DNS:Edit) for me to script it.
2. **DBs:** dedicated Postgres/Redis in `fx-weekly-lease-prod` (recommended, matches the
   configmap) — confirm, and I'll author the manifests.
3. **MinIO creds** for car-biz (reuse prod-forex or mint a scoped key).
4. **Keycloak realm** (E2) — create it, or defer admin login.

## ArgoCD vs kubectl

Recommend a GitOps `Application` (like the other apps) sourcing `car-biz` repo
`k8s/manifests` so deploys stay declarative. Alternative: `kubectl apply -k k8s/manifests`
for a first manual bring-up.
