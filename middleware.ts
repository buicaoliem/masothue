import { NextResponse, type NextRequest } from "next/server";
import { ensureEnriched } from "@/lib/enrich";

// Detail pages of PENDING companies are enriched here, before rendering, so a failed enrichment
// can answer 503 + Retry-After (crawlers retry later) instead of a 200/500 page without data.
// SOURCE_MISS and unknown codes pass through and the page answers 404 as before.

const RETRY_AFTER_S = 3600;

const BUSY_HTML = `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Đang cập nhật dữ liệu</title></head>
<body style="font-family:system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1rem">
<h1>Đang cập nhật dữ liệu</h1>
<p>Thông tin doanh nghiệp này đang được cập nhật. Vui lòng quay lại sau.</p>
<p><a href="/">Về trang chủ</a></p>
</body></html>`;

export async function middleware(req: NextRequest) {
  const taxCode = req.nextUrl.pathname.slice(1);
  if ((await ensureEnriched(taxCode)) === "ready") return NextResponse.next();
  return new NextResponse(BUSY_HTML, {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "retry-after": String(RETRY_AFTER_S),
      "cache-control": "no-store",
    },
  });
}

export const config = {
  runtime: "nodejs",
  // Same shape as TAX_CODE_RE in lib/company.ts.
  matcher: ["/:taxCode(\\d{10}|\\d{10}-\\d{3})"],
};
