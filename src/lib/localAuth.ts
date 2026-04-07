import { nanoid } from "nanoid";
import { db, nowIso, type LocalUser } from "@/lib/localdb";

const SESSION_KEY = "nas_billing_session";

export type SessionState = {
  user_id: string;
  email: string;
  role: "admin" | "salesman";
};

export async function ensureDefaultAdmin() {
  const count = await db.users.count();
  if (count > 0) return;

  const created_at = nowIso();
  const admin: LocalUser = {
    id: nanoid(),
    email: "admin@nas.local",
    password: "admin123",
    role: "admin",
    full_name: "Default Admin",
    created_at,
  };

  await db.users.add(admin);
}

export function getSession(): SessionState | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export async function signIn(email: string, password: string): Promise<SessionState> {
  await ensureDefaultAdmin();
  const user = await db.users.where("email").equals(email.toLowerCase()).first();
  if (!user || user.password !== password) {
    throw new Error("Invalid email or password");
  }

  const session: SessionState = {
    user_id: user.id,
    email: user.email,
    role: user.role,
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}
