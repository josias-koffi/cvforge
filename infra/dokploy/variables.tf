# Target ----------------------------------------------------------------------

variable "environment" {
  type        = string
  description = "Which environment this state manages. Everything else — project name, volume prefix, domains, cookie name — is derived from it in main.tf."

  validation {
    condition     = contains(["production", "staging"], var.environment)
    error_message = "environment must be \"production\" or \"staging\"."
  }
}

# Connection ------------------------------------------------------------------

variable "dokploy_endpoint" {
  type        = string
  description = "Base URL of the Dokploy server on VPS20"
  default     = "https://dokploy.ops.koklo.dev"
}

variable "dokploy_insecure" {
  type        = bool
  description = "Skip TLS verification. Only for a self-signed Dokploy certificate."
  default     = false
}

# Release ---------------------------------------------------------------------

variable "image_tag" {
  type        = string
  description = "Tag of the ghcr.io/josias-koffi/cvspark-* images to run. CI passes the short commit sha."
  default     = "latest"
}

# Application settings --------------------------------------------------------
# Defaults match what production runs today. CI can override any of them from a
# GitHub environment variable via TF_VAR_<name>.

variable "cookie_domain" {
  type        = string
  description = "Domain the session cookie is scoped to"
  default     = ".koklo.dev"
}

variable "auth_magic_link_ttl_minutes" {
  type        = number
  description = "Lifetime of a magic-link token, in minutes"
  default     = 15
}

variable "auth_session_ttl_days" {
  type        = number
  description = "Lifetime of a session, in days"
  default     = 7
}

variable "postgres_db" {
  type        = string
  description = "Postgres database name"
  default     = "cvforge"
}

variable "postgres_user" {
  type        = string
  description = "Postgres user"
  default     = "cvforge"
}

# Balance supervision only (US-083/084/085). Must be a MANAGEMENT key — an
# inference key gets a 403 on /credits. Empty leaves the supervision inert:
# no balance on /admin/metrics, no low-balance alert, and no purchase guard.
variable "openrouter_management_api_key" {
  type        = string
  description = "OpenRouter management API key, for reading the account balance. Empty disables supervision."
  sensitive   = true
  default     = ""
}

variable "openrouter_balance_alert_threshold" {
  type        = string
  description = "Remaining OpenRouter credits (USD) below which admins are alerted."
  default     = "5"
}

variable "openrouter_balance_critical_threshold" {
  type        = string
  description = "Remaining OpenRouter credits (USD) at or below which selling credits is refused. 0 blocks only once the account is empty."
  default     = "0"
}

variable "openrouter_model" {
  type        = string
  description = <<-EOT
    OpenRouter model used for CV and cover-letter generation. Avoid
    mistral-small-2603: Mistral is its only provider, so OpenRouter's shared
    pool throttling it leaves no way through. This variant is the same family
    served by DeepInfra, Parasail and Venice.
  EOT
  default     = "mistralai/mistral-small-3.2-24b-instruct"
}

variable "openrouter_fallback_models" {
  type        = string
  description = <<-EOT
    Comma-separated models tried in order once every provider of
    openrouter_model is exhausted. Pick models served by OTHER providers, or
    the fallback is throttled along with the primary. Empty keeps the
    application defaults; "none" disables fallbacks altogether.
  EOT
  default     = ""
}

variable "openrouter_max_attempts" {
  type        = string
  description = "Attempts per OpenRouter request, first call included. 1 disables retrying."
  default     = "3"
}

# Every interview model below defaults to blank, which keeps the value
# compiled into the application. Pinning one here is how the transcription
# chain ended up on voxtral-small: OpenRouter has no route to it under this
# account's privacy settings (ADR-013), so the IaC was overriding the very
# default that fixed it. A blank cannot drift from the code; a name can.

variable "interview_stt_model" {
  type        = string
  description = "OpenRouter model for interview speech-to-text. Blank keeps the application default."
  default     = ""
}

