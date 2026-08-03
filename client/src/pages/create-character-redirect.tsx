import { useMemo } from "react";
import CreateCharacterPage from "@/pages/create-character";
import GcsRedirect from "@/pages/gcs-redirect";
import { postCreatePlayPath } from "@/lib/warlordsOnboarding";

/**
 * /create-character → Foundry create → play handoff.
 *
 * Default returnTo:
 *   - First voyage (tutorial incomplete): /tutorial?from=gcs
 *   - After tutorial: /airship?from=gcs → home island
 *
 * Optional ?returnTo=/… is honored when same-origin relative path.
 */
export default function CreateCharacterRedirect() {
  const returnPath = useMemo(() => {
    if (typeof window === "undefined") return postCreatePlayPath();
    const raw = new URLSearchParams(window.location.search).get("returnTo");
    if (!raw) return postCreatePlayPath();
    // Only relative same-app paths (open-redirect guard)
    if (!raw.startsWith("/") || raw.startsWith("//")) return postCreatePlayPath();
    if (raw.includes("://")) return postCreatePlayPath();
    // Ensure handoff query for Foundry return
    const u = new URL(raw, window.location.origin);
    if (!u.searchParams.get("from")) u.searchParams.set("from", "gcs");
    return u.pathname + u.search;
  }, []);

  return (
    <GcsRedirect
      legacyComponent={CreateCharacterPage}
      era="warlords"
      mode="create"
      returnPath={returnPath}
    />
  );
}
