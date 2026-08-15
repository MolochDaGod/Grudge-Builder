import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { authHeaders, clearToken, logout, getToken, markAuthRejected } from "./grudgeBackend";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Only clear session on 401 when we actually had a JWT (expired / revoked).
    // Guest home still hits /api/characters|wallet — 401 there must NOT call logout()
    // or throw-hard cascades that take down the shell (Sentry "Something went wrong").
    if (res.status === 401 && getToken()) {
      markAuthRejected();
      logout();
    }
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: {
      ...authHeaders(),
      ...(data ? { "Content-Type": "application/json" } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      headers: authHeaders(),
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Guest-safe default: unauthenticated GETs return null instead of throwing
      // and crashing ErrorBoundaries on /home.
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
