import notifier from "node-notifier";
import { ReleaseEvent } from "./types.js";

export class UpdateNotifier {
  async notify(event: ReleaseEvent): Promise<void> {
    this.notifyDesktop(event);
    await this.notifyDiscord(event);
  }

  private notifyDesktop(event: ReleaseEvent): void {
    const channelLabel = event.channel === "stable" ? "Stable" : "Nightly";
    notifier.notify({
      title: `Nouvelle release ${channelLabel} - ${event.repoLabel}`,
      message: `${event.name} (${event.tagName})`,
      open: event.htmlUrl,
      timeout: 8
    });
  }

  private async notifyDiscord(event: ReleaseEvent): Promise<void> {
    if (!process.env.DISCORD_WEBHOOK_URL) {
      return;
    }

    const channelLabel = event.channel === "stable" ? "Stable" : "Nightly";
    const content = [
      `**${event.repoLabel}** (${event.repoFullName})`,
      `Canal: **${channelLabel}**`,
      `Version: **${event.name}** (\`${event.tagName}\`)`,
      `Publie le: ${new Date(event.publishedAt).toLocaleString("fr-FR")}`,
      event.htmlUrl
    ].join("\n");

    await fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });
  }
}
