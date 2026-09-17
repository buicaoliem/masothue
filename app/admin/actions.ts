"use server";

import { revalidatePath } from "next/cache";
import {
  approveSubmission,
  createPlacement,
  getProfile,
  rejectSubmission,
  setLeadStatus,
  type LeadStatus,
  type PlacementInput,
  type Result,
} from "@/lib/directory";
import { approveRemoval, rejectRemoval } from "@/lib/removal";
import { assertAdmin } from "./guard";

export async function approveSubmissionAction(id: string): Promise<Result> {
  await assertAdmin();
  const r = await approveSubmission(id);
  revalidatePath("/admin");
  return r;
}

export async function rejectSubmissionAction(id: string, reason: string): Promise<Result> {
  await assertAdmin();
  const r = await rejectSubmission(id, reason);
  revalidatePath("/admin");
  return r;
}

export async function setLeadStatusAction(id: string, status: LeadStatus): Promise<Result> {
  await assertAdmin();
  const r = await setLeadStatus(id, status);
  revalidatePath("/admin");
  return r;
}

export type CreatePlacementResult = Result<{ id: string; noApprovedProfile: boolean }>;

/** Creates a placement; also flags (but never blocks on) an MST with no approved profile yet. */
export async function createPlacementAction(input: PlacementInput): Promise<CreatePlacementResult> {
  await assertAdmin();
  const r = await createPlacement(input);
  if (!r.ok) return r;
  const profile = await getProfile(input.mst);
  revalidatePath("/admin");
  return { ok: true, id: r.id, noApprovedProfile: profile === null };
}

export async function approveRemovalAction(id: string): Promise<Result> {
  await assertAdmin();
  const r = await approveRemoval(id);
  revalidatePath("/admin");
  if (r.ok && r.taxCode) revalidatePath(`/${r.taxCode}`);
  return r;
}

export async function rejectRemovalAction(id: string, reason: string): Promise<Result> {
  await assertAdmin();
  const r = await rejectRemoval(id, reason);
  revalidatePath("/admin");
  return r;
}
