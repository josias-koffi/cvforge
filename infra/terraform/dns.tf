# Flat subdomains, not a *.jobspark wildcard: Cloudflare Universal SSL does not
# cover second-level wildcards.
locals {
  records = {
    landing         = "jobspark"
    app             = "jobspark-app"
    api             = "jobspark-api"
    landing_staging = "jobspark-staging"
    app_staging     = "jobspark-app-staging"
    api_staging     = "jobspark-api-staging"
  }
}

resource "cloudflare_record" "jobspark" {
  for_each = local.records

  zone_id = var.cf_zone_id
  name    = each.value
  type    = "A"
  content = var.vps20_ip
  proxied = var.cloudflare_proxied
}

# EMERGENCY RESTORE (2026-09-27): production is already running on Dokploy
# under the OLD "cvspark" project (`cvspark-aosltd-*`, live for ~10 days, 437
# real applications) — docs/deploy.md was stale, this was not discovered until
# after the Jobspark rename destroyed these three records and took production
# offline for several hours. Re-added here, separately from `local.records`
# above, so a future cleanup can remove exactly these three once the
# Terraform state for the `cvspark` Dokploy project has been properly
# `state mv`'d to `jobspark` (never just re-point DNS and call it done: the
# infra/dokploy resource addresses were renamed the same way and would destroy
# this same project on the next production apply — see infra/dokploy/main.tf).
resource "cloudflare_record" "cvspark_prod_restore" {
  for_each = {
    landing = "cvspark"
    app     = "cvspark-app"
    api     = "cvspark-api"
  }

  zone_id = var.cf_zone_id
  name    = each.value
  type    = "A"
  content = var.vps20_ip
  proxied = var.cloudflare_proxied
}

# Mail from no-reply@jobspark.koklo.dev --------------------------------------
# Resend verifies each subdomain on its own (docs/deploy.md §4b). Its records
# exist only once the DKIM key Resend issues for jobspark.koklo.dev is set:
# until then the API keeps sending from the verified koklo.dev apex.
resource "cloudflare_record" "jobspark_resend_dkim" {
  count = var.resend_jobspark_dkim == "" ? 0 : 1

  zone_id = var.cf_zone_id
  name    = "resend._domainkey.jobspark"
  type    = "TXT"
  content = var.resend_jobspark_dkim
}

resource "cloudflare_record" "jobspark_resend_bounce_mx" {
  count = var.resend_jobspark_dkim == "" ? 0 : 1

  zone_id  = var.cf_zone_id
  name     = "send.jobspark"
  type     = "MX"
  content  = var.resend_feedback_mx
  priority = 10
}

resource "cloudflare_record" "jobspark_resend_spf" {
  count = var.resend_jobspark_dkim == "" ? 0 : 1

  zone_id = var.cf_zone_id
  name    = "send.jobspark"
  type    = "TXT"
  content = "v=spf1 include:amazonses.com ~all"
}

# DMARC starts at p=none to collect reports without risking delivery; BIMI
# (the logo next to the sender) only shows once it reads quarantine or reject,
# on this subdomain and on koklo.dev itself.
resource "cloudflare_record" "jobspark_dmarc" {
  zone_id = var.cf_zone_id
  name    = "_dmarc.jobspark"
  type    = "TXT"
  content = "v=DMARC1; p=${var.dmarc_policy}; pct=100; rua=mailto:${var.dmarc_report_email}; adkim=r; aspf=r"
}

# The Jobspark logo as the sender's picture, in the mailboxes that read BIMI
# without a certificate (Yahoo, AOL, Fastmail). Gmail and Apple Mail also need
# a VMC or CMC certificate, referenced by an a= tag here once bought.
resource "cloudflare_record" "jobspark_bimi" {
  zone_id = var.cf_zone_id
  name    = "default._bimi.jobspark"
  type    = "TXT"
  content = "v=BIMI1; l=https://jobspark.koklo.dev/bimi/jobspark.svg; a=;"
}
