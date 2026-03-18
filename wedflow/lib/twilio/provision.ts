// requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
// IMPORTANT: Twilio trial accounts cannot provision numbers programmatically.
// A paid/upgraded Twilio account is required. Trial accounts will receive a
// 20003 error ("Account not active") from the Twilio API when attempting to
// purchase numbers.

import { getTwilioClient } from './client'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const WEBHOOK_URL = 'https://wedflow-theta.vercel.app/api/webhooks/twilio'

/**
 * Formats an E.164 phone number for display.
 * e.g. "+16135550123" → "+1 (613) 555-0123"
 */
export function formatPhoneNumber(e164: string): string {
  const digits = e164.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    const area = digits.slice(1, 4)
    const prefix = digits.slice(4, 7)
    const line = digits.slice(7)
    return `+1 (${area}) ${prefix}-${line}`
  }
  return e164
}

/**
 * Provisions a real Twilio Canadian local SMS number for the given couple:
 * 1. Searches for an available CA local number with SMS enabled
 * 2. Purchases it and sets the SMS webhook to the Wedflow inbound handler
 * 3. Inserts a row into phone_numbers linked to couple_id
 *
 * Returns the formatted phone number, e.g. "+1 (416) 555-0123".
 *
 * Throws if no numbers are available, if Twilio purchase fails, or if the
 * DB insert fails (includes the Twilio SID in the error for manual recovery).
 */
export async function provisionWeddingNumber(coupleId: string): Promise<string> {
  const client = getTwilioClient()
  const supabase = getSupabaseServerClient()

  // 1. Find an available Canadian local number with SMS capability
  const available = await client.availablePhoneNumbers('CA').local.list({
    limit: 1,
    smsEnabled: true,
  })

  if (!available.length) {
    throw new Error('No available Canadian phone numbers found. Please try again later.')
  }

  const candidateNumber = available[0].phoneNumber

  // 2. Purchase the number and point its SMS webhook at the Twilio inbound handler
  const purchased = await client.incomingPhoneNumbers.create({
    phoneNumber: candidateNumber,
    smsUrl: WEBHOOK_URL,
    smsMethod: 'POST',
  })

  // 3. Record in phone_numbers — include the SID in the error so the number
  //    can be released manually if the DB write fails after purchase.
  const { error } = await supabase.from('phone_numbers').insert({
    couple_id: coupleId,
    twilio_number: purchased.phoneNumber,
    status: 'active',
    activated_at: new Date().toISOString(),
  })

  if (error) {
    throw new Error(
      `Phone number purchased (Twilio SID: ${purchased.sid}) but failed to save: ${error.message}. ` +
        'Please contact support to complete setup.',
    )
  }

  return formatPhoneNumber(purchased.phoneNumber)
}
