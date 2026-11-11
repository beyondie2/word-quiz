# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Korean-language English-study web app (영단어 외우기 앱): vocabulary quiz, grammar drills, block-based sentence writing (블럭영작), spoken-sentence "web book", exam-sheet PDF generation, and a progress viewer for students/teachers/admins. Product spec lives in [docs/PRD.md](docs/PRD.md) (Korean). UI text, comments, and commit messages are in Korean — keep that convention.

Two independent npm projects, no root package.json, no test suite:
- `server/` — Node.js + Express (ESM), PostgreSQL via `pg`
- `ui/` — React 19 + Vite (plain JS, no TypeScript)

## Commands

```bash
# Backend (port 3000, needs server/.env)
cd server && npm install
npm run dev        # nodemon
npm start
npm run db:init    # applies src/db/schema.sql

# Frontend (port 5173; proxies /api -> localhost:3000)
cd ui && npm install
npm run dev
npm run build
npm run lint       # eslint (the only lint/check available)
```

One-off DB scripts are run directly: `node src/db/<script>.js` from `server/` (e.g. `node src/db/import-words.js path/to/words.csv`, `node src/db/grant-admin.js`).

## Environment

- Server: `DATABASE_URL` (Render-style, SSL on) **or** `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD` (SSL auto-enabled when host isn't localhost); `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `PORT`. See [server/src/config/database.js](server/src/config/database.js). Note `db/init.js` builds its own pool from the `DB_*` vars only.
- UI: `VITE_API_URL` (defaults to `/api`), `VITE_SURVEY_FORM_URL` (Google Form embedded in the survey tab).
- UI deploys as a static SPA (`ui/public/_redirects`, `_headers` — Netlify/Cloudflare Pages style); backend targets Render.

## Architecture

**Backend** — [server/src/index.js](server/src/index.js) mounts one router per feature under `/api/*` (`auth`, `users`, `books`, `quiz`, `progress`, `admin`, `grammar`, `blocks`, `spoken`, `exam-papers`). Routes use raw SQL with the shared `pool`; there is no ORM or service layer. `utils/trimHelper.js` trims string inputs; `utils/examSheetPdf.js` renders exam sheets with pdfkit using the bundled NanumGothic fonts in `server/fonts/`.

**Auth is split in two styles** — know which one a route uses before editing:
- JWT (access + refresh tokens) in [server/src/middleware/auth.js](server/src/middleware/auth.js), used by `/api/auth/*`.
- Most other routes (admin, progress, users) identify the caller by an `adminId` / `requesterId` / `userId` passed in query or body, then look up `is_admin` / `role` in the DB (e.g. `checkAdmin` in `routes/admin.js`).

**Roles** — `users.is_admin` (boolean) plus `users.role` (`teacher` | `student`). Students link to a teacher via `teacher_id` / `teacher_email`. Progress visibility rules are centralized in `resolveProgressScope` in [server/src/utils/progressViewer.js](server/src/utils/progressViewer.js): teacher → own students, admin → all, otherwise self.

**Data model** — content tables (`books`, `grammar`, `blocks`, `spoken_sentence`, `exam_questions`, `exam_papers`) each have a matching `*_progress` table that stores denormalized copies of the question fields plus `is_correct`, `wrong_answer`, `round`. Content is loaded mainly via admin Excel/CSV uploads (multer memory storage + `xlsx`), replaced/deleted by group key (book name, category1, exam scope, etc.).

**Schema changes** — `schema.sql` is the full current schema (`CREATE TABLE IF NOT EXISTS`). Existing databases are evolved by standalone `src/db/migrate-add-*.js` scripts (idempotent, run manually). When changing the schema, update `schema.sql` **and** add a migration script.

**Frontend** — essentially the whole app is a single component in [ui/src/App.jsx](ui/src/App.jsx) (~5000 lines) with styles in `App.css`. There's no router or state library: an `activeTab` state switches screens (`quiz`, `review`, `grammar`, `blockwriting`, `webbook`, `createProblem`, `survey`, `admin`), and all API calls are inline `fetch(`${API_BASE}/...`)` calls. Tokens are kept in `localStorage` (`accessToken`, `refreshToken`).
