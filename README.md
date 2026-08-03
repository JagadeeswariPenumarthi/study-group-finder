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
