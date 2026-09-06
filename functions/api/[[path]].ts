// Cloudflare Pages Function — the single "server" for this SPA.
//
// Requests stay same-origin (no CORS), and the upstream hosts live only in
// Cloudflare Pages environment variables, so the browser never sees them:
//
//   /api/auth/connect/token  -> <SSO_URL>     (client credentials injected server-side)
//   /api/*                   -> <GATEWAY_URL>
//
// Environment variables to set in Cloudflare Pages (deploy settings):
//   GATEWAY_URL="https://gateway.vtsmas.vn"
//   SSO_URL="https://sso.vtsmas.vn"
//   SSO_CLIENT_ID / SSO_CLIENT_SECRET   (optional; defaults match the current app)
//   ALLOWED_ORIGINS                     (optional; comma-separated origins allowed
//                                        to use this proxy — recommended so it
//                                        can't be used as an open relay)
//
// Note: this file is compiled to a Cloudflare Worker at deploy time and is
// intentionally outside the client `src/` tree, so `tsc -b`/`vite build` don't
// touch it.

// Headers the app may send that the upstreams care about. Excludes
// origin/referer/cookie so nothing sensitive leaks upstream.
const FORWARDED_HEADERS = [
  "authorization",
  "content-type",
  "accept",
  "accept-language",
  "schoolyear",
];

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const gateway = env.GATEWAY_URL || "https://gateway.vtsmas.vn";
  const sso = env.SSO_URL || "https://sso.vtsmas.vn";

  // /api/auth/* -> SSO, stripping the /api/auth prefix so /connect/token is hit.
  const isAuth = url.pathname.startsWith("/api/auth/");
  const upstream = new URL(
    isAuth ? url.pathname.replace(/^\/api\/auth/, "") : url.pathname,
    isAuth ? sso : gateway
  );
  url.searchParams.forEach((value, key) => upstream.searchParams.append(key, value));

  // Optional: restrict which origins may use this proxy (defense against open relay).
  const allowedOrigins = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowedOrigins.length) {
    const origin = request.headers.get("origin");
    if (origin && !allowedOrigins.includes(origin)) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  let body;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.arrayBuffer();

    if (isAuth) {
      // Inject SSO client credentials server-side so they never live in the bundle.
      const params = new URLSearchParams(new TextDecoder().decode(body));
      params.set("client_id", env.SSO_CLIENT_ID || "backend-admin-app-client");
      params.set("client_secret", env.SSO_CLIENT_SECRET || "1q2w3e*");
      body = params.toString();
      headers.set("content-type", "application/x-www-form-urlencoded");
    }
  }

  return fetch(upstream, { method: request.method, headers, body });
}