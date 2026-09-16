terraform {
  required_version = ">= 1.10.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }

  # State lives in a Cloudflare R2 bucket (S3-compatible).
  # The endpoint is supplied out of band via AWS_ENDPOINT_URL_S3, and the
  # credentials via AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (R2 token).
  backend "s3" {
    bucket = "koklo-tofu-state"
    key    = "cvspark/terraform.tfstate"
    region = "auto"

    use_path_style              = true
    use_lockfile                = true
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
  }
}

provider "cloudflare" {
  api_token = var.cf_api_token
}
