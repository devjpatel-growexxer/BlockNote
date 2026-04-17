# AI Log

## 2026-04-13
**Tool:** Codex
**What I asked for:**
Scaffold Step 1 of the production block editor plan: monorepo setup, shared package, frontend shell, backend shell, and environment scaffolding.

**What it generated:**
Workspace structure, package manifests, starter Next.js and Express files, shared constants, and repo setup files.

**What was wrong or missing:**
Right now nothing

**What I fixed:**
Right now nothing

## 2026-04-13
**Tool:** Codex
**What I asked for:**
Set up local PostgreSQL support for the project, including migrations, schema, and machine setup guidance.

**What it generated:**
A PostgreSQL connection utility, migration runner, initial schema SQL, and local setup documentation.

**What was wrong or missing:**
The local PostgreSQL server is not running yet, so migrations and live DB verification still need to be executed after setup.

**What I fixed:**
Right now nothing

## 2026-04-13
**Tool:** Codex
**What I asked for:**
Implement Step 3 authentication with backend APIs, JWT and refresh token flow, and a minimal frontend to verify auth locally.

**What it generated:**
Auth controller, service, repository, middleware, password hashing, JWT helpers, shared validation schemas, and a small auth UI in the Next.js app.

**What was wrong or missing:**
Two monorepo path bugs showed up earlier in env and migration loading; those were fixed before auth work continued. Local end-to-end auth requests still need to be tested against the running API and PostgreSQL on your machine.

**What I fixed:**
Updated root path handling for env and migration resolution in the monorepo.

## 2026-04-13
**Tool:** Codex
**What I asked for:**
Implement Step 4 document APIs with ownership checks and a minimal dashboard for create, list, rename, and delete flows.

**What it generated:**
Document repository, service, controller, validation schemas, and a frontend dashboard connected to the authenticated session.

**What was wrong or missing:**
Frontend env handling needed extra monorepo-specific fixes before the UI could call the API reliably.

**What I fixed:**
Adjusted web env loading so `NEXT_PUBLIC_*` values resolve correctly in the app workspace.

## 2026-04-14
**Tool:** Codex
**What I asked for:**
Implement Step 5 block-system foundation and replace the temporary verification UI with real home, auth, dashboard, and document pages.

**What it generated:**
Block validation/contracts, block CRUD API routes, a routed frontend with an auth provider, redesigned pages, and a document workspace that renders stored blocks.

**What was wrong or missing:**
Deployed CORS and frontend env behavior needed extra monorepo and cross-origin cleanup while this step was underway.

**What I fixed:**
Improved backend CORS origin handling, Render/Vercel cookie behavior, and frontend routing/session structure.

## 2026-04-14
**Tool:** Codex
**What I asked for:**
Turn the document page into a Notion-like continuous editor canvas, move to a lighter visual design, and add the core block editing behavior.

**What it generated:**
A light-themed routed UI, a continuous document editor canvas, inline block type switching, and core keyboard behaviors for split, delete, focus, and code-tab handling.

**What was wrong or missing:**
The earlier document workspace looked too much like isolated cards and did not feel like one flowing document.

**What I fixed:**
Rebuilt the editor UI around a continuous writing surface and updated the visual system to a softer light palette.

## 2026-04-14
**Tool:** Antigravity
**What I asked for:**
Redesign the entire frontend with a professional Notion-inspired UI — clean neutral palette, Inter font, sidebar dashboard, distraction-free editor, and modern component styles. Increase font and icon sizes for better readability.

**What it generated:**
Complete CSS overhaul in `globals.css` using CSS custom properties, Inter via `next/font/google`, sticky site header, landing page hero with feature cards, full-page auth forms, sidebar-based dashboard with hover-reveal rename/delete actions, and a distraction-free centered editor canvas with a topbar, toolbar, and all block types rendered.

**What was wrong or missing:**
Initial font and icon sizes were too small for a professional feel.

**What I fixed:**
Applied a full size-increase pass across all components — header height, brand icon, nav items, buttons, inputs, sidebar items, editor paragraph/heading text, code blocks, and slash menu. Removed inline style overrides that were fighting the CSS.

## 2026-04-14
**Tool:** Antigravity
**What I asked for:**
Multiple iterative UX improvements to the dashboard and editor: click-to-open document cards, remove open/preview buttons, add a visual block type selector bar, add a light border around the editable canvas, fix image drag bug, add a drag-to-delete trash zone, make the trash zone fixed/centered, widen the editor canvas, add time to the "last updated" subtitle, make topbar and block bar sticky, merge them into one unified bar, then replace the block bar with a centered glassmorphism floating pill, add hover borders on blocks.

