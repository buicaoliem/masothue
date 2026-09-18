import assert from "node:assert/strict";
import { test } from "node:test";
import { SourceTransportError } from "../sources/types";
import {
  applyFill,
  fetchThroughHost,
  FILLABLE,
  freshHostStates,
  pace,
  shouldStopForTime,
} from "./enrich-batch";
import type { BusinessSource, CompanyData, FetchResult } from "../sources/types";

/**
 * Deterministic replacement for global setTimeout/Date.now, since the code under test schedules via
 * setTimeout. Async code needs several microtask turns to reach its next `setTimeout` call, so both
 * advance() and runAllTimers() flush microtasks before *and* after touching the clock/firing timers.
 */
function fakeClock(startAt = 1_000_000) {
  let now = startAt;
  const realSetTimeout = global.setTimeout;
  const realDateNow = Date.now;
  const scheduled: Array<{ cb: () => void; at: number }> = [];
  (global as unknown as { setTimeout: unknown }).setTimeout = ((cb: () => void, ms = 0) => {
    scheduled.push({ cb, at: now + ms });
    return 0 as unknown as NodeJS.Timeout;
  }) as typeof setTimeout;
  Date.now = () => now;

  const flushMicrotasks = async (turns = 20) => {
    for (let i = 0; i < turns; i++) await Promise.resolve();
  };

  return {
    async advance(ms: number) {
      await flushMicrotasks(); // let any pending continuation register its setTimeout first
      now += ms;
      for (const s of [...scheduled]) {
        if (s.at <= now) {
          scheduled.splice(scheduled.indexOf(s), 1);
          s.cb();
        }
      }
      await flushMicrotasks(); // let the resumed continuation run
    },
    /** Fires every scheduled timer in order, flushing microtasks between each — fast-forwards to completion. */
    async runAllTimers() {
      await flushMicrotasks();
      while (scheduled.length > 0) {
        const next = scheduled.reduce((a, b) => (a.at <= b.at ? a : b));
        now = next.at;
        scheduled.splice(scheduled.indexOf(next), 1);
        next.cb();
        await flushMicrotasks();
      }
    },
    restore() {
      global.setTimeout = realSetTimeout;
      Date.now = realDateNow;
    },
  };
}

function fakeCompany(overrides: Partial<CompanyData> = {}): CompanyData {
  return {
    taxCode: "0100000000",
    name: "CÔNG TY TNHH A",
    nameForeign: null,
    nameShort: null,
    address: "Số 1, Hà Nội",
    province: null,
    district: null,
    ward: null,
    status: "Đang hoạt động",
    activeDate: null,
    legalType: null,
    taxOffice: null,
    representativeName: "NGUYỄN VĂN A",
    mainIndustryCode: null,
    mainIndustry: null,
    capital: null,
    ...overrides,
  };
}

test("field whitelist never widens beyond public business fields", () => {
  assert.deepEqual(
    [...FILLABLE].sort(),
    ["activeDate", "address", "name", "nameForeign", "nameShort", "representativeName", "status"].sort(),
  );
  for (const forbidden of ["phone", "email", "cmnd", "cccd", "idNumber"]) {
    assert.ok(!(FILLABLE as readonly string[]).includes(forbidden));
  }
});

test("applyFill only sets currently-null fields, never overwrites existing values", () => {
  const merged: Record<string, unknown> = { name: "TÊN CŨ", address: null, status: null, activeDate: null };
  const fill: Record<string, unknown> = {};
  const changed = applyFill(merged, fill, fakeCompany({ name: "TÊN MỚI", address: "Địa chỉ mới" }));

  assert.equal(changed, true);
  assert.equal(merged.name, "TÊN CŨ"); // untouched
  assert.equal(fill.name, undefined); // never queued for write
  assert.equal(merged.address, "Địa chỉ mới");
  assert.equal(fill.address, "Địa chỉ mới");
});

