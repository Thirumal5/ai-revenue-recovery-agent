"use strict";
/**
 * Phase 8 Component — Autonomous Observation Service
 *
 * Inspects post-execution case state, interprets system outcome, records
 * audit observation logs, and determines whether recovery continuation is required.
 *
 * Deterministic Rules Enforced:
 * Rule 1: Verified Payment Success → Status RECOVERED, shouldContinue = false
 * Rule 2: Technical Tool Failure → Outcome ACTION_FAILED, shouldContinue = false (no false recovery)
 * Rule 3: Unresolved Open Case → Outcome STILL_OPEN, shouldContinue = true
 * Rule 4: Attempt Limit Reached → Outcome MAX_ATTEMPTS_REACHED, recommend ESCALATE_TO_HUMAN / CLOSE_NO_ACTION
 * Rule 5: Terminal Case → Outcome TERMINAL, shouldContinue = false
 * Rule 6: Cooldown Active → Outcome WAITING, shouldContinue = false
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.observeCaseOutcome = observeCaseOutcome;
const prisma_1 = require("../lib/prisma");
const allowedActions_1 = require("./allowedActions");
const TERMINAL_STATUSES = ['RECOVERED', 'CLOSED_NO_RECOVERY', 'ESCALATED'];
async function observeCaseOutcome(caseId) {
    const caseRecord = await prisma_1.prisma.recoveryCase.findUnique({
        where: { id: caseId },
        include: {
            actions: {
                orderBy: { timestamp: 'desc' },
                take: 10,
            },
        },
    });
    if (!caseRecord) {
        return {
            outcome: 'TERMINAL',
            reason: `Case ${caseId} not found`,
            shouldContinue: false,
            recommendedNextStep: 'NONE',
        };
    }
    // Find the most recent tool execution action
    const lastToolAction = caseRecord.actions.find((a) => a.actionType === 'TOOL_EXECUTED');
    let prevActionName;
    let lastToolFailed = false;
    if (lastToolAction?.metadata) {
        try {
            const parsed = JSON.parse(lastToolAction.metadata);
            prevActionName = parsed.action || parsed.result?.tool;
            if (lastToolAction.status === 'FAILED' || parsed.result?.success === false) {
                lastToolFailed = true;
            }
        }
        catch {
            prevActionName = lastToolAction.actionType;
        }
    }
    let result;
    // RULE 5: Terminal Case Protection
    if (TERMINAL_STATUSES.includes(caseRecord.status)) {
        result = {
            outcome: caseRecord.status === 'RECOVERED' ? 'RECOVERED' : 'TERMINAL',
            reason: `Case is in terminal state (${caseRecord.status}). Continuation stopped.`,
            shouldContinue: false,
            recommendedNextStep: 'NONE',
            previousAction: prevActionName,
        };
    }
    // RULE 2: Tool Failure Check
    else if (lastToolFailed) {
        result = {
            outcome: 'ACTION_FAILED',
            reason: `Previous tool execution (${prevActionName || 'tool'}) failed technically. Recovery not credited.`,
            shouldContinue: false,
            recommendedNextStep: 'WAIT',
            previousAction: prevActionName,
        };
    }
    // RULE 6: Contact Cooldown Protection
    else if (caseRecord.lastContactedAt) {
        const cooldownMs = parseInt(process.env.COOLDOWN_MS || '120000', 10);
        const elapsed = Date.now() - new Date(caseRecord.lastContactedAt).getTime();
        if (elapsed < cooldownMs) {
            const remainingSec = Math.ceil((cooldownMs - elapsed) / 1000);
            result = {
                outcome: 'WAITING',
                reason: `Contact cooldown active (${remainingSec}s remaining). Waiting before next attempt.`,
                shouldContinue: false,
                recommendedNextStep: 'WAIT',
                previousAction: prevActionName,
            };
        }
        else {
            // Cooldown elapsed, check allowed actions policy
            const allowed = (0, allowedActions_1.getAllowedActions)(caseRecord.type, caseRecord.attemptCount);
            const isMaxAttempts = allowed.every((act) => act === 'ESCALATE_TO_HUMAN' || act === 'CLOSE_NO_ACTION');
            if (isMaxAttempts) {
                // RULE 4: Attempt Limit Reached
                result = {
                    outcome: 'MAX_ATTEMPTS_REACHED',
                    reason: `Maximum customer contact attempts (${caseRecord.attemptCount}) reached. Next action must escalate or close.`,
                    shouldContinue: true,
                    recommendedNextStep: allowed[0] === 'CLOSE_NO_ACTION' ? 'CLOSE_NO_ACTION' : 'ESCALATE_TO_HUMAN',
                    previousAction: prevActionName,
                };
            }
            else {
                // RULE 3: Still Unresolved / Open
                result = {
                    outcome: 'STILL_OPEN',
                    reason: `Case remains open after previous action. Eligible for policy-based retry attempt.`,
                    shouldContinue: true,
                    recommendedNextStep: 'RETRY_RECOVERY',
                    previousAction: prevActionName,
                };
            }
        }
    }
    // Fresh OPEN case with no contact yet
    else {
        const allowed = (0, allowedActions_1.getAllowedActions)(caseRecord.type, caseRecord.attemptCount);
        const isMaxAttempts = allowed.every((act) => act === 'ESCALATE_TO_HUMAN' || act === 'CLOSE_NO_ACTION');
        if (isMaxAttempts) {
            result = {
                outcome: 'MAX_ATTEMPTS_REACHED',
                reason: `Case reached policy limits. Recommended next step: ${allowed[0]}.`,
                shouldContinue: true,
                recommendedNextStep: allowed[0] === 'CLOSE_NO_ACTION' ? 'CLOSE_NO_ACTION' : 'ESCALATE_TO_HUMAN',
                previousAction: prevActionName,
            };
        }
        else {
            result = {
                outcome: 'STILL_OPEN',
                reason: `Initial open case observed. Ready for autonomous recovery execution.`,
                shouldContinue: true,
                recommendedNextStep: 'RETRY_RECOVERY',
                previousAction: prevActionName,
            };
        }
    }
    // Update RecoveryCase model with observation outcome & timestamp
    await prisma_1.prisma.recoveryCase.update({
        where: { id: caseId },
        data: {
            lastObservedAt: new Date(),
            observationOutcome: result.outcome,
        },
    });
    // Log AgentAction audit row for Observation
    await prisma_1.prisma.agentAction.create({
        data: {
            caseId,
            actionType: 'OBSERVATION',
            aiReasoning: result.reason,
            status: 'SUCCESS',
            metadata: JSON.stringify({
                outcome: result.outcome,
                reason: result.reason,
                shouldContinue: result.shouldContinue,
                recommendedNextStep: result.recommendedNextStep,
                previousAction: prevActionName || null,
                observedAt: new Date().toISOString(),
            }),
        },
    });
    console.log(`👁️ Observation: [${result.outcome}] — ${result.reason}`);
    return result;
}
