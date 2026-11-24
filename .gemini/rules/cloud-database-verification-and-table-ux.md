# Rule: Cloud Database Verification & Live-Play Table Invariants

## 1. Cloud Database Persistence Verification
- **Automated Round-Trip Validation**: Whenever connecting an external database backend (Supabase, Postgres, Firebase), immediately execute an automated test script verifying:
  1. Insert/Upsert a test record.
  2. Read the record back and assert contents match.
  3. Mutate the record and verify updated timestamp/mtime.
  4. Delete test record.
- **Complete Seed Coverage**: When migrating or seeding vault/file data to a database, never seed only primary directories (`Notes/`). Always include staging, review, and meta directories (`_Review/`, `.hub/users.json`, `.hub/state.json`).
- **Truthful Empty States**: Never display "all items processed/applied" solely because query results return length 0. Distinguish between "no items found in database" and "all items resolved".

## 2. Serverless Runtime Isolation
- **No Native Subprocess Spawning**: Serverless runtimes (e.g. Vercel, AWS Lambda, Cloudflare Workers) do not support spawning native system interpreters (`python`, shell scripts).
- **Native Implementation**: All background logic, AI extraction (Gemini REST API), and collation must be implemented directly in native TypeScript/JavaScript.

## 3. Live-Table UX Invariants
- **Newest-First Feed Order**: During live gameplay (scratchpads, combat logs, chat feeds), newly entered notes must render immediately at the top directly beneath the input field for zero-scroll confirmation.
- **Auto-Switch Tab on Input**: If a user submits a private note while on a shared/public feed tab (or vice versa), the UI must either automatically switch to that note's tab or display an actionable notification so content never appears to "disappear".
- **Ergonomic Live Gaming Shortcuts**: Always support `Ctrl + Enter` (and `Cmd + Enter`) on note textareas so users do not have to leave the keyboard during live gameplay.

## 4. Query, Caching & Mobile Parity Invariants
- **Metadata-Only Index for List/Dashboard Views**: Never use `select("*")` (pulling `raw_content` and `body`) in list, dashboard, or party endpoints when only frontmatter/metadata is needed; use `loadIndexMeta` / `visibleNotesMeta`.
- **Batch Prefix Queries**: Never issue sequential N+1 `list()` / `walk()` / `read()` calls against Supabase for folder trees (such as `_Review/`). Fetch all matching rows in a single `like("path", "<prefix>/%")` query and group in memory.
- **Stale-While-Revalidate & Bounded Fetches**: Tab views should seed immediately from `localStorage` / in-memory cache and revalidate in the background. Every client fetch must use an `AbortController` timeout and render an explicit error + retry UI rather than spinning indefinitely.
- **Android WebView & Mobile Layout Parity**: `MainActivity.kt` wraps the web app in a WebView. Keep mobile navigation (`MobileNavDrawer.tsx`) synced with `AppSidebar.tsx` via `getNavGroups`, and register any mobile drawer/modal state in `window.__handleAndroidBack`.
