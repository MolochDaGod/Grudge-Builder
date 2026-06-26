/**
 * When served on rts-grudge.vercel.app, send "/" to the islands gameplay hub.
 */
import { useEffect } from "react";
import { useLocation } from "wouter";

const RTS_HOST = "rts-grudge.vercel.app";
const RTS_ENTRY_PATHS = new Set(["/", "/intro", "/home"]);

export function RtsDomainBootstrap() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hostname !== RTS_HOST) return;
    if (!RTS_ENTRY_PATHS.has(location)) return;
    setLocation("/islands");
  }, [location, setLocation]);

  return null;
}