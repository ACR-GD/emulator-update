export type ReleaseChannel = "stable" | "nightly";

export interface RepoConfig {
  label: string;
  owner: string;
  repo: string;
  watch: ReleaseChannel[];
}

export interface AppConfig {
  pollIntervalMinutes: number;
  repos: RepoConfig[];
}

export interface ReleaseEvent {
  channel: ReleaseChannel;
  repoLabel: string;
  repoFullName: string;
  releaseId: number;
  tagName: string;
  name: string;
  htmlUrl: string;
  publishedAt: string;
  prerelease: boolean;
}

export interface StoredReleaseEvent extends ReleaseEvent {
  firstSeenAt: string;
}
