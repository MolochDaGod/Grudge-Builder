#!/usr/bin/env node
/**
 * Smoke-test POST /api/auth/puter-sso returns a JWT.
 * Usage: node scripts/smoke-puter-sso.mjs [baseUrl]
 */
const base = (process.argv[2] || process.env.API_URL || "http://127.0.0.1:5000").replace(/\/$/, "");
const body = JSON.stringify({
  puterId: `smoke-${Date.now()}`,
  puterUsername: "smoke-test",
});

const res = await fetch(`${base}/api/auth/puter-sso`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body,
});

const text = await res.text();
let data;
try {
  data = JSON.parse(text);
} catch {
  console.error(`[smoke-puter-sso] Non-JSON response (${res.status}):`, text.slice(0, 500));
  process.exit(1);
}

if (!res.ok) {
  console.error(`[smoke-puter-sso] FAIL HTTP ${res.status}:`, data);
  process.exit(1);
}

if (!data.token) {
  console.error("[smoke-puter-sso] FAIL — no token in response:", data);
  process.exit(1);
}

console.log("[smoke-puter-sso] OK", {
  grudgeId: data.grudgeId,
  username: data.username,
  isNew: data.isNew,
  tokenPrefix: `${String(data.token).slice(0, 16)}…`,
});