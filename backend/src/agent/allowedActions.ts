/**
 * Step 2 — Allowed Actions Builder (Pure TypeScript, NO AI)
 *
 * This is the SAFETY BOUNDARY. The AI agent can only choose from the actions
 * returned by this function. It is deterministic and contains no AI logic.
 *
 * Provides rich multi-step recovery options before forcing terminal actions
 * (ESCALATE_TO_HUMAN or CLOSE_NO_ACTION).
 */

export function getAllowedActions(caseType: string, attemptCount: number): string[] {
  switch (caseType) {
    case 'payment_failure':
      if (attemptCount === 0) {
        return ['SEND_PAYMENT_LINK', 'SEND_REMINDER', 'SUGGEST_ALTERNATIVE_PAYMENT', 'ESCALATE_TO_HUMAN'];
      }
      if (attemptCount === 1) {
        return ['SEND_REMINDER', 'SUGGEST_ALTERNATIVE_PAYMENT', 'SEND_PAYMENT_LINK', 'ESCALATE_TO_HUMAN'];
      }
      if (attemptCount === 2) {
        return ['SUGGEST_ALTERNATIVE_PAYMENT', 'SEND_REMINDER', 'ESCALATE_TO_HUMAN'];
      }
      return ['ESCALATE_TO_HUMAN'];

    case 'subscription_failure':
      if (attemptCount === 0) {
        return ['SEND_CARD_UPDATE_REMINDER', 'SEND_PAYMENT_LINK', 'SUGGEST_ALTERNATIVE_PAYMENT', 'ESCALATE_TO_HUMAN'];
      }
      if (attemptCount === 1) {
        return ['SUGGEST_ALTERNATIVE_PAYMENT', 'SEND_REMINDER', 'SEND_PAYMENT_LINK', 'ESCALATE_TO_HUMAN'];
      }
      if (attemptCount === 2) {
        return ['SEND_REMINDER', 'SUGGEST_ALTERNATIVE_PAYMENT', 'ESCALATE_TO_HUMAN'];
      }
      return ['ESCALATE_TO_HUMAN'];

    case 'checkout_abandonment':
      if (attemptCount === 0) {
        return ['SEND_REMINDER', 'SEND_PAYMENT_LINK', 'CLOSE_NO_ACTION'];
      }
      if (attemptCount === 1) {
        return ['SEND_PAYMENT_LINK', 'SEND_REMINDER', 'CLOSE_NO_ACTION'];
      }
      return ['CLOSE_NO_ACTION'];

    case 'invoice_overdue':
      if (attemptCount === 0) {
        return ['SEND_REMINDER', 'SEND_PAYMENT_LINK', 'SUGGEST_ALTERNATIVE_PAYMENT', 'ESCALATE_TO_HUMAN'];
      }
      if (attemptCount === 1) {
        return ['SEND_PAYMENT_LINK', 'SUGGEST_ALTERNATIVE_PAYMENT', 'SEND_REMINDER', 'ESCALATE_TO_HUMAN'];
      }
      if (attemptCount === 2) {
        return ['SEND_REMINDER', 'SUGGEST_ALTERNATIVE_PAYMENT', 'ESCALATE_TO_HUMAN'];
      }
      return ['ESCALATE_TO_HUMAN'];

    default:
      // Unknown case type — always escalate
      return ['ESCALATE_TO_HUMAN'];
  }
}
