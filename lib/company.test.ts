import assert from "node:assert/strict";
import { test } from "node:test";
import { prisma } from "@/pipeline/db";
import { getCompanyForPrefillSafe } from "./company";

const originalFindUnique = prisma.company.findUnique.bind(prisma.company);

function stubFindUnique(impl: (...args: unknown[]) => unknown) {
  (prisma.company as unknown as { findUnique: unknown }).findUnique = impl;
}

function restoreFindUnique() {
  (prisma.company as unknown as { findUnique: unknown }).findUnique = originalFindUnique;
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
