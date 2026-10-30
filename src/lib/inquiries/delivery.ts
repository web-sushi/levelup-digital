import type { DeliveryResult, InquiryDelivery } from "@/lib/inquiries/types";

/**
 * Production delivery boundary.
 * Brevo is the planned provider. This adapter does not call Brevo,
 * send mail, or persist the inquiry.
 */
export class UnavailableInquiryDelivery implements InquiryDelivery {
  async deliver(): Promise<DeliveryResult> {
    return { status: "unavailable" };
  }
}
