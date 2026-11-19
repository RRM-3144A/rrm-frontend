# RRM frontend – rules and context for AI assistants

Research Resource Manager (RRM), team Echipa 1, group 3144A (USV).
This repo is the **Next.js frontend**. The backend is `rrm-backend` (FastAPI); its
`CLAUDE.md` has the same team rules. Read this file before starting a task.

## The project in short

Web app for booking university research resources (rooms/labs and equipment) in
**30-minute slots**. Students request a slot; the resource's administrator approves,
rejects (with a reason) or asks for training first. Up to 2 teams can share a resource
at the same time (per-resource setting). Administrators set opening hours and
maintenance windows (no bookings during maintenance). Optional: a waitlist with e-mail
when a slot frees up. Sign-in is **Google only**, restricted to `@student.usv.ro`.

Requirements: Confluence space **Echipa1IP** ("Research Resource Manager - Product
Requirements"); MVP = the MUST HAVE requirements. Waitlist is NICE TO HAVE.

## Where things live

- GitHub org: https://github.com/RRM-3144A – `rrm-frontend` (this repo), `rrm-backend`.
- Jira: project **E1** on https://student-team-svbnqcvw.atlassian.net
  (cloudId `d3f2b019-292a-4b54-b355-3bb3f1699bf6`; transition ids: 11 = To Do, 21 = In Progress, 31 = Done).
- Confluence: space **Echipa1IP** – Lab 5 (stack, database design), Lab 6 (coding style).
- Figma (design to follow): file key `XJh0TSEVgvZgBtXUiOXVjh` ("WIREFRAME"),
  pages **UTILIZATOR** (`0:1`), **ADMIN** (`14:2`), **WIREFRAME** (`67:226`, older sketches).

## Before starting a task

1. Pick a Jira task in **To Do** that nobody is assigned to. Tasks **In Progress** or assigned to someone else are taken.
2. Assign it to yourself and move it to **In Progress**, so the other teammates' assistants skip it.
3. Pull the latest `main`.

## Workflow: one Jira task = one branch = one commit = one PR

1. Branch from the latest `main`: `E1-XX-short-name` (e.g. `E1-25-reservation-dialog`).
2. One commit per task. The message starts with `E1-XX: `.
3. `npm run lint` (and `npm run typecheck`) must pass before pushing.
4. Open a PR into `main`. Title = commit title; the description links the Jira task, lists what changed and the lint result.
5. A **human** reviews the PR and decides when to merge. The assistant does not merge on its own.
6. Merge with **"Create a merge commit"** (never squash or rebase). Branches are deleted automatically on merge.
7. After the merge, move the Jira task to **Done**. A task with backend and frontend parts stays In Progress until both PRs are merged.
8. Never force-push to `main`, and never delete someone else's branch.

## Stack and conventions

- Next.js 16 (App Router), React 19, TypeScript (strict), ESLint 9 flat config (`eslint.config.mjs`).
- Google TypeScript style: `camelCase` for variables/functions, `PascalCase` for components
  and types, **named exports** for components (pages/layouts use the default export Next requires),
  single quotes, `{a, b}` without spaces inside braces in imports.
- Styling: **CSS Modules** next to each component + design tokens as CSS variables in
  `src/app/globals.css`. **No Tailwind.**
- UI text is **Romanian** (with diacritics); code, comments and identifiers are English.
- Server vs client: pages are server components; anything with state, effects, `localStorage`
  or event handlers is a client component (`'use client'`). **Never pass functions from a
  server page to a client component** (not serializable) – pass plain data/strings.
- The project was set up without network access for the assistant: if you cannot run
  `npm install`/`npm run lint` yourself, say so and ask the user to run them.

## Layout of the code

```
src/app/
  conectare/            sign-in page (E1-14)
  (student)/            student pages, wrapped by AppShell area="student"
    sali, echipamente   resource catalog (E1-17)
    resurse/[id]        resource page with the weekly calendar (E1-21)
    rezervari, lista-asteptare, profil   empty pages for now
  admin/                admin pages, wrapped by AppShell area="admin" (empty pages for now)
  page.tsx              redirects to /conectare
src/components/
  AppShell              layout (sidebar + content) AND page protection (E1-42)
  Sidebar, PageHeader, EmptyPanel, BackendStatus
  icons/Icon            the 22 Figma icons (name="room" | "chip" | ...), colour = currentColor
  auth/                 LoginCard, AccessDenied (403 screen)
  catalog/              ResourceCatalog (search, category select, filters, expandable rows)
  calendar/             ResourceCalendar (week grid, legend, slot selection)
src/lib/
  types.ts              types mirroring the backend schemas (camelCase)
  navigation.ts         sidebar menus per role
  session.ts            session in localStorage + useSession() hook
  auth.ts               sign-in (demo mode), signOut, homePathFor(role), domain rule
  catalog.ts, availability.ts   data access used by the pages (currently backed by mocks)
  mock/                 mock data: catalog, availability, demo accounts
  format.ts, dates.ts   formatting helpers (Romanian labels, local time)
  config.ts             apiUrl from NEXT_PUBLIC_API_URL
public/                 google.svg, lumina.svg (background lines) – exported from Figma
```

## Data: mocks now, API later

The lab brief says the MVP frontend **does not need to be integrated with the backend yet**.
So pages read data through `src/lib/catalog.ts`, `src/lib/availability.ts` and
`src/lib/auth.ts`, which currently use `src/lib/mock/*`. The mocks have the **same shape
as the backend responses** (`src/lib/types.ts`), so integration (Jira **E1-41**, API client)
only changes those `lib` files, not the components. Keep this pattern for new pages:
add a function in `src/lib/<area>.ts` backed by a mock in `src/lib/mock/`.

Backend endpoints the frontend will use (see `rrm-backend`, Swagger at `/docs`):
`POST /auth/google` (ID token → JWT + user), `GET /auth/me`, `GET /resources`,
`GET /categories`, `GET/PUT /resources/{id}/schedule`,
`GET /resources/{id}/availability?start_date&end_date` (30-min slots: FREE / PENDING /
APPROVED / MAINTENANCE + free_places), `GET/POST /resources/{id}/maintenance`,
`DELETE /resources/{id}/maintenance/{mid}`, `POST /reservations`,
`GET /reservations/pending` (admin), `POST /reservations/{id}/approve|reject|awaiting-training`,
`POST /reservations/{id}/cancel`, complete-training (E1-45, PR #21 in rrm-backend).
Errors: 401 not signed in, 403 wrong role, 404, 409 conflict (slot taken / overlap), 422 invalid input.

Sign-in: until E1-41, "Continuă cu Google" opens a **demo account chooser** (student,
admin, personal Gmail → domain error). The session (`{token, user}`) is kept in
`localStorage` under `rrm.session`. `AppShell` sends signed-out visitors to `/conectare`
and shows "Acces restricționat" to non-admins on `/admin/*`.

## Design (Figma) – how to follow it

- Tokens in `globals.css`: petrol `#0e3a44`, ink `#12262c`, ink-soft `#3f555c`,
  moss `#23604a` (free/active), amber `#8a5a0c` (reserved), danger/crimson `#952535`
  (maintenance, errors), calendar "partial" `#17606f`. Font **IBM Plex Sans**
  (`next/font`). Frosted-glass panels: `--glass-background`, `--glass-shadow`, `backdrop-filter: blur(11px)`.
- Reuse existing pieces: `PageHeader` (title/subtitle/aside), `EmptyPanel`, `Icon`,
  button styles (primary = petrol, secondary = white with petrol border, radius 11px),
  filter chips, the glass list from `ResourceCatalog`.
- Figma screens (node ids) still to implement:
  - UTILIZATOR: `149:567` popup "Adaugă rezervare", `149:911` popup "Cerere trimisă",
    `115:671` "Rezervările mele", `149:2241` "Listă de așteptare", `149:2418` "Profil";
    there are also popups for "slot ocupat / listă de așteptare" and "resursă în mentenanță"
    (find their ids with `get_metadata` on page `0:1`).
  - ADMIN: `149:2835` "Cereri primite", `149:3062` notification "Cerere aprobată",
    `149:3161` popup "Detalii cerere", `149:3308` popup "Respinge cererea",
    `149:3420` popup "Necesită instruire", `149:3549` popup "Instruire finalizată",
    `149:3661` "Resurse", `149:3915` popup "Adaugă / editează resursă",
    `149:4106` popup "Dezactivează resursa", `149:4262` "Categorii",
    `149:4716` "Calendar și mentenanță", `149:5989` "Program de funcționare",
    `149:6261` "Utilizare pe echipe", `149:6517` "Profil administrator".
  - Components: frame `114:218` ("Componente": icons, buttons, nav, filters, labels, fields).
- Figma MCP: call `create_session` first; prefer `get_design_context` for a screen and
  `use_figma` (read-only, `exportAsync({format: 'SVG_STRING'})`) for SVG assets, because
  figma.com asset URLs may be blocked from the sandbox. The team's Figma is on the
  **Starter plan: MCP calls are rate-limited** – batch reads, don't re-read what is here.
- Where Figma and the backend disagree, follow the backend and say so in the PR
  (e.g. the e-mail domain is `@student.usv.ro`, not `@usv.ro`).

## Status (keep this up to date; check Jira for the truth)

Done (merged): E1-37 (Next.js setup), E1-40 (layout + navigation), E1-17 (catalog),
E1-14 (sign-in page), E1-42 (role protection), E1-21 (resource calendar).

Remaining for the MVP frontend, in a sensible order:
1. **E1-25** – dialog "Adaugă rezervare" (wire the calendar's "Continuă", `onContinue`
   prop of `ResourceCalendar`) and page "Rezervările mele" (status, cancel).
2. **E1-28** – admin "Cereri primite" (list, "Prima rezervare" badge, approve / reject with
   reason / needs training, request details popup).
3. **E1-45 (frontend part)** – "Instruire finalizată" action/popup in "Cereri primite"
   (backend part by Antonie, rrm-backend PR #21).
4. **E1-31** – admin "Calendar și mentenanță": mark maintenance (interval + reason), show it in the calendar.
5. **E1-43** – admin "Program de funcționare" form.
6. **E1-18** – admin "Resurse" and "Categorii" pages (add / edit / deactivate).

Later / not MVP: **E1-41** API client (integration stage), **E1-46** waitlist UI (nice to have),
**E1-50** "Utilizare pe echipe", **E1-47** end-to-end tests, **E1-49** demo preparation.

**E1-37 Docker part** (postponed to the end of the project): add a `Dockerfile`
(Next.js `output: 'standalone'`, copy `.next/standalone`, `.next/static` and `public/`),
a `.dockerignore`, and a `frontend` service in `rrm-backend/docker-compose.yml`
(`build.context: ../rrm-frontend`, port 3000, `NEXT_PUBLIC_API_URL` build arg), so
`docker compose up --build` starts database + backend + frontend.

## Running

```bash
npm install
cp .env.example .env.local     # Windows: copy .env.example .env.local
npm run dev                    # http://localhost:3000
npm run lint && npm run typecheck
```
The developer works on Windows (PowerShell, VS Code); give Windows-friendly commands.
