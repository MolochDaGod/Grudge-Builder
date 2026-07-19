import CreateCharacterPage from "@/pages/create-character";
import GcsRedirect from "@/pages/gcs-redirect";

/** /create-character → GCS create → unarmed race → Warlords tutorial. Not /viewer. */
export default function CreateCharacterRedirect() {
  return (
    <GcsRedirect
      legacyComponent={CreateCharacterPage}
      era="warlords"
      mode="create"
      returnPath="/tutorial?from=character-create"
    />
  );
}