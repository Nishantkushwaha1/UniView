# UniView - Universal Document Workspace

Open, edit and organise every kind of document in one place: PDF, Word, Excel, PowerPoint, code, text,
images, audio and video. Add notes, star favorites, keep files in folders and pick up where you left off.

**Stack:** React 18 + Vite + Tailwind (frontend) - Node.js + Express (API) - MongoDB + GridFS (database)

```
uniview/
  frontend/   React app (dashboard, viewer, editor, tools)
  backend/    Express REST API (auth, files, folders, notes, todos, stats, search) + tests
  database/   Docker Compose for MongoDB, schema + index init script, demo seed data, backup/restore
```

## Quick start

You need **Node.js 18+** and **MongoDB** (Docker is the easiest way). All commands run from the **backend** folder.

```bash
cd backend

# 1. install everything (backend + frontend)
npm run setup

# 2. start MongoDB (Docker)
npm run db:up
#    no Docker? install MongoDB locally, or use a free MongoDB Atlas cluster and put its
#    connection string in .env as MONGO_URI

# 3. configure
cp .env.example .env                       # Windows: copy .env.example .env
cp ../frontend/.env.example ../frontend/.env     # Windows: copy ..\frontend\.env.example ..\frontend\.env

# 4. (optional) demo data
npm run seed           # login: demo@uniview.app / Demo@1234

# 5. run backend + frontend together
npm run dev:all
```

- App: http://localhost:5173
- API: http://localhost:5000  (health check: http://localhost:5000/api/health)
- Optional database web UI: `npm run db:tools` then http://localhost:8081

API docs: `backend/API.md` and `backend/api.http`.

Run the services separately with `npm run dev` and `npm run dev:frontend` if you prefer.

## Features

- **Dashboard** with stats, storage breakdown and "continue where you left off"
- **Viewers** for text/code (editor with line numbers, auto-save, Ctrl+F, go-to-line, Ctrl+S), PDF, images, audio, video, and
  in-browser previews of **DOCX, XLSX and PPTX**
- Drag and drop files anywhere, multi-file upload with progress, files up to **200 MB** (large files are streamed from GridFS, video/audio can seek)
- Folders (create, rename, delete), favorites, recent files, sorting, type filters, grid and list layouts
- Notes per file, to-do list, calculator, Pomodoro timer
- Search across file names and notes (press `/`)
- Light and dark theme, responsive layout down to phones
- Optional accounts (sign in, sign up, forgot/reset password) and **Continue as guest**: signing in is never required.
  Guest files are private to the browser tab and are **deleted when the tab is closed**; only signed-in users keep their files (guest files opened before signing in move into the account)
- Settings: edit profile, change password, delete account, server status

## Scripts (run in `backend/`)

| Command | What it does |
|---|---|
| `npm run dev:all` | Backend and frontend together with auto-reload |
| `npm run build` | Production build of the frontend (`frontend/dist`) |
| `npm test` | Backend integration tests (needs MongoDB; uses the `uniview_test` database) |
| `npm run seed` | Fills the database with demo data (`-- --reset` wipes everything first) |
| `npm run db:up` / `db:down` | Start / stop MongoDB in Docker |

## Configuration

`backend/.env`

| Variable | Meaning |
|---|---|
| `PORT` | API port (default 5000) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random string used to sign login tokens. **Required in production.** |
| `CLIENT_URL` | Allowed frontend origin(s), comma separated. Leave empty in development. |
| `NODE_ENV` | `development` or `production` |
| `APP_URL` | Public address of the frontend, used in password reset links (defaults to `CLIENT_URL`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Email server for password reset mails. Without it the reset link is printed in the API console (and returned by the API outside production) |

`frontend/.env`: `VITE_API` is the API address and must end with `/api`.

## Deploying

1. Set `NODE_ENV=production`, a strong `JWT_SECRET`, your `MONGO_URI` and `CLIENT_URL=https://your-site` in the backend environment, then `npm start --prefix backend`.
2. Build the frontend with `VITE_API=https://your-api/api npm run build` and host `frontend/dist` on any static host
   (the app uses hash routes, so no special rewrite rules are needed).
3. Behind a proxy such as Nginx, allow request bodies of at least 200 MB on `/api/docs/upload`.

## Notes

- Files up to 8 MB are stored inside MongoDB documents; larger ones go to GridFS. Text and code files over 8 MB cannot be opened.
- DOCX, XLSX and PPTX are *previews*: Excel shows a real spreadsheet grid (colours, fonts, borders, merged cells, number formats, several sheets), PowerPoint shows slides with their shapes, images and tables (pptx-preview), Word shows text, tables and images. Complex animations, charts and some fonts may differ from the original app. Old `.xls` files show a plain table.
- Not built yet: PDF highlights/bookmarks, split-view compare, AI summary, calendar.
