#!/usr/bin/env bash
# Fills the 27 GitHub secrets the Deploy workflow needs.
#
#   bash set-secrets.sh
#
# Production application secrets are read from .env.prod in the repository.
# Everything else is prompted for, hidden. No value is echoed, and nothing is
# written to disk or to your shell history.
#
# Re-running is safe: `gh secret set` overwrites. Press Enter at any prompt to
# skip that secret and leave whatever is already stored untouched.

set -uo pipefail

# --auto sets only the values that resolve from the files below and skips every
# prompt, so it can run without a terminal. The rest is reported as missing.
AUTO=0
[ "${1:-}" = "--auto" ] && AUTO=1

REPO="josias-koffi/cvforge"

# Production application secrets. Verified identical to
# koklo-infra/stacks/cvforge/.env, the file the running stack was deployed from.
ENV_PROD_FILE="$(git rev-parse --show-toplevel 2>/dev/null)/.env.prod"

# Infrastructure secrets shared with the rest of the estate.
KOKLO_ENV_FILE="${KOKLO_ENV_FILE:-$HOME/perso/projets/koklo/koklo-infra/.env}"

# Stripe is deliberately absent: it is not configured on any environment, and
# infra/dokploy defaults both variables to empty. Add STRIPE_SECRET_KEY and
# STRIPE_WEBHOOK_SECRET here the day the payment features go live.
APP_SECRETS=(
  POSTGRES_PASSWORD
  MINIO_ACCESS_KEY
  MINIO_SECRET_KEY
  OPENROUTER_API_KEY
  OPENAI_API_KEY
  AUTH_SESSION_SECRET
  SMTP_USER
  SMTP_PASSWORD
  NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
)

REPO_SECRETS=(
  DOKPLOY_API_KEY
  CF_API_TOKEN
  CF_ZONE_ID
  VPS20_IP
  R2_ACCESS_KEY_ID
  R2_SECRET_ACCESS_KEY
  R2_ENDPOINT
)

ok=0
skipped=0

set_secret() {            # name, value, [env]
  local name="$1" value="$2" env="${3:-}"
  if [ -z "$value" ]; then
    printf '  · %-38s ignoré\n' "$name"
    skipped=$((skipped + 1))
    return
  fi
  # No --body: gh reads the value from standard input, so it never appears in
  # the process list or in your shell history.
  if [ -n "$env" ]; then
    printf '%s' "$value" | gh secret set "$name" --repo "$REPO" --env "$env" >/dev/null
  else
    printf '%s' "$value" | gh secret set "$name" --repo "$REPO" >/dev/null
  fi
  printf '  ✓ %-38s défini\n' "$name"
  ok=$((ok + 1))
}

read_hidden() {           # prompt -> echoes value on stdout
  local prompt="$1" value=""
  [ "$AUTO" = "1" ] && return 0      # --auto: no terminal, leave it unset
  read -rsp "  $prompt: " value </dev/tty
  printf '\n' >&2
  printf '%s' "$value"
}

# Reads KEY=value from .env.prod without sourcing it, so a stray command in the
# file cannot execute. Strips surrounding quotes.
from_env_prod() {
  local key="$1" value
  [ -f "$ENV_PROD_FILE" ] || return 0
  value="$(sed -n "s/^${key}=//p" "$ENV_PROD_FILE" | head -1 \
           | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/")"

  # .env.prod carries no POSTGRES_PASSWORD: the password lives inside
  # DATABASE_URL. It must keep matching the running cvforge_postgres_data
  # volume — Postgres stores the password in the database, and POSTGRES_PASSWORD
  # only applies when the volume is first created. Changing it locks the app out.
  if [ -z "$value" ] && [ "$key" = "POSTGRES_PASSWORD" ]; then
    value="$(sed -n 's/^DATABASE_URL=//p' "$ENV_PROD_FILE" | head -1 \
             | sed -n 's#^[a-z+]*://[^:]*:\([^@]*\)@.*#\1#p')"
  fi

  # CHANGEME and friends are template leftovers, not secrets. Refuse to store
  # them: a prompt is better than a production secret that reads "CHANGEME".
  case "$value" in
    CHANGE*|change*|REPLACE*|replace*|TODO*|todo*|xxx*|XXX*) value="" ;;
  esac

  printf '%s' "$value"
}

