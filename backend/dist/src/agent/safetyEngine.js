"use strict";
/**
 * Step 5 — Safety / Rules Engine (Pure TypeScript, NO AI)
 *
 * Deterministic safety checks that run AFTER the AI makes a decision but
 * BEFORE any tool is executed. This is the last line of defense.
 *
 * Checks are run in strict order — first failing check wins.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSafetyRules = checkSafetyRules;
const CONTACT_ACTIONS = [
    'SEND_PAYMENT_LINK',
    'SEND_CARD_UPDATE_REMINDER',
    'SEND_REMINDER',
    'SUGGEST_ALTERNATIVE_PAYMENT',
];
const TERMINAL_STATUSES = ['RECOVERED', 'CLOSED_NO_RECOVERY', 'ESCALATED'];
const MAX_CONTACT_ATTEMPTS = {
    payment_failure: 3,
    subscription_failure: 3,
    checkout_abandonment: 2,
    invoice_overdue: 3,
};
function checkSafetyRules(caseRecord, aiDecision, allowedActions) {
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
    // 4. Attempt Limit Safety Check (Applies ONLY to customer-contact actions)
    if (CONTACT_ACTIONS.includes(aiDecision.chosen_action) && caseRecord.attemptCount !== undefined && caseRecord.type) {
        const maxAllowed = MAX_CONTACT_ATTEMPTS[caseRecord.type] || 3;
        if (caseRecord.attemptCount >= maxAllowed) {
            return { approved: false, reason: `maximum attempt limit reached (${caseRecord.attemptCount}/${maxAllowed})` };
        }
    }
    // 5. Terminal Status Check
    if (TERMINAL_STATUSES.includes(caseRecord.status)) {
        return { approved: false, reason: 'case already resolved' };
    }
    // All checks passed
    return { approved: true, reason: 'all checks passed' };
}
