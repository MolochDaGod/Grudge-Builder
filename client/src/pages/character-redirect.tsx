import CharacterBuilder from "@/pages/character-builder";
import GcsRedirect from "@/pages/gcs-redirect";

/**
 * /character → Foundry (Warlords era).
 * Create path returns through /airship handoff → home-island (production SSOT).
 * ?legacy=1 keeps inline builder.
 */
export default function CharacterRedirect() {
  return (
    <GcsRedirect
      legacyComponent={CharacterBuilder}
      era="warlords"
      mode="create"
      returnPath="/airship?from=gcs"
    />
  );
}