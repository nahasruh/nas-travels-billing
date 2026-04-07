# Create Salesman Login (Admin page) — Setup

This feature uses a **Supabase Edge Function** so the website can safely create salesman users.

## Why Edge Function
Creating users requires the **Service Role key** (secret). Secrets must **never** be placed in the frontend.

## 1) Prerequisites
- You already ran:
  - `supabase_schema.sql`
  - `supabase_roles_rls.sql`
- You have installed Supabase CLI

## 2) Deploy the Edge Function
From this project root folder:

```bash
supabase login
supabase link --project-ref orcipayaafyqfqjkphxq
supabase functions deploy create-salesman
```

## 3) Set function secrets
Set these secrets (replace SERVICE_ROLE_KEY):

```bash
supabase secrets set \
  SUPABASE_URL="https://orcipayaafyqfqjkphxq.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="SERVICE_ROLE_KEY"
```

Where to get Service Role key:
- Supabase Dashboard → Project Settings → API → **service_role** key

## 4) Use in the website
Login as an **admin** user.
Then go to:
- **Reports → (Admin tools) → Create Salesman Login**

Or open route:
- `/#/admin/users`

You can create:
- Email + Password + Full name

The salesman can then log in normally.

## Security checks
The Edge Function verifies:
- Caller has a valid session token
- Caller has `profiles.role = 'admin'`

