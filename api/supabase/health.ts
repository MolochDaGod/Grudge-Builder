export const config = { runtime: "edge" };

export default function handler() {
  return Response.json(
    {
      ok: true,
      configured: false,
      primary: "mysql",
      detail: "Supabase edge probe — game data uses Railway Postgres (MySQL-compatible)",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}