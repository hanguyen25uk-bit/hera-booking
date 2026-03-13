"use client";

// Auth storage - uses localStorage (works on both web and Capacitor WebView)

export interface SavedAuth {
  email: string;
  token: string;
  salonSlug: string;
  salonName: string;
  expiresAt: number;
}

const AUTH_KEY = "hera_auth";
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours in ms

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

export async function isCapacitorNative(): Promise<boolean> {
  try {
    if (typeof window === "undefined") return false;
    // Check if running in Capacitor by looking for the Capacitor object
    return !!(window as any).Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}
