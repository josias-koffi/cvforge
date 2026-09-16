# One project per environment, each in its own state. Dokploy creates the
# default `production` environment with the project, so `dokploy_environment` is
# not needed: services reference `production_environment_id`.
#
# The provider warns against deriving the environment id from the `environments`
# list — a project update marks that list unknown at plan time, and an unknown
# environment_id forces a replacement of every service under it.
resource "dokploy_project" "cvspark" {
  name        = local.project_name
  description = "CVSpark ${var.environment} — managed by OpenTofu in infra/dokploy. Do not edit in the Dokploy UI."
}
