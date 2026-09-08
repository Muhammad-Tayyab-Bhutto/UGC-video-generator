import dns from 'dns';
import net from 'net';
import { URL } from 'url';

export interface UrlSecurityValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  error?: string;
  ip?: string;
}

// Check if an IPv4 address is in a private, loopback, link-local, or reserved range
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return true;

  const [a, b] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;
  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 10.0.0.0/8 (Private)
  if (a === 10) return true;
  // 172.16.0.0/12 (Private)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 (Link-local / AWS metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;
  // 240.0.0.0/4 (Reserved) & 255.255.255.255 (Broadcast)
  if (a >= 240) return true;

  return false;
}

// Check if an IPv6 address is loopback, unique local, link-local, or IPv4-mapped private
export function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  // Loopback (::1) or Unspecified (::)
  if (normalized === '::1' || normalized === '::') return true;

  // Unique local addresses (fc00::/7 -> fc.. or fd..)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  // Link-local addresses (fe80::/10 -> fe8, fe9, fea, feb)
  if (
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  ) {
    return true;
  }

  // IPv4-mapped IPv6 (::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (normalized.includes('::ffff:')) {
    const parts = normalized.split('::ffff:');
    const v4Part = parts[1];
    if (v4Part && net.isIPv4(v4Part)) {
      return isPrivateIPv4(v4Part);
    }
    // Hex format ipv4-mapped (e.g., ::ffff:7f00:1 -> 127.0.0.1)
    if (v4Part && v4Part.includes(':')) {
      const hexParts = v4Part.split(':').map(h => parseInt(h, 16));
      if (hexParts.length === 2) {
        const ip4Str = `${(hexParts[0] >> 8) & 0xff}.${hexParts[0] & 0xff}.${(hexParts[1] >> 8) & 0xff}.${hexParts[1] & 0xff}`;
        return isPrivateIPv4(ip4Str);
      }
    }
    return true;
  }

  return false;
}

export function isPrivateIP(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  if (net.isIPv6(ip)) return isPrivateIPv6(ip);
  return true; // Treat unknown IP formats as unsafe
}

export function normalizeAndValidateUrlFormat(rawUrl: string): { valid: boolean; normalizedUrl?: string; error?: string; parsedUrl?: URL } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'URL string is required' };
  }

  let trimmed = rawUrl.trim();

  // If no scheme is provided, prepend https://
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: `Forbidden protocol: ${parsed.protocol}. Only http: and https: are allowed.` };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname) {
    return { valid: false, error: 'Hostname cannot be empty' };
  }

  // Quick string checks for obvious local hostnames
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '0.0.0.0') {
    return { valid: false, error: 'Access to localhost and loopback domains is forbidden' };
  }

  return { valid: true, normalizedUrl: parsed.toString(), parsedUrl: parsed };
}

export async function validateUrlSecurity(rawUrl: string): Promise<UrlSecurityValidationResult> {
  const formatCheck = normalizeAndValidateUrlFormat(rawUrl);
  if (!formatCheck.valid || !formatCheck.parsedUrl || !formatCheck.normalizedUrl) {
    return { valid: false, error: formatCheck.error };
  }

  const hostname = formatCheck.parsedUrl.hostname;

  // If hostname is directly an IP address
  if (net.isIP(hostname)) {
    if (isPrivateIP(hostname)) {
      return { valid: false, error: `Access to private/reserved IP address (${hostname}) is forbidden` };
    }
    return { valid: true, normalizedUrl: formatCheck.normalizedUrl, ip: hostname };
  }

  // Resolve DNS for domain name
  try {
    const addresses = await dns.promises.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      return { valid: false, error: `Could not resolve DNS for hostname: ${hostname}` };
    }

    for (const addr of addresses) {
      if (isPrivateIP(addr.address)) {
        return { valid: false, error: `Hostname ${hostname} resolved to restricted IP address (${addr.address})` };
      }
    }

    return { valid: true, normalizedUrl: formatCheck.normalizedUrl, ip: addresses[0].address };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, error: `DNS lookup failed for ${hostname}: ${msg}` };
  }
}
