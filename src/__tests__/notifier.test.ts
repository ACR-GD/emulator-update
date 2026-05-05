import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ReleaseEvent } from "../types.js";

function makeEvent(overrides: Partial<ReleaseEvent> = {}): ReleaseEvent {
  return {
    channel: "stable",
    repoLabel: "Dolphin",
    repoFullName: "dolphin-emu/dolphin",
    releaseId: 500,
    tagName: "v5.0",
    name: "Dolphin 5.0",
    htmlUrl: "https://github.com/dolphin-emu/dolphin/releases/tag/v5.0",
    publishedAt: "2025-06-01T10:00:00Z",
    prerelease: false,
    ...overrides,
  };
}

// Mock node-notifier
vi.mock("node-notifier", () => ({
  default: {
    notify: vi.fn(),
  },
}));

describe("UpdateNotifier", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends a desktop notification", async () => {
    const notifierMod = await import("node-notifier");
    const { UpdateNotifier } = await import("../notifier.js");

    const n = new UpdateNotifier();
    await n.notify(makeEvent());

    expect(notifierMod.default.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("Stable"),
        message: expect.stringContaining("Dolphin 5.0"),
      })
    );
  });

  it("includes 'Nightly' in desktop notification for nightly channel", async () => {
    const notifierMod = await import("node-notifier");
    const { UpdateNotifier } = await import("../notifier.js");

    const n = new UpdateNotifier();
    await n.notify(makeEvent({ channel: "nightly" }));

    expect(notifierMod.default.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("Nightly"),
      })
    );
  });

  it("sends a Discord webhook when DISCORD_WEBHOOK_URL is set", async () => {
    vi.stubEnv("DISCORD_WEBHOOK_URL", "https://discord.com/api/webhooks/test");

    const { UpdateNotifier } = await import("../notifier.js");
    const n = new UpdateNotifier();
    await n.notify(makeEvent());

    expect(fetch).toHaveBeenCalledWith(
      "https://discord.com/api/webhooks/test",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining("Dolphin"),
      })
    );
  });

  it("does not call Discord when DISCORD_WEBHOOK_URL is unset", async () => {
    delete process.env.DISCORD_WEBHOOK_URL;

    const { UpdateNotifier } = await import("../notifier.js");
    const n = new UpdateNotifier();
    await n.notify(makeEvent());

    expect(fetch).not.toHaveBeenCalled();
  });

  it("includes repo info and tag in Discord message body", async () => {
    vi.stubEnv("DISCORD_WEBHOOK_URL", "https://discord.com/api/webhooks/test");

    const { UpdateNotifier } = await import("../notifier.js");
    const n = new UpdateNotifier();
    await n.notify(makeEvent({ tagName: "v5.0-rc1", channel: "nightly" }));

    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.content).toContain("dolphin-emu/dolphin");
    expect(body.content).toContain("v5.0-rc1");
    expect(body.content).toContain("Nightly");
  });
});
