# RRM Frontend

Next.js (TypeScript) frontend for the Research Resource Manager.
Design: Figma file "WIREFRAME" (pages UTILIZATOR and ADMIN); the colours and text
styles are in `src/app/globals.css`.

## Run locally

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
npm run dev
```

App: http://localhost:3000. The start page calls `GET /health` on the backend
(`NEXT_PUBLIC_API_URL`, default http://localhost:8000) and shows whether it answers.
Start the backend first (see `rrm-backend`); its CORS settings already allow
http://localhost:3000.

## Checks

```bash
npm run lint        # ESLint (Next.js + Google TypeScript naming rules)
npm run typecheck   # TypeScript
npm run build
```

## Conventions

- TypeScript, Google TypeScript style guide: `camelCase` for variables and functions,
  `PascalCase` for React components and types, named exports for components.
- Styles: CSS Modules next to each component, design tokens as CSS variables.
- Layout: `src/app/` (pages), `src/components/` (shared components), `src/lib/` (API client, config).
