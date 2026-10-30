import { MAX_INQUIRY_BODY_BYTES } from "@/lib/inquiries/schema";

export type BodyReadResult =
  | { ok: true; text: string }
  | { ok: false; reason: "too-large" | "unreadable" };

function declaredLength(header: string | null) {
  if (header === null || !/^\d+$/.test(header)) {
    return null;
  }
  return Number(header);
}

export async function readLimitedBody(request: Request): Promise<BodyReadResult> {
  const declared = declaredLength(request.headers.get("content-length"));
  if (declared !== null && declared > MAX_INQUIRY_BODY_BYTES) {
    await request.body?.cancel().catch(() => undefined);
    return { ok: false, reason: "too-large" };
  }

  if (!request.body) {
    return { ok: false, reason: "unreadable" };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (!value) {
        continue;
      }
      total += value.byteLength;
      if (total > MAX_INQUIRY_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, reason: "too-large" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, reason: "unreadable" };
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(merged) };
  } catch {
    return { ok: false, reason: "unreadable" };
  }
}

export function parseJsonObject(text: string): { ok: true; value: Record<string, unknown> } | { ok: false } {
  if (!text.trim()) {
    return { ok: false };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false };
  }
  const prototype = Object.getPrototypeOf(parsed);
  if (prototype !== Object.prototype && prototype !== null) {
    return { ok: false };
  }
  return { ok: true, value: parsed as Record<string, unknown> };
}
