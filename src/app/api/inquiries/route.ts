import { handleInquiryPost } from "@/lib/inquiries/handler";
import { errorResponse, messages } from "@/lib/inquiries/responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function methodNotAllowed() {
  return errorResponse(405, "METHOD_NOT_ALLOWED", messages.invalid);
}

export function GET() {
  return methodNotAllowed();
}

export function PUT() {
  return methodNotAllowed();
}

export function PATCH() {
  return methodNotAllowed();
}

export function DELETE() {
  return methodNotAllowed();
}

export function POST(request: Request) {
  return handleInquiryPost(request);
}
