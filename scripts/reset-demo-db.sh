#!/usr/bin/env bash
set -euo pipefail

if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi

if [[ "${CONFIRM_DEMO_RESET:-}" != "YES" ]]; then
  echo "Refusing demo reset. Run with CONFIRM_DEMO_RESET=YES."
  exit 1
fi

mkdir -p backups/demo-reset
stamp="$(date +%Y%m%d-%H%M%S)"
backup="backups/demo-reset/xinkang-${stamp}.sql.gz"

if command -v pg_dump >/dev/null 2>&1 && [[ -n "${DATABASE_URL:-}" ]]; then
  pg_url="${DATABASE_URL%%\?*}"
  pg_dump "${pg_url}" | gzip > "${backup}"
elif docker compose ps --status running db >/dev/null 2>&1; then
  docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "${backup}"
else
  echo "No available PostgreSQL backup path; reset cancelled."
  exit 1
fi

echo "Backup written to ${backup}"
npx tsx prisma/seed.ts --reset
npm run data:check
