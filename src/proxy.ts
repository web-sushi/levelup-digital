import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { temporaryHostRobotsTag } from "@/lib/preview-indexing";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const tag = temporaryHostRobotsTag(request.headers.get("host"));
  if (tag) {
    response.headers.set("X-Robots-Tag", tag);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpe?g|webp|gif|svg|ico|woff2?)$).*)"],
};
