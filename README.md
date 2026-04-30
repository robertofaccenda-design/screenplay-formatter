# React + Vite

## Cloudflare Workers deploy

Questo progetto puo essere pubblicato su Cloudflare Workers con static assets.

Configurazione principale:

- `wrangler.jsonc`: configura Worker, assets Vite da `dist` e fallback SPA
- `worker/index.js`: serve gli asset statici e gestisce `/api/format`
- `functions/api/format.js`: variante compatibile con Cloudflare Pages Functions

Comandi:

```bash
npm run cf:dev
npm run cf:deploy
```

Prima di usare la formattazione AI, aggiungi il secret Cloudflare:

```text
ANTHROPIC_API_KEY
```

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
