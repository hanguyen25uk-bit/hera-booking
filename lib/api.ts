// API fetch wrapper with credentials included
// When running in Capacitor or on web, relative URLs work because
// the app loads from herabooking.com

export async function apiFetch(
  path: string,
  options?: RequestInit
): Promise<Response> {
  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return fetch(normalizedPath, {
    ...options,
    credentials: "include",
  });
}
