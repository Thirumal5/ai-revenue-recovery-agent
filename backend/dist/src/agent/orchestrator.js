"use strict";
/**
 * Step 6 — Orchestrator
 *
 * processCase(caseId) is the main entry point that runs an OPEN recovery case
 * through the full agent pipeline:
 *
 * 1. Fetch case → 2. Terminal check & Lock → 3. Classify sub-reason → 4. Get allowed actions
 * → 5. Ask Groq (with observation history) → 6. Safety check → 7. Execute tool via Dispatcher
 * → 8. Update counters (on success) → 9. Run Observation Service → 10. Unlock (finally)
 *
 * Uses try/finally to guarantee the lock is always released.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.processCase = processCase;
const prisma_1 = require("../lib/prisma");
const classifier_1 = require("./classifier");
const allowedActions_1 = require("./allowedActions");
const groqDecisionService_1 = require("./groqDecisionService");
const safetyEngine_1 = require("./safetyEngine");
const toolDispatcher_1 = require("./toolDispatcher");
const observationService_1 = require("./observationService");
// Terminal actions — don't increment attemptCount or set lastContactedAt
const TERMINAL_ACTIONS = ['ESCALATE_TO_HUMAN', 'CLOSE_NO_ACTION'];
const TERMINAL_STATUSES = ['RECOVERED', 'CLOSED_NO_RECOVERY', 'ESCALATED'];
async function processCase(caseId) {
    const steps = [];
    // 1. Fetch case record
    const caseRecord = await prisma_1.prisma.recoveryCase.findUnique({
        where: { id: caseId },
        include: { customer: true, actions: true },
    });
    if (!caseRecord) {
        return {
            caseId,
            success: false,
            steps: [],
            finalStatus: 'NOT_FOUND',
            error: `Case ${caseId} not found`,
        };
    }
    if (!caseRecord.customer) {
        return {
            caseId,
            success: false,
            steps: [],
            finalStatus: caseRecord.status,
            error: `Case ${caseId} has no associated customer`,
        };
    }
    // Early Check: Terminal Status Protection
    if (TERMINAL_STATUSES.includes(caseRecord.status)) {
        return {
            caseId,
            success: false,
            steps: [],
            finalStatus: caseRecord.status,
            error: `Case ${caseId} is already in a terminal state (${caseRecord.status})`,
        };
    }
    // Atomic Lock Acquisition (Prevents concurrent processing by multiple workers)
    const lockResult = await prisma_1.prisma.recoveryCase.updateMany({
        where: {
            id: caseId,
            lockedForProcessing: false,
            status: 'OPEN',
        },
        data: {
            lockedForProcessing: true,
        },
    });
    if (lockResult.count === 0) {
        const currentCase = await prisma_1.prisma.recoveryCase.findUnique({ where: { id: caseId } });
        return {
            caseId,
            success: false,
            steps: [],
            finalStatus: currentCase?.status || 'UNKNOWN',
            error: currentCase?.lockedForProcessing
                ? `Case ${caseId} is currently locked for processing by another worker`
                : `Case ${caseId} cannot be processed (status: ${currentCase?.status})`,
        };
    }
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║   🧠 AI AGENT PROCESSING CASE            ║');
    console.log(`║   Case ID: ${caseId.slice(0, 8)}...       ║`);
    console.log('╚══════════════════════════════════════════╝');
    try {
        // 3. Classify sub-reason if not already done
        let subReason = caseRecord.subReason;
        if (!subReason) {
            subReason = (0, classifier_1.classifyFailureReason)(caseRecord.riskReason);
            await prisma_1.prisma.recoveryCase.update({
                where: { id: caseId },
                data: { subReason },
            });
            await prisma_1.prisma.agentAction.create({
                data: {
                    caseId,
                    actionType: 'EVENT_CLASSIFIED',
                    aiReasoning: `Classified "${caseRecord.riskReason}" as sub-reason: ${subReason}`,
                    status: 'SUCCESS',
                    metadata: JSON.stringify({
                        rawReason: caseRecord.riskReason,
                        classifiedSubReason: subReason,
                    }),
                },
            });
            steps.push({
                step: 'classify',
                result: { rawReason: caseRecord.riskReason, subReason },
                timestamp: new Date().toISOString(),
            });
            console.log(`📋 Classified: "${caseRecord.riskReason}" → ${subReason}`);
        }
        else {
            steps.push({
                step: 'classify',
                result: { skipped: true, rawReason: caseRecord.riskReason, subReason },
                timestamp: new Date().toISOString(),
            });
            console.log(`📋 Already classified: "${caseRecord.riskReason}" → ${subReason} (skipped)`);
        }
        // 4. Get allowed actions
        const allowedActions = (0, allowedActions_1.getAllowedActions)(caseRecord.type, caseRecord.attemptCount);
        steps.push({
            step: 'allowed_actions',
            result: { caseType: caseRecord.type, attemptCount: caseRecord.attemptCount, allowedActions },
            timestamp: new Date().toISOString(),
        });
        console.log(`🔒 Allowed actions: ${JSON.stringify(allowedActions)}`);
        // 5. Call Groq AI for decision (including previous observation outcome)
        const daysSinceFirstEvent = Math.floor((Date.now() - new Date(caseRecord.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        const priorActionsSummary = caseRecord.actions.length > 0
            ? caseRecord.actions
                .filter(a => a.actionType === 'TOOL_EXECUTED' || a.actionType === 'OBSERVATION')
                .map(a => `${a.actionType}: ${a.aiReasoning}`)
                .join('; ') || 'No prior tool executions'
            : 'No prior actions';
        const context = {
            caseType: caseRecord.type,
            subReason: subReason,
            amount: caseRecord.amount,
            attemptCount: caseRecord.attemptCount,
            daysSinceFirstEvent,
            priorActionsSummary,
            promiseStatus: 'none',
            allowedActions,
            previousObservation: caseRecord.observationOutcome || undefined,
        };
        const aiDecision = await (0, groqDecisionService_1.decideRecoveryAction)(context);
        await prisma_1.prisma.agentAction.create({
            data: {
                caseId,
                actionType: 'AI_DECISION',
                aiReasoning: aiDecision.reasoning,
                status: 'SUCCESS',
                metadata: JSON.stringify({
                    chosen_action: aiDecision.chosen_action,
                    confidence: aiDecision.confidence,
                    customer_message: aiDecision.customer_message,
                    context_sent: context,
                }),
            },
        });
        steps.push({
            step: 'ai_decision',
            result: aiDecision,
            timestamp: new Date().toISOString(),
        });
        // 6. Safety check
        const safetyVerdict = (0, safetyEngine_1.checkSafetyRules)({
            lockedForProcessing: false, // Lock acquired at step 2
            lastContactedAt: caseRecord.lastContactedAt,
            status: caseRecord.status,
            attemptCount: caseRecord.attemptCount,
            type: caseRecord.type,
        }, aiDecision, allowedActions);
        await prisma_1.prisma.agentAction.create({
            data: {
                caseId,
                actionType: 'SAFETY_CHECK',
                aiReasoning: safetyVerdict.reason,
                status: safetyVerdict.approved ? 'SUCCESS' : 'BLOCKED',
                metadata: JSON.stringify({
                    approved: safetyVerdict.approved,
                    reason: safetyVerdict.reason,
                    checkedAction: aiDecision.chosen_action,
                }),
            },
        });
        steps.push({
            step: 'safety_check',
            result: safetyVerdict,
            timestamp: new Date().toISOString(),
        });
        console.log(`🛡️ Safety: ${safetyVerdict.approved ? '✅ APPROVED' : `❌ BLOCKED — ${safetyVerdict.reason}`}`);
        // 7. Execute tool via Centralized Dispatcher (ONLY if safety approved)
        if (!safetyVerdict.approved) {
            console.log('⏸️ Tool execution skipped — safety check blocked');
            // Still run observation to log safety blocked status
            const obsResult = await (0, observationService_1.observeCaseOutcome)(caseId);
            steps.push({
                step: 'observation',
                result: obsResult,
                timestamp: new Date().toISOString(),
            });
            return {
                caseId,
                success: false,
                steps,
                finalStatus: caseRecord.status,
                error: `Safety blocked: ${safetyVerdict.reason}`,
            };
        }
        const toolResult = await (0, toolDispatcher_1.executeTool)(aiDecision.chosen_action, {
            id: caseRecord.id,
            amount: caseRecord.amount,
            razorpayPaymentLinkId: caseRecord.razorpayPaymentLinkId,
        }, {
            name: caseRecord.customer.name,
            email: caseRecord.customer.email,
        }, aiDecision);
        // Log the tool execution in AgentAction
        await prisma_1.prisma.agentAction.create({
            data: {
                caseId,
                actionType: 'TOOL_EXECUTED',
                aiReasoning: `Executed ${toolResult.tool}: ${toolResult.success ? 'succeeded' : 'failed'}`,
                status: toolResult.success ? 'SUCCESS' : 'FAILED',
                metadata: JSON.stringify({
                    action: toolResult.tool,
                    result: toolResult,
                }),
            },
        });
        steps.push({
            step: 'tool_executed',
            result: toolResult,
            timestamp: new Date().toISOString(),
        });
        // 8. Update counters ONLY on successful tool execution for non-terminal actions
        if (!TERMINAL_ACTIONS.includes(aiDecision.chosen_action) && toolResult.success) {
            await prisma_1.prisma.recoveryCase.update({
                where: { id: caseId },
                data: {
                    attemptCount: { increment: 1 },
                    lastContactedAt: new Date(),
                },
            });
        }
        // 9. Phase 8: Autonomous Observation Loop
        const observationResult = await (0, observationService_1.observeCaseOutcome)(caseId);
        steps.push({
            step: 'observation',
            result: observationResult,
            timestamp: new Date().toISOString(),
        });
        // Fetch the final case state
        const finalCase = await prisma_1.prisma.recoveryCase.findUnique({
            where: { id: caseId },
        });
        console.log('╔══════════════════════════════════════════╗');
        console.log('║   ✅ AGENT PROCESSING COMPLETE            ║');
        console.log(`║   Final Status: ${finalCase?.status || 'unknown'}                    `);
        console.log('╚══════════════════════════════════════════╝\n');
        return {
            caseId,
            success: toolResult.success,
            steps,
            finalStatus: finalCase?.status || caseRecord.status,
            error: toolResult.success ? undefined : toolResult.error,
        };
    }
    finally {
        // 10. ALWAYS unlock the case in finally block
        await prisma_1.prisma.recoveryCase.update({
            where: { id: caseId },
            data: { lockedForProcessing: false },
        }).catch((err) => {
            console.error(`⚠️ Failed to unlock case ${caseId}:`, err.message);
        });
    }
}
