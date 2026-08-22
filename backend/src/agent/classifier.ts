/**
 * Step 1 — Failure Sub-Reason Classifier (Pure TypeScript, NO AI)
 *
 * Maps the raw riskReason text from the webhook payload into a standardized
 * sub-reason category. This is NOT the case type — it's the specific reason
 * within a case type (e.g., "insufficient_funds" within "payment_failure").
 *
 * Output is stored in the `subReason` field on RecoveryCase.
 */

export function classifyFailureReason(riskReason: string): string {
  const lower = riskReason.toLowerCase();

  // Insufficient funds
  if (lower.includes('insufficient') || lower.includes('funds')) {
    return 'insufficient_funds';
  }

  // Card expired
  if (lower.includes('expired') || lower.includes('expir')) {
    return 'card_expired';
  }

  // UPI cap / limit exceeded
  if (lower.includes('upi') && (lower.includes('cap') || lower.includes('limit') || lower.includes('exceeded'))) {
    return 'upi_cap_exceeded';
  }

  return 'unknown_reason';
}
