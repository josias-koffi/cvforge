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

variable "openrouter_model" {
  type        = string
  description = "OpenRouter model used for CV and cover-letter generation"
  default     = "mistralai/mistral-small-2603"
}

variable "interview_stt_model" {
  type        = string
  description = "OpenRouter model used for interview speech-to-text"
  default     = "mistralai/voxtral-small-24b-2507"
}

variable "interview_ai_model" {
  type        = string
  description = "OpenRouter model used for interview answers"
  default     = "mistralai/mistral-small-2603"
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

variable "email_from" {
  type        = string
  description = "From header of every outgoing email"
  default     = "CVSpark <no-reply@cvspark.koklo.dev>"
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

variable "stripe_secret_key" {
  type        = string
  description = "Stripe secret key"
  sensitive   = true
}

variable "stripe_webhook_secret" {
  type        = string
  description = "Stripe webhook signing secret"
  sensitive   = true
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
