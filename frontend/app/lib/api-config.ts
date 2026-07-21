export function getApiBaseUrl(): string {
  const envUrl =
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    process.env.API_URL ??
    "";

  // If envUrl is an absolute URL (starts with http:// or https://)
  if (envUrl.startsWith("http://") || envUrl.startsWith("https://")) {
    return envUrl.endsWith("/") ? envUrl.slice(0, -1) : envUrl;
  }

  // Normalize path prefix (defaults to /api if envUrl is empty or relative)
  const pathPrefix = envUrl ? (envUrl.startsWith("/") ? envUrl : `/${envUrl}`) : "/api";

  // If executing on the Server (SSR in Server Component / Node.js)
  if (typeof window === "undefined") {
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}${pathPrefix}`;
    }
    const port = process.env.PORT ?? "3000";
    return `http://127.0.0.1:${port}${pathPrefix}`;
  }

  // Client side in browser: relative path works out of the box
  return pathPrefix;
}

export function buildApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  if (baseUrl.endsWith("/")) {
    return `${baseUrl.slice(0, -1)}${cleanPath}`;
  }
  return `${baseUrl}${cleanPath}`;
}
