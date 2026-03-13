"use client";

// Auth storage - uses localStorage (works reliably in both web and Capacitor WebView)
// Session persists for 30 days like Facebook/Instagram

export interface SavedAuth {
  email: string;
  token: string;
  salonSlug: string;
  salonName: string;
  expiresAt: number;
}

const AUTH_KEY = "hera_auth";
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

// Check if running in Capacitor native app
export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

export async function saveAuthCredentials(data: {
  email: string;
  token: string;
  salonSlug: string;
  salonName: string;
}): Promise<void> {
  try {
    const savedAuth: SavedAuth = {
      ...data,
      expiresAt: Date.now() + SESSION_DURATION,
    };

    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(savedAuth));
    }
  } catch (e) {
    console.error("Failed to save auth:", e);
  }
}

export async function getSavedAuth(): Promise<SavedAuth | null> {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }

    const value = localStorage.getItem(AUTH_KEY);
    if (!value) return null;

    const savedAuth: SavedAuth = JSON.parse(value);

    // Check if expired
    if (savedAuth.expiresAt < Date.now()) {
      await clearSavedAuth();
      return null;
    }

    return savedAuth;
  } catch (e) {
    console.error("Failed to get auth:", e);
    return null;
  }
}

export async function clearSavedAuth(): Promise<void> {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem(AUTH_KEY);
    }
  } catch (e) {
    console.error("Failed to clear auth:", e);
  }
}

// Extend session on each app open (keeps user logged in as long as they use the app)
export async function refreshSession(): Promise<void> {
  try {
    const savedAuth = await getSavedAuth();
    if (savedAuth) {
      // Extend expiration
      savedAuth.expiresAt = Date.now() + SESSION_DURATION;
      await saveAuthCredentials(savedAuth);
    }
  } catch (e) {
    console.error("Failed to refresh session:", e);
  }
}
