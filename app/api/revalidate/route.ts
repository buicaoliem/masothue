import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";

export const dynamic = "force-dynamic";

/** On-demand purge after a data import. Auth: Bearer REVALIDATE_SECRET. */
export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401, headers: { "cache-control": "no-store" } });
  }
  for (const tag of Object.values(CACHE_TAGS)) revalidateTag(tag);
  revalidatePath("/", "layout");
  return Response.json({ ok: true });
}
