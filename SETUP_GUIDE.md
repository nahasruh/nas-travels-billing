# NAS Travels Billing — Setup Guide

This guide helps you connect the web app to your existing Supabase project.

## 1) Supabase SQL schema
1. Open **Supabase Dashboard → SQL Editor**
2. Run the file: `supabase_schema.sql`

This creates:
- `agents`
- `salesmen`
- `sales` (tickets)
- `ledger_entries` (payments/ledger)
- Views: `v_dashboard_totals`, `v_agent_balances`

## 2) Supabase Authentication
This app uses **Supabase Auth** (email/password) for login.

In Supabase:
1. Go to **Authentication → Providers**
2. Enable **Email** provider
3. Create users in **Authentication → Users**

## 3) Environment variables
Create `.env` in the project root (same folder as `package.json`):

```bash
VITE_SUPABASE_URL=https://orcipayaafyqfqjkphxq.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_PUBLIC_KEY
```

## 4) Run locally
```bash
pnpm install
pnpm dev
```

## 5) Deploy (GitHub)
- Push this folder to GitHub
- Set the same env vars in your hosting provider (Vercel/Netlify)
- If deploying to GitHub Pages, use GitHub Actions or a Pages build workflow.

## Important notes
- English only
- No VAT
- Currency: SAR
