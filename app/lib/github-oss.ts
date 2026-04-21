import "server-only";
import type { EligibilityAssessment, OrganizationContribution } from "@/app/lib/auth-session";

type GithubSearchItem = {
  id: number;
  pull_request?: {
    url: string;
  };
  repository_url: string;
};

type GithubSearchResponse = {
  items: GithubSearchItem[];
  total_count: number;
};

type GithubRepo = {
  full_name: string;
  html_url: string;
  owner: {
    login: string;
    type: string;
  };
};

type GithubAccount = {
  followers: number;
  html_url: string;
  login: string;
  type: string;
};

const GITHUB_API_HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "are-you-an-oss-dev",
  "X-GitHub-Api-Version": "2022-11-28",
};

const DEFAULT_FOLLOWER_THRESHOLD = 90;
const DEFAULT_SEARCH_PAGES = 2;

function getFollowerThreshold() {
  const value = Number(process.env.OSS_ORG_FOLLOWER_THRESHOLD);

  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_FOLLOWER_THRESHOLD;
  }

  return Math.floor(value);
}

function getSearchPages() {
  const value = Number(process.env.OSS_GITHUB_SEARCH_PAGES);

  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_SEARCH_PAGES;
  }

  return Math.min(Math.floor(value), 10);
}

async function githubFetch<T>(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: {
      ...GITHUB_API_HEADERS,
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`GitHub API request failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

export async function evaluateGithubEligibility(
  accessToken: string,
  login: string,
): Promise<EligibilityAssessment> {
  const minimumFollowers = getFollowerThreshold();
  const pages = getSearchPages();
  const searchItems: GithubSearchItem[] = [];
  let totalMergedPullRequests = 0;

  for (let page = 1; page <= pages; page += 1) {
    const query = new URL("https://api.github.com/search/issues");
    query.searchParams.set("q", `is:pr is:merged author:${login}`);
    query.searchParams.set("sort", "updated");
    query.searchParams.set("order", "desc");
    query.searchParams.set("per_page", "100");
    query.searchParams.set("page", String(page));

    const response = await githubFetch<GithubSearchResponse>(
      query.toString(),
      accessToken,
    );

    if (page === 1) {
      totalMergedPullRequests = response.total_count;
    }

    searchItems.push(...response.items.filter((item) => item.pull_request));

    if (response.items.length < 100) {
      break;
    }
  }

  if (searchItems.length === 0) {
    return {
      bestOrganization: null,
      checkedAt: new Date().toISOString(),
      consideredMergedPullRequests: 0,
      minimumFollowers,
      organizations: [],
      qualifies: false,
      reason: "We could not find any merged pull requests authored by this GitHub account.",
      totalMergedPullRequests,
    };
  }

  const repoCache = new Map<string, GithubRepo>();

  for (const item of searchItems) {
    if (!repoCache.has(item.repository_url)) {
      const repo = await githubFetch<GithubRepo>(item.repository_url, accessToken);
      repoCache.set(item.repository_url, repo);
    }
  }

  const organizationBuckets = new Map<
    string,
    { mergedCount: number; orgUrl: string }
  >();

  for (const item of searchItems) {
    const repo = repoCache.get(item.repository_url);

    if (!repo || repo.owner.type !== "Organization") {
      continue;
    }

    const existingBucket = organizationBuckets.get(repo.owner.login);

    if (existingBucket) {
      existingBucket.mergedCount += 1;
      continue;
    }

    organizationBuckets.set(repo.owner.login, {
      mergedCount: 1,
      orgUrl: `https://github.com/${repo.owner.login}`,
    });
  }

  if (organizationBuckets.size === 0) {
    return {
      bestOrganization: null,
      checkedAt: new Date().toISOString(),
      consideredMergedPullRequests: searchItems.length,
      minimumFollowers,
      organizations: [],
      qualifies: false,
      reason:
        "We found merged pull requests, but none of them were merged into organization-owned repositories.",
      totalMergedPullRequests,
    };
  }

  const organizations: OrganizationContribution[] = [];

  for (const [orgLogin, bucket] of organizationBuckets) {
    const account = await githubFetch<GithubAccount>(
      `https://api.github.com/users/${orgLogin}`,
      accessToken,
    );

    if (account.type !== "Organization") {
      continue;
    }

    organizations.push({
      followers: account.followers,
      mergedCount: bucket.mergedCount,
      orgLogin,
      orgUrl: account.html_url ?? bucket.orgUrl,
    });
  }

  organizations.sort((left, right) => {
    if (right.followers !== left.followers) {
      return right.followers - left.followers;
    }

    if (right.mergedCount !== left.mergedCount) {
      return right.mergedCount - left.mergedCount;
    }

    return left.orgLogin.localeCompare(right.orgLogin);
  });

  const bestOrganization = organizations[0] ?? null;
  const qualifies = organizations.some(
    (organization) => organization.followers >= minimumFollowers,
  );

  return {
    bestOrganization,
    checkedAt: new Date().toISOString(),
    consideredMergedPullRequests: searchItems.length,
    minimumFollowers,
    organizations,
    qualifies,
    reason: qualifies
      ? "At least one organization you contributed to meets the follower threshold."
      : `Sorry, none of the organizations from your merged pull requests reached ${minimumFollowers} followers.`,
    totalMergedPullRequests,
  };
}
