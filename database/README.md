# Database

UniView uses **MongoDB** (database name `uniview`). Large files live in **GridFS** (`files.files` and `files.chunks`).

```
database/
  docker-compose.yml   MongoDB 7 (+ optional web UI) with a persistent volume
  init/01-init.js      Creates collections with schema validation and all indexes
  seed/seed.js         Demo user, folders, files, notes and tasks
  scripts/backup.sh    Compressed dump of the whole database
  scripts/restore.sh   Restore a dump
```

## Start MongoDB

```bash
npm run db:up        # from the backend folder; data survives restarts (Docker volume "uniview_mongo_data")
npm run db:tools     # also starts mongo-express at http://localhost:8081
npm run db:down      # stop (data is kept)
docker compose -f database/docker-compose.yml down -v   # stop AND delete all data
```

`init/01-init.js` runs automatically the first time the volume is created. To apply it to any other MongoDB (local install or Atlas):

```bash
mongosh "mongodb://127.0.0.1:27017/uniview" database/init/01-init.js
```

It is safe to run again. The backend creates the same indexes by itself, so the app also works on an empty database.

## Demo data

```bash
npm run seed                # adds / refreshes the demo account only
npm run seed -- --reset     # wipes ALL UniView data first
```

Demo login: `demo@uniview.app` / `Demo@1234`

## Backup and restore

```bash
./database/scripts/backup.sh                       # -> ./backups/uniview-<date>.archive.gz
./database/scripts/restore.sh ./backups/<file>     # replaces current data
```

Uses the Docker container by default. Set `MONGO_URI` to back up / restore any other server with your local `mongodump` / `mongorestore`. On Windows run the scripts from Git Bash or WSL.

## Collections

Ownership: every record has `owner` = `u:<userId>` for signed-in users or `g:<guestId>` for guests. Signing in re-labels a guest's records.

| Collection | Fields | Indexes |
|---|---|---|
| `users` | name, email (unique, lowercase), password (bcrypt hash), createdAt, updatedAt | `email` unique |
| `docs` | owner, name, ext, kind, size, content (text or data URL, small files), gridId (big files), mime, folder, favorite, lastOpened, createdAt, updatedAt | `owner+createdAt`, `owner+lastOpened`, `owner+favorite`, `owner+folder`, `owner+name` |
| `notes` | owner, docId, docName, text, createdAt, updatedAt | `owner+docId`, `owner+createdAt` |
| `todos` | owner, text, done, createdAt, updatedAt | `owner+createdAt` |
| `folders` | owner, name, createdAt, updatedAt | `owner+name` unique |
| `files.files`, `files.chunks` | GridFS storage for files over 8 MB | managed by MongoDB driver |

`docs.kind` is one of `text image audio video pdf docx xlsx pptx other`. Deleting a doc also deletes its notes and GridFS data.
