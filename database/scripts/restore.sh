#!/usr/bin/env sh
# Restores a backup made by backup.sh. WARNING: replaces the current data.
#   ./database/scripts/restore.sh ./backups/uniview-YYYYMMDD-HHMMSS.archive.gz
set -e
FILE="$1"
[ -f "$FILE" ] || { echo "Usage: $0 <backup-file.archive.gz>"; exit 1; }
if [ -n "$MONGO_URI" ]; then
  mongorestore --uri "$MONGO_URI" --archive="$FILE" --gzip --drop
else
  docker exec -i uniview-mongo mongorestore --archive --gzip --drop < "$FILE"
fi
echo "Restore complete."
