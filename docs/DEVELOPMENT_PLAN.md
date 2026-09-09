# Kiddy: repository assessment and development plan

Implementation update: the initial security foundation is now implemented. The app has owner/admin login, PostgreSQL-backed expiring/revocable sessions, role and center enforcement, origin checks, persistent login limiting, non-destructive migrations from both legacy schemas, history-preserving student withdrawal, basic mutation audit events, typed roster validation and classroom IDs, honest enrollment summaries, visible load/save errors, and guarded form submissions. Git no longer tracks server dependencies or the local environment file. Fifteen automated checks pass against a disposable PostgreSQL database, the frontend builds, and the main login/roster/logout browser journey was verified. See `README.md` for setup and remaining production boundaries. The assessment below records the original state; DOB/guardian modeling, actual attendance, staff/family access, billing, and payroll remain future work. The existing business database has not been migrated by this implementation session.

Reviewed September 8, 2026. Business scope: a California preschool with no more than 15 employees, seeking to replace Procare workflows and Gusto payroll/tax workflows. Location count, licensed programs, municipality, payroll schedule, current integrations, and exact Procare feature usage remain to be confirmed.

## Recommendation

Build one application with two permission-controlled areas: Preschool Operations and Staff & Payroll. Keep one repository, one API, and PostgreSQL, with separate backend modules for each business area. Add a mobile-friendly family portal and staff/kiosk views to the same platform. Do not create two independent databases or introduce microservices at this stage.

Replace the preschool workflows incrementally. Build staff records, time tracking, approvals, and payroll preparation internally, while initially retaining a payroll processor for actual wages and taxes. A complete Gusto replacement includes money movement, filings, corrections, and ongoing tax operations, beyond a payroll UI.

For a business this size, confirm provider eligibility and total cost before investing in an embedded payroll integration. An internal app does not automatically qualify for a platform partnership. This plan does not promise lower total cost than existing subscriptions.

## What the repository implements

| Area | Current implementation |
| --- | --- |
| Frontend | React 18, Vite 5, Tailwind 4; dashboard, roster, billing placeholder |
| Navigation | React state switches tabs; no URL router |
| Data access | Small fetch wrapper; shared children/classrooms context |
| Backend | Express 4, node-postgres, dotenv; six HTTP endpoints |
| Children | List, create, edit, hard-delete; search and room filtering in the browser |
| Classrooms | Read-only list scoped to a fixed seeded center |
| Dashboard | Active enrollment totals, seeded room ratios, hardcoded teacher counts |
| Database | Centers, classrooms, profiles, children, attendance definitions |
| Missing workflows | Authentication, actual attendance, staff management, payroll, tuition processing, family portal, messaging, daily reports, document handling |

The small React/Express/PostgreSQL stack is reasonable to retain. SQL values are parameterized, routes are separated by resource, classroom selection uses database data, and child updates/deletes include a center filter. Those are useful foundations, although the fixed center is not authorization.

## Findings, ordered by importance

1. **No authentication or authorization.** `server/index.js:12-17` mounts every API without identity or permission checks. A client able to reach the API can read children's contact/medical information and modify/delete records. A localhost CORS origin does not enforce authorization. Add authenticated sessions, organization/center memberships, server-side permissions, and tests for denied access before using real records.

2. **The dashboard presents simulated data as live staffing information.** `server/routes/dashboard.js:7-12,23-27,38-49` counts active enrollments as checked-in children, uses hardcoded teachers, and defaults unknown rooms to one teacher. `web-admin/src/pages/Dashboard.jsx:53-57` always says staffing is secure, even if a room warning is shown. Data is fetched once per mount. Until real attendance and staff assignments exist, label this as enrollment/planning data and remove the compliance assurance.

3. **Conflicting schemas and a destructive initialization path.** Root `database.sql` requires DOB and uses an allergy array; `server/db/init.sql` allows missing DOB and adds text fields used by the API. Initializing with the root schema leaves API queries referencing nonexistent columns. The server initializer drops all existing tables. Introduce versioned, non-destructive migrations and an explicitly separate disposable development reset/seed workflow.

4. **Removing a child also deletes attendance history.** `server/routes/children.js:125-130` hard-deletes children; `server/db/init.sql:52` cascades that deletion into attendance. Use enrollment end dates/archive status for normal withdrawal, with history preserved. Handle eventual retention-based purges separately.

5. **The data model cannot support reliable age, family, or enrollment workflows.** `server/routes/children.js:75-81` persists a manually entered age string and does not populate DOB. A value such as "2 yrs" becomes stale. Parent name and emergency phone are embedded in the child record without linked guardians, pickup permissions, siblings, households, or enrollment history. Store validated DOB, derive age, and normalize relationships.

6. **Validation and database constraints are incomplete.** `server/routes/children.js:21-25` checks presence through string conversion, without checking actual types, sizes, formats, or allowed status values. The database has no enrollment-status constraint. Invalid UUIDs become database errors rather than clear client errors. Classroom selection resolves a name even though names are not unique per center. Use typed request validation and classroom IDs; add non-null, same-center, uniqueness, positive-value, and date-order constraints where appropriate.