echo
echo "Dépôt : $REPO"
echo

# --- 1. Repository-level secrets ---------------------------------------------
echo "1/3  Secrets de dépôt (partagés par les deux environnements)"
if [ -f "$KOKLO_ENV_FILE" ]; then
  echo "     VPS20_IP, CF_API_TOKEN et CF_ZONE_ID sont lus depuis koklo-infra."
fi
echo "     Entrée vide = on garde la valeur déjà en place."
echo
for name in "${REPO_SECRETS[@]}"; do
  value=""
  case "$name" in
    VPS20_IP|CF_API_TOKEN|CF_ZONE_ID)
      [ -f "$KOKLO_ENV_FILE" ] && value="$(sed -n "s/^${name}=//p" "$KOKLO_ENV_FILE" | head -1)"
      ;;
  esac
  if [ -z "$value" ]; then
    case "$name" in
      DOKPLOY_API_KEY) hint="clé de l'UI Dokploy, Rate Limiting OFF" ;;
      R2_ENDPOINT)     hint="https://<account_id>.r2.cloudflarestorage.com" ;;
      R2_*)            hint="token R2 avec accès lecture/écriture sur koklo-tofu-state" ;;
      VPS20_IP)        hint="IPv4 publique de VPS20" ;;
      *)               hint="" ;;
    esac
    [ -n "$hint" ] && printf '     (%s)\n' "$hint"
    value="$(read_hidden "$name")"
  fi
  set_secret "$name" "$value"
done

# --- 2. Production ------------------------------------------------------------
echo
if [ -f "$ENV_PROD_FILE" ]; then
  echo "2/3  Secrets de l'environnement production, lus depuis .env.prod"
else
  echo "2/3  Secrets de l'environnement production (.env.prod introuvable — saisie)"
fi
echo
for name in "${APP_SECRETS[@]}"; do
  value="$(from_env_prod "$name")"
  if [ -z "$value" ]; then
    case "$name" in
      NEXT_SERVER_ACTIONS_ENCRYPTION_KEY|AUTH_SESSION_SECRET)
        printf '     %s est absent. Entrée vide = j'"'"'en génère un aléatoire.\n' "$name"
        value="$(read_hidden "$name")"
        if [ -z "$value" ]; then
          value="$(openssl rand -base64 32)"
          printf '     → généré\n'
        fi
        ;;
      *)
        value="$(read_hidden "$name (absent ou placeholder dans .env.prod)")"
        ;;
    esac
  fi
  set_secret "$name" "$value" production
done

# --- 3. Staging ---------------------------------------------------------------
echo
echo "3/3  Secrets de l'environnement staging"
echo "     Doivent différer de production. STRIPE_SECRET_KEY : clé de test."
echo
for name in "${APP_SECRETS[@]}"; do
  value=""
  case "$name" in
    # Nothing constrains these: the cvspark-staging_* volumes do not exist yet,
    # so the values are created along with them. Generate rather than ask.
    POSTGRES_PASSWORD|MINIO_SECRET_KEY|AUTH_SESSION_SECRET|NEXT_SERVER_ACTIONS_ENCRYPTION_KEY)
      value="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-32)"
      printf '     %s → généré\n' "$name"
      ;;
    MINIO_ACCESS_KEY)
      value="cvspark-staging"
      printf '     %s → cvspark-staging\n' "$name"
      ;;
    *)
      value="$(read_hidden "$name")"
      ;;
  esac
  set_secret "$name" "$value" staging
done

echo
echo "$ok définis, $skipped ignorés."
echo
echo "Vérification :"
echo "  gh secret list --repo $REPO"
echo "  gh secret list --repo $REPO --env production"
echo "  gh secret list --repo $REPO --env staging"
