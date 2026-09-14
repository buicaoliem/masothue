// Contact and affiliate links in one place: change the number / OA / affiliate URLs here only.

const ZALO_PHONE = "0913081986";
const zaloChat = (phone: string) => `https://zalo.me/${phone}`;

// zalo.me/{phone} opens the chat but cannot prefill a message,
// so the page shows `message` for the visitor to copy.
export const ZALO_CONTACT = {
  phone: ZALO_PHONE,
  url: zaloChat(ZALO_PHONE),
  claimMessage: (companyName: string, taxCode: string) =>
    `Tôi muốn quản lý trang doanh nghiệp ${companyName} - MST ${taxCode}`,
};

export type ServiceKey = "digitalSignature" | "eInvoice" | "website";

// "Nhận báo giá" targets. Temporarily all point to Zalo; swap in real affiliate URLs later.
export const AFFILIATE_LINKS: Record<ServiceKey, { url: string; message: string }> = {
  digitalSignature: { url: ZALO_CONTACT.url, message: "Tôi cần tư vấn Chữ ký số" },
  eInvoice: { url: ZALO_CONTACT.url, message: "Tôi cần tư vấn Hóa đơn điện tử" },
  website: { url: ZALO_CONTACT.url, message: "Tôi cần tư vấn Thiết kế website" },
};
