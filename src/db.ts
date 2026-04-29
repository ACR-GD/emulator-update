import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { ReleaseChannel, ReleaseEvent, StoredReleaseEvent } from "./types.js";

interface SeenRelease {
  release_id: number;
}

interface ReleaseEventRow {
  channel: ReleaseChannel;
  repo_label: string;
  repo_full_name: string;
  release_id: number;
  tag_name: string;
  name: string;
  html_url: string;
  published_at: string;
  prerelease: number;
  first_seen_at: string;
}

export class ReleaseStore {
  private readonly db: Database.Database;

  constructor() {
    const dataDir = path.resolve(process.cwd(), "data");
    fs.mkdirSync(dataDir, { recursive: true });
    this.db = new Database(path.join(dataDir, "releases.db"));
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS seen_releases (
        repo_full_name TEXT NOT NULL,
        channel TEXT NOT NULL,
        release_id INTEGER NOT NULL,
        tag_name TEXT NOT NULL,
        published_at TEXT NOT NULL,
        first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (repo_full_name, channel, release_id)
      );

      CREATE TABLE IF NOT EXISTS release_events (
        repo_full_name TEXT NOT NULL,
        repo_label TEXT NOT NULL,
        channel TEXT NOT NULL,
        release_id INTEGER NOT NULL,
        tag_name TEXT NOT NULL,
        name TEXT NOT NULL,
        html_url TEXT NOT NULL,
        published_at TEXT NOT NULL,
        prerelease INTEGER NOT NULL,
        first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (repo_full_name, channel, release_id)
      );
    `);
  }

  hasSeen(repoFullName: string, channel: ReleaseChannel, releaseId: number): boolean {
    const row = this.db
      .prepare(
        `
        SELECT release_id
        FROM release_events
        WHERE repo_full_name = ? AND channel = ? AND release_id = ?
      `
      )
      .get(repoFullName, channel, releaseId) as SeenRelease | undefined;

    return Boolean(row);
  }

  save(event: ReleaseEvent): void {
    this.db
      .prepare(
        `
        INSERT OR IGNORE INTO release_events (
          repo_full_name,
          repo_label,
          channel,
          release_id,
          tag_name,
          name,
          html_url,
          published_at,
          prerelease
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        event.repoFullName,
        event.repoLabel,
        event.channel,
        event.releaseId,
        event.tagName,
        event.name,
        event.htmlUrl,
        event.publishedAt,
        event.prerelease ? 1 : 0
      );
  }

  getLatestForRepoChannel(
    repoFullName: string,
    channel: ReleaseChannel
  ): StoredReleaseEvent | null {
    const row = this.db
      .prepare(
        `
        SELECT *
        FROM release_events
        WHERE repo_full_name = ? AND channel = ?
        ORDER BY published_at DESC
        LIMIT 1
      `
      )
      .get(repoFullName, channel) as ReleaseEventRow | undefined;

    if (!row) {
      return null;
    }

    return this.mapRow(row);
  }

  getRecentEvents(limit = 30): StoredReleaseEvent[] {
    const rows = this.db
      .prepare(
        `
        SELECT *
        FROM release_events
        ORDER BY first_seen_at DESC
        LIMIT ?
      `
      )
      .all(limit) as ReleaseEventRow[];

    return rows.map((row) => this.mapRow(row));
  }

  private mapRow(row: ReleaseEventRow): StoredReleaseEvent {
    return {
      channel: row.channel,
      repoLabel: row.repo_label,
      repoFullName: row.repo_full_name,
      releaseId: row.release_id,
      tagName: row.tag_name,
      name: row.name,
      htmlUrl: row.html_url,
      publishedAt: row.published_at,
      prerelease: Boolean(row.prerelease),
      firstSeenAt: row.first_seen_at
    };
  }
}
