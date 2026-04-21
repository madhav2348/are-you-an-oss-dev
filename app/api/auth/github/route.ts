import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  sessionCookieName,
  sessionCookieOptions,
} from "@/app/lib/auth-session";
import { evaluateGithubEligibility } from "@/app/lib/github-oss";

export const runtime = "nodejs";

const githubStateCookieName = "github-oauth-state";
const githubStateCookieOptions = {
  httpOnly: true,
  maxAge: 60 * 10,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

type GithubTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GithubUser = {
  avatar_url: string | null;
  email: string | null;
  html_url: string | null;
  login: string;
  name: string | null;
};

type GithubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
};

function getConfig(request: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return {
      ok: false as const,
      message:
        "Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET. Add them to .env.local.",
    };
  }

  return {
    ok: true as const,
    clientId,
    clientSecret,
    redirectUri:
      process.env.GITHUB_REDIRECT_URI ??
      `${request.nextUrl.origin}/api/auth/github`,
    scope: process.env.GITHUB_AUTH_SCOPES ?? "read:user user:email",
  };
}

function buildAuthorizeUrl(
  clientId: string,
  state: string,
  redirectUri: string,
  scope: string,
) {
  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");

  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", scope);
  authorizeUrl.searchParams.set("state", state);

  return authorizeUrl;
}

function jsonError(message: string, status = 500) {
  return NextResponse.json(
    {
      provider: "github",
      message,
    },
    { status },
  );
}

async function fetchGithubProfile(accessToken: string) {
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${accessToken}`,
    "User-Agent": "are-you-an-oss-dev",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const [userResponse, emailsResponse] = await Promise.all([
    fetch("https://api.github.com/user", { headers, cache: "no-store" }),
    fetch("https://api.github.com/user/emails", {
      headers,
      cache: "no-store",
    }),
  ]);

  if (!userResponse.ok) {
    throw new Error("Failed to fetch the GitHub user profile.");
  }

  const user = (await userResponse.json()) as GithubUser;
  const emails = emailsResponse.ok
    ? ((await emailsResponse.json()) as GithubEmail[])
    : [];

  const primaryEmail =
    emails.find((entry) => entry.primary && entry.verified)?.email ??
    emails.find((entry) => entry.verified)?.email ??
    user.email;

  return {
    avatarUrl: user.avatar_url,
    email: primaryEmail,
    login: user.login,
    name: user.name,
    profileUrl: user.html_url,
  };
}

async function handleCallback(request: NextRequest) {
  const callbackError = request.nextUrl.searchParams.get("error");
  const callbackErrorDescription =
    request.nextUrl.searchParams.get("error_description");

  if (callbackError) {
    return jsonError(
      callbackErrorDescription ?? `GitHub OAuth failed with ${callbackError}.`,
      400,
    );
  }

  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const storedState = request.cookies.get(githubStateCookieName)?.value;

  if (!state || !code) {
    return jsonError("Missing GitHub OAuth callback parameters.", 400);
  }

  if (!storedState || storedState !== state) {
    return jsonError("GitHub OAuth state verification failed.", 400);
  }

  const config = getConfig(request);

  if (!config.ok) {
    return jsonError(config.message, 500);
  }

  const tokenResponse = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "are-you-an-oss-dev",
      },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
        state,
      }),
      cache: "no-store",
    },
  );

  if (!tokenResponse.ok) {
    return jsonError("GitHub did not accept the OAuth code exchange.", 502);
  }

  const tokenData = (await tokenResponse.json()) as GithubTokenResponse;

  if (!tokenData.access_token) {
    return jsonError(
      tokenData.error_description ?? "GitHub did not return an access token.",
      502,
    );
  }

  let profile;

  try {
    profile = await fetchGithubProfile(tokenData.access_token);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch the GitHub user profile.";

    return jsonError(message, 502);
  }

  let assessment;

  try {
    assessment = await evaluateGithubEligibility(
      tokenData.access_token,
      profile.login,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to evaluate GitHub OSS contributions.";

    return jsonError(message, 502);
  }

  const response = NextResponse.redirect(new URL("/success/github", request.url));

  response.cookies.set(githubStateCookieName, "", {
    ...githubStateCookieOptions,
    maxAge: 0,
  });
  response.cookies.set(
    sessionCookieName,
    createSessionToken({
      assessment,
      provider: "github",
      login: profile.login,
      name: profile.name,
      email: profile.email,
      avatarUrl: profile.avatarUrl,
      profileUrl: profile.profileUrl,
      createdAt: new Date().toISOString(),
    }),
    sessionCookieOptions,
  );

  return response;
}

export async function GET(request: NextRequest) {
  if (
    request.nextUrl.searchParams.has("code") ||
    request.nextUrl.searchParams.has("error")
  ) {
    return handleCallback(request);
  }

  const config = getConfig(request);

  if (!config.ok) {
    return jsonError(config.message, 500);
  }

  const state = randomUUID();
  const response = NextResponse.redirect(
    buildAuthorizeUrl(
      config.clientId,
      state,
      config.redirectUri,
      config.scope,
    ),
  );

  response.cookies.set(
    githubStateCookieName,
    state,
    githubStateCookieOptions,
  );

  return response;
}

export async function POST(request: NextRequest) {
  const config = getConfig(request);

  if (!config.ok) {
    return jsonError(config.message, 500);
  }

  const state = randomUUID();
  const response = NextResponse.json({
    authorizationUrl: buildAuthorizeUrl(
      config.clientId,
      state,
      config.redirectUri,
      config.scope,
    ).toString(),
    provider: "github",
  });

  response.cookies.set(
    githubStateCookieName,
    state,
    githubStateCookieOptions,
  );

  return response;
}
