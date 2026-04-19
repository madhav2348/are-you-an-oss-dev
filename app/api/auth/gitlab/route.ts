export async function GET() {
  return Response.json(
    {
      provider: "gitlab",
      message: "GitLab auth is not configured yet.",
    },
    { status: 501 },
  );
}

export async function POST() {
  return Response.json(
    {
      provider: "gitlab",
      message: "GitLab auth is not configured yet.",
    },
    { status: 501 },
  );
}
