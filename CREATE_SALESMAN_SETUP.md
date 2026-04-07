# Create Salesman Login (Admin page) — Setup

This feature uses a **Supabase Edge Function** so the website can safely create salesman users.

If you see **“Failed to fetch”** in the browser, it is usually a **CORS** issue — deploy the latest function code (it includes CORS headers).

## Why Edge Function
Creating users requires the **Service Role key** (secret). Secrets must **never** be placed in the frontend.

## 1) Prerequisites
- You already ran:
  - `supabase_schema.sql`
  - `supabase_roles_rls.sql`
- You have installed Supabase CLI

## 2) Deploy the Edge Functions
From this project root folder:

```bash
supabase login
supabase link --project-ref orcipayaafyqfqjkphxq
supabase functions deploy create-salesman
supabase functions deploy sheets-read

# If you deployed before, redeploy after updating the function:
# supabase functions deploy create-salesman
```

## 3) Set function secrets
Set these secrets (replace SERVICE_ROLE_KEY):

```bash
supabase secrets set \
  SUPABASE_URL="https://orcipayaafyqfqjkphxq.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="SERVICE_ROLE_KEY"

# Google Sheets (live read)
# IMPORTANT: put the entire service account JSON in one line.
# On Windows PowerShell you may need to escape quotes, or use a .env and `supabase secrets set --env-file`.
supabase secrets set \
  GOOGLE_SHEET_ID="1mvollIBhE9KIBRjRDnI8nm3TUNkY-TltbtnsVtuo5gY" \
  GOOGLE_SA_JSON='{"type":"service_account", ... }'
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

