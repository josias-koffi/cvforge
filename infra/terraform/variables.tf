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

# Mail ------------------------------------------------------------------------

variable "resend_cvspark_dkim" {
  type        = string
  description = "DKIM TXT value Resend issues for cvspark.koklo.dev (p=...). Empty: the sending records are not created."
  default     = ""
}

variable "resend_feedback_mx" {
  type        = string
  description = "Bounce MX Resend gives for send.cvspark, region included."
  default     = "feedback-smtp.eu-west-1.amazonses.com"
}

variable "dmarc_policy" {
  type        = string
  description = "DMARC policy of cvspark.koklo.dev: none while reading reports, then quarantine (required for BIMI)."
  default     = "none"

  validation {
    condition     = contains(["none", "quarantine", "reject"], var.dmarc_policy)
    error_message = "dmarc_policy must be none, quarantine or reject."
  }
}

variable "dmarc_report_email" {
  type        = string
  description = "Mailbox receiving the aggregate DMARC reports."
  default     = "support@cvspark.koklo.dev"
}
