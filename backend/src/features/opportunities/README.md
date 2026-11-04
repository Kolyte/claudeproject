# Opportunities (P4)

Implements the P4 routes in `docs/CONTRACTS.md`: needs, applications and founder review. The frontend half is in `frontend/src/features/opportunities/`.

| File | Purpose |
|---|---|
| `index.ts` | Exports `router`, wired to P1's `optionalAuth` and `requireAuth` |
| `router.ts` | HTTP layer; validates input and leaves errors to P1's `errorHandler` |
| `validation.ts` | Strict field allowlists, built on P1's validators |
| `service.ts` | Ownership, visibility and status rules |
| `supabaseRepository.ts` | All database access, as the calling user |

The database also enforces these rules: P1's RLS and `guard_application` trigger reject a bad write even if Express is bypassed. Applicant details come only from `application_review_summary`.

## Run the tests

```sh
cd backend
npx tsx --test src/features/opportunities/opportunities.test.ts
```

The backend `test` script only covers `src/lib/`, so this folder needs running directly until P1 widens it. These tests use an in-memory repository, so they do not cover Supabase or RLS; `tests/e2e/` does.
