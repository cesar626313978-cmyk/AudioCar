/**
 * PKCE (Proof Key for Code Exchange) Utility for Client-Side SPA OAuth
 * Compliant with RFC 7636 for Microsoft Identity and Dropbox OAuth 2.0
 */

export function generateRandomString(length: number = 64): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array, (byte) => possible[byte % possible.length]).join('');
}

export function generateCodeVerifier(): string {
  return generateRandomString(64);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  
  // Base64URL encode
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function generateRandomState(): string {
  return generateRandomString(32);
}
