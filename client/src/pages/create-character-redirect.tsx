import { useMemo } from "react";
import CreateCharacterPage from "@/pages/create-character";
import GcsRedirect from "@/pages/gcs-redirect";

/**
 * /create-character → Foundry create → play handoff.
 * Optional ?returnTo=/tutorial|/play|… is honored when same-origin relative path.
 * Default: /airship?from=gcs → home-island (production SSOT).
 */
export default function CreateCharacterRedirect() {
  const returnPath = useMemo(() => {
    if (typeof window === "undefined") return "/airship?from=gcs";
    const raw = new URLSearchParams(window.location.search).get("returnTo");
    if (!raw) return "/airship?from=gcs";
    // Only relative same-app paths (open-redirect guard)
    if (!raw.startsWith("/") || raw.startsWith("//")) return "/airship?from=gcs";
    if (raw.includes("://")) return "/airship?from=gcs";
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