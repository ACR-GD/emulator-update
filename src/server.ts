import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { ReleaseStore } from "./db.js";
import { AppConfig } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function startDashboardServer(config: AppConfig, store: ReleaseStore): void {
  const app = express();
  const publicDir = path.resolve(__dirname, "../public");
  const port = Number(process.env.PORT ?? 3030);

  app.use(express.static(publicDir));

  app.get("/api/overview", (_req, res) => {
    const repos = config.repos.map((repo) => {
      const repoFullName = `${repo.owner}/${repo.repo}`;
      return {
        label: repo.label,
        repoFullName,
        stable: store.getLatestForRepoChannel(repoFullName, "stable"),
        nightly: store.getLatestForRepoChannel(repoFullName, "nightly")
      };
    });

    const recent = store.getRecentEvents(40);
    res.json({
      updatedAt: new Date().toISOString(),
      pollIntervalMinutes: config.pollIntervalMinutes,
      repos,
      recent
    });
  });

  app.use((_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });

  app.listen(port, () => {
    console.log(`Dashboard dispo sur http://localhost:${port}`);
  });
}
