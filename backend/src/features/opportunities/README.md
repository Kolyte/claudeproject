# Opportunities (P4)

Implements the P4 routes in `docs/CONTRACTS.md`: needs, applications and founder review. The frontend half is in `frontend/src/features/opportunities/`.

| File | Purpose |
|---|---|
| `index.ts` | Exports `router` for P1 to mount below `/api` |
| `router.ts` | HTTP layer; `resolveFromLocals` reads P1's request context |
| `validation.ts` | Strict allowlists and contract limits |
| `service.ts` | Ownership, visibility and status rules |
| `supabaseRepository.ts` | All database access, as the calling user |
| `testing/memoryRepository.ts` | Test double; not for application use |

## Integration with P1 (PR #3)

Built against the interfaces in `docs/P1-HANDOFF.md`, which arrive with PR #3:

- `index.ts` imports `optionalAuth` from `middleware/auth.js`, so `backend/` compiles only once that lands. Every route reads `res.locals.user` and `res.locals.db`.
- Applicant summaries use `application_review_summary(application_id uuid)`.
- Status rules are also enforced by P1's `guard_application` trigger and RLS.

When PR #3 lands:

1. Keep this folder's files in place of PR #3's single-file `features/opportunities/index.ts`, and delete its `frontend/src/features/opportunities/index.tsx`. `index.ts` would otherwise shadow it silently.
2. Point the frontend `api.ts` `request` at P1's `api()` client, or call `configureOpportunitiesAuth` at startup.
3. Replace both local `types.ts` files with `import type` from `@neo/contracts`.
4. Add this folder to the backend `test` script, and exclude `testing/` from the production build.

## Run the tests

```sh
npx tsx --test backend/src/features/opportunities/opportunities.test.ts
```

This needs P1's backend dependencies. The tests use the in-memory repository, so they do not cover Supabase or RLS.
