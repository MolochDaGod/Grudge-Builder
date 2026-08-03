import { useMemo } from "react";
import CharacterCreatorPage from "@/pages/character-creator";
import GcsRedirect from "@/pages/gcs-redirect";
import { postCreatePlayPath } from "@/lib/warlordsOnboarding";

/** /character-creator → GCS create → first voyage tutorial or airship→home. ?legacy=1 keeps wizard. */
export default function CharacterCreatorRedirect() {
  const returnPath = useMemo(() => postCreatePlayPath(), []);

  return (
    <GcsRedirect
      legacyComponent={CharacterCreatorPage}
      era="warlords"
      mode="create"
      returnPath={returnPath}
    />
  );
}