test("applyFill reports no change when every field is already present", () => {
  const merged: Record<string, unknown> = { name: "X", nameForeign: "Y", nameShort: "Z", address: "A", status: "S", activeDate: null, representativeName: "R" };
  merged.activeDate = new Date();
  const fill: Record<string, unknown> = {};
  const changed = applyFill(merged, fill, fakeCompany());
  assert.equal(changed, false);
  assert.deepEqual(fill, {});
});

test("shouldStopForTime respects --max-minutes (0 = unlimited)", () => {
  const start = 1_000_000;
  assert.equal(shouldStopForTime(start, 0, start + 999_999_999), false); // unlimited
  assert.equal(shouldStopForTime(start, 5, start + 4 * 60_000), false); // under limit
  assert.equal(shouldStopForTime(start, 5, start + 5 * 60_000), true); // exactly at limit
  assert.equal(shouldStopForTime(start, 5, start + 6 * 60_000), true); // over limit
});

test("pace() waits the full spacing between two calls to the same host (fake clock)", async () => {
  const clock = fakeClock();
  try {
    const state = freshHostStates().vietqr;

    await pace(state, 5_000);
    const firstCall = Date.now();

    let resolved = false;
    const second = pace(state, 5_000).then(() => {
      resolved = true;
    });

    await clock.advance(4_999);
    assert.equal(resolved, false, "must not resolve before spacing elapses");

    await clock.advance(1);
    await second;
    assert.equal(resolved, true);
    assert.equal(Date.now() - firstCall, 5_000);
  } finally {
    clock.restore();
  }
});

function alwaysRateLimited(): BusinessSource {
  return {
    name: "fake",
    async fetchByTaxCode(): Promise<FetchResult> {
      throw new SourceTransportError("fake 429", 429);
    },
  };
}

test("a second consecutive 429 disables the host for the rest of the run", async () => {
  const clock = fakeClock();
  try {
    const state = freshHostStates().vietqr;
    let count429 = 0;

    const resultPromise = fetchThroughHost(alwaysRateLimited(), "vietqr", "0100000000", state, 0, () => count429++);
    // First 429 triggers a >=60s wait before the retry; fast-forward past it.
    await clock.runAllTimers();
    const result = await resultPromise;

    assert.equal(result.kind, "unavailable");
    assert.equal(state.blocked, true);
    assert.equal(count429, 2);
  } finally {
    clock.restore();
  }
});

test("a single 429 followed by success does not block the host", async () => {
  const clock = fakeClock();
  try {
    const state = freshHostStates().esgoo;
    let calls = 0;
    const source: BusinessSource = {
      name: "fake",
      async fetchByTaxCode(taxCode): Promise<FetchResult> {
        calls++;
        if (calls === 1) throw new SourceTransportError("fake 429", 429);
        return { kind: "OK", source: "fake", data: fakeCompany({ taxCode }) };
      },
    };

    const resultPromise = fetchThroughHost(source, "esgoo", "0100000000", state, 0);
    await clock.runAllTimers();
    const result = await resultPromise;

    assert.equal(result.kind, "ok");
    assert.equal(state.blocked, false);
  } finally {
    clock.restore();
  }
});

test("a blocked host is skipped without another network call", async () => {
  const state = freshHostStates().vietqr;
  state.blocked = true;
  let called = false;
  const source: BusinessSource = {
    name: "fake",
    async fetchByTaxCode(): Promise<FetchResult> {
      called = true;
      return { kind: "OK", source: "fake", data: fakeCompany() };
    },
  };

  const result = await fetchThroughHost(source, "vietqr", "0100000000", state, 0);
  assert.equal(result.kind, "unavailable");
  assert.equal(called, false);
});

test("a non-429 transport error aborts without touching the host breaker", async () => {
  const state = freshHostStates().esgoo;
  const source: BusinessSource = {
    name: "fake",
    async fetchByTaxCode(): Promise<FetchResult> {
      throw new SourceTransportError("network down", null);
    },
  };

  const result = await fetchThroughHost(source, "esgoo", "0100000000", state, 0);
  assert.equal(result.kind, "abort");
  assert.equal(state.blocked, false);
});