**What it generated:**
- Dashboard cards converted to `<Link>` elements for click-to-navigate; open/preview buttons removed; only rename and delete remain on hover.
- Visual block bar (later replaced) with icon buttons for all 7 block types.
- `editor-paper` div with `border` and `box-shadow` to define the writing area.
- Image drag bug fixed: `draggable={false}` and `onDragStart` prevention on `<img>` elements.
- Drag-to-delete trash zone: fixed-positioned at bottom-center of viewport, slides in when dragging starts, turns red on hover, deletes block via API on drop.
- Editor canvas max-width widened from 760px to 960px.
- Document subtitle updated to include time alongside date.
- Topbar made `position: sticky` with frosted glass background.
- Unified sticky bar combining nav row and block row in one container (later reverted to separate by user preference).
- Glassmorphism floating pill block bar: centered, `border-radius: 48px`, blue-lavender gradient background, indigo border, inset highlight, sticky just below topbar.
- Block row hover: thin transparent-to-grey border with `border-radius: 8px`, no background fill.

**What was wrong or missing:**
Trash zone was not centered (parent transform interference). Block bar needed stronger glassmorphism contrast against white canvas. Initial hover border was too colourful.

**What I fixed:**
Trash zone centering switched from `left:50%; transform:translateX(-50%)` to `left:0; right:0; margin:auto; width:fit-content`. Glassmorphism pill upgraded with indigo-tinted gradient, 1.5px indigo border, and colored box shadow. Block hover border changed to neutral grey `rgba(0,0,0,0.15)` with no background tint.

## 2026-04-14
**Tool:** Antigravity
**What I asked for:**
Fix "session expired" error for new users on auth pages, make drag-and-drop alive (visually shift blocks while dragging) and perfectly smooth, and add "+" buttons on hover between blocks to easily insert new blocks.

**What it generated:**
- Fixed auth context: passed `retryOnUnauthorized: false` to the session restore refresh call so it silently fails for new visitors instead of triggering the global error handler.
- Fixed drag-and-drop UX: removed CSS properties (`pointer-events: none` and `transform`) that broke native HTML5 drag events, moved `draggable` to the article row instead of just the button (with a target guard), and implemented real-time shifting by applying `reorderBlocksArray` from a drag snapshot *during* `onDragOver`.
- Replaced recursive mapping with `flushSync` in `onDragOver` alongside `lastDragOverRef` dedup for instant, lag-free live-shifting.
- Added gap inserters: mapped thinly styled divider zones *between* all blocks (and at ends). Hovering them reveals a centered `+` button that inserts a new paragraph block explicitly at that gap.

**What was wrong or missing:**
The first attempt at live-shifting used `requestAnimationFrame` which caused a frame of delay/lag.

**What I fixed:**
Switched `requestAnimationFrame` out for `flushSync(() => setBlocks(preview))` from `react-dom` to force synchronous DOM paints, making the block swapping feel instant and buttery smooth as the cursor moves over rows.

## 2026-04-15 to 2026-04-16
**Tool:** Antigravity
**What I asked for:**
Iteratively improve the frontend UX and visual polish: redesign the landing page, improve dashboard search/create controls, refine the document shell into a left-sidebar layout, polish document-level states, and keep the editor feeling more product-like.

**What it generated:**
- Landing page redesign with more open spacing and scroll-reveal motion.
- Dashboard search UI and compact toolbar refinements.
- Left-sidebar document shell with title, share, save, export, and bottom-aligned back button.
- Better empty/error/read-only states, including shared-document unavailable messaging.
- Multiple visual iterations around spacing, hover controls, save/share button styling, and responsive layout polish.

**What was wrong or missing:**
- Some iterations produced UI that was too cramped or too visually heavy.
- The sidebar shell initially caused document scroll issues and clipped the share popover.
- Cross-account document URLs initially left the page in a loading skeleton instead of showing a forbidden state.

**What I fixed:**
- Requested more open spacing and lighter visual density across landing/dashboard/editor.
- Corrected the document shell so the main canvas scrolls properly and the share panel is not clipped.
- Replaced loading-only cross-account behavior with a dedicated forbidden state in the document route.

