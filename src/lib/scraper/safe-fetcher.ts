import http from 'http';
import https from 'https';
import { URL } from 'url';
import { validateUrlSecurity, normalizeAndValidateUrlFormat } from '../security/url-security';

export interface SafeFetchOptions {
  maxRedirects?: number;
  timeoutMs?: number;
  maxSizeBytes?: number;
  userAgent?: string;
}

export interface SafeFetchResult {
  finalUrl: string;
  statusCode: number;
  contentType: string;
  bodyText: string;
}

const DEFAULT_USER_AGENT = 'UGCVideoGenerator/1.0 (Product Page Intelligence Extractor)';
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 8000;
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB streaming limit

export async function safeFetchProductPage(
  targetUrl: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult> {
  const maxRedirects = options.maxRedirects ?? MAX_REDIRECTS;
  const timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
  const maxSizeBytes = options.maxSizeBytes ?? MAX_SIZE_BYTES;
  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;

  let currentUrl = targetUrl;
  let redirectCount = 0;

  while (redirectCount <= maxRedirects) {
    // 1. Validate security & resolve DNS for current URL
    const secResult = await validateUrlSecurity(currentUrl);
    if (!secResult.valid || !secResult.normalizedUrl || !secResult.ip) {
      throw new Error(`Security validation failed for URL (${currentUrl}): ${secResult.error}`);
    }

    const validatedUrlStr = secResult.normalizedUrl;
    const pinnedIp = secResult.ip;
    const parsedUrl = new URL(validatedUrlStr);

    // 2. Perform HTTP GET with pinned IP lookup to prevent DNS rebinding
    const fetchResponse = await executePinnedHttpGet(parsedUrl, pinnedIp, {
      userAgent,
      timeoutMs,
      maxSizeBytes,
    });

    const statusCode = fetchResponse.statusCode;

    // 3. Handle Redirects (301, 302, 303, 307, 308)
    if ([301, 302, 303, 307, 308].includes(statusCode)) {
      redirectCount++;
      if (redirectCount > maxRedirects) {
        throw new Error(`Too many redirects (exceeded maximum of ${maxRedirects})`);
      }

      const locationHeader = fetchResponse.headers['location'];
      if (!locationHeader) {
        throw new Error(`Redirect response (${statusCode}) missing Location header`);
      }

      // Resolve redirect target relative to current URL
      let nextUrl: URL;
      try {
        nextUrl = new URL(locationHeader, parsedUrl);
      } catch {
        throw new Error(`Invalid redirect Location header: ${locationHeader}`);
      }

      // Re-normalize and re-validate protocol
      const formatCheck = normalizeAndValidateUrlFormat(nextUrl.toString());
      if (!formatCheck.valid || !formatCheck.normalizedUrl) {
        throw new Error(`Forbidden redirect URL (${nextUrl.toString()}): ${formatCheck.error}`);
      }

      currentUrl = formatCheck.normalizedUrl;
      continue;
    }

    // 4. Handle Successful HTML Response (200 OK)
    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(`HTTP fetch failed with status code: ${statusCode}`);
    }

    const contentType = (fetchResponse.headers['content-type'] || '').toLowerCase();
    const isHtml =
      contentType.includes('text/html') ||
      contentType.includes('application/xhtml+xml') ||
      contentType === ''; // Some legacy servers omit Content-Type for HTML

    if (!isHtml) {
      throw new Error(`Invalid Content-Type (${contentType}). Expected text/html.`);
    }

    return {
      finalUrl: validatedUrlStr,
      statusCode,
      contentType,
      bodyText: fetchResponse.bodyText,
    };
  }

  throw new Error(`Exceeded max redirects (${maxRedirects})`);
}

interface InternalFetchResponse {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  bodyText: string;
}

function executePinnedHttpGet(
  parsedUrl: URL,
  pinnedIp: string,
  opts: { userAgent: string; timeoutMs: number; maxSizeBytes: number }
): Promise<InternalFetchResponse> {
  return new Promise((resolve, reject) => {
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const reqOptions: https.RequestOptions = {
      protocol: parsedUrl.protocol,
      hostname: pinnedIp,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: `${parsedUrl.pathname}${parsedUrl.search}`,
      method: 'GET',
      headers: {
        'User-Agent': opts.userAgent,
        Accept: 'text/html,application/xhtml+xml',
        Host: parsedUrl.hostname,
      },
      servername: parsedUrl.hostname,
    };

    let settled = false;
    let timer: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
    };

    const req = client.request(reqOptions, res => {
      const statusCode = res.statusCode || 500;

      // Early rejection via Content-Length header if available
      const contentLengthHeader = res.headers['content-length'];
      if (contentLengthHeader) {
        const declaredSize = parseInt(contentLengthHeader, 10);
        if (!isNaN(declaredSize) && declaredSize > opts.maxSizeBytes) {
          req.destroy();
          cleanup();
          return reject(new Error(`Content-Length (${declaredSize} bytes) exceeds maximum limit (${opts.maxSizeBytes} bytes)`));
        }
      }

      // Check redirect codes before downloading body
      if ([301, 302, 303, 307, 308].includes(statusCode)) {
        res.resume(); // Consume stream
        cleanup();
        return resolve({
          statusCode,
          headers: res.headers,
          bodyText: '',
        });
      }

      let receivedBytes = 0;
      const chunks: Buffer[] = [];

      res.on('data', (chunk: Buffer) => {
        receivedBytes += chunk.length;
        if (receivedBytes > opts.maxSizeBytes) {
          req.destroy();
          cleanup();
          if (!settled) {
            settled = true;
            reject(new Error(`Response body size exceeded maximum streaming limit of ${opts.maxSizeBytes} bytes`));
          }
          return;
        }
        chunks.push(chunk);
      });

      res.on('end', () => {
        cleanup();
        if (settled) return;
        settled = true;
        const bodyText = Buffer.concat(chunks).toString('utf-8');
        resolve({
          statusCode,
          headers: res.headers,
          bodyText,
        });
      });

      res.on('error', err => {
        cleanup();
        if (!settled) {
          settled = true;
          reject(err);
        }
      });
    });

    req.on('error', err => {
      cleanup();
      if (!settled) {
        settled = true;
        reject(err);
      }
    });

    timer = setTimeout(() => {
      req.destroy();
      cleanup();
      if (!settled) {
        settled = true;
        reject(new Error(`HTTP request timed out after ${opts.timeoutMs}ms`));
      }
    }, opts.timeoutMs);

    req.end();
  });
}
