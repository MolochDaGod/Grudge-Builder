import CreateCharacterPage from "@/pages/create-character";
import GcsRedirect from "@/pages/gcs-redirect";

/** /create-character → Foundry create → airship era scene (then home island). Not /viewer. */
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