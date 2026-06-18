// API-key auth helpers. The backend requires a key when SM_API_KEY is set;
// otherwise the API is open and none of this is surfaced.

export const API_KEY_STORAGE = 'sm_api_key';

export function getApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE);
}

export function setApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE, key);
}

export function clearApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE);
}

/** Whether the backend currently requires an API key. Uses fetch (not the
 * axios client) to avoid an interceptor import cycle. */
export async function isAuthRequired(): Promise<boolean> {
  try {
    const resp = await fetch('/api/v1/auth/status');
    if (!resp.ok) return false;
    const data = await resp.json();
    return Boolean(data?.auth_required);
  } catch {
    return false; // fail open if the probe is unreachable
  }
}

export function isAuthed(): boolean {
  return Boolean(getApiKey());
}
