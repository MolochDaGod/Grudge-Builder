/**
 * Redirect in-app /game/* shortcuts to the canonical Grudge6 playground SPA.
 */
import { useEffect } from "react";
import { grudge6Url, type Grudge6RouteKey } from "@/lib/grudge6Urls";

export function Grudge6Redirect({ route = "home" }: { route?: Grudge6RouteKey }) {
  useEffect(() => {
    window.location.replace(grudge6Url(route));
  }, [route]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-950 text-sm text-stone-300">
      Opening Grudge6 playground…
    </div>
  );
}