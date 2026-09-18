# ==============================================================================
# TERRAFORM OWNS THIS SERVICE IN FULL.
#
# An apply of `dokploy_compose` rewrites the source and the whole operational
# configuration of the service. Anything changed in the Dokploy UI — the compose
# file, the environment variables, the build settings — is replaced on the next
# apply, silently. Every change to the CVSpark stack goes through this repository
# and the CI apply, never through the UI.
# ==============================================================================

resource "dokploy_compose" "cvspark" {
  name           = local.project_name
  description    = "CVSpark ${var.environment} stack — managed by OpenTofu"
  environment_id = dokploy_project.cvspark.production_environment_id
  compose_type   = "docker-compose"

  # Shipped inline: Dokploy clones nothing, so no GitHub App has to be
  # registered by hand before the first apply.
  raw = {
    compose_file = file("${path.module}/../compose/dokploy-stack.yml")
  }

  # Dokploy writes these to the .env of the compose project, which is what the
  # ${...} references in dokploy-stack.yml resolve against.
  env = join("\n", [
    "IMAGE_TAG=${var.image_tag}",
    "VOLUME_PREFIX=${local.volume_prefix}",
    "LANDING_DOMAIN=${local.domains.landing}",
    "WEB_DOMAIN=${local.domains.web}",
    "API_DOMAIN=${local.domains.api}",
    "COOKIE_DOMAIN=${var.cookie_domain}",
    "AUTH_COOKIE_NAME=${local.auth_cookie_name}",
    "AUTH_MAGIC_LINK_TTL_MINUTES=${var.auth_magic_link_ttl_minutes}",
    "AUTH_SESSION_TTL_DAYS=${var.auth_session_ttl_days}",
    "AUTH_SESSION_SECRET=${var.auth_session_secret}",
    "POSTGRES_DB=${var.postgres_db}",
    "POSTGRES_USER=${var.postgres_user}",
    "POSTGRES_PASSWORD=${var.postgres_password}",
    # Unique per environment: the bare `postgres` alias is shared by staging and
    # production on `dokploy-network` (see the web service in dokploy-stack.yml).
    "POSTGRES_HOST=${local.project_name}-postgres",
    "DATABASE_URL=postgres://${var.postgres_user}:${var.postgres_password}@${local.project_name}-postgres:5432/${var.postgres_db}",
    "REDIS_URL=redis://redis:6379",
    "MINIO_ENDPOINT=http://minio:9000",
    "MINIO_ACCESS_KEY=${var.minio_access_key}",
    "MINIO_SECRET_KEY=${var.minio_secret_key}",
    "PUPPETEER_URL=http://puppeteer:3000",
    "OPENROUTER_API_KEY=${var.openrouter_api_key}",
    "OPENROUTER_MANAGEMENT_API_KEY=${var.openrouter_management_api_key}",
    "OPENROUTER_BALANCE_ALERT_THRESHOLD=${var.openrouter_balance_alert_threshold}",
    "OPENROUTER_BALANCE_CRITICAL_THRESHOLD=${var.openrouter_balance_critical_threshold}",
    "OPENROUTER_MODEL=${var.openrouter_model}",
    "INTERVIEW_STT_MODEL=${var.interview_stt_model}",
    "INTERVIEW_AI_MODEL=${var.interview_ai_model}",
    "STRIPE_SECRET_KEY=${var.stripe_secret_key}",
    "STRIPE_WEBHOOK_SECRET=${var.stripe_webhook_secret}",
    "SMTP_PROVIDER=${var.smtp_provider}",
    "SMTP_SERVER=${var.smtp_server}",
    "SMTP_PORT=${var.smtp_port}",
    "SMTP_USER=${var.smtp_user}",
    "SMTP_PASSWORD=${var.smtp_password}",
    "EMAIL_FROM=${local.email_from}",
    "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=${var.next_server_actions_encryption_key}",
  ])
}
