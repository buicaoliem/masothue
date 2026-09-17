import assert from "node:assert/strict";
import { test } from "node:test";
import { prisma } from "@/pipeline/db";
import { findCompanyForLookup, getCompanyForPrefillSafe } from "./company";

const originalFindUnique = prisma.company.findUnique.bind(prisma.company);
const originalRemovalFindFirst = prisma.removalRequest.findFirst.bind(prisma.removalRequest);

function stubFindUnique(impl: (...args: unknown[]) => unknown) {
  (prisma.company as unknown as { findUnique: unknown }).findUnique = impl;
}

function restoreFindUnique() {
  (prisma.company as unknown as { findUnique: unknown }).findUnique = originalFindUnique;
}

/** Defaults to "no approved removal request" unless overridden. */
function stubRemovalFindFirst(impl: (...args: unknown[]) => unknown = async () => null) {
  (prisma.removalRequest as unknown as { findFirst: unknown }).findFirst = impl;
}

function restoreRemovalFindFirst() {
  (prisma.removalRequest as unknown as { findFirst: unknown }).findFirst = originalRemovalFindFirst;
}

test("invalid MST -> null, no DB call", async () => {
  let calls = 0;
  stubFindUnique(async () => {
    calls++;
    throw new Error("should not be called for an invalid tax code");
  });
  try {
    assert.equal(await getCompanyForPrefillSafe("not-a-tax-code"), null);
    assert.equal(calls, 0);
  } finally {
    restoreFindUnique();
  }
});

test("unknown MST -> null", async () => {
  stubFindUnique(async () => null);
  try {
    assert.equal(await getCompanyForPrefillSafe("0300588569"), null);
  } finally {
    restoreFindUnique();
  }
});

test("hidden MST -> null", async () => {
  stubFindUnique(async () => ({ name: "Ẩn", address: "123 Đường A", isHidden: true }));
  try {
    assert.equal(await getCompanyForPrefillSafe("0300588569"), null);
  } finally {
    restoreFindUnique();
  }
});

test("DB error -> null, does not throw", async () => {
  stubFindUnique(async () => {
    throw new Error("connection lost");
  });
  try {
    await assert.doesNotReject(() => getCompanyForPrefillSafe("0300588569"));
    assert.equal(await getCompanyForPrefillSafe("0300588569"), null);
  } finally {
    restoreFindUnique();
  }
});

test("MST with an APPROVED removal request -> null even when not isHidden", async () => {
  stubFindUnique(async () => ({ name: "Công ty A", address: "123 Đường A", isHidden: false }));
  stubRemovalFindFirst(async () => ({ id: "rr1" }));
  try {
    assert.equal(await getCompanyForPrefillSafe("0300588569"), null);
  } finally {
    restoreFindUnique();
    restoreRemovalFindFirst();
  }
});

test("MST with only a PENDING removal request -> still visible (prevents abuse)", async () => {
  stubFindUnique(async () => ({ name: "Công ty A", address: "123 Đường A", isHidden: false }));
  // findFirst is queried with status: "APPROVED" only, so a PENDING-only request never matches.
  stubRemovalFindFirst(async () => null);
  try {
    assert.deepEqual(await getCompanyForPrefillSafe("0300588569"), { name: "Công ty A", address: "123 Đường A" });
  } finally {
    restoreFindUnique();
    restoreRemovalFindFirst();
  }
});

test("findCompanyForLookup: APPROVED removal request -> null", async () => {
  stubFindUnique(async () => ({ name: "Công ty A", isHidden: false, enrichStatus: "OK" }));
  stubRemovalFindFirst(async () => ({ id: "rr1" }));
  try {
    assert.equal(await findCompanyForLookup("0300588569"), null);
  } finally {
    restoreFindUnique();
    restoreRemovalFindFirst();
  }
});
