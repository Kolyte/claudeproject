# Opportunities (P4)

Implements the P4 routes in `docs/CONTRACTS.md`: needs, applications and founder review. The frontend half is in `frontend/src/features/opportunities/`.

| File | Purpose |
|---|---|
| `index.ts` | Exports `router` for P1 to mount below `/api` |
| `router.ts` | HTTP layer and the one P1 integration point, `resolveFromLocals` |
| `validation.ts` | Strict allowlists and contract limits |
| `service.ts` | Ownership, visibility and status rules |
| `supabaseRepository.ts` | All database access, as the calling user |
| `testing/memoryRepository.ts` | Test double; not for application use |

## What P1 needs to provide

1. Add `express` and `@supabase/supabase-js` to the backend. Exclude `*.test.ts` and `testing/` from the production build.
2. Before this router, set `res.locals.userId` (string or null) and `res.locals.db` (a per-request Supabase client carrying the caller's token, or the public client). Without `db` every route returns 503. If P1's middleware uses other names, change only `resolveFromLocals`.
3. Provide `project_needs`, `applications`, their RLS, and `application_review_summaries(p_project_id uuid)` returning `applicant_id, display_name, declared_skills, hours_per_week`. The function name is the constant `REVIEW_SUMMARY_FUNCTION`.
4. Approve the additive `need: { id, title, projectId } | null` on `GET /me/applications`, so applicants can see which role they applied for.
5. Publish `@neo/contracts`; both local `types.ts` files can then be replaced.

## Run the tests

```sh
npx tsx --test backend/src/features/opportunities/opportunities.test.ts
```

This needs P1's backend dependencies. The tests use the in-memory repository, so they do not cover Supabase or RLS.
