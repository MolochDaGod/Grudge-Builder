/**
 * Legacy /shipwreck-cinema → /leviathan-cinema (preserve query).
 * Product first-voyage SSOT is LeviathanOceanCinema at /leviathan-cinema.
 */
import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { LEVIATHAN_INTRO_PATH } from '@shared/definitions/productionIntro';

export default function LegacyShipwreckCinemaRedirect() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const search = typeof window !== 'undefined' ? window.location.search : '';
    navigate(`${LEVIATHAN_INTRO_PATH}${search}`, { replace: true });
  }, [navigate]);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black text-cyan-200/80 text-sm">
      Opening Leviathan Ocean cinema…
    </div>
  );
}
