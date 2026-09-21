# SEO changelog

Ghi mỗi thay đổi SEO có chủ đích để đối chiếu với Search Console sau 14/28 ngày. Không gộp nhiều thay đổi lớn vào một ngày
mà không ghi.

**Baseline Search Console: PENDING.** Repository và môi trường này không có quyền truy cập GSC API và chưa có export.
Khi có export (`data/gsc/28d`, `data/gsc/90d`), chạy `npm run seo:gsc-report` và `npm run seo:ctr-report`, rồi điền bảng dưới.

| Chỉ số (28 ngày) | Giá trị |
|---|---|
| Clicks | pending |
| Impressions | pending |
| CTR | pending |
| Vị trí trung bình | pending |
| Trang có click / có impression | pending |
| Query có click / có impression | pending |

## Nhật ký

| Ngày | Thay đổi | Route ảnh hưởng | Giả thuyết | Baseline |
|---|---|---|---|---|
| 2026-09-21 (994c956) | Taxonomy (tỉnh, ngành, loại hình, tình trạng), sitemap chia section, metadata framework, dữ liệu ngành 99% hồ sơ, noindex hub ngành bão hòa | toàn site, /nganh/*, /tinh/*/nganh/* | Tăng phạm vi crawl; chỉ index hub có giá trị phân loại | pending |
| 2026-09-21 (ab5520b) | Ghim function sang sin1, giảm số truy vấn | trang động | Giảm TTFB, không đổi nội dung | pending |
| 2026-09-21 (phase nội dung) | 5 bài hướng dẫn cụm MST / tình trạng / ngành; thống kê thêm loại hình và doanh nghiệp mới; liên kết ngữ cảnh tới doanh nghiệp mới theo tỉnh; footer thêm Tình trạng, Loại hình | /huong-dan/*, /thong-ke/*, /[mst], footer | Xây topical authority cụm MST - doanh nghiệp - ngành; thêm liên kết nội bộ tới hub | pending |
| 2026-09-21 (phase VSIC 2025) | /ma-nganh-2025 (+ chi tiết), /cong-cu/chuyen-doi-ma-nganh-2018-2025, tham chiếu trạng thái MST /trang-thai và /trang-thai/mst/*; sitemap vsic-2025; liên kết trong 3 guide và /nganh/* | routes mới, /nganh/*, /trang-thai | Bắt intent mã ngành 2026 và chuyển đổi 2018-2025; không đổi URL/canonical/indexability của company | pending |

## Chưa làm vì thiếu dữ liệu (không suy đoán)

- Đổi title/description template công ty: cần query pattern từ GSC.
- Trang báo cáo tháng (`/thong-ke/doanh-nghiep-moi-thang-...`): dữ liệu hiện chỉ có ngày cấp MST, chưa có lịch sử theo dõi thay đổi nhiều kỳ; chưa đủ tin cậy để sinh archive.
- Ma trận đối thủ: cần khảo sát thủ công từng trang (xem `docs/competitor-gap.md`).
