import CharacterCreatorPage from "@/pages/character-creator";
import GcsRedirect from "@/pages/gcs-redirect";

/** /character-creator → GCS create → tutorial (first hero). ?legacy=1 keeps wizard. */
export default function CharacterCreatorRedirect() {
  return (
    <GcsRedirect
      legacyComponent={CharacterCreatorPage}
      era="warlords"
      mode="create"
      returnPath="/tutorial?from=character-create"
    />
  );
}