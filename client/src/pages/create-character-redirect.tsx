import CreateCharacterPage from "@/pages/create-character";
import GcsRedirect from "@/pages/gcs-redirect";

/** /create-character → GCS create flow. ?legacy=1 keeps class-selector React port. */
export default function CreateCharacterRedirect() {
  return (
    <GcsRedirect
      legacyComponent={CreateCharacterPage}
      era="warlords"
      mode="create"
      returnPath="/test-play"
    />
  );
}