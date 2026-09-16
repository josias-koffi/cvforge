# Dokploy's own Traefik terminates TLS and routes to the compose service named
# by `service_name`. The matching proxied A records already exist in
# ../terraform/dns.tf; this module never touches Cloudflare.

locals {
  routes = {
    landing = { port = 3001, host = local.domains.landing }
    web     = { port = 3100, host = local.domains.web }
    api     = { port = 3333, host = local.domains.api }
  }
}

resource "dokploy_domain" "cvspark" {
  for_each = local.routes

  compose_id = dokploy_compose.cvspark.id

  # Must match the prefixed service key in dokploy-stack.yml, or Traefik gets no
  # router and the host answers 404.
  service_name     = "${local.service_prefix}-${each.key}"
  host             = each.value.host
  port             = each.value.port
  https            = true
  certificate_type = "letsencrypt"
}
