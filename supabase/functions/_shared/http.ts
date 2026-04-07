// Shared helpers for Supabase Edge Functions
export function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers ?? {}),
    },
  });
}

export function badRequest(message: string, extra?: Record<string, unknown>) {
  return json({ error: message, ...(extra ?? {}) }, { status: 400 });
}

export function forbidden(message = "Forbidden") {
  return json({ error: message }, { status: 403 });
}
