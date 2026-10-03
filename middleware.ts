import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/directory/admin-auth";

// /admin is gated here first (401 + WWW-Authenticate); app/admin also re-checks per request
// (see app/admin/guard.ts) as defense in depth.
// Company-page enrichment runs at page generate (lib/company.ts), not per request: a DB read
// here would keep Neon awake for every crawler hit even when the HTML is cached.

export async function middleware(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  return unauthorized ?? NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
