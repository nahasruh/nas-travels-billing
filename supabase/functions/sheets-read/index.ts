// Supabase Edge Function: sheets-read
// Purpose: Admin-only read of Google Sheet tabs (Sales_Report, Agent_Report, Ledger_Report)
//
// Deploy:
//   supabase functions deploy sheets-read
// Secrets:
//   supabase secrets set \
//     GOOGLE_SA_JSON='{"type":"service_account",...}' \
//     GOOGLE_SHEET_ID='1mvollIBhE9KIBRjRDnI8nm3TUNkY-TltbtnsVtuo5gY'
//
// Request:
//   GET /functions/v1/sheets-read?tab=Sales_Report
// Headers:
//   Authorization: Bearer <user_access_token>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { json } from "../_shared/http.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function base64url(input: ArrayBuffer) {
  const bytes = new Uint8Array(input);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  const b64 = btoa(str)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  return b64;
}

async function signJwt(payload: Record<string, any>, pemKey: string) {
  const header = { alg: "RS256", typ: "JWT" };
  const enc = (obj: any) => base64url(new TextEncoder().encode(JSON.stringify(obj)).buffer);
  const data = `${enc(header)}.${enc(payload)}`;

  const keyData = pemKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");

  const bin = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    bin.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(data));
  return `${data}.${base64url(sig)}`;
}

async function getAccessToken(sa: any) {
  const now = Math.floor(Date.now() / 1000);
  const jwt = await signJwt(
    {
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    },
    sa.private_key
  );

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error_description ?? "Failed to get access token");
  return data.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Missing function secrets (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)" }, { status: 500, headers: corsHeaders });
  }

  const saJson = Deno.env.get("GOOGLE_SA_JSON") ?? "";
  const sheetId = Deno.env.get("GOOGLE_SHEET_ID") ?? "";
  if (!saJson || !sheetId) {
    return json({ error: "Missing function secrets (GOOGLE_SA_JSON/GOOGLE_SHEET_ID)" }, { status: 500, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return json({ error: "Missing Authorization token" }, { status: 403, headers: corsHeaders });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return json({ error: "Invalid token" }, { status: 403, headers: corsHeaders });
  }

  const callerId = userData.user.id;
  const { data: prof } = await admin.from("profiles").select("role").eq("user_id", callerId).maybeSingle();
  if (prof?.role !== "admin") {
    return json({ error: "Admin role required" }, { status: 403, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const tab = (url.searchParams.get("tab") || "Sales_Report").trim();
  if (!tab) return json({ error: "Missing tab" }, { status: 400, headers: corsHeaders });

  let sa: any;
  try {
    sa = JSON.parse(saJson);
  } catch {
    return json({ error: "Invalid GOOGLE_SA_JSON" }, { status: 500, headers: corsHeaders });
  }

  try {
    const accessToken = await getAccessToken(sa);
    const range = `${tab}!A:Z`;
    const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?majorDimension=ROWS`;
    const r = await fetch(apiUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error?.message ?? "Sheets API error");

    const values: any[][] = data.values ?? [];
    if (values.length === 0) {
      return json({ tab, headers: [], rows: [] }, { headers: corsHeaders });
    }

    const headers = values[0].map((h) => String(h ?? "").trim());
    const rows = values.slice(1).map((row) => {
      const obj: Record<string, any> = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] ?? "";
      });
      return obj;
    });

    return json({ tab, headers, rows }, { headers: corsHeaders });
  } catch (e: any) {
    return json({ error: e?.message ?? "Failed" }, { status: 500, headers: corsHeaders });
  }
});
