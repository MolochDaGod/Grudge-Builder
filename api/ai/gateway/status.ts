export const config = { runtime: "edge" };

const CLOUD_BASE = "https://ai.grudge-studio.com";

export default async function handler() {
  let cloudOnline = false;
  try {
    const res = await fetch(`${CLOUD_BASE}/health`, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = (await res.json()) as { ok?: boolean };
      cloudOnline = data.ok ?? true;
    }
  } catch {
    cloudOnline = false;
  }

  return Response.json(
    {
      ollama: { online: false, models: [], host: "localhost:11434", checkedAt: Date.now() },
      cloud: { online: cloudOnline, models: [], host: CLOUD_BASE, checkedAt: Date.now() },
      routing: [],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}