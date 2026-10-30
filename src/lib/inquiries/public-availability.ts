/**
 * The public contact page reads this value.
 * It stays false for this phase so a browser flag or a stray environment value
 * cannot reveal a working send button. A later activation phase can replace it
 * with the server runtime flag after Redis and Brevo are attached.
 */
export const publicInquirySubmissionsAvailable = false;
