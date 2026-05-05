import { describe, it, expect, vi, beforeEach } from "vitest";
import { GithubReleaseChecker } from "../github.js";
import type { RepoConfig } from "../types.js";

// Access private methods for unit testing the pure logic
function getChecker() {
  return new GithubReleaseChecker() as unknown as {
    tagMatchesChannel: (tagName: string, channel: "stable" | "nightly") => boolean;
    stableIntegerId: (input: string) => number;
    octokit: {
      repos: {
        listReleases: ReturnType<typeof vi.fn>;
        listTags: ReturnType<typeof vi.fn>;
        getCommit: ReturnType<typeof vi.fn>;
        get: ReturnType<typeof vi.fn>;
        listCommits: ReturnType<typeof vi.fn>;
      };
    };
    fetchLatestForChannel: (repo: RepoConfig, channel: "stable" | "nightly") => Promise<unknown>;
  };
}

describe("GithubReleaseChecker", () => {
  describe("tagMatchesChannel", () => {
    let checker: ReturnType<typeof getChecker>;

    beforeEach(() => {
      checker = getChecker();
    });

    describe("stable channel", () => {
      it("matches semver tags", () => {
        expect(checker.tagMatchesChannel("v1.0.0", "stable")).toBe(true);
        expect(checker.tagMatchesChannel("1.2.3", "stable")).toBe(true);
        expect(checker.tagMatchesChannel("v2.1.0.1", "stable")).toBe(true);
      });

      it("rejects prerelease tags", () => {
        expect(checker.tagMatchesChannel("v1.0.0-nightly", "stable")).toBe(false);
        expect(checker.tagMatchesChannel("v1.0.0-alpha", "stable")).toBe(false);
        expect(checker.tagMatchesChannel("v1.0.0-beta.1", "stable")).toBe(false);
        expect(checker.tagMatchesChannel("v1.0.0-rc1", "stable")).toBe(false);
        expect(checker.tagMatchesChannel("v1.0.0-preview", "stable")).toBe(false);
        expect(checker.tagMatchesChannel("v1.0.0-canary", "stable")).toBe(false);
      });

      it("rejects non-version strings", () => {
        expect(checker.tagMatchesChannel("latest", "stable")).toBe(false);
        expect(checker.tagMatchesChannel("some-text", "stable")).toBe(false);
      });
    });

    describe("nightly channel", () => {
      it("matches nightly/dev/canary/alpha/beta/rc/preview tags", () => {
        expect(checker.tagMatchesChannel("nightly-2024.01.15", "nightly")).toBe(true);
        expect(checker.tagMatchesChannel("v1.0.0-dev", "nightly")).toBe(true);
        expect(checker.tagMatchesChannel("v1.0.0-canary.1", "nightly")).toBe(true);
        expect(checker.tagMatchesChannel("v2.0.0-alpha", "nightly")).toBe(true);
        expect(checker.tagMatchesChannel("v1.0.0-beta.2", "nightly")).toBe(true);
        expect(checker.tagMatchesChannel("v3.0.0-rc1", "nightly")).toBe(true);
        expect(checker.tagMatchesChannel("v1.0.0-preview", "nightly")).toBe(true);
      });

      it("matches dated build patterns", () => {
        expect(checker.tagMatchesChannel("2024.01.15", "nightly")).toBe(true);
        expect(checker.tagMatchesChannel("2024-01-15", "nightly")).toBe(true);
        expect(checker.tagMatchesChannel("build_2024_01_15", "nightly")).toBe(true);
      });

      it("rejects plain stable versions", () => {
        expect(checker.tagMatchesChannel("v1.0.0", "nightly")).toBe(false);
        expect(checker.tagMatchesChannel("1.2.3", "nightly")).toBe(false);
      });
    });
  });

  describe("stableIntegerId", () => {
    let checker: ReturnType<typeof getChecker>;

    beforeEach(() => {
      checker = getChecker();
    });

    it("returns a non-negative integer", () => {
      const id = checker.stableIntegerId("test/repo:stable:v1.0.0");
      expect(id).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(id)).toBe(true);
    });

    it("returns the same value for the same input", () => {
      const input = "owner/repo:nightly:abc123";
      expect(checker.stableIntegerId(input)).toBe(checker.stableIntegerId(input));
    });

    it("returns different values for different inputs", () => {
      const a = checker.stableIntegerId("owner/repo:stable:v1.0.0");
      const b = checker.stableIntegerId("owner/repo:stable:v2.0.0");
      expect(a).not.toBe(b);
    });
  });

  describe("fetchLatestForChannel", () => {
    const mockRepo: RepoConfig = {
      label: "TestEmu",
      owner: "test",
      repo: "emu",
      watch: ["stable"],
    };

    it("returns a ReleaseEvent for a stable release", async () => {
      const checker = getChecker();
      checker.octokit.repos.listReleases = vi.fn().mockResolvedValue({
        data: [
          {
            id: 100,
            draft: false,
            prerelease: false,
            tag_name: "v1.2.0",
            name: "Release v1.2.0",
            html_url: "https://github.com/test/emu/releases/tag/v1.2.0",
            published_at: "2025-06-01T10:00:00Z",
          },
        ],
      });

      const result = await checker.fetchLatestForChannel(mockRepo, "stable");
      expect(result).not.toBeNull();
      expect(result!.channel).toBe("stable");
      expect(result!.tagName).toBe("v1.2.0");
      expect(result!.repoLabel).toBe("TestEmu");
      expect(result!.repoFullName).toBe("test/emu");
      expect(result!.prerelease).toBe(false);
    });

    it("returns a nightly release when channel is nightly", async () => {
      const checker = getChecker();
      checker.octokit.repos.listReleases = vi.fn().mockResolvedValue({
        data: [
          {
            id: 200,
            draft: false,
            prerelease: true,
            tag_name: "nightly-2025-06-01",
            name: "Nightly Build",
            html_url: "https://github.com/test/emu/releases/tag/nightly-2025-06-01",
            published_at: "2025-06-01T02:00:00Z",
          },
          {
            id: 101,
            draft: false,
            prerelease: false,
            tag_name: "v1.2.0",
            name: "Release v1.2.0",
            html_url: "https://github.com/test/emu/releases/tag/v1.2.0",
            published_at: "2025-05-30T10:00:00Z",
          },
        ],
      });

      const result = await checker.fetchLatestForChannel(mockRepo, "nightly");
      expect(result).not.toBeNull();
      expect(result!.channel).toBe("nightly");
      expect(result!.prerelease).toBe(true);
    });

    it("skips draft releases", async () => {
      const checker = getChecker();
      checker.octokit.repos.listReleases = vi.fn().mockResolvedValue({
        data: [
          {
            id: 300,
            draft: true,
            prerelease: false,
            tag_name: "v2.0.0",
            name: "Draft",
            html_url: "https://github.com/test/emu/releases/tag/v2.0.0",
            published_at: "2025-06-01T10:00:00Z",
          },
          {
            id: 301,
            draft: false,
            prerelease: false,
            tag_name: "v1.9.0",
            name: "Release v1.9.0",
            html_url: "https://github.com/test/emu/releases/tag/v1.9.0",
            published_at: "2025-05-28T10:00:00Z",
          },
        ],
      });

      const result = await checker.fetchLatestForChannel(mockRepo, "stable");
      expect(result).not.toBeNull();
      expect(result!.tagName).toBe("v1.9.0");
    });

    it("falls back to tags when no releases found", async () => {
      const checker = getChecker();
      checker.octokit.repos.listReleases = vi.fn().mockResolvedValue({ data: [] });
      checker.octokit.repos.listTags = vi.fn().mockResolvedValue({
        data: [
          { name: "v1.0.0", commit: { sha: "abc123def456" } },
        ],
      });
      checker.octokit.repos.getCommit = vi.fn().mockResolvedValue({
        data: { commit: { committer: { date: "2025-05-01T00:00:00Z" } } },
      });

      const result = await checker.fetchLatestForChannel(mockRepo, "stable");
      expect(result).not.toBeNull();
      expect(result!.tagName).toBe("v1.0.0");
      expect(result!.name).toContain("(tag)");
    });
  });
});
