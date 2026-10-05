// Railway healthcheck: no database access on purpose (a DB outage must not take the whole site out of rotation).
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
