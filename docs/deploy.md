# Deployment

Jobspark is deployed by the [josias-koffi/infra](https://github.com/josias-koffi/infra)
platform. This repository owns its images, its stack file
(`infra/compose/dokploy-stack.yml`), its DNS records (`infra/terraform`) and
**one manifest**, [`.deploy/manifest.yaml`](../.deploy/manifest.yaml), which
describes the Dokploy project, its environments, domains, variables, secrets
and backups. The platform turns it into Dokploy resources.

## Pipeline

`.github/workflows/deploy-platform.yml` carries no rule of its own: the manifest
decides (`environments.<env>.branch` and `deploy: auto|manual`).

| Event | Effect |
|---|---|
| push on `develop` | build the 4 images (short sha) → boot the API image against a disposable Postgres → deploy **staging** → assert the served version |
| push on `main` | nothing: production is `deploy: manual` |
| *Actions → Deploy → Run workflow* from `main` | deploy **production** (refused from any other branch) |
| same, with `image_tag` | redeploy an existing tag: promote the staging tag, or **roll back** |
| same, with `plan_only` | show the plan, apply nothing |

Promote staging to production: merge `develop` → `main`, then *Run workflow* on
`main` with `image_tag` = the staging tag (no rebuild).

The deploy job (reusable, in the platform) validates the manifest, plans, refuses
any plan that would destroy the stack or a volume, applies, and smoke-tests the
domains. `verify-version` then checks that `/health` (api) and `/version` (web)
serve the deployed tag.

## Environments

| | staging | production |
|---|---|---|
| Dokploy | project `jobspark`, environment `staging` | project `jobspark`, environment `production` |
| compose (appName) | `jobspark-staging-rdzqb4` | `cvspark-vxlxow` |
| platform state | `apps/jobspark/staging.tfstate` | `apps/jobspark/production.tfstate` |
| landing | `jobspark-staging.koklo.dev` | `jobspark.koklo.dev` |
| app (web) | `jobspark-app-staging.koklo.dev` | `jobspark-app.koklo.dev` |
| api | `jobspark-api-staging.koklo.dev` | `jobspark-api.koklo.dev` |
| volumes (`external`) | `cvspark-staging_*` (legacy names, kept on purpose) | `jobspark_*` |
| cookie name | `jobspark_staging_session` | `jobspark_session` |

All these values live in `.deploy/manifest.yaml`. The volumes are declared
`external: true` by the platform: a wrong `volumePrefix` fails the deploy
instead of starting on empty volumes, and deleting the compose cannot delete
them.

## Required GitHub configuration

Repository variables: `DOKPLOY_URL`, `TF_STATE_BUCKET`. Repository secrets:
`DOKPLOY_API_KEY`, `VPS20_IP` (the DNS record target), `CF_API_TOKEN`,
`CF_ZONE_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`
(`https://<account_id>.r2.cloudflarestorage.com`).

Per-environment (`staging`, `production`) secrets — unchanged, and the only
per-environment configuration left: `POSTGRES_PASSWORD`, `MINIO_ACCESS_KEY`,
`MINIO_SECRET_KEY`, `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `AUTH_SESSION_SECRET`, `SMTP_USER`, `SMTP_PASSWORD`,
`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` (fixed value, or every redeploy invalidates
in-flight server actions), `ALERT_EMAIL` (restore-check alerts), `R2_BACKUP_ACCESS_KEY_ID`,
`R2_BACKUP_SECRET_ACCESS_KEY` (read-only use by `r2_fetch`). The list is the
`secrets` / `optionalSecrets` of the manifest.

Optional, per environment: `OPENROUTER_MANAGEMENT_API_KEY`. It enables balance
supervision — the OpenRouter balance on `/admin/metrics`, the low-balance alert
to every admin, and the guard that refuses to sell credits the provider can no
longer honour. It must be a **management** key, created at
<https://openrouter.ai/settings/management-keys>: the inference key above gets a
403 on `/credits`, and a management key cannot run completions, so the two are
never interchangeable. Left unset, the deploy succeeds and supervision stays
inert (no balance shown, no alert, purchases unaffected). The two thresholds,
`OPENROUTER_BALANCE_ALERT_THRESHOLD` (default 5) and
`OPENROUTER_BALANCE_CRITICAL_THRESHOLD` (default 0, so a sale is refused only
once the account is empty), are non-secret defaults in
`.deploy/manifest.yaml` and only need overriding to change them.

Optional, per environment: `FRANCE_TRAVAIL_CLIENT_ID` and
`FRANCE_TRAVAIL_CLIENT_SECRET`, the credentials of an application declared on
<https://francetravail.io> and subscribed to *Offres d'emploi v2*. They feed the
daily offer collection. Left unset, the deploy succeeds and the source stays
inert — the collection then calls nothing and the offer database stays empty.

The same key serves every France Travail API (ADR-024). `FRANCE_TRAVAIL_APIS`
lists the ones actually subscribed, comma-separated (default: `offres`); an API
left out is never called. Check one with `ft:smoke <api>` (`ft:smoke:built` in
the container) before adding it: an `invalid_scope` there means it is not
subscribed, or its scope differs from the catalogue and needs
`FRANCE_TRAVAIL_<ID>_SCOPE`.

With `rome-metiers`, `rome-competences` and `rome-fiches-metiers` enabled (the
Terraform default), the API copies the ROME 4.0 referential into `rome_*` once
a week by itself, in three calls. The first copy can be forced right after a
deploy with `rome:sync:built`; a failed sync keeps the previous copy. With
`rome-substitutions` enabled too, each sync asks France Travail for the
successor of every code a user still holds that the referential dropped, and
rewrites it (`lookups` and `substitutions` in `rome_sync_runs.stats`).

With `marche-travail` enabled, the API reads the labour market figures of every
confirmed ROME job in each department of the searches (and the other
departments of their region) into `market_stats`, once a month, forty reads an
hour. `market:refresh:built` fills it right after a deploy.

With `la-bonne-boite` enabled, it reads once a week the companies La Bonne
Boîte expects to hire in each confirmed job, near each place of the searches
(`hiring_companies`, sixty reads an hour). `hiring-companies:refresh:built`
fills it right after a deploy.

The company behind each of them is then read monthly from two public, keyless
APIs, the Annuaire des entreprises (`recherche-entreprises.api.gouv.fr`) and
Egapro (`companies`, a hundred reads an hour). Nothing to configure; outbound
HTTPS to both hosts must be allowed. `companies:refresh:built` fills it once
`hiring-companies:refresh:built` has run.
With `pages-employeurs` enabled as well, the same pass looks up each
company's France Travail employer page, by name in its department, and links
it on the company page (29 % of them have one). Enabling it later reads every
company once at the next passes, without waiting for the month.

Optional too: `LA_BONNE_ALTERNANCE_API_KEY`, a key created on
<https://api.apprentissage.beta.gouv.fr>. It adds apprenticeship offers, and is
only called for searches that ask for an alternance. A *sandbox* key is granted
the route automatically; a production key is requested from their support. Left
unset, that source stays inert like the one above.

> A **sandbox** key queries their *recette* environment: roughly one offer in
> thirty then carries a `labonnealternance-recette.*` link, which is not
> public. It proves the wiring, and must not feed a database candidates read —
> those links would stay in it until the offers expire.

> Setting them in the Dokploy UI does **not** work, and worse, looks like it
> does: Terraform rewrites the stack's environment file on every deploy, and a
> compose service only receives the variables its own `environment:` block
> names. Both are handled here; the values belong in GitHub secrets.

Generate `DOKPLOY_API_KEY` from the Dokploy UI (*Settings > Profile > API/CLI
Keys > Generate New Key*) and leave **Enable Rate Limiting off**: a rate-limited
key answers `401`, not `429`, and the window is 24 hours.

No per-environment GitHub *variables* are needed any more. Domains, volume
prefixes, cookie names, model names and SMTP settings are now defaults in
`.deploy/manifest.yaml`. `SSH_PRIVATE_KEY` and `SSH_USER` are
no longer used by this workflow.

## Going to production (historical, pre-platform bootstrap)

Jobspark is the evolution of CVForge, so the live production is still the CVForge
stack: `cvforge.koklo.dev`, `cvforge-app.koklo.dev` and `cvforge-api.koklo.dev`,
proxied by Cloudflare and deployed from `koklo-infra/stacks/cvforge`. The
`jobspark*.koklo.dev` records do not exist yet. Dokploy runs on VPS20 at
`dokploy.ops.koklo.dev` with a valid Let's Encrypt certificate.

The cutover is therefore a rename *and* a change of deployment mechanism. Do it
in this order — each step is reversible until step 6.

**1. GitHub secrets.** `bash scripts/set-secrets.sh` fills the 27 entries. It
reads production values from `.env.prod` (verified identical to
`koklo-infra/stacks/cvforge/.env`) and the shared ones from `koklo-infra/.env`.
You still supply by hand: `DOKPLOY_API_KEY`, the three `R2_*`, both Stripe keys
and `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`, plus all ten staging values.

**2. R2 state bucket.** Create `koklo-tofu-state` and an R2 token with read and
write on it. Nothing in `koklo-infra` references R2, so assume it does not exist.
Both `infra/terraform` and `infra/dokploy` fail at `init` without it.

**3. Back up the real data.** The API keeps most of its state as JSON files in
`cvforge_api_data`; credits, offers and orders live in Postgres (ADR-011).
Snapshot that volume, and dump Postgres too. On its first start the API imports
`credits-state.json` into Postgres once (`data_imports` table); the file stays
in place as a record.
Everything downstream depends on this being done.

**4. DNS.** Merging into `develop` runs the `tofu` job, which creates the six
`jobspark*` records. **Create them unproxied first.** Dokploy resolves
Let's Encrypt over HTTP-01, and an orange-cloud record with no origin
certificate yet gives Cloudflare a 526 until issuance completes. Set
`proxied = false` in `infra/terraform/dns.tf`, apply, let the certificates
issue at step 5, then flip it back to `true`. Note `dokploy.ops.koklo.dev` is
itself unproxied, which is why its certificate issued cleanly.

**4b. Mail sends from `@koklo.dev`, and only from there.** Resend verifies each
subdomain independently. Only the apex carries the records — DKIM at
`resend._domainkey.koklo.dev`, plus the `send.koklo.dev` MX and SPF. Neither
`jobspark.koklo.dev` nor `cvforge.koklo.dev` is verified, so a From on either is
rejected with a 403 domain mismatch. That is why `EMAIL_FROM` is
`Jobspark <no-reply@koklo.dev>`.

Note this means production mail was already failing before the cutover: the
pre-Dokploy stack sent from `no-reply@cvforge.koklo.dev`, which Resend never
accepted. Magic links are how people sign in, so this is worth checking after
the first deploy.

To move to `no-reply@jobspark.koklo.dev` later — Resend recommends a subdomain
over the apex, to keep each product's sending reputation separate — add that
subdomain in Resend, publish the records it issues into the `koklo.dev` zone,
wait for *verified*, then change `email_from` in `.deploy/manifest.yaml`.

Checklist for that move, and for the Jobspark logo next to the sender:

1. **Resend**: add `jobspark.koklo.dev`, copy the DKIM value it issues into
   `resend_jobspark_dkim` (and the bounce MX region into `resend_feedback_mx`
   if it is not `eu-west-1`) in `infra/terraform`, apply, wait for *verified*.
   Then set `email_from` to `Jobspark <no-reply@jobspark.koklo.dev>`.
2. **Receive mail** with Cloudflare Email Routing on `koklo.dev`: forward
   `support@jobspark.koklo.dev` (the Reply-To, the footer address and the DMARC
   report mailbox) and `no-reply@jobspark.koklo.dev` (needed once, to verify the
   accounts below) to a real inbox.
3. **Sender picture without a certificate**: create a Gravatar and a Google
   account on `no-reply@jobspark.koklo.dev`, both with
   `apps/landing/public/email/jobspark-avatar.png`. Gmail shows the Google
   account's picture; a few clients read Gravatar.
4. **BIMI**: `default._bimi.jobspark` already points at
   `https://jobspark.koklo.dev/bimi/jobspark.svg` (SVG Tiny-PS). Yahoo, AOL and
   Fastmail show it once DMARC is enforced: after a week of clean reports, set
   `dmarc_policy = "quarantine"`. BIMI also checks the organisational domain,
   so `_dmarc.koklo.dev` must be at quarantine or reject too — it covers every
   koklo.dev sender, check them first. Gmail and Apple Mail additionally need a
   VMC or CMC certificate (paid, yearly), referenced by the record's `a=` tag.
5. **Check**: `dig TXT _dmarc.jobspark.koklo.dev default._bimi.jobspark.koklo.dev`,
   the BIMI Group inspector, and a mail-tester.com score.

The e-mails themselves are built in `apps/api/src/mail/` (one layout, one
function per e-mail). `pnpm --filter @cvforge/api email:preview` writes them
to `apps/api/.email-previews/` to check the design in a browser.

**4c. Expect the first apply of a fresh environment to serve 404.** The three
`dokploy_domain` resources take `compose_id`, so Terraform creates them *after*
the compose has deployed. Dokploy injects the Traefik labels into the stack at
deploy time, so the containers already running predate the domains and carry no
labels — Traefik has no router for the host and answers 404, and the smoke test
fails on an otherwise healthy deploy. One redeploy fixes it, from the Dokploy UI
or by pushing again. Every later push redeploys anyway, since `IMAGE_TAG`
changes, so this is a one-time gap per environment.

**4d. Internal service names are ambiguous across environments — do not dial
them.** Dokploy attaches every service of every stack to the shared
`dokploy-network` and registers the compose service name as a network alias on
it. Production and staging both define a service named `api`, so that one
network carries the alias twice and Docker resolves it to either container.
Measured from production's web container:

```
$ getent hosts api
10.0.1.29   api      # staging's API, not production's
```

Production's web app therefore asked *staging's* API for a magic link. The link
was built from staging's own URLs, so the session cookie was set for
`jobspark-app-staging.koklo.dev` and production answered "session expirée" to
everyone.

`API_INTERNAL_URL` is consequently `https://${API_DOMAIN}`, the public host,
which is unambiguous by construction. The traffic stays on the box — out to the
VPS address and back in through Traefik — at the cost of a TLS hop.

`postgres`, `redis`, `minio` and `puppeteer` collide in exactly the same way.
Postgres is now read by the API (ADR-011), so it gets a per-environment network
alias, `${POSTGRES_HOST}` = `<project>-postgres` (`jobspark-postgres` or
`jobspark-staging-postgres`), declared on the stack's `default` network and used
by `DATABASE_URL` and the `db_backup` service. Check it after a deploy from the
API container: `getent hosts jobspark-staging-postgres` must return a single
address. `REDIS_URL` and `MINIO_ENDPOINT` are still dead configuration and
`PUPPETEER_URL` is stateless. **Anything else that starts using a datastore must
get the same treatment, never the bare service name.**

The clean fix — prefixing every service name so each alias is unique — is
blocked by Dokploy today: a compose whose services no longer match the
`service_name` of an existing domain is rejected ("Domain ... is attached to
service "web" which does not exist in the compose"), and the compose is deployed
*before* Terraform reconciles the domains. Getting there needs the domains
destroyed, the compose applied, then the domains recreated.

**5. Staging.** The same merge deploys staging through Dokploy. Check
`jobspark-staging.koklo.dev`, `jobspark-app-staging.koklo.dev` and
`jobspark-api-staging.koklo.dev/health`. Staging uses its own volumes
(`cvspark-staging_*`) and touches nothing in production. Do not continue until
this is green.

**6. Production cutover — the irreversible step.** The CVForge stack and the
Dokploy stack share the same volumes (`VOLUME_PREFIX=cvforge`). Two Postgres
containers on one volume corrupt it, so stop the old stack *before* promoting:

```bash
ssh devops@<VPS20_IP> 'cd /opt/apps/jobspark && docker compose down'
# and, if the pre-self-deploy stack is still up:
ssh root@<VPS20_IP> 'cd /opt/koklo/stacks/cvforge && docker compose down'
```

Then merge `develop` into `main`. That triggers the production environment,
which is restricted to the `main` branch.

> **What actually happened (2026-09-27 → 2026-09-29).** The old stack in
> `/opt/koklo/stacks/cvforge` was not stopped. Both Postgres ran on
> `cvforge_postgres_data` for two days, and both backup sidecars wrote the same
> filenames into `cvforge_db_backups`, so no dump restored production. The old
> stack was then stopped (`restart=no`, Postgres and Redis killed with SIGKILL
> so they would not flush stale state onto the shared volumes), and production
> moved to its own `jobspark_*` volumes, filled from a fresh `pg_dump` while
> the API was stopped. The `cvforge_*` volumes are left on disk, detached, as
> a rollback: set `volumePrefix` back to `cvforge` in `.deploy/manifest.yaml`.

**7. Retire the old names.** Once `jobspark*` serves correctly, delete the
`cvforge*` records from `koklo-infra`, remove `stacks/cvforge` from its Ansible
playbook, and delete `infra/compose/docker-compose.yml` here — it is the SSH
pipeline's file and nothing references it any more. On VPS20, remove the stopped
`cvforge-*` containers and the `cvforge_*` volumes (including
`cvforge_db_backups`) once the rollback is no longer needed.

## Operations

- Logs and shells: the Dokploy UI, per service, in the `jobspark` project.
- Backups, two independent copies per environment:
  1. On-VPS: the `db_backup` sidecar dumps the whole database at 00:00 UTC in
     custom format (`<db>-<date>.dump`) into the `${VOLUME_PREFIX}_pg_backups`
     volume (7 daily, 4 weekly, 6 monthly; newest at
     `last/<db>-latest.dump`). **Does not survive VPS destruction.**
  2. Off-site (declared in `.deploy/manifest.yaml`, created by the platform): Dokploy's own `dokploy_backup`
     (Postgres dump, 03:00) and `dokploy_volume_backup` (the `api_data`
     volume — JSON state pg_dump does not cover — 04:00), both via
     `dokploy_destination` to the R2 bucket of the environment —
     `koklo-db-backups` for production, `koklo-db-backups-staging` for
     staging — under `db/<environment>/` and `api-data/<environment>/`. One
     bucket each because an R2 token is scoped to whole buckets: the
     `R2_BACKUP_ACCESS_KEY_ID` / `R2_BACKUP_SECRET_ACCESS_KEY` secrets are set
     per GitHub environment, each an *Object Read & Write* token on its own
     bucket only — never the state bucket's token. The production bucket has
     a 30-day bucket lock (Cloudflare dashboard, *Settings → Bucket lock
     rules*): nothing under 30 days old can be deleted or overwritten, even
     with a valid key. Keeps the last 35 of each, above the lock, so Dokploy
     only prunes released objects. Check a run from the Dokploy UI's Backups tab
     on the compose, or trigger one manually there. The Postgres file is a
     gzipped custom-format dump (`.sql.gz`, read with `zcat | pg_restore`).
- Restore tests, nightly and automatic: the `restore_check` sidecar restores
  every new dump of both copies — the local one, and the newest R2 one that the
  `r2_fetch` sidecar (rclone) copies into `${VOLUME_PREFIX}_r2_check` — into a
  throwaway Postgres inside its own container, then compares its migrations
  (and, when they are the same, its table count) with the live database. A dump
  taken before a deploy's new migrations is accepted once, but the next dump
  must hold them. It e-mails `RESTORE_CHECK_ALERT_TO`
  (`restore_check_alert_to` in `.deploy/manifest.yaml`) through Resend when
  a restore fails, the comparison fails, or a copy has no dump under 26 h old, and
  turns unhealthy when either copy's last success is older than 26 h. Its log
  (`restore OK (local)` / `restore OK (r2)`) is the quickest health check;
  `docker exec <restore_check container> sh /restore-check.sh alert-test` sends
  a test e-mail. Its script and r2_fetch's are inline in
  `infra/compose/dokploy-stack.yml`, every `$` doubled; OpenTofu passes a hash of
  that file (`RESTORE_CHECK_REV`) because compose does not recreate a container
  when only an inline config changes.
- Restoring for real: dump first whatever is live, then restore into the
  stack's Postgres with the API stopped —
  `pg_restore -U <user> -d <db> --clean --if-exists <file>.dump` for a local
  dump, `zcat <file>.sql.gz | pg_restore -U <user> -d <db> --clean --if-exists`
  for an R2 one. To restore onto fresh volumes instead, fill them before the
  deploy that switches `volume_prefix`: compose reuses a named volume that
  already exists (with a warning), and starts the stack on empty ones
  otherwise.
- The API stores credits, offers and orders in Postgres and everything else as
  JSON files in the `api_data` volume (`/workspace/.data`). Never recreate either
  volume. Migrations run automatically before the API starts; `GET /ready`
  checks the database.

## Stripe payments

Each environment has its own Stripe account and its own catalogue: staging uses
the **Jobspark sandbox**, production the live account. Products and prices are
never configured by hand — they are created from the back-office
(`/admin/offers`), and their ids are stored in that environment's database.

**Staging (sandbox)**

1. In the sandbox, create a **restricted key** (`rk_test_…`) with write access
   to Products, Prices and Checkout Sessions. Store it as `STRIPE_SECRET_KEY` in
   the `staging` GitHub Environment.
2. Add a webhook endpoint `https://jobspark-api-staging.koklo.dev/billing/stripe/webhook`
   for `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed` and `checkout.session.expired`. Store
   its signing secret (`whsec_…`) as `STRIPE_WEBHOOK_SECRET` in `staging`.
3. Deploy (push to `develop`), then in `/admin/offers` click **Synchroniser
   Stripe**: the seeded Starter and Pro offers get their Stripe product and
   price. Every badge must read « Synchronisée ».
4. Test from `/credits` with a regular account: card `4242 4242 4242 4242`
   (paid, credits arrive within seconds), `4000 0000 0000 0002` (declined),
   `4000 0027 6000 3184` (3-D Secure), and an abandoned checkout (the order
   turns « Abandonné » when the session expires). Resend an event from the
   Stripe Dashboard: the balance must not change.

**Production (live)** — only after staging passes.

1. Activate the live account (business details, bank account, tax settings).
2. Repeat steps 1–2 with a live restricted key and the endpoint
   `https://jobspark-api.koklo.dev/billing/stripe/webhook`, in the `production`
   Environment.
3. Merge `develop` into `main`, then **Synchroniser Stripe** in production's
   back-office.
4. Buy the cheapest offer with a real card, check the credits, then refund it
   from the Stripe Dashboard.

Without `STRIPE_SECRET_KEY` the offers are still editable but marked « À
synchroniser », and checkout answers 503. Without `STRIPE_WEBHOOK_SECRET` the
webhook answers 503 and Stripe retries for three days.
