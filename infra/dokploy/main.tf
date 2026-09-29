terraform {
  required_version = ">= 1.10.0"

  required_providers {
    dokploy = {
      source  = "vanillauys/dokploy"
      version = "~> 1.0"
    }
  }

  # Same Cloudflare R2 bucket as ../terraform, with one state per environment so
  # a staging apply can never touch production. The `key` is deliberately absent:
  # it is supplied at init time, which is what makes the two states distinct.
  #
  # NOTE (Jobspark rename): the state key below still says `cvspark/...` on
  # purpose. It is just the object path in R2, unrelated to any Dokploy/DNS
  # resource name — renaming it here would make Tofu init against an empty
  # state and lose track of the resources below. Change it only alongside a
  # deliberate `key=jobspark/...` migration (copy the state object in R2 first,
  # or `tofu init -reconfigure` after copying).
  #
  #   tofu init -backend-config="key=cvspark/dokploy-production.tfstate"
  #   tofu init -backend-config="key=cvspark/dokploy-staging.tfstate"
  #
  # The endpoint is supplied out of band via AWS_ENDPOINT_URL_S3, and the
  # credentials via AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (R2 token).
  backend "s3" {
    bucket = "koklo-tofu-state"
    region = "auto"

    use_path_style              = true
    use_lockfile                = true
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
  }
}

provider "dokploy" {
  endpoint = var.dokploy_endpoint
  insecure = var.dokploy_insecure

  # api_key is deliberately absent: the provider reads DOKPLOY_API_KEY from the
  # environment. Never put the key in a .tf file or in a tfvars file.
}

locals {
  is_production = var.environment == "production"

  # One Dokploy project per environment. Each project brings its own default
  # `production` environment, so no dokploy_environment resource is needed and
  # the two states share no resource at all.
  project_name = local.is_production ? "jobspark" : "jobspark-staging"

  # Changing a prefix points the stack at other volumes: fill them first, or it
  # starts on empty ones. Production moved off `cvforge` on 2026-09-29, after
  # the pre-Dokploy stack ran a second Postgres on `cvforge_postgres_data`; its
  # `jobspark_*` volumes were filled from a fresh dump, and the `cvforge_*` ones
  # stay on disk, detached, as a rollback. Staging kept `cvspark-staging` after
  # the Jobspark rebrand orphaned its data under the new prefix once
  # (2026-09-26) — restored here rather than migrated, since the old volumes
  # were still on disk.
  volume_prefix = local.is_production ? "jobspark" : "cvspark-staging"

  # One bucket per environment: an R2 token is scoped to whole buckets, never to
  # a prefix, so staging's credentials must not be able to reach production's
  # dumps. Production keeps the original bucket, and its history with it.
  r2_backup_bucket = local.is_production ? var.r2_backup_bucket : "${var.r2_backup_bucket}-staging"

  # Both environments live under .koklo.dev, so an identical cookie name would
  # make the two sessions collide.
  auth_cookie_name = local.is_production ? "jobspark_session" : "jobspark_staging_session"

  # Staging shares the Resend account with production, so it sends from the same
  # verified domain. Only the display name differs, which is enough to tell a
  # staging magic link from a real one in an inbox.
  email_from = local.is_production ? var.email_from : "Jobspark staging <no-reply@koklo.dev>"

  domains = local.is_production ? {
    landing = "jobspark.koklo.dev"
    web     = "jobspark-app.koklo.dev"
    api     = "jobspark-api.koklo.dev"
    } : {
    landing = "jobspark-staging.koklo.dev"
    web     = "jobspark-app-staging.koklo.dev"
    api     = "jobspark-api-staging.koklo.dev"
  }
}
