# AGENTS.md

> **Context**: This file is the source of truth for all AI agents (e.g., Jules) working on the `notepad-budget` repository.

## 1. System Architecture
**Summary**: A **Local-First** Personal Finance PWA built with Next.js 16, Supabase, and Dexie.js.
- **Hybrid Sync Model**:
  - **Reads**: UI primarily reads from **Dexie (IndexedDB)** for instant load times (0ms latency).
  - **Writes**: Writes go to Dexie *immediately*, then sync to Supabase via `SyncManager` or Server Actions in the background.
  - **Auth**: Supabase Auth (SSR + Middleware protection).

### Tech Stack
- **Framework**: Next.js 16 (App Router).
- **Language**: TypeScript (Strict).
- **Styling**: Tailwind CSS 4 (PostCSS).
- **Database (Cloud)**: Supabase (PostgreSQL).
- **Database (Local)**: Dexie.js (IndexedDB).
- **State/Sync**: Custom `SyncManager.tsx` + `useLiveQuery` (Dexie).
- **Icons**: Lucide React.

## 2. Technical Constraints
### Routing & State
- **App Router**: STRICTLY use the App Router (`app/` directory).
- **Client Components**:
  - Use `"use client"` only for interactive leaves.
  - **Data Fetching**: Prefer `useLiveQuery` (Dexie) for client-side reads to ensure offline support.
  - **Server Actions**: Use `actions.ts` for writes that need to hit Supabase directly or for initial hydration.

### Styling
- **Tailwind Only**: No CSS modules. Use `clsx` or `tailwind-merge` for conditional classes.
- **Mobile First**: This is a **PWA**. All designs must be touch-friendly and responsive.
  - Tap targets: minimum 44px.
  - Safe areas: Respect notch/home bar (`pb-safe`, `pt-safe` utilities if available, or manual spacing).

### Local-First Rules
- **Optimistic UI**: ALWAYS update the local UI/Dexie immediately. Never wait for the network.
- **Offline Support**: The app must function 100% read/write while offline (queueing syncs via `SyncManager`).

## 3. Naming Conventions
- **Branches**: `agent/<type>/<description>` (e.g., `agent/feat/offline-mode`, `agent/fix/sync-bug`).
- **Components**: PascalCase (e.g., `TransactionCard.tsx`).
- **Hooks**: camelCase with `use` prefix (e.g., `useCurrency.ts`).
- **Server Actions**: camelCase (e.g., `addTransaction`, `syncData`).

## 4. Deployment Guardrails
- **Preview**: Every PR generates a Vercel Preview.
  - **Requirement**: Verify 'Offline Mode' in the preview (toggle Network Throttling to Offline) before merging.
- **Production**: Main branch is production.
  - **Migrations**: SQL migrations must be idempotent or carefully sequenced.
  - **Environment**: Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set.

## 5. Performance Budget
- **Core Web Vitals**:
  - **LCP (Largest Contentful Paint)**: < 2.5s. (Use `next/image` or optimized local assets).
  - **CLS (Cumulative Layout Shift)**: < 0.1. (Skeleton loaders for `useLiveQuery` initial states).
  - **FID/INP**: < 200ms. (Heavy logic in Web Workers if necessary, though unlikely for this complexity).
- **PWA Hygiene**:
  - `manifest.json` and `service-worker.js` must be valid.
  - Assets must be cached.

## 6. Security & Best Practices
- **RLS**: Row Level Security is ENABLED on Supabase.
  - Always include `user_id` in queries/inserts.
  - Never bypass RLS in client queries.
- **Validation**:
  - Validate all `actions.ts` inputs (Zod recommended, or strict type checks).
  - Sanitize user inputs (amounts, descriptions).
