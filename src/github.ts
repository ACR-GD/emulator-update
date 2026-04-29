import { Octokit } from "@octokit/rest";
import { RepoConfig, ReleaseChannel, ReleaseEvent } from "./types.js";

export class GithubReleaseChecker {
  private readonly octokit: Octokit;

  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN || undefined
    });
  }

  async fetchLatestForChannel(repo: RepoConfig, channel: ReleaseChannel): Promise<ReleaseEvent | null> {
    const { data } = await this.octokit.repos.listReleases({
      owner: repo.owner,
      repo: repo.repo,
      per_page: 20
    });

    const release = data.find((item) => {
      if (item.draft) return false;
      if (channel === "stable") return !item.prerelease;
      return item.prerelease;
    });

    if (!release || !release.published_at) {
      const fromTags = await this.fetchFromTags(repo, channel);
      if (fromTags) {
        return fromTags;
      }
      return this.fetchFromLatestCommit(repo, channel);
    }

    return {
      channel,
      repoLabel: repo.label,
      repoFullName: `${repo.owner}/${repo.repo}`,
      releaseId: release.id,
      tagName: release.tag_name,
      name: release.name ?? release.tag_name,
      htmlUrl: release.html_url,
      publishedAt: release.published_at,
      prerelease: release.prerelease
    };
  }

  private async fetchFromTags(repo: RepoConfig, channel: ReleaseChannel): Promise<ReleaseEvent | null> {
    const { data } = await this.octokit.repos.listTags({
      owner: repo.owner,
      repo: repo.repo,
      per_page: 30
    });

    const selectedTag = data.find((tag) => this.tagMatchesChannel(tag.name, channel));
    if (!selectedTag) {
      return null;
    }

    const commitData = await this.octokit.repos.getCommit({
      owner: repo.owner,
      repo: repo.repo,
      ref: selectedTag.commit.sha
    });
    const publishedAt = commitData.data.commit.committer?.date ?? new Date().toISOString();

    return {
      channel,
      repoLabel: repo.label,
      repoFullName: `${repo.owner}/${repo.repo}`,
      releaseId: this.stableIntegerId(`${repo.owner}/${repo.repo}:${channel}:${selectedTag.name}`),
      tagName: selectedTag.name,
      name: `${selectedTag.name} (tag)`,
      htmlUrl: `https://github.com/${repo.owner}/${repo.repo}/tree/${encodeURIComponent(selectedTag.name)}`,
      publishedAt,
      prerelease: channel === "nightly"
    };
  }

  private async fetchFromLatestCommit(
    repo: RepoConfig,
    channel: ReleaseChannel
  ): Promise<ReleaseEvent | null> {
    const repoMeta = await this.octokit.repos.get({
      owner: repo.owner,
      repo: repo.repo
    });
    const branch = repoMeta.data.default_branch;

    const commits = await this.octokit.repos.listCommits({
      owner: repo.owner,
      repo: repo.repo,
      sha: branch,
      per_page: 1
    });
    const latest = commits.data[0];
    if (!latest) {
      return null;
    }

    const shortSha = latest.sha.slice(0, 7);
    const publishedAt = latest.commit.committer?.date ?? new Date().toISOString();

    return {
      channel,
      repoLabel: repo.label,
      repoFullName: `${repo.owner}/${repo.repo}`,
      releaseId: this.stableIntegerId(`${repo.owner}/${repo.repo}:${channel}:${latest.sha}`),
      tagName: `${branch}@${shortSha}`,
      name: `${branch}@${shortSha} (commit)`,
      htmlUrl: latest.html_url,
      publishedAt,
      prerelease: channel === "nightly"
    };
  }

  private tagMatchesChannel(tagName: string, channel: ReleaseChannel): boolean {
    const lower = tagName.toLowerCase();
    const prereleasePattern = /(nightly|dev|canary|alpha|beta|rc|preview)/i;
    const datedBuildPattern = /\d{4}[.\-_]\d{2}[.\-_]\d{2}/;
    const stablePattern = /^v?\d+(\.\d+){1,3}([+\-][a-z0-9.\-_]+)?$/i;

    if (channel === "nightly") {
      return prereleasePattern.test(lower) || datedBuildPattern.test(lower);
    }

    return stablePattern.test(lower) && !prereleasePattern.test(lower);
  }

  private stableIntegerId(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = (hash * 31 + input.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }
}
