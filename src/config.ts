import { readFile } from "node:fs/promises";
import path from "node:path";
import { AppConfig } from "./types.js";

const DEFAULT_CONFIG_FILE = "repos.json";

export async function loadConfig(): Promise<AppConfig> {
  const configPath = path.resolve(process.cwd(), process.env.REPOS_CONFIG_PATH ?? DEFAULT_CONFIG_FILE);
  const raw = await readFile(configPath, "utf8");
  const parsed = JSON.parse(raw) as AppConfig;

  if (!parsed.repos?.length) {
    throw new Error("Le fichier de config ne contient aucun repo a surveiller.");
  }

  if (!parsed.pollIntervalMinutes || parsed.pollIntervalMinutes < 1) {
    parsed.pollIntervalMinutes = 10;
  }

  return parsed;
}
