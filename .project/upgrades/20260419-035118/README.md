# cvforge

<!-- generated-by: /init-project -->

## Multi-Agent Workflow

This project uses an agent-driven workflow. See:

- `.claude/CLAUDE.md` — entry point for Claude Code sessions
- `AGENTS.md` — entry point for Codex CLI sessions
- `spec/engineering-standards.md` — non-negotiable engineering rules
- `agents/<role>/` — agent definitions and memory
- `workflows/` — named workflows (analyze-design-dev-review, bug-triage, spike-research, release)
- `sprints/` — backlog and active sprint files

Run a sprint:

```
/sprint 001 developer analyze-design-dev-review US-001
```

## Production Compose

`docker-compose.prod.yml` is the production override for the local stack. It keeps the same application services, adds a `traefik` reverse proxy, redirects `:80` to `:443`, and obtains TLS certificates through Let's Encrypt.

Expected host mapping:

- `LANDING_DOMAIN` → `landing`
- `APP_DOMAIN` → `app`
- `API_DOMAIN` → `api`

Required production environment variables are documented in [.env.example](/home/devops/perso/projets/cvforge/.env.example). At minimum, production deploys must set the public domains, `LETSENCRYPT_EMAIL`, and the runtime secrets used by the API (`DATABASE_URL`, `REDIS_URL`, `MINIO_*`, `OPENROUTER_API_KEY`, `MISTRAL_API_KEY`, `STRIPE_SECRET_KEY`).

To inspect the merged production configuration locally:

```bash
docker compose --env-file .env.example -f docker-compose.yml -f docker-compose.prod.yml config
```
