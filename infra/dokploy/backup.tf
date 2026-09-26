# Off-site backups, independent of the on-VPS `db_backup` sidecar.
#
# One destination + two schedules per environment (this file is shared by both
# states, same as everywhere else in this module): a database dump (Postgres,
# via Dokploy's own dump command) and a volume archive of `api_data` (the JSON
# state — credits, offers — that pg_dump does not cover). Both land in the same
# R2 bucket, under a prefix that keeps `staging` and `production` apart even
# though each environment applies from its own state.

resource "dokploy_destination" "backups" {
  name              = "R2 backups — ${var.environment}"
  provider_name     = "Cloudflare"
  endpoint          = var.r2_backup_endpoint
  bucket            = var.r2_backup_bucket
  region            = var.r2_backup_region
  access_key        = var.r2_backup_access_key
  secret_access_key = var.r2_backup_secret_access_key
}

resource "dokploy_backup" "postgres" {
  destination_id = dokploy_destination.backups.id

  service_type          = "compose"
  service_id            = dokploy_compose.cvspark.id
  service_name          = "postgres"
  compose_database_type = "postgres"
  compose_database_user = var.postgres_user
  database              = var.postgres_db

  # Offset from the on-VPS sidecar's `@daily` (~midnight) so the two dumps
  # never fight Postgres for I/O at the same time.
  cron_expression        = "0 3 * * *"
  prefix                 = "db/${var.environment}/"
  keep_latest_count      = 14
  include_encryption_key = true
}

resource "dokploy_volume_backup" "api_data" {
  name           = "api_data — ${var.environment}"
  destination_id = dokploy_destination.backups.id

  service_type = "compose"
  service_id   = dokploy_compose.cvspark.id
  service_name = "api"
  volume_name  = "${local.volume_prefix}_api_data"

  cron_expression   = "0 4 * * *"
  prefix            = "api-data/${var.environment}/"
  keep_latest_count = 14
}
