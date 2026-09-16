# CVSpark on Dokploy — OpenTofu module

Declares the CVSpark project, the compose stack that runs in it, and the three
public domains, on the Dokploy instance at `https://dokploy.ops.koklo.dev`.

> **Terraform owns these services in full.** `dokploy_compose` rewrites the
> whole configuration of a service on every apply. Anything you change in the
> Dokploy UI — the compose file, the environment variables, the domains — is
> silently replaced on the next apply. Every change goes through this repository.

**This module runs in CI only.** `.github/workflows/deploy.yml` applies it; there
is no `terraform.tfvars` and nothing to run on a workstation. The commands below
are for reading the state or for a break-glass apply.

## One environment per state

The module manages **one** environment, chosen by `var.environment`
(`production` or `staging`). Everything else is derived from it in `main.tf`:

| | `production` | `staging` |
|---|---|---|
| Dokploy project | `cvspark` | `cvspark-staging` |
| state key | `cvspark/dokploy-production.tfstate` | `cvspark/dokploy-staging.tfstate` |
| volume prefix | `cvforge` (legacy, kept on purpose) | `cvspark-staging` |
| cookie name | `cvspark_session` | `cvspark_staging_session` |
| landing | `cvspark.koklo.dev` | `cvspark-staging.koklo.dev` |
| app (web) | `cvspark-app.koklo.dev` | `cvspark-app-staging.koklo.dev` |
| api | `cvspark-api.koklo.dev` | `cvspark-api-staging.koklo.dev` |

That split is what lets the CI job keep `environment: staging|production` and
see only that environment's GitHub secrets. Two states share no resource, hence
one Dokploy *project* per environment rather than one project with two
environments.

## Layout

| File | Contents |
|---|---|
| `main.tf` | provider `vanillauys/dokploy ~> 1.0`, partial R2 backend, the derived locals |
| `variables.tf` | `environment`, image tag, application settings, the ten secrets |
| `project.tf` | `dokploy_project` |
| `compose.tf` | the `dokploy_compose` stack and its env block |
| `domain.tf` | the three `dokploy_domain` routes |
| `outputs.tf` | ids, status, public URLs |

There is no `application.tf` or `database.tf`. The stack is modelled as a single
compose service rather than as native Dokploy resources, because MinIO,
Puppeteer and the nightly `db_backup` sidecar have no native equivalent in the
provider. Postgres and Redis therefore stay inside the compose file next to them.

The compose YAML lives at `../compose/dokploy-stack.yml` and is shipped inline by
`raw.compose_file`, so Dokploy clones nothing and no GitHub App has to be
registered by hand.

## How CI applies it

The `deploy` job of `.github/workflows/deploy.yml` runs, per environment:

```sh
tofu init -backend-config="key=cvspark/dokploy-${ENVIRONMENT}.tfstate"
tofu plan -detailed-exitcode -out=tfplan     # published to the job summary
tofu apply tfplan                            # only when the plan has changes
```

The apply blocks until Dokploy reports a terminal deploy status
(`deployment_timeout`, 15 minutes by default), then a smoke test curls the three
public URLs.

Re-running with an unchanged image tag produces an empty plan and no redeploy,
which is the intended idempotence. To roll back, dispatch the workflow with the
short sha of an earlier build.

## Break-glass: applying by hand

```sh
export DOKPLOY_API_KEY="..."                 # UI > Settings > Profile > API/CLI Keys
export AWS_ENDPOINT_URL_S3="https://<account_id>.r2.cloudflarestorage.com"
export AWS_ACCESS_KEY_ID="..." AWS_SECRET_ACCESS_KEY="..."

export TF_VAR_environment=staging
export TF_VAR_image_tag=<short-sha>
export TF_VAR_postgres_password=... TF_VAR_minio_access_key=... # and the rest

tofu init -backend-config="key=cvspark/dokploy-staging.tfstate"
tofu plan
```

`tofu init -backend=false` is enough for `validate` and `fmt -check` without any
credentials.

**A rate-limited Dokploy key returns `401`, not `429`.** If an apply fails with
an authentication error on a key that works for single requests, its daily budget
is exhausted; generate a new one from the UI with *Enable Rate Limiting* off.
Waiting does not help — the window is 24 hours.

## Cutover risks

1. **Traefik.** Dokploy runs its own Traefik on ports 80/443. The pre-Dokploy
   stack routes through the `traefik-public` Traefik supplied by `koklo-infra`.
   Both cannot hold the same ports — settle this on VPS20 before the production
   apply.
2. **Two Postgres on one volume.** Production keeps `VOLUME_PREFIX=cvforge`, so
   the Dokploy stack attaches the very volumes the old stack uses. Stop the old
   stack (`cd /opt/apps/cvspark && docker compose down`) first, or two Postgres
   processes write to `cvforge_postgres_data`.
3. **The real data is `cvforge_api_data`.** The API persists JSON state files in
   `/workspace/.data`; there is no ORM and Postgres is effectively unused. Back
   that volume up before the cutover.
4. **No more pre-deploy `pg_dump`.** That step lived in the SSH job this module
   replaced. The nightly `db_backup` sidecar still runs, but it is on-VPS only.
   `dokploy_backup` + `dokploy_destination` would restore an off-site copy.

## Secrets and state

`dokploy_compose.env` is a plain string with no write-only (`_wo`) companion, so
**the application secrets are stored in the R2 state file**. The bucket is
private; treat the state as a secret. That is the price of a fully declarative
Dokploy.
