# Deployment

CVSpark deploys itself. The repository owns its images, its stack file, its DNS
records, its Dokploy configuration and its pipeline; `koklo-infra` only provides
the shared VPS20 host and the Dokploy instance at `https://dokploy.ops.koklo.dev`.

Everything runs in CI. Nothing is applied from a workstation.

## Pipeline

`.github/workflows/deploy.yml` runs on every push to `develop` (→ staging) and
`main` (→ production):

1. **build** — pushes `ghcr.io/josias-koffi/cvspark-{web,landing,api,puppeteer}`
   tagged with the short commit sha (plus the branch name, and `latest` on main).
2. **tofu** — `tofu plan` on `infra/terraform/` (Cloudflare DNS), then `apply`
   only when the plan reports changes. The plan is printed in the job summary.
3. **deploy** — `tofu apply` on `infra/dokploy/` against the target environment's
   state, which pushes the compose stack and its environment to Dokploy and
   blocks until the deploy reaches a terminal status; then smoke-tests the three
   public URLs.

`workflow_dispatch` takes an `environment` and an optional `image_tag`, which is
how you redeploy or **roll back**: pick the short sha of a previous build. A
re-run with an unchanged tag produces an empty plan and no redeploy.

## Environments

| | staging | production |
|---|---|---|
| Dokploy project | `cvspark-staging` | `cvspark` |
| Dokploy state | `cvspark/dokploy-staging.tfstate` | `cvspark/dokploy-production.tfstate` |
| landing | `cvspark-staging.koklo.dev` | `cvspark.koklo.dev` |
| app (web) | `cvspark-app-staging.koklo.dev` | `cvspark-app.koklo.dev` |
| api | `cvspark-api-staging.koklo.dev` | `cvspark-api.koklo.dev` |
| volumes | `cvspark-staging_*` | `cvforge_*` (legacy names, kept on purpose) |
| cookie name | `cvspark_staging_session` | `cvspark_session` |

One state per environment is what lets the deploy job keep
`environment: staging|production` and see only that environment's secrets. All of
the values above are derived from `var.environment` in `infra/dokploy/main.tf` —
they are no longer GitHub variables. See `infra/dokploy/README.md`.

## Required GitHub configuration

Repository secrets: `DOKPLOY_API_KEY`, `VPS20_IP` (the DNS record target),
`CF_API_TOKEN`, `CF_ZONE_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
`R2_ENDPOINT` (`https://<account_id>.r2.cloudflarestorage.com`).

Per-environment (`staging`, `production`) secrets — unchanged, and the only
per-environment configuration left: `POSTGRES_PASSWORD`, `MINIO_ACCESS_KEY`,
`MINIO_SECRET_KEY`, `OPENROUTER_API_KEY`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `AUTH_SESSION_SECRET`, `SMTP_USER`, `SMTP_PASSWORD`,
`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` (fixed value, or every redeploy invalidates
in-flight server actions).

Generate `DOKPLOY_API_KEY` from the Dokploy UI (*Settings > Profile > API/CLI
Keys > Generate New Key*) and leave **Enable Rate Limiting off**: a rate-limited
key answers `401`, not `429`, and the window is 24 hours.

No per-environment GitHub *variables* are needed any more. Domains, volume
prefixes, cookie names, model names and SMTP settings are now defaults in
`infra/dokploy/variables.tf` and `main.tf`. `SSH_PRIVATE_KEY` and `SSH_USER` are
no longer used by this workflow.

## One-time bootstrap

1. **R2 state bucket** — create the `koklo-tofu-state` bucket and an R2 token
   with read/write on it.
2. **Terraform** — locally, with the same env vars:
   ```bash
   cd infra/terraform
   export AWS_ACCESS_KEY_ID=… AWS_SECRET_ACCESS_KEY=… \
          AWS_ENDPOINT_URL_S3=https://<account_id>.r2.cloudflarestorage.com
   export TF_VAR_cf_api_token=… TF_VAR_cf_zone_id=… TF_VAR_vps20_ip=…
   tofu init
   tofu plan   # 6 records to create
   ```
   The legacy `cvforge*.koklo.dev` records stay in `koklo-infra` until the
   rename is complete, then they are deleted there.
3. **Traefik** — Dokploy runs its own Traefik on ports 80/443, and the
   pre-Dokploy stack routed through the `traefik-public` Traefik of
   `koklo-infra`. Only one of them can hold those ports. Settle this on VPS20
   before the first production apply.
4. **Production cutover** — the pre-Dokploy stack runs from `/opt/apps/cvspark`
   on the *same* volumes the Dokploy stack attaches (`VOLUME_PREFIX=cvforge`).
   Stop it **before** the first production deploy, otherwise two Postgres
   containers write to the same volume:
   ```bash
   ssh devops@<VPS20_IP> 'cd /opt/apps/cvspark && docker compose down'
   ```
   Back up `cvforge_api_data` first — that volume, not Postgres, holds the real
   data. Deploy staging and check it, then production.

## Operations

- Logs and shells: the Dokploy UI, per service, in the `cvspark` project.
- Backups: nightly `pg_dump` in the `cvforge_db_backups` volume (7 daily, 4
  weekly, 6 monthly). The pre-deploy dump disappeared with the SSH job; restoring
  an off-site copy means adding `dokploy_backup` + `dokploy_destination` to
  `infra/dokploy/`. **What remains lives on the VPS only** — copy it off-site for
  real durability.
- The API stores its state as JSON files in the `api_data` volume
  (`/workspace/.data`), not in Postgres. Never recreate that volume.
