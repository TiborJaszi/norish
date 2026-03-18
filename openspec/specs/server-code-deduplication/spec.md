# server-code-deduplication Specification

## Purpose

Ensures that reusable server infrastructure modules exist in exactly one canonical location (`packages/shared-server`) and that all consumer packages import from that single source, eliminating file-level duplication and maintaining a single Pino logger instance.

## Requirements

### Requirement: Single Canonical Location for Server Infrastructure Modules

All reusable server infrastructure modules (logger, media storage, AI foundations, CalDAV client/helpers, archive parsers, workspace-paths) SHALL exist in exactly one location within the monorepo: `packages/shared-server/src/`. No other package SHALL contain a fork, copy, or re-implementation of these modules.

#### Scenario: No duplicate infrastructure files exist across packages

- **WHEN** the codebase is inspected for file-level duplication between `packages/api/src/` and `packages/shared-server/src/`
- **THEN** zero files SHALL exist in `packages/api/src/` that are functional copies of files in `packages/shared-server/src/`
- **AND** `packages/api/src/` SHALL NOT contain: `logger.ts`, `downloader.ts`, `lib/workspace-paths.ts`, `caldav/client.ts`, `caldav/ics-helpers.ts`, or any AI foundation files that duplicate `shared-server/src/ai/` content

#### Scenario: Domain-specific modules remain in packages/api

- **WHEN** the codebase is inspected
- **THEN** domain-specific AI features (recipe-parser, transcriber, auto-tagger, auto-categorizer, allergy-detector, nutrition-estimator, image-recipe-parser) SHALL remain in `packages/api/src/ai/`
- **AND** CalDAV orchestration (sync-manager, event-listener, household-deduplication) SHALL remain in `packages/api/src/caldav/`
- **AND** domain utilities (`lib/domain-matcher.ts`) SHALL remain in `packages/api/src/lib/`

### Requirement: shared-server Exports All Infrastructure Modules

`packages/shared-server/package.json` SHALL declare an export entry for every infrastructure module that is consumed by other packages. This includes existing modules and newly canonicalized modules.

#### Scenario: All AI foundation modules are exported

- **WHEN** inspecting `packages/shared-server/package.json` exports
- **THEN** export entries SHALL exist for: `./ai/helpers`, `./ai/prompts/loader`, `./ai/providers`, `./ai/providers/factory`, `./ai/providers/listing`, `./ai/providers/types`, `./ai/schemas/conversion.schema`, `./ai/types/result`, `./ai/unit-converter`, `./ai/utils/category-matcher`

#### Scenario: CalDAV helper modules are exported

- **WHEN** inspecting `packages/shared-server/package.json` exports
- **THEN** export entries SHALL exist for: `./caldav/client`, `./caldav/ics-helpers`

#### Scenario: Existing exports are preserved

- **WHEN** inspecting `packages/shared-server/package.json` exports
- **THEN** all previously existing export entries (logger, media/storage, archive/parser, lib/workspace-paths, etc.) SHALL remain unchanged

### Requirement: Single Pino Logger Instance

The server process SHALL use exactly one Pino logger instance, provided by `@norish/shared-server/logger`. No other package SHALL instantiate its own Pino logger.

#### Scenario: All packages use the shared-server logger

- **WHEN** any server-side package (`api`, `queue`, `auth`, `trpc`) needs logging
- **THEN** it SHALL import logger functions from `@norish/shared-server/logger`
- **AND** it SHALL NOT create or export its own Pino logger instance

### Requirement: Consumer Packages Import Infrastructure from shared-server

All server-side consumer packages SHALL import infrastructure modules from `@norish/shared-server` rather than duplicating them or importing via `@norish/api`.

#### Scenario: packages/api imports infrastructure from shared-server

- **WHEN** code in `packages/api/src/` needs logger, media storage, AI foundations, CalDAV client/helpers, archive parsing, or workspace-paths functionality
- **THEN** it SHALL import from `@norish/shared-server/*`
- **AND** it SHALL NOT have its own copy of these modules

#### Scenario: packages/queue imports infrastructure from shared-server

- **WHEN** code in `packages/queue/src/` needs logger or media storage functionality
- **THEN** it SHALL import from `@norish/shared-server/logger` or `@norish/shared-server/media/storage`
- **AND** it SHALL NOT import these from `@norish/api`

#### Scenario: packages/auth imports infrastructure from shared-server

- **WHEN** code in `packages/auth/src/` needs logger functionality
- **THEN** it SHALL import from `@norish/shared-server/logger`
- **AND** it SHALL NOT import from `@norish/api/logger`

### Requirement: Test Mocks Reference Canonical Module Paths

All test files that mock infrastructure modules SHALL use `@norish/shared-server/*` paths in their `vi.mock()` calls, matching the canonical import location.

#### Scenario: Test mocks use shared-server paths

- **WHEN** a test file mocks logger, media storage, AI foundations, or archive parser modules
- **THEN** the `vi.mock()` path SHALL reference `@norish/shared-server/*`
- **AND** SHALL NOT reference `@norish/api/logger`, `@norish/api/downloader`, or other deleted module paths

### Requirement: Code Quality Improvements Are Merged Before Deletion

When the canonical `shared-server` copy and the `api` fork have minor code-quality differences, the best version of each pattern SHALL be adopted in the `shared-server` copy before the `api` copy is deleted.

#### Scenario: Optional chaining and loop improvements are preserved

- **WHEN** merging code differences between `api/src/downloader.ts` and `shared-server/src/media/storage.ts`
- **THEN** the canonical `shared-server` copy SHALL adopt optional chaining patterns where they improve null safety
- **AND** SHALL adopt cleaner loop patterns (e.g., `for...of` over indexed `for` loops) where semantically equivalent
