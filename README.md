# StudyCircle — Peer Study Group Finder

Find, create and join peer study groups by subject. Built with **Node.js + Express.js** (backend) and **HTML + CSS + vanilla JavaScript** (frontend). No database required — data persists to a local JSON file (and runs in-memory on serverless platforms like Vercel).

This replaces the previous Spring Boot version of this repository.

## Features

- 📚 10 subjects — browse groups by Mathematics, CS, Physics, Chemistry, Biology, and more
- 🔎 Live search + subject filters across all groups
- 🤝 Join a group with just your name & email (capacity-aware, double-join protected)
- ➕ Create a study group with schedule, location and max-member limits
- 📋 My Groups — bookmarks saved on your device + membership lookup by email
- 📊 Group detail modal with member roster and Lead/Member roles
- 🧮 Admin-style stats endpoint (`/api/stats`) for dashboards
- 📱 Fully responsive UI

## Run locally

```bash
npm install
npm start
```

Open http://localhost:3000 (or the `PORT` env var if set).

- Groups and students are stored in `data/study-groups.json` (gitignored).
- `npm run dev` is an alias for `npm start`.

## Deploy to Vercel

The repo is Vercel-ready (see `vercel.json` + `api/index.js`):

1. Push to GitHub, then go to **https://vercel.com/new** and **Import** the repository.
2. Vercel auto-detects **Express** (Framework: *Other*). Leave Build Command / Output Directory empty.
3. Click **Deploy** — every future push auto-redeploys.

**Via CLI:**
```bash
npm i -g vercel
vercel --prod
```

> **Note on data:** Vercel serverless functions have a read-only filesystem (except ephemeral `/tmp`). The app detects this and runs with in-memory storage — it fully works, but groups reset on cold starts. For durable data, add a free database (Neon / MongoDB Atlas) — the Express layer is ready to be pointed at one.

## API reference

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/api/subjects` | List of study subjects |
| GET | `/api/groups?subject=&q=` | Groups (filtered & searchable) |
| GET | `/api/groups/:id` | Single group with member roster |
| POST | `/api/groups` | Create a study group |
| POST | `/api/groups/:id/join` | Join a group (name + email) |
| POST | `/api/groups/:id/leave` | Leave a group |
| GET | `/api/students?subject=&q=` | Registered students |
| POST | `/api/students` | Register as a student |
| GET | `/api/stats` | Dashboard statistics |
