import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

// We need to test loadConfig which reads from disk, so we'll create temp files.
let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "emu-cfg-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function writeConfig(filename: string, content: unknown): Promise<string> {
  const filePath = path.join(tmpDir, filename);
  await fs.writeFile(filePath, JSON.stringify(content), "utf8");
  return filePath;
}

// Dynamic import so env vars are picked up fresh
async function loadConfigFromPath(configPath: string) {
  vi.stubEnv("REPOS_CONFIG_PATH", configPath);
  // Re-import to pick up fresh env
  const mod = await import("../config.js");
  return mod.loadConfig();
}

describe("loadConfig", () => {
  it("loads a valid config with repos", async () => {
    const configPath = await writeConfig("repos.json", {
      pollIntervalMinutes: 15,
      repos: [
        { label: "TestEmu", owner: "test", repo: "emu", watch: ["stable"] },
      ],
    });

    const config = await loadConfigFromPath(configPath);
    expect(config.pollIntervalMinutes).toBe(15);
    expect(config.repos).toHaveLength(1);
    expect(config.repos[0].label).toBe("TestEmu");
    expect(config.repos[0].watch).toEqual(["stable"]);
  });

  it("defaults pollIntervalMinutes to 10 when missing", async () => {
    const configPath = await writeConfig("repos.json", {
      repos: [
        { label: "TestEmu", owner: "test", repo: "emu", watch: ["stable"] },
      ],
    });

    const config = await loadConfigFromPath(configPath);
    expect(config.pollIntervalMinutes).toBe(10);
  });

  it("defaults pollIntervalMinutes to 10 when less than 1", async () => {
    const configPath = await writeConfig("repos.json", {
      pollIntervalMinutes: 0,
      repos: [
        { label: "TestEmu", owner: "test", repo: "emu", watch: ["stable"] },
      ],
    });

    const config = await loadConfigFromPath(configPath);
    expect(config.pollIntervalMinutes).toBe(10);
  });

  it("throws when repos array is empty", async () => {
    const configPath = await writeConfig("repos.json", {
      pollIntervalMinutes: 5,
      repos: [],
    });

    await expect(loadConfigFromPath(configPath)).rejects.toThrow(
      /aucun repo/i
    );
  });

  it("throws when repos key is missing", async () => {
    const configPath = await writeConfig("repos.json", {
      pollIntervalMinutes: 5,
    });

    await expect(loadConfigFromPath(configPath)).rejects.toThrow();
  });

  it("throws when config file does not exist", async () => {
    vi.stubEnv("REPOS_CONFIG_PATH", "/nonexistent/repos.json");
    const mod = await import("../config.js");
    await expect(mod.loadConfig()).rejects.toThrow();
  });
});
