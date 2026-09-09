# Kiddy

Preschool administration for an internal business. The current release provides an authenticated owner/admin console, student rosters, enrollment summaries, and history-preserving withdrawal. Attendance, family accounts, tuition, and payroll are still planned.

## Local setup

Use Node.js 22 or later and PostgreSQL 16 or later. Commands below start from the repository root unless noted. PostgreSQL must be running; on macOS with Postgres.app, add its `Contents/Versions/latest/bin` directory to your PATH if necessary.

1. Install dependencies: run `npm ci --prefix server` and `npm ci --prefix web-admin`.
2. Create a PostgreSQL database if this is a fresh installation: `createdb kiddy`.
3. Copy `server/.env.example` to `server/.env` **only if `.env` does not already exist**. Set `DB_URL` to the intended database. Keep this file private.
4. Back up an existing database before upgrading: `pg_dump --format=custom --file=kiddy-backup.dump DATABASE_NAME`. Store backups outside the repository.
5. From `server/`, run `npm run db:migrate`. This supports both original schema versions and does not drop existing records. Applied migrations have checksums and must not be edited; add a new migration instead.
6. For a **new development database only**, run `psql -d kiddy -v ON_ERROR_STOP=1 -f server/db/seed.sql` from the repository root to create a sample center and classrooms. Use the database matching `DB_URL` if it has another name. These sample settings are not verified licensing rules. Existing businesses should use their existing center ID and skip the sample seed.
7. From `server/`, create your own account: `npm run create-admin -- owner@example.com CENTER_UUID`. Replace the email and center ID. The command prompts for a hidden password and confirmation. The sample center ID is `00000000-0000-0000-0000-000000000001`. There are no default passwords or public registration routes.
8. In one terminal, run `npm run dev --prefix server`. In another, run `npm run dev --prefix web-admin`. Open `http://localhost:5173` and sign in.

`APP_ORIGIN` must exactly match the browser origin, including port. The API defaults to loopback `127.0.0.1:3001`; Vite forwards `/api` to that address. Requests use a session cookie, not a token in browser storage.

The legacy `database.sql` and `server/db/init.sql` files no longer initialize or reset a database. Use `npm run db:migrate` for all schema changes. Do not use the SQL fixtures under `server/test/fixtures` to initialize a real database.

## Access and record handling

- Accounts are provisioned by a database administrator. Each currently belongs to one center. Owner/admin accounts can access that center's administration routes; teacher/parent roles are denied these routes. Family/staff permissions and multi-center membership are future work.
- Passwords use salted scrypt hashes. Sessions use random tokens; only their hashes are stored in PostgreSQL. Cookies are HttpOnly/SameSite=Strict and become Secure `__Host-` cookies in production. Sessions expire after eight hours and logout revokes them.
- All mutations require the configured Origin and JSON content type to prevent cross-origin form requests. API responses are marked `no-store`. Login attempts are limited to ten per email and source IP per fifteen minutes, including successful attempts. The app intentionally does not trust forwarding headers; behind a proxy, that IP limit is shared. Review proxy-specific rate limiting before expanding access.
- To revoke an account immediately, set its `app_users.disabled_at` to the current timestamp; every request checks this. Password reset/self-service account administration and MFA are not part of this release.
- “Mark inactive” keeps the child record and attendance history. Edit the profile to reactivate it. Permanent API deletion is disabled, and the database restricts deletion of children with attendance.
- Child creation, edits, and withdrawal write actor/action/entity audit events in the same database transaction. This is an initial activity trail, not a full before/after record history or compliance certification.
- Request types, lengths, UUIDs, statuses, and classroom membership are checked on the server. Age remains a temporary text field pending DOB/guardian/enrollment modeling.
- Legacy status and center constraints are introduced as `NOT VALID` to preserve historical rows that need review; they enforce new/updated records. Review legacy data and validate those constraints before treating historical data as fully checked. Missing dates of birth are left unknown, never guessed.

## Verification

Run `npm test --prefix server` for the password/configuration tests. Database-backed tests explicitly skip when `TEST_DATABASE_URL` is absent.

For the full suite, create a **disposable** database whose name starts with `kiddy_test`, then run from `server/`:

```sh
TEST_DATABASE_URL=postgresql://localhost/kiddy_test npm test
```

Tests create and remove isolated schemas in that database. They check authentication, role and center isolation, cross-origin protection, validation, logout/expiry/disable behavior, persistent login limiting, attendance preservation, and upgrades from both legacy schemas. They never use `DB_URL` as a test fallback.

Run `npm run build --prefix web-admin` to verify the frontend production bundle. GitHub Actions runs the full backend suite against PostgreSQL 16 and builds the frontend on Node.js 22.

## Hosting boundary

For production, use HTTPS and set `NODE_ENV=production` and `APP_ORIGIN=https://your-domain.example`. Serve the frontend build and route `/api` to Express under that **same origin**. The Vite proxy only exists during development; this repository does not yet provision production hosting. Set `HOST` explicitly if a container network requires it.

Before enabling real business use, configure backups and verify restoration, restrict database access, and review the actual hosting/proxy configuration. This foundation does not yet implement live attendance, staffing compliance, payroll, or payment processing.

See [the development plan](docs/DEVELOPMENT_PLAN.md) for the broader roadmap. Its initial assessment describes the repository before this foundation work.
