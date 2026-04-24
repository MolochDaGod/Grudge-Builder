/**
 * ArsenalPage.tsx — thin redirect shim to the canonical WCS /arsenal page.
 *
 * The original in-app arsenal is preserved at `ArsenalPage.legacy.tsx` for reference.
 */
import WcsRedirect from '@/components/WcsRedirect';

export default function ArsenalPage() {
  return <WcsRedirect to="/arsenal" returnPath="/home" label="Open Arsenal" />;
}
