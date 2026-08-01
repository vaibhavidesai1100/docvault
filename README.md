# DocVault - AI-Ready Document Management System with Subscription-Based RBAC

DocVault is a full-stack document management SaaS application built to handle multi-tenant document workflows with strict role-based access control, subscription plan tier limits, and secure Supabase Storage integration. Users can upload, search, filter, and securely download business files, while platform administrators can manage global users, adjust subscription plans manually, and monitor system-wide activity.

## Tech Stack Used

- **Framework**: Next.js 15 (App Router with TypeScript strict mode enabled)
- **Styling**: Tailwind CSS with a clean Slate & Indigo design system
- **Backend & Authentication**: Supabase (`@supabase/supabase-js`, `@supabase/ssr`) for cookie-based SSR auth, PostgreSQL database, and private file storage
- **Payments**: Stripe Checkout (`stripe`, `@stripe/stripe-js`) and Stripe Webhooks
- **Form Handling & Validation**: `react-hook-form`, `@hookform/resolvers`, and `zod`
- **Feedback**: `sonner` toast notification system and custom loading skeletons

---

## Local Setup & Installation

### 1. Clone the Repository & Install Dependencies
```bash
git clone <repository-url>
cd Practical_Test
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your credentials in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Apply Database SQL Migrations in Supabase
In your Supabase Dashboard **SQL Editor**, execute the two migration files in order:
1. `supabase/migrations/0001_init.sql`: Creates `profiles` and `documents` tables and the `handle_new_user()` auto-signup trigger.
2. `supabase/migrations/0002_rls_policies.sql`: Enables Row Level Security (RLS), creates the `is_admin()` Security Definer helper function, and configures storage object security policies.

### 4. Run the Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## How RBAC & RLS Are Enforced

Security is implemented across three complementary layers:

1. **Database Row Level Security (RLS)**: PostgreSQL policies on `profiles`, `documents`, and Storage objects prevent unauthorized data access regardless of client queries. The `is_admin(user_id)` helper function runs under `SECURITY DEFINER` privileges to check admin status without causing recursive RLS lookups.
2. **Server Actions & Route Handlers**: API endpoints in `/api/documents` and `/api/admin/*` perform server-side session checks, Zod schema validation, and upload plan limit pre-checks before executing database mutations or streaming files to storage.
3. **Middleware / Proxy Gatekeeper**: `src/proxy.ts` (Next.js 15 convention) intercepts unauthenticated requests attempting to reach `/dashboard`, `/documents`, `/profile`, or `/admin/*`, redirecting non-admin users away from administrative routes.

---

## Plan Limits & Business Logic

- **Free Plan**: Maximum 5 document uploads, max 10MB per file cap.
- **Pro Plan**: Unlimited document uploads, max 100MB per file cap ($19/month via Stripe Checkout or manual Admin upgrade).
- **File Format Support**: PDF, DOCX, JPG, JPEG, PNG, WEBP.

---

## Deliverables & Verification Checklist

- [x] Unauthenticated users redirected away from protected routes (`/dashboard`, `/documents`, `/admin/*`).
- [x] Non-admins blocked from `/admin/*`.
- [x] Free plan users blocked server-side from 6th upload or files >10MB.
- [x] Short-lived (60s) signed URLs generated for secure file downloads.
- [x] Admin dashboard and user management table with manual plan toggle (`Free` <-> `Pro`).
- [x] Clean Next.js production build (`npm run build`) with zero TypeScript errors.
