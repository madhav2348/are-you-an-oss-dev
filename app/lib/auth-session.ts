import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const sessionCookieName = "oss-dev-session";

export type OrganizationContribution = {
  followers: number;
  mergedCount: number;
  orgLogin: string;
  orgUrl: string;
};

export type EligibilityAssessment = {
  bestOrganization: OrganizationContribution | null;
  checkedAt: string;
  consideredMergedPullRequests: number;
  minimumFollowers: number;
  organizations: OrganizationContribution[];
  qualifies: boolean;
  reason: string;
  totalMergedPullRequests: number;
};

export type SessionPayload = {
  assessment: EligibilityAssessment | null;
  provider: "github";
  login: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
  createdAt: string;
};

export const sessionCookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 7,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

function getSessionSecret() {
  return process.env.SESSION_SECRET ?? process.env.GITHUB_CLIENT_SECRET ?? null;
}

function sign(value: string) {
  const secret = getSessionSecret();

  if (!secret) {
    throw new Error(
      "Missing SESSION_SECRET or GITHUB_CLIENT_SECRET for session signing.",
    );
  }

  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createSessionToken(payload: SessionPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function readSessionToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  if (!getSessionSecret()) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as SessionPayload;

    if (payload.provider !== "github" || !payload.login) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
