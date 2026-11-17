/**
 * Owner-controlled source gate for the contact page and the public inquiry route.
 * The public page also requires the launch gate and INQUIRY_SUBMISSIONS_ENABLED=true.
 * The public route additionally requires a complete ready_for_launch_review configuration.
 * Environment variables cannot turn this constant on by themselves.
 */
export const publicInquirySubmissionsAvailable = true;
