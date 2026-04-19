export type ProviderId = "github" | "gitlab";

export type ContributionOrg = {
  name: string;
  mergedCount: number;
  mergedLabel: string;
};

export type ProviderDetails = {
  id: ProviderId;
  name: string;
  callbackPath: string;
  contributions: ContributionOrg[];
};

export const providerDetails: Record<ProviderId, ProviderDetails> = {
  github: {
    id: "github",
    name: "GitHub",
    callbackPath: "/success/github",
    contributions: [
      { name: "vercel", mergedCount: 6, mergedLabel: "merged pull requests" },
      { name: "tailwindlabs", mergedCount: 4, mergedLabel: "merged pull requests" },
      { name: "openai", mergedCount: 2, mergedLabel: "merged pull requests" },
    ],
  },
  gitlab: {
    id: "gitlab",
    name: "GitLab",
    callbackPath: "/success/gitlab",
    contributions: [
      { name: "gitlab-org", mergedCount: 5, mergedLabel: "merged merge requests" },
      { name: "freedesktop", mergedCount: 3, mergedLabel: "merged merge requests" },
      { name: "gnome", mergedCount: 2, mergedLabel: "merged merge requests" },
    ],
  },
};

export function isProviderId(value: string): value is ProviderId {
  return value === "github" || value === "gitlab";
}
