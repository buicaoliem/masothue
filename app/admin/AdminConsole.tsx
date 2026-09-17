"use client";

import { useMemo, useState } from "react";
import { DIRECTORY_GROUPS } from "@/lib/directory/groups";
import { PROVINCES } from "@/pipeline/province";
import type { LeadStatus, PlacementInput } from "@/lib/directory";
import dirStyles from "../components/directory.module.css";
import formStyles from "../components/directoryForm.module.css";
import {
  approveRemovalAction,
  approveSubmissionAction,
  createPlacementAction,
  rejectRemovalAction,
  rejectSubmissionAction,
  setLeadStatusAction,
} from "./actions";
import type { AdminData, PendingSubmissionView } from "./data";
import type { PendingRemovalRow } from "@/lib/removal";

type Tab = "pending" | "leads" | "placements" | "removals";

const LEAD_STATUS_LABEL: Record<LeadStatus, string> = { NEW: "Mới", CALLED: "Đã gọi", WON: "Đã chốt", LOST: "Không mua" };
const LEAD_STATUSES: LeadStatus[] = ["NEW", "CALLED", "WON", "LOST"];

const badgeFor = (b: PendingSubmissionView["nameBadge"]) => {
  if (b === "match") return { cls: dirStyles.badgeOk, text: "Tên khớp đăng ký" };
  if (b === "mismatch") return { cls: formStyles.badgeWarn, text: "Tên lệch đăng ký" };
  return { cls: dirStyles.badgeOff, text: "Chưa đối chiếu được" };
};

const fmtDateTime = (d: Date) =>
  new Date(d).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const fmtDate = (d: Date) => new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

