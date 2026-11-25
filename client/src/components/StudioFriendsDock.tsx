import { useAuth } from '@/contexts/AuthContext';
import { getToken } from '@/lib/grudgeBackend';
import { useEffect } from "react";

const NEXUS = "https://nemesis.grudge-studio.com";
const APP_SLUG = "grudge-builder";

function readToken(): string { return getToken() ?? ''; }

export function openStudioFriends() {
  const token = readToken();
  const url = new URL("/friends", NEXUS);
  url.searchParams.set("popout", "1");
  url.searchParams.set("app", APP_SLUG);
  if (token) url.hash = `token=${encodeURIComponent(token)}`;
  window.open(
    url.toString(),
    "nexus-friends",
    "popup=yes,width=360,height=820,menubar=no,toolbar=no,location=no,status=no,resizable=yes",
  );
}

/** Steam-style friends rail that pops out the canonical Nexus friends list. */
export function StudioFriendsDock() {
  const { isAuthenticated } = useAuth();
  useEffect(() => {
    let rejectedToken = '';
    const ping = () => {
      const token = readToken();
      if (!isAuthenticated || !token || token === rejectedToken) return;
      fetch(`/api/social/presence`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: "online",
          location: window.location.pathname,
          app: APP_SLUG,
        }),
      }).then(response => {
        if (response.status === 401 || response.status === 403) rejectedToken = token;
      }).catch(() => {});
    };
    ping();
    const t = window.setInterval(ping, 45000);
    const onPop = () => openStudioFriends();
    window.addEventListener("nexus:popout-friends", onPop);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("nexus:popout-friends", onPop);
    };
  }, [isAuthenticated]);

  return (
    <button
      type="button"
      onClick={openStudioFriends}
      title="Friends — pop out across Grudge Studio"
      data-testid="studio-friends-rail"
      style={{
        position: "fixed",
        right: 0,
        top: 52,
        zIndex: 70,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        width: 44,
        height: "calc(100vh - 52px)",
        border: 0,
        borderLeft: "1px solid rgba(0,0,0,.6)",
        background: "#171a21",
        color: "#c6d4df",
        cursor: "pointer",
        padding: "12px 0",
      }}
    >
      <span
        style={{
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.18em",
          color: "#8f98a0",
        }}
      >
        FRIENDS
      </span>
    </button>
  );
}

export default StudioFriendsDock;
