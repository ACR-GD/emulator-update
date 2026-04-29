import "dotenv/config";
import cron from "node-cron";
import { loadConfig } from "./config.js";
import { ReleaseStore } from "./db.js";
import { GithubReleaseChecker } from "./github.js";
import { UpdateNotifier } from "./notifier.js";
import { startDashboardServer } from "./server.js";
import { ReleaseEvent, RepoConfig, ReleaseChannel } from "./types.js";

async function runCheck(
  repos: RepoConfig[],
  checker: GithubReleaseChecker,
  store: ReleaseStore,
  notifier: UpdateNotifier
) {
  for (const repo of repos) {
    for (const channel of repo.watch) {
      await checkOne(repo, channel, checker, store, notifier);
    }
  }
}

async function checkOne(
  repo: RepoConfig,
  channel: ReleaseChannel,
  checker: GithubReleaseChecker,
  store: ReleaseStore,
  notifier: UpdateNotifier
) {
  try {
    const latest = await checker.fetchLatestForChannel(repo, channel);
    if (!latest) {
      return;
    }

    if (!store.hasSeen(latest.repoFullName, latest.channel, latest.releaseId)) {
      store.save(latest);
      await notifier.notify(latest);
      logEvent(latest, "NOUVEAU");
      return;
    }

    logEvent(latest, "deja vu");
  } catch (error) {
    console.error(`[${repo.owner}/${repo.repo}] erreur check ${channel}:`, error);
  }
}

function logEvent(event: ReleaseEvent, status: string): void {
  const stamp = new Date().toISOString();
  console.log(
    `[${stamp}] ${status} | ${event.repoLabel} | ${event.channel} | ${event.tagName} | ${event.htmlUrl}`
  );
}

async function main() {
  const config = await loadConfig();
  const checker = new GithubReleaseChecker();
  const store = new ReleaseStore();
  const notifier = new UpdateNotifier();

  console.log(`Surveillance de ${config.repos.length} repo(s), intervalle ${config.pollIntervalMinutes} min.`);
  startDashboardServer(config, store);
  await runCheck(config.repos, checker, store, notifier);

  const expression = `*/${config.pollIntervalMinutes} * * * *`;
  cron.schedule(expression, async () => {
    await runCheck(config.repos, checker, store, notifier);
  });
}

main().catch((error) => {
  console.error("Erreur fatale:", error);
  process.exit(1);
});
