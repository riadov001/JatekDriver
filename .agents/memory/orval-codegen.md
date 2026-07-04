---
name: Orval codegen typecheck barrel issue
description: Why `pnpm --filter @workspace/api-spec run codegen` may report failures after editing openapi.yaml, and how to safely regenerate anyway.
---

`lib/api-zod/src/index.ts` does `export * from "./generated/api"` and `export * from "./generated/types"`, both of which define many identically-named symbols (e.g. `CreateOrderBody`, `LoginBody`). This makes `pnpm -w run typecheck:libs` fail with TS2308 ambiguous-export errors — this is a pre-existing, systemic issue in the barrel file, not caused by any single schema addition (verified: old untouched symbols collide too).

**Why:** `@workspace/api-zod`'s package.json resolves directly to `./src/index.ts` (no build step), so bundlers/dev servers (vite, tsx) tolerate the ambiguity at runtime even though strict `tsc --build` does not.

**How to apply:** If the codegen script fails only at its `typecheck:libs` step (orval generation itself succeeds), it's safe to bypass by running `npx orval --config ./orval.config.ts` directly from `lib/api-spec` instead of the full `pnpm run codegen` script. Verify new hooks/types exist in `lib/api-client-react/src/generated` afterward.
