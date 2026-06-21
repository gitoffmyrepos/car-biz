const DEFAULT_API_ORIGIN = 'http://localhost:8100';
const DEFAULT_API_BASE_URL = `${DEFAULT_API_ORIGIN}/api`;

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function withApiSuffix(value: string): string {
  const base = trimTrailingSlash(value || DEFAULT_API_BASE_URL);
  return base.endsWith('/api') ? base : `${base}/api`;
}

export function apiBaseUrl(): string {
  return withApiSuffix(
    process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      DEFAULT_API_BASE_URL,
  );
}

export function serverApiBaseUrl(): string {
  return withApiSuffix(
    process.env.INTERNAL_API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      DEFAULT_API_BASE_URL,
  );
}

export function apiOriginUrl(): string {
  const base = apiBaseUrl();
  return base.endsWith('/api') ? base.slice(0, -4) : base;
}

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const pathWithoutApiPrefix = normalizedPath.startsWith('/api/')
    ? normalizedPath.slice(4)
    : normalizedPath;
  return `${apiBaseUrl()}${pathWithoutApiPrefix}`;
}

export function serverApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const pathWithoutApiPrefix = normalizedPath.startsWith('/api/')
    ? normalizedPath.slice(4)
    : normalizedPath;
  return `${serverApiBaseUrl()}${pathWithoutApiPrefix}`;
}

export function apiWebSocketBaseUrl(): string {
  const explicitBase = process.env.NEXT_PUBLIC_WS_BASE_URL;
  if (explicitBase) return trimTrailingSlash(explicitBase);

  const apiBase = apiBaseUrl();
  try {
    const url = new URL(apiBase);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return trimTrailingSlash(url.toString());
  } catch {
    return 'ws://localhost:8100/api';
  }
}
