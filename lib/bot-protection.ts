/**
 * Bot protection utilities
 * - Honeypot: hidden field that bots fill out
 * - Timestamp: reject submissions faster than human typing speed
 */

const MIN_SUBMISSION_TIME_MS = 3000; // 3 seconds minimum

export interface BotProtectionFields {
  website?: string;      // Honeypot field - should be empty
  _formLoadedAt?: number; // Timestamp when form was loaded
}

export interface BotCheckResult {
  isBot: boolean;
  reason?: 'honeypot' | 'too_fast';
}

/**
 * Check if the submission appears to be from a bot
 */
export function checkBotSubmission(fields: BotProtectionFields): BotCheckResult {
  // Check honeypot - if filled, it's a bot
  if (fields.website && fields.website.trim().length > 0) {
    return { isBot: true, reason: 'honeypot' };
  }

  // Check timestamp - if submitted too fast, it's a bot
  if (fields._formLoadedAt) {
    const submissionTime = Date.now() - fields._formLoadedAt;
    if (submissionTime < MIN_SUBMISSION_TIME_MS) {
      return { isBot: true, reason: 'too_fast' };
    }
  }

  return { isBot: false };
}

/**
 * Generate a fake success response to trick bots
 * Returns different fake responses based on the type of form
 */
export function getFakeSuccessResponse(formType: 'booking' | 'signup' | 'contact') {
  switch (formType) {
    case 'booking':
      return {
        id: `fake_${Date.now().toString(36)}`,
        status: 'confirmed',
        message: 'Booking confirmed',
      };
    case 'signup':
      return {
        success: true,
        redirectUrl: '/dashboard',
        message: 'Account created',
      };
    case 'contact':
      return {
        success: true,
        message: 'Message sent',
      };
  }
}