7. **Failures look like valid empty data.** `web-admin/src/context/CenterContext.jsx:20-24` logs initial-load errors and clears loading, causing the roster to show no enrolled students. `web-admin/src/pages/Dashboard.jsx:11,27` similarly falls back to zero/empty data while retaining the secure-staffing message. `web-admin/src/services/api.js:6` discards the server's explanation. Add explicit error/retry/stale states and display safe validation messages.

8. **Repeated saves can create duplicate records.** `web-admin/src/pages/Rosters.jsx:56-66,250` has no pending-state guard or disabled submit button. Repeated submissions issue separate inserts; closure-based state updates can also hide one of the results until reload. Disable concurrent actions, use functional updates or cache invalidation, and add server idempotency for retry-sensitive operations.

9. **Attendance integrity is not implemented.** The table permits overlapping open sessions and checkout before check-in; timestamps have no timezone. Add transactional attendance operations, a unique constraint for an open child session, timestamp ordering, actor attribution, room-movement history, and correction records. Store event instants with timezone-aware timestamps and use the center's America/Los_Angeles timezone for business dates.

10. **Repository and operational foundations need work.** Git tracks 775 files under `server/node_modules` and tracks `server/.env`. The inspected environment uses a local database URL without a password; this review did not establish an exposed production credential. Add a root ignore file and remove dependencies/environment files from tracking while retaining lockfiles and `.env.example`. No application tests, CI, migration scripts, setup README, or deployment configuration were found. Vite proxies `/api` only in development; production needs an explicit API routing configuration. The fixed sidebar and wide table also need mobile/accessibility work before tablet/phone use.

## Architecture and data ownership

Keep the current `web-admin` and `server` directories initially. Introduce TypeScript gradually, starting with request schemas and shared API contracts. Add URL routing, reusable form/dialog components, and a server-state cache as workflows expand. The immediate priority is correctness and permissions rather than moving frameworks.

Suggested backend modules:

- Identity: accounts, memberships, roles, sessions, audit events.
- Preschool: centers, licensed programs, classrooms, children, households, guardians, enrollments, attendance, pickup permissions.
- Workforce: employees, employment terms and effective-dated pay rates, qualifications, room assignments, shifts, time entries, breaks, leave, approvals.
- Tuition: family billing accounts, rate plans, invoice lines, discounts, credits, payments, refunds, allocations, reconciliations.
- Payroll: pay periods, approved earnings snapshots, provider references, submissions, status changes, reconciliation results.
- Communications: conversations, recipients, daily activities, notifications, delivery records, consent-aware media/document access.

Keep child attendance, staff paid time, and staff presence in a classroom as separate concepts. A clocked-in employee may be doing administrative work and should not automatically count toward classroom staffing. Shared staff data is the strongest reason to build one platform.

Accounts may hold multiple roles. A teacher can also be a parent; family access must be tied to a specific child relationship. Payroll access should be restricted to authorized owner/payroll roles, while employees can view their own permitted records. Model business membership and center access without building a public SaaS product now. If locations have different legal employers, preserve that distinction for payroll.

Use durable background jobs for recurring billing and notification delivery. Payment/payroll adapters should support retries, signature-verified webhooks, idempotency, and reconciliation. Store money as integer cents or exact decimals, with currency; never depend on floating-point totals for financial records. Prefer provider-hosted collection of bank/tax credentials.

## Ordered delivery plan

| Phase | Deliverable | Completion criteria |
| --- | --- | --- |
| 0. Foundations | Root repository hygiene, setup docs, one migration history, authentication, permissions, validated API, accurate dashboard labels, basic CI and error states | Fresh setup is reproducible; unauthorized/cross-center requests fail; migrations preserve records; failures cannot masquerade as empty data |
| 1. People and enrollment | DOB-based children, households, guardians, pickup permissions, rooms/programs, employee records, enrollment history, import preview | Import a reviewed sample without duplicates; a child's guardians and pickup permissions are independently manageable; withdrawals retain history |
| 2. Daily operations | Child sign-in/out, staff presence and room transfers, kiosk/staff views, live presence dashboard, emergency roster, attendance corrections and exports | Two devices cannot create overlapping open sessions; double taps are safe; staff breaks/transfers update room coverage; reports reproduce saved events |
| 3. Family experience | Parent portal, messages, photos, daily reports, meals/naps/toileting where needed, incident acknowledgments, forms, calendars, notifications | Guardians see only authorized children; delivery failures are visible; activity and incident workflows work on phones/tablets |
| 4. Tuition | Family accounts, recurring charges, fee rules, discounts, deposits, credits, invoices/statements, payment processor, refunds/failed-payment handling | A billing cycle reconciles to provider settlements; duplicate jobs/webhooks do not duplicate charges; historical invoices remain stable after rate changes |
| 5. Workforce and payroll preparation | Schedules, time clock, recorded breaks, corrections, leave, pay rates, pay periods, approval and export | A reviewed payroll period reconciles to the existing processor; approved time is versioned/locked; California earning categories and exceptions are handled |
| 6. Payroll-provider replacement | Eligible provider selection, onboarding, tax/payment operations integration, pay statements, filing visibility and reconciliation | Provider terms/coverage fit a small internal business; historical/YTD totals reconcile; parallel calculations match before the first live submission |
| 7. Remaining Procare workflows and rollout | Usage-based feature checklist, additional reports, waitlist/admissions improvements, subsidy workflows if used, historical imports, tested recovery | Each used workflow has an accepted replacement; balances and attendance reconcile; staff can run a full day; exports/backups restore successfully |

