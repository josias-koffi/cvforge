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
