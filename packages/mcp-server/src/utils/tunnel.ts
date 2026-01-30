import type { EmailProvider } from '@mcp-mail/shared';

interface NgrokTunnel {
  public_url: string;
  proto: string;
  config: {
    addr: string;
  };
}

interface NgrokApiResponse {
  tunnels: NgrokTunnel[];
}

interface TunnelCache {
  url: string | null;
  timestamp: number;
}

const NGROK_API_URL = 'http://localhost:4040/api/tunnels';
const CACHE_TTL_MS = 30_000; // 30 seconds

let cache: TunnelCache | null = null;

/**
 * Query ngrok API to get the active HTTPS tunnel URL
 */
async function fetchNgrokUrl(): Promise<string | null> {
  try {
    const response = await fetch(NGROK_API_URL, {
      signal: AbortSignal.timeout(2000),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as NgrokApiResponse;

    // Find HTTPS tunnel pointing to port 3000
    const httpsTunnel = data.tunnels.find(
      (t) => t.proto === 'https' && t.config.addr.includes('3000')
    );

    return httpsTunnel?.public_url || null;
  } catch {
    // ngrok not running or API not accessible
    return null;
  }
}

/**
 * Get the ngrok tunnel URL with caching
 */
export async function getNgrokUrl(): Promise<string | null> {
  const now = Date.now();

  // Return cached value if still valid
  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return cache.url;
  }

  const url = await fetchNgrokUrl();
  cache = { url, timestamp: now };

  return url;
}

/**
 * Check if ngrok tunnel is currently active
 */
export async function isTunnelActive(): Promise<boolean> {
  const url = await getNgrokUrl();
  return url !== null;
}

/**
 * Clear the tunnel URL cache
 */
export function clearTunnelCache(): void {
  cache = null;
}

/**
 * Get OAuth redirect URI for a provider
 * Uses ngrok URL if available, falls back to localhost
 */
export async function getOAuthRedirectUri(provider: EmailProvider): Promise<string> {
  // Gmail requires localhost (Google Cloud Console configured with localhost redirect URI)
  if (provider === 'gmail') {
    return 'http://localhost:3000/auth/gmail/callback';
  }

  const ngrokUrl = await getNgrokUrl();
  const baseUrl = ngrokUrl || 'http://localhost:3000';

  return `${baseUrl}/auth/callback?provider=${provider}`;
}

/**
 * Get the base URL for the app (ngrok or localhost)
 */
export async function getBaseUrl(): Promise<string> {
  const ngrokUrl = await getNgrokUrl();
  return ngrokUrl || 'http://localhost:3000';
}
