/**
 * Referral code generation for the partner system.
 *
 * Codes are 8-character uppercase alphanumeric strings, designed to be
 * human-readable and easy to share verbally (no ambiguous chars like 0/O, 1/I/L).
 */

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // excludes 0, O, 1, I, L
const CODE_LENGTH = 8;

/**
 * Generate a random referral code. Uses crypto.getRandomValues for
 * uniform distribution across the alphabet.
 */
export function generateReferralCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

/**
 * Build a full referral URL from a referral code.
 *
 * requires: NEXT_PUBLIC_APP_URL (or defaults to wedflow.com)
 */
export function buildReferralUrl(referralCode: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://wedflow.com';
  return `${base}/join?ref=${referralCode}`;
}
