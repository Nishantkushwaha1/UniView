# UniView API

Base URL: `http://localhost:5000/api` &nbsp;·&nbsp; All bodies are JSON unless stated. Errors look like `{ "error": "message" }`.

## Who is calling?

Every route except `/health`, `/files/:id` and `/auth/login|register` needs **one** of:

| Header | Meaning |
|---|---|
| `Authorization: Bearer <token>` | A signed-in user (token from login/register, valid 30 days) |
| `x-guest-id: <16-64 chars [A-Za-z0-9_-]>` | A guest. The browser generates a UUID once and keeps it. Guests only see their own data. |

An invalid or expired token returns `401`. Data is always scoped to the caller; other people's ids return `404`.

## Health

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{ status, db, uptime, time }`. `503` when the database is down. Public. |

## Auth

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/auth/register` | `{ name, email, password (6-72), guestId? }` | `201 { token, user }`. Pass `guestId` to move that guest's data into the new account. |
| POST | `/auth/login` | `{ email, password, guestId? }` | `{ token, user }` |
| GET | `/auth/me` | | `{ _id, name, email, createdAt }` (accounts only) |
| PATCH | `/auth/me` | `{ name }` | updated user |
| POST | `/auth/password` | `{ currentPassword, newPassword }` | `{ ok: true }` |
| DELETE | `/auth/me` | `{ password }` | Deletes the account and **all** its data |

Register/login are rate limited (40 per 15 min per IP).

## Documents

| Method | Path | Notes |
|---|---|---|
| GET | `/docs` | Query: `search`, `favorite=1`, `recent=1` (last 20), `folder`, `kind`, `sort` (`newest` `oldest` `name` `size` `opened`), `page`, `limit` (max 100, default 50). Returns `{ items, total, page, pages }`. Never includes file content. |
| POST | `/docs` | `{ name, content, folder? }` for files up to 8 MB. Text files: `content` is the text. Anything else: a data URL (`data:image/png;base64,...`). Type and size are detected by the server. `201` |
| POST | `/docs/upload` | `multipart/form-data` with `file` and optional `folder`. Up to 200 MB, stored in GridFS. Text/code files over 8 MB are refused. `201` |
| GET | `/docs/:id` | Full document including `content`. Also marks it as recently opened. |
| PATCH | `/docs/:id` | Any of `{ content, favorite, folder, name }`. `content` only for text files. Renames keep the original extension. |
| DELETE | `/docs/:id` | Removes the file, its GridFS data and its notes |
| GET | `/docs/:id/file` | Raw bytes of a GridFS file. Supports `Range` requests. |
| GET | `/docs/:id/download` | Any file as an attachment |
| POST | `/docs/:id/link` | `{ path, expiresIn }`: a 1-hour signed link for `<audio>`/`<video>` tags (they cannot send headers) |
| GET | `/files/:id?t=<token>` | Streams the file for a signed link. No other auth needed. |

`kind` is one of `text image audio video pdf docx xlsx pptx other`.

## Folders

| Method | Path | Notes |
|---|---|---|
| GET | `/folders` | `[{ name, count, size }]`. `General` always exists. Includes empty folders. |
| POST | `/folders` | `{ name }` → `201`. `409` if it exists. |
| PATCH | `/folders/:name` | `{ name }` renames (merges if the target exists). `General` cannot be renamed. |
| DELETE | `/folders/:name` | Files move to `General`. Returns `{ ok, moved }`. |

## Notes

| Method | Path | Notes |
|---|---|---|
| GET | `/notes` | Query: `docId`, `search` |
| POST | `/notes` | `{ docId, text }` (max 5000 chars) |
| PATCH | `/notes/:id` | `{ text }` |
| DELETE | `/notes/:id` | |

## To-dos

| Method | Path | Notes |
|---|---|---|
| GET | `/todos` | |
| POST | `/todos` | `{ text }` (max 500) |
| PATCH | `/todos/:id` | `{ done?, text? }` |
| DELETE | `/todos/:id` | |
| DELETE | `/todos?completed=1` | Clears finished tasks. Returns `{ ok, deleted }`. |

## Dashboard and search

| Method | Path | Notes |
|---|---|---|
| GET | `/stats` | `{ totalDocs, totalSize, favorites, notes, todos: { open, done }, folders, byKind: [{ kind, count, size }] }` |
| GET | `/search?q=` | `{ q, docs, notes }`: file names and note text (case-insensitive, max 30 each) |

## Status codes

`200/201` ok · `400` invalid input · `401` not signed in / expired · `404` not found · `409` already exists · `413` too large · `429` rate limited · `503` database or storage not ready.
