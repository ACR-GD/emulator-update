# Emulator Update Radar

Emulator Update Radar tracks open-source emulator updates on GitHub and notifies users when new builds are available.

It supports:

- Stable and nightly channels
- Desktop notifications (macOS)
- Optional Discord notifications
- A bilingual dashboard (French/English toggle)
- Persistent history with SQLite

## Why this project

Emulator communities often follow many projects at once (PPSSPP, PCSX2, RPCS3, Dolphin, mGBA, and more). This project provides one simple place to monitor update activity and quickly discover new releases.

## Features

- Polls GitHub on a configurable schedule
- Detects updates from:
  - Releases (primary source)
  - Tags (fallback)
  - Latest commit (final fallback for repos with no releases/tags)
- Stores known events in `data/releases.db`
- Exposes a web dashboard at `http://localhost:3030`
- Exposes API endpoint: `/api/overview`

## Quick Start

```bash
npm install
cp .env.example .env
cp repos.example.json repos.json
npm run dev
```

Open:

```bash
http://localhost:3030
```

## Configuration

### Environment variables

Edit `.env`:

- `GITHUB_TOKEN` (recommended to avoid low API rate limits)
- `DISCORD_WEBHOOK_URL` (optional)
- `REPOS_CONFIG_PATH` (default: `repos.json`)

### Repository list

Edit `repos.json`:

- `pollIntervalMinutes`: polling interval
- `repos[]`: emulator repositories to track
- `watch`: channels to track (`stable`, `nightly`)

## Scripts

- `npm run dev`: run in development mode
- `npm run typecheck`: TypeScript checks
- `npm run build`: compile to `dist/`
- `npm start`: run compiled app

## Deployment

DigitalOcean deployment instructions are available in `DEPLOY.md`, including:

- PM2 process management
- Nginx reverse proxy
- HTTPS via Certbot
- SQLite persistence and backup basics

## Tech Stack

- Node.js + TypeScript
- Octokit (GitHub API)
- better-sqlite3
- Express
- node-cron
- node-notifier

## License

This project currently has no explicit license file yet.
If you plan to accept public contributions, add a license (MIT is a good default).
