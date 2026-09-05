/**
 * Step 5 — Safety / Rules Engine (Pure TypeScript, NO AI)
 *
 * Deterministic safety checks that run AFTER the AI makes a decision but
 * BEFORE any tool is executed. This is the last line of defense.
 *
 * Checks are run in strict order — first failing check wins.
 */

export interface SafetyVerdict {
  approved: boolean;
  reason: string;
}

interface CaseForSafety {
  lockedForProcessing: boolean;
  lastContactedAt: Date | null;
  status: string;
  attemptCount?: number;
  type?: string;
  promiseToPayAt?: Date | null;
  promiseToPayStatus?: string | null;
  customer?: {
    emailOptOut?: boolean;
    smsOptOut?: boolean;
    whatsappOptOut?: boolean;
  };
}

interface DecisionForSafety {
  chosen_action: string;
}


const CONTACT_ACTIONS = [
  'SEND_PAYMENT_LINK',
  'SEND_CARD_UPDATE_REMINDER',
  'SEND_REMINDER',
  'SUGGEST_ALTERNATIVE_PAYMENT',
];

const TERMINAL_STATUSES = ['RECOVERED', 'CLOSED_NO_RECOVERY', 'ESCALATED'];

const MAX_CONTACT_ATTEMPTS: Record<string, number> = {
  payment_failure: 3,
  subscription_failure: 3,
  checkout_abandonment: 2,
  invoice_overdue: 3,
};

export function checkSafetyRules(
  caseRecord: CaseForSafety,
  aiDecision: DecisionForSafety,
  allowedActions: string[]
): SafetyVerdict {
  // 1. Processing Lock Check
  if (caseRecord.lockedForProcessing) {
    return { approved: false, reason: 'already processing' };
  }

  // 2. Allowed Actions Boundary Check
  if (!allowedActions.includes(aiDecision.chosen_action)) {
    return { approved: false, reason: 'action not in allowed list' };
  }

  // 3. Customer Contact Cooldown Check (Applies ONLY to customer-contact actions)
  if (CONTACT_ACTIONS.includes(aiDecision.chosen_action) && caseRecord.lastContactedAt) {
    const rawCooldown = process.env.COOLDOWN_MS;
    const cooldownMs = rawCooldown && !isNaN(Number(rawCooldown)) ? Number(rawCooldown) : 86400000;
    const elapsedMs = Date.now() - new Date(caseRecord.lastContactedAt).getTime();
    if (elapsedMs < cooldownMs) {
      const remainingSec = Math.ceil((cooldownMs - elapsedMs) / 1000);
      return { approved: false, reason: `cooldown not elapsed (${remainingSec}s remaining)` };
    }
  }

  // 4. Promise to Pay Cooldown Protection (Applies ONLY to customer-contact actions)
  if (CONTACT_ACTIONS.includes(aiDecision.chosen_action) && caseRecord.promiseToPayStatus === 'PROMISED' && caseRecord.promiseToPayAt) {
    const promiseDate = new Date(caseRecord.promiseToPayAt);
    if (promiseDate.getTime() > Date.now()) {
      const remainingHours = Math.ceil((promiseDate.getTime() - Date.now()) / (1000 * 60 * 60));
      return { approved: false, reason: `active customer promise-to-pay in place (${remainingHours}h remaining until promised date)` };
    }
  }

  // 5. Attempt Limit Safety Check (Applies ONLY to customer-contact actions)
  if (CONTACT_ACTIONS.includes(aiDecision.chosen_action) && caseRecord.attemptCount !== undefined && caseRecord.type) {
    const maxAllowed = MAX_CONTACT_ATTEMPTS[caseRecord.type] || 3;
    if (caseRecord.attemptCount >= maxAllowed) {
      return { approved: false, reason: `maximum attempt limit reached (${caseRecord.attemptCount}/${maxAllowed})` };
    }
  }

  // 6. Terminal Status Check
  if (TERMINAL_STATUSES.includes(caseRecord.status)) {
    return { approved: false, reason: 'case already resolved' };
  }

  // 7. Customer Opt-Out Safety Check
  if (CONTACT_ACTIONS.includes(aiDecision.chosen_action) && caseRecord.customer) {
    if (caseRecord.customer.emailOptOut) {
      return { approved: false, reason: 'customer has opted out of email communications' };
    }
    if (caseRecord.customer.emailOptOut && caseRecord.customer.smsOptOut && caseRecord.customer.whatsappOptOut) {
      return { approved: false, reason: 'customer has opted out of all communication channels' };
    }
  }

  // All checks passed
  return { approved: true, reason: 'all checks passed' };
}

