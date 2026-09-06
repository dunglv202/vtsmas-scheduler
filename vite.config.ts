import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

// Dev-time proxy, mirroring the production Edge proxy in api/[...path].ts:
// requests stay same-origin, upstreams are only touched server-side by this
// middleware, and the SSO client credentials never leave the server.
const DEV_GATEWAY = "https://gateway.vtsmas.vn";
const DEV_SSO = "https://sso.vtsmas.vn";
const FORWARDED_HEADERS = [
  "authorization",
  "content-type",
  "accept",
  "accept-language",
  "schoolyear",
];

function devApiProxy(): Plugin {
  return {
    name: "dev-api-proxy",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/api")) return next();

        const url = new URL(req.url, "http://localhost");
        const isAuth = url.pathname.startsWith("/api/auth/");
        const upstream = new URL(
          isAuth ? url.pathname.replace(/^\/api\/auth/, "") : url.pathname,
          isAuth ? DEV_SSO : DEV_GATEWAY
        );
        url.searchParams.forEach((value, key) => upstream.searchParams.append(key, value));

        const headers = new Headers();
        for (const name of FORWARDED_HEADERS) {
          const value = req.headers[name];
          if (value) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
        }

        let body: Buffer | string | undefined;
        const method = (req.method || "GET").toUpperCase();
        if (method !== "GET" && method !== "HEAD") {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(Buffer.from(chunk));
          const raw = Buffer.concat(chunks);

          if (isAuth) {
            const params = new URLSearchParams(raw.toString("utf-8"));
            params.set("client_id", "backend-admin-app-client");
            params.set("client_secret", "1q2w3e*");
            body = params.toString();
            headers.set("content-type", "application/x-www-form-urlencoded");
          } else {
            body = raw;
          }
        }

        try {
          const upstreamResponse = await fetch(upstream, { method, headers, body });
          res.statusCode = upstreamResponse.status;
          const contentType = upstreamResponse.headers.get("content-type");
          if (contentType) res.setHeader("content-type", contentType);
          res.end(Buffer.from(await upstreamResponse.arrayBuffer()));
        } catch (err) {
          res.statusCode = 502;
          res.end(`Proxy error: ${(err as Error).message}`);
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), devApiProxy()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    allowedHosts: ["pumped-cub-firstly.ngrok-free.app"],
  },
});