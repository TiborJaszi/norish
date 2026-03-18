## 1. Prepare shared-server exports

- [x] 1.1 Add missing export entries to `packages/shared-server/package.json` for: `./ai/helpers`, `./ai/prompts/loader`, `./ai/providers/factory`, `./ai/providers/listing`, `./ai/providers/types`, `./ai/schemas/conversion.schema`, `./ai/types/result`, `./caldav/ics-helpers`
- [x] 1.2 Merge code-quality improvements from `packages/api/src/downloader.ts` into `packages/shared-server/src/media/storage.ts` (optional chaining on mime split, non-null assertions on regex match, `for...of` loop style)
- [x] 1.3 Merge minor doc-comment fix in `packages/shared-server/src/logger.ts` (update the example import path comment if it references `@norish/api`)
- [x] 1.4 Merge any minor drift in archive parser files (`parser.ts` Tandoor detection refactor) from `shared-server` into the canonical copy, ensuring both null-safety improvements are kept
- [x] 1.5 Run `pnpm typecheck` on `packages/shared-server` to verify all new exports resolve correctly

## 2. Consolidate logger (Zone 1)

- [x] 2.1 Delete `packages/api/src/logger.ts`
- [x] 2.2 Rewire all `@norish/api/logger` imports in `packages/api/src/` (~44 files) to `@norish/shared-server/logger`
- [x] 2.3 Add `"@norish/shared-server": "workspace:*"` to `packages/queue/package.json` dependencies
- [x] 2.4 Rewire all `@norish/api/logger` imports in `packages/queue/src/` (~24 files) to `@norish/shared-server/logger`
- [x] 2.5 Add `"@norish/shared-server": "workspace:*"` to `packages/auth/package.json` dependencies
- [x] 2.6 Rewire all `@norish/api/logger` imports in `packages/auth/src/` (3 files) to `@norish/shared-server/logger`
- [x] 2.7 Update `vi.mock()` paths in test files across `packages/api/__tests__/`, `packages/queue/__tests__/`, `packages/auth/__tests__/` (~22 files) to use `@norish/shared-server/logger`
- [x] 2.8 Run `pnpm typecheck` to verify logger zone

## 3. Consolidate media/downloader (Zone 2)

- [x] 3.1 Delete `packages/api/src/downloader.ts`
- [x] 3.2 Rewire all `@norish/api/downloader` imports in `packages/api/src/` (~8 files) to `@norish/shared-server/media/storage`
- [x] 3.3 Rewire all `@norish/api/downloader` imports in `packages/queue/src/` (3 files) to `@norish/shared-server/media/storage`
- [x] 3.4 Update `vi.mock()` paths in test files referencing `@norish/api/downloader` to `@norish/shared-server/media/storage`
- [x] 3.5 Run `pnpm typecheck` to verify media zone

## 4. Consolidate AI foundations (Zone 3)

- [x] 4.1 Delete duplicated AI foundation files from `packages/api/src/ai/`: `helpers.ts`, `prompts/loader.ts`, `providers/factory.ts`, `providers/index.ts`, `providers/listing.ts`, `providers/types.ts`, `schemas/conversion.schema.ts`, `types/result.ts`, `unit-converter.ts`, `utils/category-matcher.ts`
- [x] 4.2 Rewire AI foundation imports in remaining `packages/api/src/ai/` domain files (~17 files) from `@norish/api/ai/*` to `@norish/shared-server/ai/*`
- [x] 4.3 Rewire AI foundation imports in `packages/queue/src/` workers that reference `@norish/api/ai/*` infrastructure modules
- [x] 4.4 Update `vi.mock()` paths in AI-related test files
- [x] 4.5 Run `pnpm typecheck` to verify AI zone

## 5. Consolidate CalDAV client and helpers (Zone 4)

- [x] 5.1 Delete `packages/api/src/caldav/client.ts` and `packages/api/src/caldav/ics-helpers.ts`
- [x] 5.2 Rewire imports in remaining `packages/api/src/caldav/` domain files (sync-manager, event-listener, household-deduplication) to `@norish/shared-server/caldav/*`
- [x] 5.3 Rewire any CalDAV-related imports in `packages/queue/src/` to `@norish/shared-server/caldav/*`
- [x] 5.4 Run `pnpm typecheck` to verify CalDAV zone

## 6. Consolidate archive parsers (Zone 5)

- [x] 6.1 Delete duplicated archive parser files from `packages/api/src/importers/`: `mealie-legacy-parser.ts`, `mealie-parser.ts`, `mela-parser.ts`, `paprika-parser.ts`, `parser-helpers.ts`, `tandoor-parser.ts`
- [x] 6.2 Rewire `packages/api/src/importers/archive-parser.ts` to import parsing functions from `@norish/shared-server/archive/*` instead of local `./` relative imports
- [x] 6.3 Rewire any archive parser imports in `packages/queue/src/` to `@norish/shared-server/archive/*`
- [x] 6.4 Update `vi.mock()` paths in archive parser test files (~4 files) to `@norish/shared-server/archive/*`
- [x] 6.5 Run `pnpm typecheck` to verify archive zone

## 7. Consolidate workspace-paths (Zone 6)

- [x] 7.1 Delete `packages/api/src/lib/workspace-paths.ts`
- [x] 7.2 Rewire any imports in `packages/api/src/` referencing `@norish/api/lib/workspace-paths` to `@norish/shared-server/lib/workspace-paths`
- [x] 7.3 Run `pnpm typecheck` to verify workspace-paths zone

## 8. Update api package exports

- [x] 8.1 Remove export entries from `packages/api/package.json` (if any) for deleted modules (logger, downloader, workspace-paths, etc.) that now live in shared-server
- [x] 8.2 Verify no external consumer is broken by removed api exports (check `packages/queue`, `packages/auth`, `packages/trpc`, `apps/web`)

## 9. Final validation

- [x] 9.1 Run `pnpm typecheck` across the full monorepo
- [x] 9.2 Run `pnpm test` across affected packages (api, shared-server, queue, auth)
- [x] 9.3 Run `pnpm build` to verify production build succeeds
- [x] 9.4 Verify zero files remain duplicated between `packages/api/src/` and `packages/shared-server/src/` (diff check)
