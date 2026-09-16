import { headers } from "next/headers";
import { requireAdmin } from "@/lib/directory";

// Defense in depth: middleware.ts is the primary gate for /admin (it answers 401 + WWW-Authenticate
// before this page/action even runs). Every server action and data-read function below calls this
// too, so a middleware misconfiguration or a direct RSC action call still cannot bypass admin auth.

/**
 * Throws when the request is not authenticated as admin.
 * `headerList` is only for tests (they cannot call next/headers() outside a request scope);
 * every real call site omits it and gets the current request's headers.
 */
export async function assertAdmin(headerList?: Headers): Promise<void> {
  const h = headerList ?? (await headers());
  const req = new Request("http://internal.local/admin", { headers: h });
  const unauthorized = await requireAdmin(req);
  if (unauthorized) throw new Error("Unauthorized");
}
