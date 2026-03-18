## MODIFIED Requirements

### Requirement: Enforced Dependency Direction Between Layers

The workspace SHALL enforce one-way dependency direction so shared contracts never import backend internals and backend code never depends on app-specific modules. For the TRPC/API boundary, `@norish/api` MAY depend on `@norish/trpc`, and `@norish/trpc` SHALL NOT depend on `@norish/api`. Infrastructure consumers (`@norish/queue`, `@norish/auth`) SHALL import reusable server infrastructure from `@norish/shared-server` rather than from `@norish/api`.

#### Scenario: Import direction remains valid after extraction

- **WHEN** modules are moved to `apps/*` and `packages/*`
- **THEN** shared package(s) SHALL only depend on other shared/runtime-safe modules
- **AND** backend package(s) MAY depend on shared package(s)
- **AND** backend package(s) SHALL NOT import from `apps/web`

#### Scenario: TRPC to API dependency back-edge is prevented

- **WHEN** package dependency validation runs for the workspace
- **THEN** `@norish/api` MAY import from `@norish/trpc`
- **AND** `@norish/trpc` SHALL NOT import from `@norish/api`
- **AND** boundary compliance SHALL preserve the model where API hosts routes and TRPC owns router/contracts

#### Scenario: Infrastructure imports flow through shared-server not api

- **WHEN** `@norish/queue` or `@norish/auth` needs server infrastructure (logger, media storage, AI foundations)
- **THEN** these packages SHALL import from `@norish/shared-server`
- **AND** these packages SHALL NOT import infrastructure modules from `@norish/api` when an equivalent export exists in `@norish/shared-server`
- **AND** `@norish/queue` MAY still import domain-specific modules from `@norish/api` (e.g., AI features, parser, video) that are not available in `@norish/shared-server`
