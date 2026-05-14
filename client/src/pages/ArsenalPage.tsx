/**
 * ArsenalPage.tsx — renders the unified crafting station with ObjectStore data.
 *
 * Previously redirected to the legacy WCS /arsenal page. Now uses the same
 * CraftingPage component that sources all icons from R2 CDN / D1 via ObjectStore,
 * ensuring all game modes share the same items, icons, and data.
 *
 * Legacy WCS redirect preserved at `ArsenalPage.legacy.tsx` for reference.
 */
import CraftingPage from './crafting';

export default function ArsenalPage() {
  return <CraftingPage />;
}
