import CharacterBuilder from "@/pages/character-builder";
import GcsRedirect from "@/pages/gcs-redirect";

/** /character → GCS (Warlords era). ?legacy=1 keeps inline builder. */
export default function CharacterRedirect() {
  return (
    <GcsRedirect
      legacyComponent={CharacterBuilder}
      era="warlords"
      mode="landing"
      returnPath="/home"
    />
  );
}