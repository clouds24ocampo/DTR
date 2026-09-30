import Counter from "src/models/global/counter.model";
import UserModel from "src/models/workforce/user.model";

export const ID_NUMBER_PREFIX = "QC";

/** QC-2026-0001 style. Sequence is per calendar year and allocated atomically. */
export function formatEmployeeIdNumber(year: number, seq: number): string {
  return `${ID_NUMBER_PREFIX}-${year}-${String(seq).padStart(4, "0")}`;
}

function httpError(message: string, status: number): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}

/** Atomically allocate the next sequence for `key` and return it. */
async function nextSequence(key: string): Promise<number> {
  const doc = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return doc.seq;
}

/** Generate a collision-free ID number (retries if a legacy manual ID collides). */
export async function generateEmployeeIdNumber(): Promise<string> {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 5; attempt++) {
    const seq = await nextSequence(`employeeId:${year}`);
    const candidate = formatEmployeeIdNumber(year, seq);
    const exists = await UserModel.exists({ idNumber: candidate });
    if (!exists) return candidate;
  }
  throw httpError("Failed to generate a unique ID number, please retry.", 500);
}

/**
 * Auto-with-override resolver for employee creation.
 * - Blank/omitted → system generates (QC-YYYY-NNNN, sequential, atomic).
 * - Provided → normalized (trim + uppercase), format-checked, uniqueness-checked.
 */
export async function resolveEmployeeIdNumber(
  provided?: unknown
): Promise<string> {
  const raw = typeof provided === "string" ? provided.trim() : "";
  if (!raw) return generateEmployeeIdNumber();

  const normalized = raw.toUpperCase();
  if (!/^[A-Z0-9-]{3,24}$/.test(normalized)) {
    throw httpError(
      "ID number must be 3-24 characters (letters, numbers, dashes).",
      400
    );
  }
  const exists = await UserModel.exists({ idNumber: normalized });
  if (exists) {
    throw httpError(`ID number ${normalized} is already taken.`, 409);
  }
  return normalized;
}