## 2026-04-15 to 2026-04-16
**Tool:** Codex
**What I asked for:**
Stabilize backend and editor behavior: autosave/versioning, auth/session flow explanations, image validation and image interactions, document ownership handling, export behavior, and multiple edge-case fixes across block editing.

**What it generated:**
- Race-safe autosave using document `baseVersion` and backend conflict handling.
- JWT auth flow using short-lived access token in frontend memory and refresh token in `httpOnly` cookie.
- Image block content extended to support `width` and `alignment`, with hover resize and alignment controls.
- Browser-load-based image validation instead of URL-shape-only validation.
- Editor behavior fixes for rapid Enter typing, todo/image paragraph insertion rules, image resize persistence, and PDF-only export flow.
- Proper frontend forbidden state when backend returns `403` for cross-account document access.

**What was wrong or missing:**
- Earlier autosave and split flows could feel too eager and could lose fast typing in edge cases.
- Image handling initially accepted any syntactically valid URL, and resize persistence could fail after autosave in deployed environments.
- Export section briefly included extra HTML/TXT options before being simplified back to PDF only.

**What I fixed:**
- Switched normal typing and Enter-split persistence onto the debounced autosave model.
- Tightened image validation to require real browser image load success and corrected image paragraph insertion behavior.
- Simplified export back to a PDF-only action and fixed print styles to avoid extra blank pages.

## 2026-04-16 to 2026-04-17
**Tool:** Antigravity
**What I asked for:**
Stabilize the editor autosave system to prevent cursor jumping and data loss during rapid typing, Enter, and Backspace operations. Save should only happen after the user stops typing (all keys released + idle debounce).

**What it generated:**
- Global keyboard tracking via `activeKeysRef` (Set) that monitors all physically pressed keys through `keydown`/`keyup` listeners.
- Hard save guard in `flushAutosaveNow()` that refuses to execute while any key is held down.
- Idle-only auto-save: removed direct `scheduleAutoSave` calls from text change handlers. Saves now only trigger 1.5s after the user has completely stopped typing (via `keyup` idle debounce).
- Optimistic block creation for Enter key: `insertNewBlockAfter()` generates a local `crypto.randomUUID()`, inserts the block into React state synchronously, and focuses the cursor instantly. The API call runs in the background.
- Focus timing fix: `setInputRef()` ref callback checks `pendingFocus` when a new element registers, ensuring focus snaps to newly mounted textareas immediately.
- Race condition resolution: dirty fingerprint map is cleared before merging server responses, so blocks modified during in-flight requests are excluded from server merge.

**What was wrong or missing:**
- Initial implementation had Enter and Backspace still making direct API calls during rapid key presses, causing lag.
- Cursor disappeared when the background save swapped optimistic IDs for server IDs (React unmounted the focused node).
- Keyup save trigger only checked dirty blocks, ignoring pending creates/deletes.

**What I fixed:**
- Reverted to direct API calls for Enter/Backspace block operations (user preference for immediate persistence).
- Kept keyboard-aware save gating for normal text typing.
- Debounce timer remains at 1.5s for idle detection.

## 2026-04-17
**Tool:** Antigravity
**What I asked for:**
Redesign the landing page to look premium, animated, and modern while maintaining the existing violet/purple color theme.

**What it generated:**
- Hero section with animated typewriter effect cycling through "organize.", "design.", "create.", "build." in a gradient text style.
- Floating ambient gradient orbs (purple, cyan, pink) with slow drift animations in the background.
- Glassmorphic "7 block types" showcase card with backdrop blur, staggered chip pop-in animations, and hover lift effects.
- Features section with 6 cards (expanded from 3) that slide up on scroll via IntersectionObserver.
- Gradient CTA buttons with inner glow, hover lift, and arrow slide animation.
- Bottom CTA banner with radial glow and a clean footer with copyright.
- Hidden scrollbar for a cleaner look.
- Responsive breakpoints for 900px, 768px, and 640px.
- Widened content area to 1280px max-width to use more horizontal space on large screens.

**What was wrong or missing:**
- Initial layout was too narrow on wide screens with too much empty space on sides.
- "collaborate" was listed as a typewriter word but the app has no collaboration feature.

**What I fixed:**
- Widened all landing sections (hero, features, block showcase) and removed the `content-shell` max-width constraint for the landing layout.
- Replaced "collaborate" with "design" in the typewriter rotation.
