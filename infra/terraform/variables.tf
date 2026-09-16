variable "cf_api_token" {
  type        = string
  description = "Cloudflare API token with DNS edit rights on the zone"
  sensitive   = true
}

variable "cf_zone_id" {
  type        = string
  description = "Cloudflare zone id of koklo.dev"
}

variable "vps20_ip" {
  type        = string
  description = "Public IPv4 of VPS20, where every CVSpark stack runs"
}

# Grey-clouded while Dokploy issues the Let's Encrypt certificates: it resolves
# the ACME challenge over HTTP-01, and an orange-clouded record with no origin
# certificate yet answers 526 for the duration. dokploy.ops.koklo.dev is
# unproxied for the same reason, which is why its certificate issued cleanly.
#
# Flip to true once every host serves HTTPS from the origin, to put the CDN and
# Cloudflare's protection back in front.
variable "cloudflare_proxied" {
  type        = bool
  description = "Route the records through the Cloudflare proxy (orange cloud)."
  default     = false
}