variable "interview_stt_fallback_models" {
  type        = string
  description = <<-EOT
    Comma-separated speech-to-text models tried once every provider of
    interview_stt_model is exhausted. Blank keeps the application defaults;
    "none" disables fallbacks altogether.
  EOT
  default     = ""
}

variable "interview_voice_model" {
  type        = string
  description = "OpenRouter speech-to-speech model answering a spoken turn. Blank keeps the application default."
  default     = ""
}

variable "interview_voice" {
  type        = string
  description = "Voice the interviewer speaks with. Blank keeps the application default."
  default     = ""
}

variable "interview_voice_fallback_models" {
  type        = string
  description = <<-EOT
    Comma-separated speech-to-speech models tried once every provider of
    interview_voice_model is exhausted. Blank keeps the application defaults;
    "none" disables fallbacks altogether.
  EOT
  default     = ""
}

variable "interview_voice_max_attempts" {
  type        = string
  description = <<-EOT
    Attempts per voice turn, first call included. Deliberately separate from
    openrouter_max_attempts: a spoken turn has about a second of perceived
    budget, so it fails over to the next model rather than waiting out a
    throttle (ADR-016). Blank keeps the application default.
  EOT
  default     = ""
}

variable "interview_voice_max_tokens" {
  type        = string
  description = "Token ceiling for one spoken reply. Blank keeps the application default."
  default     = ""
}

variable "smtp_provider" {
  type        = string
  description = "SMTP provider name"
  default     = "resend"
}

variable "smtp_server" {
  type        = string
  description = "SMTP host"
  default     = "smtp.resend.com"
}

variable "smtp_port" {
  type        = number
  description = "SMTP port"
  default     = 587
}

# Only koklo.dev is a verified sender in Resend: it carries the DKIM record at
# resend._domainkey.koklo.dev and the send.koklo.dev MX and SPF. Neither
# cvspark.koklo.dev nor cvforge.koklo.dev does, and Resend verifies each
# subdomain independently — a From on an unverified one is rejected with a 403
# domain mismatch, so no magic link goes out and nobody can sign in.
#
# To move to no-reply@cvspark.koklo.dev, add that subdomain in Resend, publish
# the records it issues into the koklo.dev zone, wait for "verified", and only
# then change this default. Resend recommends a subdomain over the apex, to keep
# the sending reputation of each product separate.
variable "email_from" {
  type        = string
  description = "From header of every outgoing email. The domain must be verified in Resend, on its own."
  default     = "CVSpark <no-reply@koklo.dev>"
}

# Secrets ---------------------------------------------------------------------
# One value each: this state manages a single environment, so CI can pass the
# GitHub Environment secrets of that environment directly as TF_VAR_<name>.
#
# These land in the compose `env` block, which the provider does not mark as
# sensitive and which has no write-only (_wo) companion. They are therefore
# stored in the R2 state file. Keep the bucket private.

variable "postgres_password" {
  type        = string
  description = "Postgres password"
  sensitive   = true
}

variable "minio_access_key" {
  type        = string
  description = "MinIO root user"
  sensitive   = true
}

variable "minio_secret_key" {
  type        = string
  description = "MinIO root password"
  sensitive   = true
}

variable "openrouter_api_key" {
  type        = string
  description = "OpenRouter API key"
  sensitive   = true
}

# Offer collection (France Travail "Offres d'emploi v2"). Optional: an empty
# pair leaves the source inert instead of failing the deploy, exactly like the
# OpenRouter management key.
variable "france_travail_client_id" {
  type        = string
  description = "France Travail application client id"
  sensitive   = true
  default     = ""
}

variable "france_travail_client_secret" {
  type        = string
  description = "France Travail application client secret"
  sensitive   = true
  default     = ""
}

# The France Travail APIs the key is subscribed to (ADR-024). One is added here
# only after `ft:smoke <api>` succeeded; an API left out is never called. The
# three ROME ones feed the weekly `rome:sync`, Substitutions rewrites the
# retired codes users hold, Marché du travail feeds the monthly market radar
# (US-128), La Bonne Boîte the weekly "Entreprises qui recrutent" (US-119).
variable "france_travail_apis" {
  type        = string
  description = "Comma-separated France Travail APIs to call (offres, romeo, rome-metiers...)"
  default     = "offres,romeo,rome-metiers,rome-competences,rome-fiches-metiers,rome-substitutions,marche-travail,la-bonne-boite,pages-employeurs"
}