Basic workforce records and staff presence belong in phases 1-2 because attendance depends on them. Payroll-specific time/pay processing comes later. Move a feature earlier if it is essential to your actual daily operation; the order is a dependency plan, not a promise that all Procare capabilities are covered by an initial MVP.

Before retiring Procare, inventory the features actually used: child/family records, sign-in/out, billing and autopay, messages/photos, daily activity reports, incidents, enrollment/waitlist, documents/e-signatures, staff time, reporting, and any subsidy/accounting integration. Keep an explicit supported/deferred/not-needed checklist.

## California requirements to design for

Treat licensing and payroll rules as explicit, versioned configuration with reviewed applicability. Do not treat the seeded classroom ratios as verified California rules. CDSS distinguishes licensed age programs and staffing ratios; the actual license, program, staff qualifications, and applicable rules must drive the feature. See [CDSS child care centers](https://www.cdss.ca.gov/inforesources/child-care-and-development/parent-resources/child-care-centers).

Payroll preparation must account for applicable daily/weekly overtime, double time and seventh-day rules, employee classification, meal/rest periods and potential premiums, leave, effective-dated rates, and local requirements. Preserve raw time entries and reviewed corrections; do not implement a weekly-hours-only calculation. Scope rules with the payroll professional/provider for the business. Sources: [California overtime](https://www.dir.ca.gov/dlse/faq_overtime.htm?preview=true), [meal periods](https://www.dir.ca.gov/dlse/FAQ_MealPeriods.html), and [rest periods](https://www.dir.ca.gov/dlse/FAQ_RestPeriods.htm).

California payroll taxes include employer-paid UI/ETT and employee-withheld SDI/PIT, alongside federal obligations. Avoid hardcoded tax tables in the app. [EDD payroll taxes](https://edd.ca.gov/payroll_taxes) describes the state programs; [IRS third-party payroll arrangements](https://www.irs.gov/businesses/small-businesses-self-employed/outsourcing-payroll-and-third-party-payers) explains that responsibility depends on the provider arrangement.

## Payroll integration decision

Gusto explicitly states that it does not currently support API access for customers connecting their own company systems directly to their account. Do not schedule a direct Gusto integration assuming API credentials will be available. Start with an approved export/manual reconciliation workflow if needed. [Gusto API access policy](https://support.gusto.com/article/106622056100000/gusto-api-integrations).

[Gusto Embedded](https://embedded.gusto.com/product/payroll-api) provides payroll/tax/payment infrastructure but still depends on Gusto. [Check](https://www.checkhq.com/platform/payroll) is an alternative infrastructure candidate. Both should be evaluated for eligibility, commercial minimums, California coverage, support responsibilities, and migration requirements before committing engineering time. Check is a candidate, not a verified fit or price quote for this business.

A successful replacement of the Gusto UI is distinct from independently performing every payroll/tax function. For up to 15 employees, retain specialist processing unless a separate cost and operational analysis justifies building those functions. Do not send live duplicate payrolls during validation; compare calculations and approved records in shadow mode.

## First development milestone

Build a secure, accurate roster foundation: reproducible setup, migrations, authentication/roles, linked children/guardians, valid DOB and classroom IDs, archived enrollment, useful errors, and honest dashboard labels. Then complete a real check-in/check-out flow with audit history before expanding the dashboard.

Validation should cover authorization boundaries, child/guardian relationships, enrollment updates, failed loads, duplicate attendance actions, timezone/DST behavior, historical preservation, and later invoice/payroll reconciliation. Use database integration tests and a few complete browser journeys; do not substitute mocks for financial or attendance integrity checks.

## Review verification and limits

- Read the first-party frontend/backend source, package/configuration files, and both SQL definitions; inspected lockfile versions and Git tracking. Dependency source was not exhaustively audited.
- `npm run build` in `web-admin` passed using installed dependencies.
- Backend entry point and all route files passed `node --check`.
- Direct route checks with a mocked database confirmed weak required-field validation and dashboard enrollment/default-teacher behavior. These checks do not establish live PostgreSQL behavior.
- A read-only attempt to connect to the configured local database was blocked by the execution environment (`EPERM`); schema application and database-backed flows were not verified. No initializer, seed, or live mutation was executed.
- No full browser end-to-end test, fresh dependency installation, deployment validation, or comprehensive vulnerability audit was performed.
- This review adds this planning document; application code is unchanged.
