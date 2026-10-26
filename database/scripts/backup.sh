#!/usr/bin/env sh
# Creates a compressed backup of the whole UniView database (including uploaded big files).
#   ./database/scripts/backup.sh [output-folder]
# Uses the Docker container by default. If MONGO_URI is set it uses your local mongodump instead.
set -e
OUT="${1:-./backups}"
FILE="$OUT/uniview-$(date +%Y%m%d-%H%M%S).archive.gz"
mkdir -p "$OUT"
if [ -n "$MONGO_URI" ]; then
  mongodump --uri "$MONGO_URI" --archive="$FILE" --gzip
else
  docker exec uniview-mongo mongodump --db uniview --archive --gzip > "$FILE"
fi
echo "Backup saved to $FILE"
