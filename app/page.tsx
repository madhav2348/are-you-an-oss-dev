import Link from "next/link";
import { providerDetails } from "@/app/lib/oss-data";

function GithubIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-8 w-8 fill-white"
    >
      <path d="M12 0.5C5.37 0.5 0 5.87 0 12.5C0 17.8 3.44 22.3 8.2 23.89C8.8 24 9.02 23.63 9.02 23.31C9.02 23.03 9.01 22.1 9 19.01C5.66 19.74 4.97 17.4 4.97 17.4C4.42 16 3.63 15.63 3.63 15.63C2.54 14.89 3.71 14.9 3.71 14.9C4.92 14.99 5.56 16.15 5.56 16.15C6.63 17.99 8.37 17.46 9.06 17.15C9.17 16.38 9.48 15.86 9.83 15.56C7.16 15.25 4.34 14.22 4.34 9.62C4.34 8.31 4.81 7.24 5.57 6.4C5.45 6.1 5.03 4.88 5.69 3.23C5.69 3.23 6.7 2.91 8.99 4.46C9.96 4.19 11 4.06 12.03 4.06C13.06 4.06 14.1 4.19 15.08 4.46C17.36 2.91 18.37 3.23 18.37 3.23C19.03 4.88 18.61 6.1 18.49 6.4C19.26 7.24 19.72 8.31 19.72 9.62C19.72 14.23 16.89 15.24 14.21 15.55C14.66 15.94 15.06 16.71 15.06 17.89C15.06 19.58 15.05 22.84 15.05 23.31C15.05 23.63 15.26 24.01 15.87 23.89C20.63 22.3 24.07 17.8 24.07 12.5C24.07 5.87 18.7 0.5 12 0.5Z" />
    </svg>
  );
}

function GitlabIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8">
      <path
        fill="#E24329"
        d="M12 22.49 16.42 8.89H7.58L12 22.49Z"
      />
      <path
        fill="#FC6D26"
        d="M12 22.49 7.58 8.89H1.38L12 22.49Z"
      />
      <path
        fill="#FCA326"
        d="M1.38 8.89.04 13.03a.91.91 0 0 0 .33 1.02L12 22.49 1.38 8.89Z"
      />
      <path
        fill="#FC6D26"
        d="M1.38 8.89h6.2L4.91.68a.46.46 0 0 0-.87 0L1.38 8.89Z"
      />
      <path
        fill="#E24329"
        d="M12 22.49 16.42 8.89h6.2L12 22.49Z"
      />
      <path
        fill="#FCA326"
        d="m22.62 8.89 1.34 4.14a.91.91 0 0 1-.33 1.02L12 22.49 22.62 8.89Z"
      />
      <path
        fill="#FC6D26"
        d="M22.62 8.89h-6.2L19.09.68a.46.46 0 0 1 .87 0l2.66 8.21Z"
      />
    </svg>
  );
}

const providers = [
  {
    ...providerDetails.github,
    icon: <GithubIcon />,
    className:
      "border-zinc-700 bg-[#1f2328] text-white hover:bg-[#2a2f36] focus-visible:outline-orange-300",
  },
  {
    ...providerDetails.gitlab,
    icon: <GitlabIcon />,
    className:
      "border-zinc-700 bg-[#1f2328] text-white hover:bg-[#2a2f36] focus-visible:outline-orange-300",
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center  px-6 py-16 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-black/25 p-8">
        <div className="mx-auto flex w-fit items-center gap-4 rounded-full border border-white/10 bg-white/5 px-5 py-3">
          <GithubIcon />
          <span className="text-zinc-500">+</span>
          <GitlabIcon />
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-400">
            Open source access
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Are you an OSS Dev ?
          </h1>
          <p className="mt-4 text-sm leading-6 text-zinc-400">
            Connect your coding profile and continue with the provider you use
            most to get special discount
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-4">
          {providers.map((provider) => (
            <Link
              key={provider.id}
              href={provider.connectPath}
              className={`flex h-14 items-center justify-center gap-3 rounded-2xl border px-5 text-base font-semibold transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 ${provider.className}`}
            >
              {provider.icon}
              <span>Connect with {provider.name}</span>
            </Link>
          ))}
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-zinc-500">
          GitHub OAuth now starts at <code>/api/auth/github</code>. GitLab is
          still stubbed at <code>/api/auth/gitlab</code>.
        </p>
      </section>
    </main>
  );
}
