import CreateCharacterPage from "@/pages/create-character";
import GcsRedirect from "@/pages/gcs-redirect";

/** /create-character → Foundry create (Undead forge) → haven_shore zone play. Not /viewer. */
export default function CreateCharacterRedirect() {
  return (
    <GcsRedirect
      legacyComponent={CreateCharacterPage}
      era="warlords"
      mode="create"
      returnPath="/play?mode=zone&sector=haven_shore&worldSeed=grudge-world-1&from=character-create"
    />
  );
}