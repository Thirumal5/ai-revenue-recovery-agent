"use strict";
/**
 * Component 7 — Centralized Tool Dispatcher & Registry
 *
 * Maps predefined action names chosen by the Groq LLM and approved by the Safety Engine
 * to their respective deterministic execution functions.
 *
 * Execution Order Boundary Enforced:
 * 1. Classifier → 2. Allowed Actions Policy → 3. Groq LLM → 4. Safety Engine → 5. Tool Dispatcher
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeTool = executeTool;
const sendPaymentLink_1 = require("./tools/sendPaymentLink");
const sendCardUpdateReminder_1 = require("./tools/sendCardUpdateReminder");
const sendReminder_1 = require("./tools/sendReminder");
const suggestAlternativePayment_1 = require("./tools/suggestAlternativePayment");
const escalateToHuman_1 = require("./tools/escalateToHuman");
const closeCaseNoAction_1 = require("./tools/closeCaseNoAction");
async function executeTool(chosenAction, caseRecord, customer, aiDecision) {
    console.log(`🛠️ Tool Dispatcher executing registered tool: "${chosenAction}"`);
    switch (chosenAction) {
        case 'SEND_PAYMENT_LINK': {
            const res = await (0, sendPaymentLink_1.sendPaymentLink)(caseRecord, customer);
            return {
                success: res.success,
                tool: 'SEND_PAYMENT_LINK',
                paymentLinkId: res.paymentLinkId,
                paymentLinkUrl: res.paymentLinkUrl,
                message: res.message || 'Razorpay test payment link created',
                error: res.error,
            };
        }
        case 'SEND_CARD_UPDATE_REMINDER': {
            const msg = aiDecision.customer_message || 'Please update your card details to continue your subscription.';
            const res = await (0, sendCardUpdateReminder_1.sendCardUpdateReminder)({ id: caseRecord.id }, msg);
            return {
                success: res.success,
                tool: 'SEND_CARD_UPDATE_REMINDER',
                message: res.messageContent,
            };
        }
        case 'SEND_REMINDER': {
            const msg = aiDecision.customer_message || 'This is a friendly reminder regarding your pending payment.';
            const res = await (0, sendReminder_1.sendReminder)({ id: caseRecord.id }, msg);
            return {
                success: res.success,
                tool: 'SEND_REMINDER',
                message: res.messageContent,
            };
        }
        case 'SUGGEST_ALTERNATIVE_PAYMENT': {
            const msg = aiDecision.customer_message ||
                'Your payment could not be completed with the current payment method. Please try another available payment method.';
            const res = await (0, suggestAlternativePayment_1.suggestAlternativePayment)({ id: caseRecord.id }, msg);
            return {
                success: res.success,
                tool: 'SUGGEST_ALTERNATIVE_PAYMENT',
                message: res.messageContent,
            };
        }
        case 'ESCALATE_TO_HUMAN': {
            const reason = aiDecision.reasoning || 'Escalated to human operator by recovery policy';
            const res = await (0, escalateToHuman_1.escalateToHuman)({ id: caseRecord.id }, reason);
            return {
                success: res.success,
                tool: 'ESCALATE_TO_HUMAN',
                newStatus: res.newStatus,
                message: `Case status updated to ${res.newStatus}`,
            };
        }
        case 'CLOSE_NO_ACTION': {
            const res = await (0, closeCaseNoAction_1.closeCaseNoAction)({ id: caseRecord.id });
            return {
                success: res.success,
                tool: 'CLOSE_NO_ACTION',
                newStatus: res.newStatus,
                message: `Case status updated to ${res.newStatus}`,
            };
        }
        default: {
            console.error(`❌ Unregistered or invalid action string: "${chosenAction}"`);
            return {
                success: false,
                tool: chosenAction,
                error: `Action "${chosenAction}" is not a registered internal tool`,
            };
        }
    }
}
