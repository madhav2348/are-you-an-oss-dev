import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { readSessionToken, sessionCookieName } from "@/app/lib/auth-session";
import { isProviderId, providerDetails } from "@/app/lib/oss-data";

type SuccessPageProps = {
  params: Promise<{ provider: string }>;
};

export default async function SuccessPage({ params }: SuccessPageProps) {
  const { provider } = await params;

  if (!isProviderId(provider)) {
    notFound();
  }

  const selectedProvider = providerDetails[provider];
  const session =
    provider === "github"
      ? readSessionToken((await cookies()).get(sessionCookieName)?.value)
      : null;
  const assessment = session?.assessment ?? null;

  if (provider === "github" && (!session || session.provider !== "github")) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16 text-white">
      <section className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-black/30 p-8 shadow-2xl shadow-black/25 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">
              Login complete
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              You have successfully logged in with {selectedProvider.name}.
            </h1>
          </div>

          <Link
            href="/"
            className="rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-zinc-200 transition hover:border-white/30 hover:bg-white/8"
          >
            Back to home
          </Link>
        </div>

        {session ? (
          <div className="mt-8 flex flex-wrap items-center gap-4 rounded-3xl border border-white/10 bg-white/6 p-5">
            {session.avatarUrl ? (
              <Image
                src={session.avatarUrl}
                alt={`${session.login} avatar`}
                width={56}
                height={56}
                className="h-14 w-14 rounded-full border border-white/10"
              />
            ) : null}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-400">
                GitHub account
              </p>
              <p className="mt-2 text-xl font-semibold text-white">
                {session.name ?? session.login}
              </p>
              <p className="mt-1 text-sm text-zinc-300">
                @{session.login}
                {session.email ? ` | ${session.email}` : ""}
              </p>
            </div>
          </div>
        ) : null}

        {provider === "github" && assessment ? (
          <>
            <div className="mt-8 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-6">
              <p className="text-lg font-medium text-white">
                Organizations found from your merged pull requests
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-200">
                We checked {assessment.consideredMergedPullRequests} merged pull
                requests from your account and compared each organization against a{" "}
                {assessment.minimumFollowers}-follower threshold.
              </p>

              {assessment.organizations.length > 0 ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  {assessment.organizations.map((organization) => (
                    <article
                      key={organization.orgLogin}
                      className="rounded-2xl border border-white/10 bg-white/6 p-5"
                    >
                      <p className="text-sm uppercase tracking-[0.28em] text-zinc-400">
                        Organization
                      </p>
                      <h2 className="mt-3 text-2xl font-semibold text-white">
                        {organization.orgLogin}
                      </h2>
                      <p className="mt-4 text-3xl font-semibold text-emerald-300">
                        {organization.mergedCount}
                      </p>
                      <p className="mt-1 text-sm text-zinc-300">
                        merged pull requests
                      </p>
                      <p className="mt-4 text-2xl font-semibold text-white">
                        {organization.followers}
                      </p>
                      <p className="mt-1 text-sm text-zinc-300">followers</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-5 text-sm text-zinc-200">{assessment.reason}</p>
              )}
            </div>

            <div
              className={`mt-8 rounded-3xl p-6 ${
                assessment.qualifies
                  ? "border border-amber-300/20 bg-amber-300/10"
                  : "border border-rose-300/20 bg-rose-300/10"
              }`}
            >
              <p className="text-xl font-semibold text-white">
                {assessment.qualifies
                  ? "You will get a special discount."
                  : "Sorry, you do not qualify right now."}
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-200">
                {assessment.reason}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="mt-8 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-6">
              <p className="text-lg font-medium text-white">
                You have contributed to the following organizations:
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {selectedProvider.contributions.map((org) => (
                  <article
                    key={org.name}
                    className="rounded-2xl border border-white/10 bg-white/6 p-5"
                  >
                    <p className="text-sm uppercase tracking-[0.28em] text-zinc-400">
                      Organization
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold text-white">
                      {org.name}
                    </h2>
                    <p className="mt-4 text-3xl font-semibold text-emerald-300">
                      {org.mergedCount}
                    </p>
                    <p className="mt-1 text-sm text-zinc-300">{org.mergedLabel}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-amber-300/20 bg-amber-300/10 p-6">
              <p className="text-xl font-semibold text-white">
                You will get a special discount.
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-200">
                Please show this screen to the owner or reception to claim it.
              </p>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
