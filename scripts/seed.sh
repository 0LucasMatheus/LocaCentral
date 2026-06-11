#!/usr/bin/env bash
set -e

CONTAINER="locacentral-api-1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "→ Copiando seed.mjs para o container $CONTAINER..."
docker cp "$SCRIPT_DIR/seed.js" "$CONTAINER:/usr/app/seed.mjs"

echo "→ Executando seed..."
docker exec \
  -e MONGO_URL="mongodb://mongo/mredb" \
  "$CONTAINER" \
  node /usr/app/seed.mjs

echo "→ Limpando seed.mjs do container..."
docker exec "$CONTAINER" rm /usr/app/seed.mjs

echo "✔ Feito!"
