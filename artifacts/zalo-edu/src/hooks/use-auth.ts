import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { apiFetch, apiPost, setToken, clearToken, getToken } from "@/lib/api-client";
import { isInsideZMP, getZaloAccessToken, getDeepLinkCenter } from "@/lib/zmp-sdk";
import { getCenter, setCenter } from "@/lib/center-storage";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "onboarding";

export type UserProfile = {
  fullName: string;
  code: string;
  type: string;
};

export type AuthContextValue = {
  status: AuthStatus;
  userType: "student" | "staff" | null;
  profile: UserProfile | null;
  loginWithZalo: (accessToken: string) => Promise<void>;
  loginWithPassword: (phone: string, password: string) => Promise<void>;
  logout: () => void;
};

async function checkSession(): Promise<{ userType: "student" | "staff" | null } | null> {
  if (!getToken()) return null;
  try {
    const data = await apiFetch<{ userType: "student" | "staff" | null }>("/api/my-space/user-type");
    return data;
  } catch {
    return null;
  }
}

function extractToken(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  return (
    (typeof b["token"] === "string" ? b["token"] : null) ??
    (typeof b["accessToken"] === "string" ? b["accessToken"] : null) ??
    (typeof b["access_token"] === "string" ? b["access_token"] : null) ??
    null
  );
}

function extractCenter(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  return typeof b["center"] === "string" ? b["center"] : null;
}

function extractNeedsOnboarding(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return b["needsOnboarding"] === true;
}

function extractProfile(body: unknown): UserProfile | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const p = b["profile"];
  if (!p || typeof p !== "object") return null;
  const pr = p as Record<string, unknown>;
  return {
    fullName: typeof pr["fullName"] === "string" ? pr["fullName"] : "",
    code: typeof pr["code"] === "string" ? pr["code"] : "",
    type: typeof pr["type"] === "string" ? pr["type"] : "",
  };
}

/**
 * PRE-AUTH: resolve candidate center from URL (deep link) then localStorage.
 * This is a hint for the backend — NOT authoritative.
 */
function resolveCandidateCenter(): string | null {
  const fromUrl = getDeepLinkCenter();
  if (fromUrl) {
    setCenter(fromUrl);
    return fromUrl;
  }
  return getCenter();
}

/**
 * POST-AUTH: sync authoritative center from backend response.
 * Backend always wins. Only overwrite if backend returns a non-null center.
 */
function syncCenterFromResponse(res: unknown): void {
  const backendCenter = extractCenter(res);
  if (backendCenter) {
    setCenter(backendCenter);
  }
}

export const AuthContext = createContext<AuthContextValue>({
  status: "loading",
  userType: null,
  profile: null,
  loginWithZalo: async () => {},
  loginWithPassword: async () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function useAuthState(): AuthContextValue {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [userType, setUserType] = useState<"student" | "staff" | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    async function init() {
      // Step 1: Check existing stored session
      const session = await checkSession();
      if (session) {
        setUserType(session.userType);
        setStatus("authenticated");
        return;
      }

      // PRE-AUTH: resolve candidate center (URL → localStorage)
      const candidateCenter = resolveCandidateCenter();

      // Step 2: Auto-login via Zalo SDK if inside ZMP
      if (isInsideZMP()) {
        try {
          const accessToken = await getZaloAccessToken();

          if (accessToken) {
            const res = await apiPost<unknown>("/api/mobile/auth/zalo", {
              accessToken,
              ...(candidateCenter ? { center: candidateCenter } : {}),
            });

            // POST-AUTH: sync authoritative center from backend
            syncCenterFromResponse(res);

            const jwt = extractToken(res);
            if (jwt) {
              setToken(jwt);
              const newSession = await checkSession();
              if (newSession) {
                setUserType(newSession.userType);
                setStatus("authenticated");
                return;
              }
            }

            // Backend indicated onboarding required
            if (extractNeedsOnboarding(res)) {
              setStatus("onboarding");
              return;
            }
          }
        } catch {
          // Auto-login failed → fall through to manual login
        }
      }

      // Step 3: Show manual login screen
      clearToken();
      setStatus("unauthenticated");
    }

    init();
  }, []);

  const loginWithZalo = useCallback(async (accessToken: string) => {
    const candidateCenter = resolveCandidateCenter();
    const res = await apiPost<unknown>("/api/mobile/auth/zalo", {
      accessToken,
      ...(candidateCenter ? { center: candidateCenter } : {}),
    });

    syncCenterFromResponse(res);

    if (extractNeedsOnboarding(res)) {
      setStatus("onboarding");
      return;
    }

    const jwt = extractToken(res);
    if (jwt) setToken(jwt);
    const p = extractProfile(res);
    if (p) setProfile(p);
    const session = await checkSession();
    if (session) {
      setUserType(session.userType);
      setStatus("authenticated");
    } else {
      throw new Error("Không thể xác thực phiên đăng nhập");
    }
  }, []);

  const loginWithPassword = useCallback(async (phone: string, password: string) => {
    const candidateCenter = resolveCandidateCenter();
    const res = await apiPost<unknown>("/api/mobile/auth/login", {
      username: phone,
      password,
      ...(candidateCenter ? { center: candidateCenter } : {}),
    });

    syncCenterFromResponse(res);

    if (extractNeedsOnboarding(res)) {
      setStatus("onboarding");
      return;
    }

    const jwt = extractToken(res);
    if (jwt) setToken(jwt);
    const p = extractProfile(res);
    if (p) setProfile(p);
    const session = await checkSession();
    if (session) {
      setUserType(session.userType);
      setStatus("authenticated");
    } else {
      throw new Error("Không thể xác thực phiên đăng nhập");
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setStatus("unauthenticated");
    setUserType(null);
    setProfile(null);
    // center is intentionally NOT cleared on logout (sticky identity context)
  }, []);

  return { status, userType, profile, loginWithZalo, loginWithPassword, logout };
}
