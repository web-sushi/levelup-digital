import type { DeliveryResult, InquiryDelivery } from "@/lib/inquiries/types";

/**
 * Production delivery boundary for the public route.
 * BrevoInquiryDelivery is implemented separately and is not constructed here.
 * This adapter does not call Brevo, send mail, or persist the inquiry.
 */
export class UnavailableInquiryDelivery implements InquiryDelivery {
  async deliver(): Promise<DeliveryResult> {
    return { status: "unavailable" };
  }
}
