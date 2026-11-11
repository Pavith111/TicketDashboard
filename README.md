# Zuse IT Helpdesk

IT helpdesk and ticket management for **Zuse Technologies (Pvt) Ltd**, supporting IT operations at
Lyceum International School, Panadura.

| Portal | Route | Who | Auth |
| --- | --- | --- | --- |
| Staff portal | `/` | All employees (the only link you share) | None |
| Admin portal | `/admin` | IT Department staff | Supabase Auth + active `profiles` row |

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS v4 · shadcn/ui (Base UI) ·
Motion · Lucide · Supabase (Postgres, Auth, Storage, RLS) · Recharts · React Hook Form + Zod.

---

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste the contents of
   [`supabase/migrations/20261111000000_init.sql`](supabase/migrations/20261111000000_init.sql) and run it.
   (Or with the CLI: `supabase link` then `supabase db push`.)
   This creates the tables, RLS policies, the private `ticket-attachments` bucket and seed data
   (departments, issue categories and placeholder locations).
   Run it **once**. If it fails partway (e.g. `type "ticket_status" already exists`), run
   [`supabase/reset.sql`](supabase/reset.sql) first, then the migration again.
3. **Authentication → Sign In / Providers:** turn **off** "Allow new users to sign up".
   Staff accounts are created from the admin portal only.

## 2. Configure environment

```bash
cp .env.example .env.local
```

| Variable | Where to find it | Exposure |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API | public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | API Keys → publishable (or legacy `anon`) | public |
| `SUPABASE_SECRET_KEY` | API Keys → secret (or legacy `service_role`) | **server only** |

## 3. Create the first administrator

```bash
npm install
node --env-file=.env.local scripts/create-admin.mjs "Your Name" you@example.com "a-strong-password"
```

After that, administrators add other IT staff in **Admin → Team**.

## 4. Run

```bash
npm run dev      # http://localhost:3000 (staff portal) and /admin
npm run build && npm start
```

## 5. Deploy to Vercel

1. Push the repository to GitHub and import it in Vercel.
2. Add the three environment variables above (Production and Preview).
3. Deploy. Share only the root URL (`https://<your-domain>/`) with employees.

---

## Security model

- **Public portal is session-free.** It never reads cookies and contains no admin links, data or controls.
- **Ticket intake** runs in a Server Action ([`submit-ticket.ts`](src/app/actions/submit-ticket.ts)):
  Zod validation, a honeypot, a per-email rate limit (5 per 15 minutes), and a check that the chosen
  department, category and location are still enabled. Only then does it insert with the secret key.
  The `anon` role has **no** privileges on tickets, notes, attachments, activity or profiles.
- **Attachments** go straight from the browser to the private bucket through single-use signed
  upload URLs issued per ticket. The bucket enforces a 10 MB limit and a MIME allow-list. Staff
  download them through 10-minute signed URLs.
- **Admin portal** is protected three times:
  1. [`proxy.ts`](src/proxy.ts) refreshes the session and redirects anonymous visitors to `/admin/login`
     (an optimistic, fast check).
  2. The data access layer ([`lib/auth.ts`](src/lib/auth.ts)) checks the caller on every page and
     every Server Action, and requires an **active** `profiles` row. Settings and Team require `role = 'admin'`.
  3. **Postgres RLS** (`is_staff()` / `is_admin()`) enforces the same rules in the database, so a
     leaked publishable key or a signed-in non-staff account can't read anything.
- Deactivating a team member blocks them immediately at the RLS layer.

## Roles

| | Support agent | Administrator |
| --- | :-: | :-: |
| View, assign and update tickets | ✓ | ✓ |
| Internal notes (delete own) | ✓ | ✓ (delete any) |
| Delete tickets | | ✓ |
| Manage departments, categories, locations | | ✓ |
| Manage team members | | ✓ |

## Project structure

```
src/
  app/
    page.tsx                      Public staff portal
    actions/submit-ticket.ts      Public intake (Server Action)
    admin/
      (auth)/login/               Sign in
      (portal)/                   Authenticated area (dashboard, tickets, settings, team)
      actions.ts                  Admin Server Actions (all re-authorise)
  components/
    public/   admin/   shared/   theme/   ui/ (shadcn)
  lib/
    auth.ts                       Data access layer
    data/                         Queries (tickets, analytics, lookups)
    supabase/                     Server, browser, service and proxy clients
    validations.ts                Zod schemas shared by client and server
  proxy.ts                        Session refresh + admin gate
supabase/migrations/              Schema, RLS, storage, seed
scripts/create-admin.mjs          Bootstrap the first administrator
```

## Customising

- **Locations** are seeded with generic placeholders. Rename them in *Admin → Settings → Locations*.
- **Departments / categories:** add, rename, reorder, disable or delete (if unused) in *Settings*.
  Changes reach the public form immediately (cache tag `lookups`).
- **Design tokens** live in [`src/app/globals.css`](src/app/globals.css).
