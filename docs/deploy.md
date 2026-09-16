# Deployment

CVSpark deploys itself. The repository owns its images, its stack file, its DNS
records and its pipeline; `koklo-infra` only provides the shared VPS20 host
(Docker, Traefik with the `cloudflare` certresolver, the `traefik-public`
network, the `devops` user with the CI key, the GHCR login, and `/opt/apps`).

## Pipeline

`.github/workflows/deploy.yml` runs on every push to `develop` (→ staging) and
`main` (→ production):

1. **build** — pushes `ghcr.io/josias-koffi/cvspark-{web,landing,api,puppeteer}`
   tagged with the short commit sha (plus the branch name, and `latest` on main).
2. **tofu** — `tofu plan` on `infra/terraform/`, then `apply` only when the plan
   reports changes. The plan is printed in the job summary.
3. **deploy** — renders `.env` from the environment's secrets, copies it with
   `infra/compose/docker-compose.yml` to `/opt/apps/<stack>/`, backs up Postgres,
   pulls (3 attempts) and runs `docker compose up -d --wait`, then smoke-tests
   the three public URLs.

`workflow_dispatch` takes an `environment` and an optional `image_tag`, which is
how you redeploy or **roll back**: pick the short sha of a previous build.

## Environments

| | staging | production |
|---|---|---|
| stack dir | `/opt/apps/cvspark-staging` | `/opt/apps/cvspark` |
| landing | `cvspark-staging.koklo.dev` | `cvspark.koklo.dev` |
| app (web) | `cvspark-app-staging.koklo.dev` | `cvspark-app.koklo.dev` |
| api | `cvspark-api-staging.koklo.dev` | `cvspark-api.koklo.dev` |
| volumes | `cvspark-staging_*` | `cvforge_*` (legacy names, kept on purpose) |

Production volumes keep their `cvforge_` prefix so the existing data survives the
rename; `VOLUME_PREFIX` in the workflow pins it.

Set `AUTH_COOKIE_NAME=cvspark_staging_session` as a staging environment variable,
otherwise staging and production share a session cookie on `.koklo.dev`.

## Required GitHub configuration

Repository secrets: `VPS20_IP`, `SSH_PRIVATE_KEY` (the shared CI key trusted by
`devops` on VPS20), `CF_API_TOKEN`, `CF_ZONE_ID`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`
(`https://<account_id>.r2.cloudflarestorage.com`).
Repository variable: `SSH_USER` (`devops`).

Per-environment (`staging`, `production`) secrets: `POSTGRES_PASSWORD`,
`MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `OPENROUTER_API_KEY`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `AUTH_SESSION_SECRET`,
`SMTP_USER`, `SMTP_PASSWORD`, `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` (fixed value,
or every redeploy invalidates in-flight server actions).
Per-environment variables: `COOKIE_DOMAIN`, `AUTH_COOKIE_NAME`, `SMTP_PROVIDER`,
`SMTP_SERVER`, `SMTP_PORT`, `EMAIL_FROM`, `OPENROUTER_MODEL`,
`INTERVIEW_STT_MODEL`, `INTERVIEW_AI_MODEL`, and optionally `POSTGRES_DB` /
`POSTGRES_USER` (both default to `cvforge`, matching the existing database).

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
3. **Production cutover** — the old stack still runs from
   `/opt/koklo/stacks/cvforge` on the *same* volumes. Stop it **before** the
   first production deploy, otherwise two Postgres containers write to the same
   volume:
   ```bash
   ssh devops@<VPS20_IP> 'cd /opt/koklo/stacks/cvforge && docker compose down'
   ```
   Deploy staging first and check it, then production.

## Operations

- Logs: `ssh devops@<VPS20_IP> 'cd /opt/apps/cvspark && docker compose logs -f api'`
- Backups: nightly `pg_dump` in the `cvforge_db_backups` volume (7 daily, 4
  weekly, 6 monthly) plus a pre-deploy dump in `/opt/apps/<stack>/backups/` (last
  10 kept). **Both live on the VPS only** — copy them off-site for real
  durability.
- The API stores its state as JSON files in the `api_data` volume
  (`/workspace/.data`), not in Postgres. Never recreate that volume.
