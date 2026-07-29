import CreateCharacterPage from "@/pages/create-character";
import GcsRedirect from "@/pages/gcs-redirect";

/**
 * /create-character → Foundry create → /airship handoff → home-island.
 * Matches character.grudge-studio.com default dest (DEFAULT_PLAY_PATH=/airship).
 */
export default function CreateCharacterRedirect() {
  return (
    <GcsRedirect
      legacyComponent={CreateCharacterPage}
      era="warlords"
      mode="create"
      returnPath="/airship?from=gcs"
    />
  );
}