# La bonne alternance. Same rule: an empty key leaves the source inert.
variable "la_bonne_alternance_api_key" {
  type        = string
  description = "La bonne alternance API key. Empty disables the source."
  sensitive   = true
  default     = ""
}

# Stripe is not configured on any environment yet — both values were CHANGE_ME
# placeholders in the pre-Dokploy stack. They default to empty so the stack
# deploys without them; the payment features stay inert until they are set.
variable "stripe_secret_key" {
  type        = string
  description = "Stripe secret key. Empty disables the payment features."
  sensitive   = true
  default     = ""
}

variable "stripe_webhook_secret" {
  type        = string
  description = "Stripe webhook signing secret. Empty disables webhook verification."
  sensitive   = true
  default     = ""
}

variable "auth_session_secret" {
  type        = string
  description = "Secret that signs session cookies"
  sensitive   = true
}

variable "smtp_user" {
  type        = string
  description = "SMTP user"
  sensitive   = true
}

variable "smtp_password" {
  type        = string
  description = "SMTP password"
  sensitive   = true
}

variable "next_server_actions_encryption_key" {
  type        = string
  description = "Next.js server-actions encryption key. Must stay fixed: a new value invalidates every in-flight server action on redeploy."
  sensitive   = true
}

variable "ats_ip_hash_secret" {
  type        = string
  description = <<-EOT
    Salt for the hashed visitor address kept on a public ATS scan. Optional:
    an empty value makes the API mint a random salt per process, which leaks
    nothing but stops hashes being comparable across restarts, so abuse
    forensics become useless. Never the raw address, either way.
  EOT
  sensitive   = true
  default     = ""
}

variable "landing_proxy_secret" {
  type        = string
  description = <<-EOT
    Shared by the landing and the API: the landing signs the visitor's address
    it relays, since Traefik overwrites X-Forwarded-For on the way in. Optional:
    empty means the relay is ignored and every visitor of the landing shares
    one rate-limit counter (US-132, ADR-022).
  EOT
  sensitive   = true
  default     = ""
}

variable "client_ip_header" {
  type        = string
  description = <<-EOT
    Header the landing reads the visitor's address from, for the per-IP
    limits. Empty uses the X-Forwarded-For Traefik rewrites, which a visitor
    cannot forge. Set "cf-connecting-ip" only while the records are proxied
    by Cloudflare (cloudflare_proxied in infra/terraform): with a grey cloud,
    anyone can send that header and dodge every per-IP limit (ADR-022).
  EOT
  default     = ""
}

variable "ats_public_hourly_limit" {
  type        = number
  description = "Public ATS scans allowed per IP and per hour."
  default     = 3
}

variable "ats_public_daily_limit" {
  type        = number
  description = "Public ATS scans allowed per IP and per rolling day."
  default     = 10
}

variable "ats_public_daily_budget" {
  type        = number
  description = <<-EOT
    Public ATS scans allowed across every visitor per rolling day — the cost
    stop-loss. Per-IP limits alone do not survive a botnet and every scan
    spends a model call; past this the route answers 503 until the window
    slides. Counters live in the API process: a restart resets the day.
  EOT
  default     = 300
}

variable "enable_zdr_chat" {
  type        = bool
  description = <<-EOT
    Sends `data_collection: "deny"` on every chat completion, which the vision
    (§15.3) requires of production.

    It is a routing filter, not a header: OpenRouter then only considers
    providers advertising zero data retention. If none of them serves the
    configured model, generation fails outright — so a change here must be
    watched on staging before it reaches production.
  EOT
  default     = true
}

variable "enable_zdr_stt" {
  type        = bool
  description = "Same filter for speech-to-text. See enable_zdr_chat."
  default     = true
}
