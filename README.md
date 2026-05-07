# Emulator Update Radar

Emulator Update Radar tracks open-source emulator updates on GitHub and notifies users when new builds are available.

[![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![GitHub stars](https://img.shields.io/github/stars/ACR-GD/emulator-update?style=social)](https://github.com/ACR-GD/emulator-update)
[![Last commit](https://img.shields.io/github/last-commit/ACR-GD/emulator-update)](https://github.com/ACR-GD/emulator-update/commits/main)

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

## Supported project examples

- PPSSPP
- PCSX2
- RPCS3
- Dolphin
- mGBA
- SameBoy
- OpenEmu
- bsnes

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

## Roadmap

- [x] GitHub release tracker (stable/nightly)
- [x] Fallbacks for tags and commits
- [x] Web dashboard with recent update feed
- [x] Bilingual UI toggle (FR/EN)
- [x] Discord webhook notifications
- [ ] Per-repository detection rules in `repos.json`
- [ ] RSS feed per emulator and global feed
- [ ] Public status page + uptime checks
- [ ] Docker image and one-command deployment
- [ ] Optional Postgres backend for multi-instance hosting

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

## Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Run `npm run typecheck` and `npm run build`
4. Open a pull request with a clear description
