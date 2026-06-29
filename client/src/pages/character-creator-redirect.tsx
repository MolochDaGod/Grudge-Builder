import CharacterCreatorPage from "@/pages/character-creator";
import GcsRedirect from "@/pages/gcs-redirect";

/** /character-creator → GCS create flow. ?legacy=1 keeps 6-step wizard. */
export default function CharacterCreatorRedirect() {
  return (
    <GcsRedirect
      legacyComponent={CharacterCreatorPage}
      era="warlords"
      mode="create"
      returnPath="/account"
    />
  );
}