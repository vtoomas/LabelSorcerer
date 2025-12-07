# Repository Guidelines

## Project Structure & Module Organization
`src/` follows the Chrome MV3 layout described in `PLAN.md`: `background/` handles service worker messaging, `content/` hosts selector evaluation, `ui/options/` and `ui/popup/` contain React entry points, and `domain/` houses services that manipulate `models.ts`. Copy or re-export the interface definitions into `src/domain/models.ts` (the root `models.ts` stays for reference but the working code should import from `src/domain/models.ts`); put shared utilities under `shared/` (messaging types, regex helpers, etc.) as the architecture matures.

### Options vs Popup UI
- Keep the `options` page light: reserve it for global settings and structural config, but push the detailed layout/data-source editors, selector tester helpers, and live preview into the `popup` UI as the working surface for interacting with the current page.
- Design `OptionsApp` as a composition of focused components that import the shared domain models from `src/domain/models.ts`; avoid duplicating business logic or state that already belongs to the services so the options page merely reflects saved configuration instead of re-implementing the editor.

## Build, Test, and Development Commands
- `bun install` – bootstraps Bun dependencies described in `package.json` (run once per machine or after `package.json` changes).
- `bun run build` – bundles each MV3 entry point, copies the HTML shells, and populates `dist/` so the manifest can reference compiled assets.
- `bun run clean` – removes the `dist/` directory between builds.
- `bun run lint` – runs ESLint across the TypeScript/React source tree.
- `bun run test` – executes unit/integration suites (see Testing Guidelines); bail on failures before publishing assets.

## Coding Style & Naming Conventions
TypeScript + React are the primary languages; prefer `camelCase` for functions/variables and `PascalCase` for React components/interfaces. Keep indentation at 2 spaces and use explicit return types on exported functions. Follow the domain/interfaces in `models.ts` when naming layout/data-source entities. Linting/formatting is centralized through Bun-friendly tools (`eslint`, `prettier`) configured in `package.json`; run `bun run lint` before merging.

### Component Design
Break pages into focused React components that each own a narrow UI concern and reuse shared helpers from `src/domain` or `src/shared`. Keep business logic in services or hooks so components become thin renderers/data coordinators rather than monolithic logic bundles.

## Testing Guidelines
Bun is the primary test runner. Structure tests to mirror services (e.g., `layoutService.test.ts`, `evaluationService.test.ts`). Use descriptive names like `shouldMapSelectorsToLayoutVariables` and locate tests inside `src/domain/__tests__/`. Target at least one happy-path and one failure case per service, and keep fixtures in `__fixtures__/` for DOM snapshots or sample mappings. Execute `bun test` after any logic change and before PRs.

## Commit & Pull Request Guidelines
History currently shows a single `first commit`; establish a lean commit discipline going forward. Use Conventional Commits (`feat:`, `fix:`, `chore:`, etc.) with optional scopes (e.g., `feat(layout): add canvas helpers`). Each PR should include:
1. A short summary of what changed.
2. Testing steps or results (`bun test`, manual Chrome extension load).
3. Links to relevant issues or the user story.
4. Screenshots only when UI/print output changes.

## Security & Configuration Tips
Keep secrets and API keys out of the repo; rely on Chrome MV3 permissions in `manifest.json`. When touching storage logic, double-check that `chrome.storage.sync` limits are respected and that user-facing error messages surface when selectors fail to match.
