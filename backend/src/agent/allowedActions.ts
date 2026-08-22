/**
 * Step 2 — Allowed Actions Builder (Pure TypeScript, NO AI)
 *
 * This is the SAFETY BOUNDARY. The AI agent can only choose from the actions
 * returned by this function. It is deterministic and contains no AI logic.
 *
 * Uses the `type` field (clean category set at case creation time), NOT the
 * sub-reason from the classifier.
 */

export function getAllowedActions(caseType: string, attemptCount: number): string[] {
  switch (caseType) {
    case 'payment_failure':
      if (attemptCount <= 1) {
        return ['SEND_PAYMENT_LINK', 'ESCALATE_TO_HUMAN'];
      }
      return ['ESCALATE_TO_HUMAN'];

    case 'subscription_failure':
      if (attemptCount < 3) {
        return ['SEND_CARD_UPDATE_REMINDER', 'ESCALATE_TO_HUMAN'];
      }
      return ['ESCALATE_TO_HUMAN'];

    case 'checkout_abandonment':
      if (attemptCount < 2) {
        return ['SEND_REMINDER', 'CLOSE_NO_ACTION'];
      }
      return ['CLOSE_NO_ACTION'];

    case 'invoice_overdue':
      if (attemptCount < 3) {
        return ['SEND_REMINDER', 'ESCALATE_TO_HUMAN'];
      }
      return ['ESCALATE_TO_HUMAN'];

    default:
      // Unknown case type — always escalate
      return ['ESCALATE_TO_HUMAN'];
  }
}
