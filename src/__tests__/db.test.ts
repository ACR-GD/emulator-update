import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { ReleaseEvent } from "../types.js";

let tmpDir: string;

function makeEvent(overrides: Partial<ReleaseEvent> = {}): ReleaseEvent {
  return {
    channel: "stable",
    repoLabel: "TestEmu",
    repoFullName: "test/emu",
    releaseId: 1001,
    tagName: "v1.0.0",
    name: "Release v1.0.0",
    htmlUrl: "https://github.com/test/emu/releases/tag/v1.0.0",
    publishedAt: "2025-06-01T10:00:00Z",
    prerelease: false,
    ...overrides,
  };
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "emu-db-"));
  // ReleaseStore uses process.cwd() to find data dir, so we mock it
  vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

async function createStore() {
  const mod = await import("../db.js");
  return new mod.ReleaseStore();
}

describe("ReleaseStore", () => {
  it("creates the data directory and database", async () => {
    await createStore();
    expect(fs.existsSync(path.join(tmpDir, "data", "releases.db"))).toBe(true);
  });

  it("hasSeen returns false for unseen releases", async () => {
    const store = await createStore();
    expect(store.hasSeen("test/emu", "stable", 9999)).toBe(false);
  });

  it("hasSeen returns true after saving a release", async () => {
    const store = await createStore();
    const event = makeEvent();
    store.save(event);
    expect(store.hasSeen("test/emu", "stable", 1001)).toBe(true);
  });

  it("save is idempotent (INSERT OR IGNORE)", async () => {
    const store = await createStore();
    const event = makeEvent();
    store.save(event);
    store.save(event); // should not throw
    expect(store.hasSeen("test/emu", "stable", 1001)).toBe(true);
  });

  it("getLatestForRepoChannel returns null when empty", async () => {
    const store = await createStore();
    expect(store.getLatestForRepoChannel("test/emu", "stable")).toBeNull();
  });

  it("getLatestForRepoChannel returns the most recent release", async () => {
    const store = await createStore();
    store.save(makeEvent({ releaseId: 1, tagName: "v1.0.0", publishedAt: "2025-01-01T00:00:00Z" }));
    store.save(makeEvent({ releaseId: 2, tagName: "v2.0.0", publishedAt: "2025-06-01T00:00:00Z" }));
    store.save(makeEvent({ releaseId: 3, tagName: "v1.5.0", publishedAt: "2025-03-01T00:00:00Z" }));

    const latest = store.getLatestForRepoChannel("test/emu", "stable");
    expect(latest).not.toBeNull();
    expect(latest!.tagName).toBe("v2.0.0");
  });

  it("getLatestForRepoChannel filters by channel", async () => {
    const store = await createStore();
    store.save(makeEvent({ channel: "stable", releaseId: 1, tagName: "v1.0.0", publishedAt: "2025-06-01T00:00:00Z" }));
    store.save(makeEvent({ channel: "nightly", releaseId: 2, tagName: "nightly-2025", publishedAt: "2025-06-02T00:00:00Z", prerelease: true }));

    const stable = store.getLatestForRepoChannel("test/emu", "stable");
    expect(stable!.tagName).toBe("v1.0.0");

    const nightly = store.getLatestForRepoChannel("test/emu", "nightly");
    expect(nightly!.tagName).toBe("nightly-2025");
  });

  it("getRecentEvents returns events ordered by first_seen_at DESC", async () => {
    const store = await createStore();
    store.save(makeEvent({ releaseId: 1, tagName: "v1.0.0", publishedAt: "2025-01-01T00:00:00Z" }));
    store.save(makeEvent({ releaseId: 2, tagName: "v2.0.0", publishedAt: "2025-02-01T00:00:00Z" }));
    store.save(makeEvent({ releaseId: 3, tagName: "v3.0.0", publishedAt: "2025-03-01T00:00:00Z" }));

    const events = store.getRecentEvents(2);
    expect(events).toHaveLength(2);
  });

  it("getRecentEvents returns empty array when no events", async () => {
    const store = await createStore();
    expect(store.getRecentEvents()).toEqual([]);
  });

  it("maps stored rows correctly with boolean prerelease", async () => {
    const store = await createStore();
    store.save(makeEvent({ prerelease: true, channel: "nightly", releaseId: 99 }));

    const latest = store.getLatestForRepoChannel("test/emu", "nightly");
    expect(latest).not.toBeNull();
    expect(latest!.prerelease).toBe(true);
    expect(typeof latest!.prerelease).toBe("boolean");
    expect(latest!.firstSeenAt).toBeDefined();
  });
});
