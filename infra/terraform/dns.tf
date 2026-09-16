# Flat subdomains, not a *.cvspark wildcard: Cloudflare Universal SSL does not
# cover second-level wildcards.
locals {
  records = {
    landing         = "cvspark"
    app             = "cvspark-app"
    api             = "cvspark-api"
    landing_staging = "cvspark-staging"
    app_staging     = "cvspark-app-staging"
    api_staging     = "cvspark-api-staging"
  }
}

resource "cloudflare_record" "cvspark" {
  for_each = local.records

  zone_id = var.cf_zone_id
  name    = each.value
  type    = "A"
  content = var.vps20_ip
  proxied = var.cloudflare_proxied
}
