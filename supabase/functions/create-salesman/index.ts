// Supabase Edge Function: create-salesman
// Purpose: Admin-only creation of Auth user + salesman profile
//
// Deploy:
//   supabase functions deploy create-salesman
// Secrets:
//   supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
//
// Client call (from app):
//   POST {SUPABASE_URL}/functions/v1/create-salesman
//   Authorization: Bearer <user_access_token>
//   body: { email, password, full_name }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { badRequest, forbidden, json } from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Missing function secrets" }, { status: 500 });
  }

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return forbidden("Missing Authorization token");

  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const email = String(payload?.email ?? "").trim().toLowerCase();
  const password = String(payload?.password ?? "");
  const fullName = String(payload?.full_name ?? "").trim();

  if (!email || !email.includes("@")) return badRequest("Valid email is required");
  if (!password || password.length < 6) return badRequest("Password must be at least 6 characters");

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) Verify caller token + role
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return forbidden("Invalid token");

  const callerId = userData.user.id;
  const { data: prof } = await admin
    .from("profiles")
    .select("role")
    .eq("user_id", callerId)
    .maybeSingle();

  if (prof?.role !== "admin") return forbidden("Admin role required");

  // 2) Create Auth user
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createErr) {
    return badRequest(createErr.message);
  }

  // 3) Upsert salesman profile
  const { error: profErr } = await admin
    .from("profiles")
    .upsert({
      user_id: created.user.id,
      role: "salesman",
      full_name: fullName || null,
    });

  if (profErr) {
    return json({ error: profErr.message }, { status: 500 });
  }

  return json({ ok: true, user_id: created.user.id, email });
});
