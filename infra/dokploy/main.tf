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
  project_name = local.is_production ? "cvspark" : "cvspark-staging"

  # Production keeps the legacy `cvforge` volume prefix so the existing data
  # survives the move to Dokploy. Changing it points the stack at empty volumes.
  volume_prefix = local.is_production ? "cvforge" : "cvspark-staging"

  # Both environments live under .koklo.dev, so an identical cookie name would
  # make the two sessions collide.
  auth_cookie_name = local.is_production ? "cvspark_session" : "cvspark_staging_session"

  # Staging shares the Resend account with production, so it sends from the same
  # verified domain. Only the display name differs, which is enough to tell a
  # staging magic link from a real one in an inbox.
  email_from = local.is_production ? var.email_from : "CVSpark staging <no-reply@cvspark.koklo.dev>"

  domains = local.is_production ? {
    landing = "cvspark.koklo.dev"
    web     = "cvspark-app.koklo.dev"
    api     = "cvspark-api.koklo.dev"
    } : {
    landing = "cvspark-staging.koklo.dev"
    web     = "cvspark-app-staging.koklo.dev"
    api     = "cvspark-api-staging.koklo.dev"
  }
}
