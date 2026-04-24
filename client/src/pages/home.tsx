/**
 * home.tsx — thin redirect shim to the canonical WCS /home page.
 *
 * The original in-app home is preserved at `home.legacy.tsx` for reference.
 * To revert: swap the import in App.tsx or rename the legacy file back.
 */
import WcsRedirect from '@/components/WcsRedirect';

export default function HomePage() {
  return <WcsRedirect to="/home" returnPath="/home" label="Open Home" />;
}