export function AdminConsole({ initialData }: { initialData: AdminData }) {
  const [tab, setTab] = useState<Tab>("pending");
  const [pending, setPending] = useState(initialData.pending);
  const [leads, setLeads] = useState(initialData.leads);
  const [placements, setPlacements] = useState(initialData.placements);
  const [removals, setRemovals] = useState(initialData.removals);

  return (
    <div>
      <div className={formStyles.atabs}>
        <button type="button" className={tab === "pending" ? formStyles.atabsOn : ""} onClick={() => setTab("pending")}>
          Hồ sơ chờ duyệt ({pending.length})
        </button>
        <button type="button" className={tab === "leads" ? formStyles.atabsOn : ""} onClick={() => setTab("leads")}>
          Yêu cầu quảng cáo ({leads.length})
        </button>
        <button type="button" className={tab === "placements" ? formStyles.atabsOn : ""} onClick={() => setTab("placements")}>
          Vị trí nổi bật
        </button>
        <button type="button" className={tab === "removals" ? formStyles.atabsOn : ""} onClick={() => setTab("removals")}>
          Yêu cầu gỡ thông tin ({removals.length})
        </button>
      </div>

      {tab === "pending" && (
        <div className={formStyles.apane}>
          {pending.length === 0 && <p className={dirStyles.note}>Không có hồ sơ nào đang chờ duyệt.</p>}
          {pending.map((s) => (
            <PendingCard key={s.id} s={s} onDone={(id) => setPending((cur) => cur.filter((x) => x.id !== id))} />
          ))}
        </div>
      )}

      {tab === "removals" && (
        <div className={formStyles.apane}>
          {removals.length === 0 && <p className={dirStyles.note}>Không có yêu cầu gỡ thông tin nào đang chờ duyệt.</p>}
          {removals.map((r) => (
            <RemovalCard key={r.id} r={r} onDone={(id) => setRemovals((cur) => cur.filter((x) => x.id !== id))} />
          ))}
        </div>
      )}

      {tab === "leads" && (
        <div className={formStyles.apane}>
          {leads.length === 0 && <p className={dirStyles.note}>Chưa có yêu cầu quảng cáo nào.</p>}
          {leads.length > 0 && (
            <table className={`${formStyles.tbl} ${formStyles.tblStack}`}>
              <thead>
                <tr>
                  <th>Người liên hệ</th>
                  <th>Ngành, tỉnh</th>
                  <th>Gửi lúc</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id}>
                    <td data-l="Người liên hệ">
                      {l.contactName} · <a href={`tel:${l.phone}`}>{l.phone}</a>
                    </td>
                    <td data-l="Ngành, tỉnh">
                      {DIRECTORY_GROUPS.find((g) => g.slug === l.groupSlug)?.label ?? l.groupSlug} ·{" "}
                      {PROVINCES.find((p) => p.slug === l.provinceSlug)?.displayName ?? l.provinceSlug}
                    </td>
                    <td data-l="Gửi lúc">{fmtDateTime(l.createdAt)}</td>
                    <td data-l="Trạng thái">
                      <select
                        aria-label="Trạng thái"
                        value={l.status}
                        onChange={async (e) => {
                          const status = e.target.value as LeadStatus;
                          const prev = l.status;
                          setLeads((cur) => cur.map((x) => (x.id === l.id ? { ...x, status } : x)));
                          const r = await setLeadStatusAction(l.id, status);
                          if (!r.ok) setLeads((cur) => cur.map((x) => (x.id === l.id ? { ...x, status: prev } : x)));
                        }}
                      >
                        {LEAD_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {LEAD_STATUS_LABEL[st]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "placements" && (
        <PlacementsPane placements={placements} setPlacements={setPlacements} fmtDate={fmtDate} />
      )}
    </div>
  );
}

function PendingCard({ s, onDone }: { s: PendingSubmissionView; onDone: (id: string) => void }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const badge = badgeFor(s.nameBadge);

  async function approve() {
    setBusy(true);
    const r = await approveSubmissionAction(s.id);
    setBusy(false);
    if (r.ok) onDone(s.id);
    else setResult({ ok: false, message: r.message });
  }

  async function reject() {
    if (!rejecting) {
      setRejecting(true);
      return;
    }
    if (!reason.trim()) {
      setResult({ ok: false, message: "Vui lòng nhập lý do từ chối." });
      return;
    }
    setBusy(true);
    const r = await rejectSubmissionAction(s.id, reason.trim());
    setBusy(false);
    if (r.ok) onDone(s.id);
    else setResult({ ok: false, message: r.message });
  }

  return (
    <div className={formStyles.subCard}>
      <div className={formStyles.top2}>
        <h4>{s.companyName}</h4>
        <span className={`${dirStyles.badge} ${badge.cls}`}>{badge.text}</span>
      </div>
      <div className={formStyles.meta}>
        MST {s.mst} · {s.groupLabel} · {s.provinceLabel} · gửi {fmtDateTime(s.createdAt)}
      </div>
      <div className={formStyles.cmp2}>
        <div>
          <b>Tên theo đăng ký</b>
          {s.officialName ?? "Chưa có dữ liệu đăng ký"}
        </div>
        <div>
          <b>Tên người gửi nhập</b>
          {s.companyName}
        </div>
        <div>
          <b>Người gửi</b>
          {s.submitterName} · {s.submitterRole}
        </div>
        <div>
          <b>Số gọi xác minh</b>
          <a href={`tel:${s.submitterPhone}`}>{s.submitterPhone}</a>
        </div>
      </div>
      <p style={{ marginTop: 12 }}>{s.description}</p>
      {s.services.length > 0 && (
        <ul className={dirStyles.services}>
          {s.services.map((sv, i) => (
            <li className={dirStyles.svc} key={i}>
              <span className={dirStyles.svcName}>{sv.name}</span>
              {sv.detail && <span className={dirStyles.svcDetail}>{sv.detail}</span>}
            </li>
          ))}
        </ul>
      )}
      <div className={formStyles.cmp2}>
        <div>
          <b>Điện thoại công khai</b>
          {s.publicPhone ?? "—"}
        </div>
        <div>
          <b>Zalo công khai</b>
          {s.publicZalo ?? "—"}
        </div>
        <div>
          <b>Website</b>
          {s.website ?? "—"}
        </div>
        <div>
          <b>Email công khai</b>
          {s.publicEmail ?? "—"}
        </div>
      </div>

      {rejecting && (
        <div className={formStyles.reason}>
          <div className={formStyles.fld}>
            <label className={formStyles.lbl}>Lý do từ chối</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ví dụ: không xác minh được người gửi" />
          </div>
        </div>
      )}

      {result && <p className={`${formStyles.result} ${result.ok ? formStyles.resultOk : formStyles.resultBad}`}>{result.message}</p>}

      <div className={dirStyles.act} style={{ marginTop: 12 }}>
        <button type="button" className={dirStyles.btnGhost + " " + dirStyles.btn} onClick={reject} disabled={busy}>
          {rejecting ? "Xác nhận từ chối" : "Từ chối"}
        </button>
        <button type="button" className={dirStyles.btn} onClick={approve} disabled={busy}>
          Duyệt và đăng
        </button>
      </div>
    </div>
  );
}

function RemovalCard({ r, onDone }: { r: PendingRemovalRow; onDone: (id: string) => void }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function approve() {
    setBusy(true);
    const res = await approveRemovalAction(r.id);
    setBusy(false);
    if (res.ok) onDone(r.id);
    else setResult({ ok: false, message: res.message });
  }

  async function reject() {
    if (!rejecting) {
      setRejecting(true);
      return;
    }
    if (!reason.trim()) {
      setResult({ ok: false, message: "Vui lòng nhập lý do từ chối." });
      return;
    }
    setBusy(true);
    const res = await rejectRemovalAction(r.id, reason.trim());
    setBusy(false);
    if (res.ok) onDone(r.id);
    else setResult({ ok: false, message: res.message });
  }

  return (
    <div className={formStyles.subCard}>
      <div className={formStyles.top2}>
        <h4>{r.companyName ?? "Chưa có dữ liệu đăng ký"}</h4>
      </div>
      <div className={formStyles.meta}>
        MST {r.taxCode} · gửi {fmtDateTime(r.createdAt)}
      </div>
      <div className={formStyles.cmp2}>
        <div>
          <b>Người yêu cầu</b>
          {r.requesterName ?? "—"} {r.requesterRelation ? `(${r.requesterRelation})` : ""}
        </div>
        <div>
          <b>Email liên hệ</b>
          {r.contactEmail}
        </div>
      </div>
      <p style={{ marginTop: 12 }}>{r.reason}</p>

      {rejecting && (
        <div className={formStyles.reason}>
          <div className={formStyles.fld}>
            <label className={formStyles.lbl}>Lý do từ chối</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ví dụ: không xác minh được người yêu cầu" />
          </div>
        </div>
      )}

      {result && <p className={`${formStyles.result} ${result.ok ? formStyles.resultOk : formStyles.resultBad}`}>{result.message}</p>}

      <div className={dirStyles.act} style={{ marginTop: 12 }}>
        <button type="button" className={dirStyles.btnGhost + " " + dirStyles.btn} onClick={reject} disabled={busy}>
          {rejecting ? "Xác nhận từ chối" : "Từ chối"}
        </button>
        <button type="button" className={dirStyles.btn} onClick={approve} disabled={busy}>
          Duyệt và ẩn
        </button>
      </div>
    </div>
  );
}

type PlacementView = AdminData["placements"][number];

function placementStatus(p: PlacementView, now: Date): { label: string; cls: string } {
  if (now < p.startsAt) return { label: "Sắp chạy", cls: dirStyles.badgeOff };
  if (now >= p.endsAt) return { label: "Hết hạn", cls: dirStyles.badgeOff };
  return { label: "Đang chạy", cls: dirStyles.badgeOk };
}

function PlacementsPane({
  placements,
  setPlacements,
  fmtDate,
}: {
  placements: PlacementView[];
  setPlacements: React.Dispatch<React.SetStateAction<PlacementView[]>>;
  fmtDate: (d: Date) => string;
}) {
  const [open, setOpen] = useState(false);
  const now = useMemo(() => new Date(), []);

  return (
    <div className={formStyles.apane}>
      <div className={dirStyles.act} style={{ marginBottom: 12 }}>
        <button type="button" className={dirStyles.btnGold + " " + dirStyles.btn} onClick={() => setOpen(true)}>
          Thêm vị trí
        </button>
      </div>
      {placements.length === 0 && <p className={dirStyles.note}>Chưa có vị trí nổi bật nào.</p>}
      {placements.length > 0 && (
        <table className={`${formStyles.tbl} ${formStyles.tblStack}`}>
          <thead>
            <tr>
              <th>MST</th>
              <th>Ngành, tỉnh</th>
              <th>Vị trí</th>
              <th>Thời hạn</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {placements.map((p) => {
              const st = placementStatus(p, now);
              return (
                <tr key={p.id}>
                  <td data-l="MST">{p.mst}</td>
                  <td data-l="Ngành, tỉnh">
                    {p.groupLabel} · {p.provinceLabel}
                  </td>
                  <td data-l="Vị trí">{p.position}</td>
                  <td data-l="Thời hạn">
                    {fmtDate(p.startsAt)} – {fmtDate(p.endsAt)}
                  </td>
                  <td data-l="Trạng thái">
                    <span className={`${dirStyles.badge} ${st.cls}`}>{st.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <p className={dirStyles.note}>Hết hạn thì vị trí tự rút khỏi trang, không cần thao tác.</p>

      {open && (
        <AddPlacementModal
          onClose={() => setOpen(false)}
          onCreated={(p) => setPlacements((cur) => [...cur, p])}
        />
      )}
    </div>
  );
}

function AddPlacementModal({ onClose, onCreated }: { onClose: () => void; onCreated: (p: PlacementView) => void }) {
  const [mst, setMst] = useState("");
  const [groupSlug, setGroupSlug] = useState("");
  const [provinceSlug, setProvinceSlug] = useState("");
  const [position, setPosition] = useState("1");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const logoValid = logoUrl.trim() === "" || /^https:\/\//i.test(logoUrl.trim());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setWarning(null);
    if (!logoValid) {
      setError("Logo phải là đường dẫn https.");
      return;
    }
    if (!mst.trim() || !groupSlug || !provinceSlug || !startsAt || !endsAt) {
      setError("Vui lòng nhập đủ thông tin bắt buộc.");
      return;
    }
    const input: PlacementInput = {
      mst: mst.trim(),
      groupSlug,
      provinceSlug,
      position: Number(position),
      startsAt,
      endsAt,
      note: note.trim() || null,
    };
    setBusy(true);
    const r = await createPlacementAction(input);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    onCreated({
      id: r.id,
      mst: input.mst,
      groupSlug,
      provinceSlug,
      position: Number(position),
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      note: input.note ?? null,
      createdAt: new Date(),
      groupLabel: DIRECTORY_GROUPS.find((g) => g.slug === groupSlug)?.label ?? groupSlug,
      provinceLabel: PROVINCES.find((p) => p.slug === provinceSlug)?.displayName ?? provinceSlug,
    });
    if (r.noApprovedProfile) {
      setWarning("Doanh nghiệp này chưa có hồ sơ được duyệt nên vị trí sẽ không hiện.");
      setSaved(true);
    } else {
      onClose();
    }
  }

  return (
    <div className={formStyles.modalBackdrop} role="dialog" aria-modal="true">
      <div className={formStyles.modal}>
        <h2>Thêm vị trí nổi bật</h2>
        <form onSubmit={submit} noValidate>
          <div className={formStyles.fld}>
            <label className={formStyles.lbl}>Mã số thuế</label>
            <input value={mst} onChange={(e) => setMst(e.target.value)} inputMode="numeric" />
          </div>
          <div className={formStyles.grid2}>
            <div className={formStyles.fld}>
              <label className={formStyles.lbl}>Ngành</label>
              <select value={groupSlug} onChange={(e) => setGroupSlug(e.target.value)}>
                <option value="">Chọn ngành</option>
                {DIRECTORY_GROUPS.map((g) => (
                  <option key={g.slug} value={g.slug}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={formStyles.fld}>
              <label className={formStyles.lbl}>Tỉnh, thành phố</label>
              <select value={provinceSlug} onChange={(e) => setProvinceSlug(e.target.value)}>
                <option value="">Chọn tỉnh, thành phố</option>
                {PROVINCES.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={formStyles.grid2}>
            <div className={formStyles.fld}>
              <label className={formStyles.lbl}>Vị trí (1–3)</label>
              <select value={position} onChange={(e) => setPosition(e.target.value)}>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </div>
            <div className={formStyles.fld}>
              <label className={formStyles.lbl}>Logo (URL, không bắt buộc)</label>
              <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://" />
            </div>
          </div>
          <div className={formStyles.grid2}>
            <div className={formStyles.fld}>
              <label className={formStyles.lbl}>Ngày bắt đầu</label>
              <input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div className={formStyles.fld}>
              <label className={formStyles.lbl}>Ngày kết thúc</label>
              <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          </div>
          <div className={formStyles.fld}>
            <label className={formStyles.lbl}>Ghi chú (không bắt buộc)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {error && <p className={formStyles.error} role="alert">{error}</p>}
          {saved && (
            <p className={`${formStyles.result} ${formStyles.resultOk}`}>
              Đã lưu vị trí.{warning ? ` ${warning}` : ""}
            </p>
          )}
          <div className={dirStyles.act} style={{ marginTop: 12 }}>
            <button type="button" className={dirStyles.btnGhost + " " + dirStyles.btn} onClick={onClose} disabled={busy}>
              {saved ? "Đóng" : "Hủy"}
            </button>
            {!saved && (
              <button type="submit" className={dirStyles.btnGold + " " + dirStyles.btn} disabled={busy}>
                {busy ? "Đang lưu…" : "Lưu vị trí"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
