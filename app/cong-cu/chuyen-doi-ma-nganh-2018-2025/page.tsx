import Link from "next/link";
import { conversionStats } from "@/lib/vsic/convert";
import { VSIC_2025_ROOT } from "@/lib/vsic/catalog";
import { webApplicationJsonLd } from "@/lib/seo/jsonld";
import { getTool } from "@/lib/tools/registry";
import { JsonLd } from "../../components/JsonLd";
import siteStyles from "../../components/site.module.css";
import { VsicProvenance } from "../../ma-nganh-2025/VsicProvenance";
import { ToolPage, toolMetadata } from "../ToolPage";
import { VsicConverter } from "./VsicConverter";

const SLUG = "chuyen-doi-ma-nganh-2018-2025";

export const metadata = toolMetadata(SLUG);

type Props = { searchParams: Promise<{ ma?: string | string[]; chieu?: string | string[] }> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function Page({ searchParams }: Props) {
  const sp = await searchParams;
  const ma = (one(sp.ma) ?? "").slice(0, 12).replace(/[^0-9A-Za-z.\- ]/g, "");
  const chieu = one(sp.chieu) === "2025" ? "2025" : "2018";
  const st = conversionStats("2018");
  const tool = getTool(SLUG);
  return (
    <ToolPage
      slug={SLUG}
      intro={
        <p>
          Nhập mã ngành VSIC 2018 để xem mã tương ứng trong VSIC 2025, hoặc làm ngược lại. Kết quả lấy trực tiếp từ bảng chuyển đổi chính thức;
          khi một mã tách thành nhiều mã, công cụ hiển thị tất cả và không chọn hộ bạn.
        </p>
      }
    >
      <JsonLd data={webApplicationJsonLd({ name: tool.name, path: `/cong-cu/${SLUG}`, description: tool.description })} />
      <VsicConverter initialCode={ma} initialFrom={chieu} />

      <section className={siteStyles.section} style={{ maxWidth: 760, marginInline: "auto" }}>
        <h2 className={siteStyles.sectionTitle}>VSIC 2018 và VSIC 2025 là gì</h2>
        <p>
          VSIC là Hệ thống ngành kinh tế Việt Nam, dùng để ghi mã ngành, nghề khi đăng ký kinh doanh và trong thống kê. VSIC 2018 ban hành theo
          Quyết định 27/2018/QĐ-TTg. VSIC 2025 ban hành theo Quyết định 36/2025/QĐ-TTg, có hiệu lực từ 15/11/2025 và thay Quyết định 27/2018/QĐ-TTg.
          Danh mục đầy đủ của hệ mới có ở trang <Link href={VSIC_2025_ROOT}>tra cứu mã ngành 2025</Link>.
        </p>

        <h2 className={siteStyles.sectionTitle}>Vì sao cùng một mã có thể đổi nghĩa</h2>
        <p>
          Hệ 2025 sắp xếp lại nhiều nhóm nên một dãy số có thể chỉ một hoạt động khác hẳn. Ví dụ theo bảng chính thức: mã 1104 trong VSIC 2018 là
          “Sản xuất đồ uống không cồn, nước khoáng”, còn trong VSIC 2025 mã 1104 là “Sản xuất mạch nha ủ men bia”; ngành đồ uống không cồn nay mang mã 1105.
          Vì vậy không thể đổi mã bằng cách giữ nguyên dãy số hay so sánh số gần nhau.
        </p>

        <h2 className={siteStyles.sectionTitle}>Vì sao không thể thay mã tự động</h2>
        <p>
          Bảng chuyển đổi có mã cũ tách thành nhiều mã mới, nhiều mã cũ gộp vào một mã mới, và có mã được đánh dấu (*). Ví dụ 6201 (Lập trình máy vi tính) ở VSIC 2018
          ứng với hai mã của VSIC 2025 là 6211 và 6219. Doanh nghiệp phải chọn mã theo hoạt động thực tế, nên công cụ chỉ liệt kê mã tương ứng và ghi rõ khi cần đối chiếu.
          Dữ liệu doanh nghiệp trên masothuedn.com vẫn theo mã 2018 như nguồn công bố và không bị đổi bởi công cụ này.
        </p>

        <h2 className={siteStyles.sectionTitle}>Cách dùng bảng chuyển đổi</h2>
        <ol>
          <li>Chọn chiều chuyển đổi (2018 → 2025 hoặc 2025 → 2018).</li>
          <li>Nhập mã ngành, hoặc gõ tên ngành rồi chọn trong danh sách gợi ý.</li>
          <li>Nếu chỉ có một mã tương ứng và không có đánh dấu, đối chiếu tên ngành rồi dùng mã đó. Nếu có nhiều mã, đọc nội dung từng mã ở trang chi tiết để chọn theo hoạt động thực tế.</li>
          <li>Khi đăng ký hoặc thay đổi ngành nghề, thực hiện theo hướng dẫn của cơ quan đăng ký kinh doanh có thẩm quyền.</li>
        </ol>
        <p style={{ color: "var(--muted)" }}>
          Trong bảng chính thức, {st.level5OneToOne.toLocaleString("vi-VN")} trên {st.level5Codes.toLocaleString("vi-VN")} mã cấp 5 của VSIC 2018 có đúng một mã tương ứng
          mà không gộp chung với mã khác; các mã còn lại tách, gộp hoặc cần đối chiếu.
        </p>
        <p>
          Đọc thêm: <Link href="/huong-dan/ma-nganh-kinh-te-la-gi">Mã ngành kinh tế là gì</Link>,{" "}
          <Link href="/huong-dan/nganh-nghe-chinh-va-nganh-nghe-dang-ky">ngành nghề chính và ngành nghề đăng ký</Link>,{" "}
          <Link href="/huong-dan/cach-tra-cuu-ma-nganh-cua-doanh-nghiep">cách tra cứu mã ngành của doanh nghiệp</Link>.
        </p>

        <h2 className={siteStyles.sectionTitle}>Nguồn và phiên bản</h2>
        <VsicProvenance conversion />
        <p style={{ color: "var(--muted)" }}>
          Công cụ tra trực tiếp trong bảng chuyển đổi chính thức, không dùng suy đoán hay trí tuệ nhân tạo. Ký hiệu (*) là ký hiệu của bảng chính thức; file không giải thích ý nghĩa.
        </p>
      </section>
    </ToolPage>
  );
}
