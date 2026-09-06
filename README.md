# VTSMAS Lesson Scheduler

React (Vite) + TypeScript SPA, deployed to **Cloudflare Pages** (static build + Pages Functions in the `functions/` directory). One deployment serves both the SPA and the server-side proxy.

## Architecture

The browser only ever talks to the app's own origin — no CORS, and upstream hosts are not exposed:

- **Dev:** the Vite dev server mirrors the production proxy (`vite.config.ts` `devApiProxy`) — `/api/*` → `gateway.vtsmas.vn`, `/api/auth/*` → `sso.vtsmas.vn`.
- **Prod:** `functions/api/[[path]].ts` is a Cloudflare Pages Function (a Worker) doing the same server-side, injecting the SSO `client_id`/`client_secret` before forwarding.
- **SPA fallback:** `public/_redirects` rewrites unknown routes (`/login`, `/teaching-schedule`, …) to `/index.html`.

### Required Cloudflare Pages environment variables

Set in the Pages project → Settings → Environment Variables.

| Variable            | Example                        |
| ------------------- | ------------------------------ |
| `GATEWAY_URL`       | `https://gateway.vtsmas.vn`    |
| `SSO_URL`           | `https://sso.vtsmas.vn`        |
| `SSO_CLIENT_ID`     | `backend-admin-app-client`     |
| `SSO_CLIENT_SECRET` | `1q2w3e*` (as configured)      |
| `ALLOWED_ORIGINS`   | `https://your-app.pages.dev` *(optional — comma-separated; recommend setting so the proxy can't be used as an open relay)* |

All vars fall back to the current values in code if unset, so a deploy works out of the box; set them to harden.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
