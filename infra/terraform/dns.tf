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

# Mail from no-reply@cvspark.koklo.dev --------------------------------------
# Resend verifies each subdomain on its own (docs/deploy.md §4b). Its records
# exist only once the DKIM key Resend issues for cvspark.koklo.dev is set:
# until then the API keeps sending from the verified koklo.dev apex.
resource "cloudflare_record" "cvspark_resend_dkim" {
  count = var.resend_cvspark_dkim == "" ? 0 : 1

  zone_id = var.cf_zone_id
  name    = "resend._domainkey.cvspark"
  type    = "TXT"
  content = var.resend_cvspark_dkim
}

resource "cloudflare_record" "cvspark_resend_bounce_mx" {
  count = var.resend_cvspark_dkim == "" ? 0 : 1

  zone_id  = var.cf_zone_id
  name     = "send.cvspark"
  type     = "MX"
  content  = var.resend_feedback_mx
  priority = 10
}

resource "cloudflare_record" "cvspark_resend_spf" {
  count = var.resend_cvspark_dkim == "" ? 0 : 1

  zone_id = var.cf_zone_id
  name    = "send.cvspark"
  type    = "TXT"
  content = "v=spf1 include:amazonses.com ~all"
}

# DMARC starts at p=none to collect reports without risking delivery; BIMI
# (the logo next to the sender) only shows once it reads quarantine or reject,
# on this subdomain and on koklo.dev itself.
resource "cloudflare_record" "cvspark_dmarc" {
  zone_id = var.cf_zone_id
  name    = "_dmarc.cvspark"
  type    = "TXT"
  content = "v=DMARC1; p=${var.dmarc_policy}; pct=100; rua=mailto:${var.dmarc_report_email}; adkim=r; aspf=r"
}

# The CVSpark logo as the sender's picture, in the mailboxes that read BIMI
# without a certificate (Yahoo, AOL, Fastmail). Gmail and Apple Mail also need
# a VMC or CMC certificate, referenced by an a= tag here once bought.
resource "cloudflare_record" "cvspark_bimi" {
  zone_id = var.cf_zone_id
  name    = "default._bimi.cvspark"
  type    = "TXT"
  content = "v=BIMI1; l=https://cvspark.koklo.dev/bimi/cvspark.svg; a=;"
}
