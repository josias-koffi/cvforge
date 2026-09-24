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
`infra/dokploy/variables.tf` and only need overriding to change them.

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
deploy with `rome:sync:built`; a failed sync keeps the previous copy.

With `marche-travail` enabled, the API reads the labour market figures of every
confirmed ROME job in each department of the searches (and the other
departments of their region) into `market_stats`, once a month, forty reads an
hour. `market:refresh:built` fills it right after a deploy.

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
`infra/dokploy/variables.tf` and `main.tf`. `SSH_PRIVATE_KEY` and `SSH_USER` are
no longer used by this workflow.

## Going to production

CVSpark is the evolution of CVForge, so the live production is still the CVForge
stack: `cvforge.koklo.dev`, `cvforge-app.koklo.dev` and `cvforge-api.koklo.dev`,
proxied by Cloudflare and deployed from `koklo-infra/stacks/cvforge`. The
`cvspark*.koklo.dev` records do not exist yet. Dokploy runs on VPS20 at
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
`cvspark*` records. **Create them unproxied first.** Dokploy resolves
Let's Encrypt over HTTP-01, and an orange-cloud record with no origin
certificate yet gives Cloudflare a 526 until issuance completes. Set
`proxied = false` in `infra/terraform/dns.tf`, apply, let the certificates
issue at step 5, then flip it back to `true`. Note `dokploy.ops.koklo.dev` is
itself unproxied, which is why its certificate issued cleanly.

**4b. Mail sends from `@koklo.dev`, and only from there.** Resend verifies each
subdomain independently. Only the apex carries the records — DKIM at
`resend._domainkey.koklo.dev`, plus the `send.koklo.dev` MX and SPF. Neither
`cvspark.koklo.dev` nor `cvforge.koklo.dev` is verified, so a From on either is
rejected with a 403 domain mismatch. That is why `EMAIL_FROM` is
`CVSpark <no-reply@koklo.dev>`.

Note this means production mail was already failing before the cutover: the
pre-Dokploy stack sent from `no-reply@cvforge.koklo.dev`, which Resend never
accepted. Magic links are how people sign in, so this is worth checking after
the first deploy.

To move to `no-reply@cvspark.koklo.dev` later — Resend recommends a subdomain
over the apex, to keep each product's sending reputation separate — add that
subdomain in Resend, publish the records it issues into the `koklo.dev` zone,
wait for *verified*, then change `email_from` in `infra/dokploy/variables.tf`.

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
`cvspark-app-staging.koklo.dev` and production answered "session expirée" to
everyone.

`API_INTERNAL_URL` is consequently `https://${API_DOMAIN}`, the public host,
which is unambiguous by construction. The traffic stays on the box — out to the
VPS address and back in through Traefik — at the cost of a TLS hop.

`postgres`, `redis`, `minio` and `puppeteer` collide in exactly the same way.
Postgres is now read by the API (ADR-011), so it gets a per-environment network
alias, `${POSTGRES_HOST}` = `<project>-postgres` (`cvspark-postgres` or
`cvspark-staging-postgres`), declared on the stack's `default` network and used
by `DATABASE_URL` and the `db_backup` service. Check it after a deploy from the
API container: `getent hosts cvspark-staging-postgres` must return a single
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
`cvspark-staging.koklo.dev`, `cvspark-app-staging.koklo.dev` and
`cvspark-api-staging.koklo.dev/health`. Staging uses its own volumes
(`cvspark-staging_*`) and touches nothing in production. Do not continue until
this is green.

**6. Production cutover — the irreversible step.** The CVForge stack and the
Dokploy stack share the same volumes (`VOLUME_PREFIX=cvforge`). Two Postgres
containers on one volume corrupt it, so stop the old stack *before* promoting:

```bash
ssh devops@<VPS20_IP> 'cd /opt/apps/cvspark && docker compose down'
# and, if the pre-self-deploy stack is still up:
ssh root@<VPS20_IP> 'cd /opt/koklo/stacks/cvforge && docker compose down'
```

Then merge `develop` into `main`. That triggers the production environment,
which is restricted to the `main` branch.

**7. Retire the old names.** Once `cvspark*` serves correctly, delete the
`cvforge*` records from `koklo-infra`, remove `stacks/cvforge` from its Ansible
playbook, and delete `infra/compose/docker-compose.yml` here — it is the SSH
pipeline's file and nothing references it any more.

## Operations

- Logs and shells: the Dokploy UI, per service, in the `cvspark` project.
- Backups: nightly `pg_dump` in the `cvforge_db_backups` volume (7 daily, 4
  weekly, 6 monthly). The pre-deploy dump disappeared with the SSH job; restoring
  an off-site copy means adding `dokploy_backup` + `dokploy_destination` to
  `infra/dokploy/`. **What remains lives on the VPS only** — copy it off-site for
  real durability.
- The API stores credits, offers and orders in Postgres and everything else as
  JSON files in the `api_data` volume (`/workspace/.data`). Never recreate either
  volume. Migrations run automatically before the API starts; `GET /ready`
  checks the database.

## Stripe payments

Each environment has its own Stripe account and its own catalogue: staging uses
the **CvSpark sandbox**, production the live account. Products and prices are
never configured by hand — they are created from the back-office
(`/admin/offers`), and their ids are stored in that environment's database.

**Staging (sandbox)**

1. In the sandbox, create a **restricted key** (`rk_test_…`) with write access
   to Products, Prices and Checkout Sessions. Store it as `STRIPE_SECRET_KEY` in
   the `staging` GitHub Environment.
2. Add a webhook endpoint `https://cvspark-api-staging.koklo.dev/billing/stripe/webhook`
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
   `https://cvspark-api.koklo.dev/billing/stripe/webhook`, in the `production`
   Environment.
3. Merge `develop` into `main`, then **Synchroniser Stripe** in production's
   back-office.
4. Buy the cheapest offer with a real card, check the credits, then refund it
   from the Stripe Dashboard.

Without `STRIPE_SECRET_KEY` the offers are still editable but marked « À
synchroniser », and checkout answers 503. Without `STRIPE_WEBHOOK_SECRET` the
webhook answers 503 and Stripe retries for three days.
