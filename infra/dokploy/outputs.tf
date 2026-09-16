output "environment" {
  description = "Environment this state manages"
  value       = var.environment
}

output "project_id" {
  description = "Id of the Dokploy project"
  value       = dokploy_project.cvspark.id
}

output "environment_id" {
  description = "Id of the default environment inside the project, which holds the stack"
  value       = dokploy_project.cvspark.production_environment_id
}

output "compose_id" {
  description = "Compose service id, for terraform import and for the Dokploy UI"
  value       = dokploy_compose.cvspark.id
}

output "compose_status" {
  description = "Last status Dokploy reported for the stack"
  value       = dokploy_compose.cvspark.status
}

output "urls" {
  description = "Public URLs served by this environment"
  value = {
    landing = "https://${local.domains.landing}"
    web     = "https://${local.domains.web}"
    api     = "https://${local.domains.api}"
  }
}
