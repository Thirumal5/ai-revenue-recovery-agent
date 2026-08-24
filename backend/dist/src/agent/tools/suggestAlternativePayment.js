"use strict";
/**
 * Controlled Tool — Suggest Alternative Payment Method
 *
 * SIMULATED COMMUNICATION TOOL.
 * Sends a notification advising the customer to try an alternative payment method
 * (e.g. UPI, Netbanking, or another Credit/Debit card) when the current payment method fails.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.suggestAlternativePayment = suggestAlternativePayment;
const prisma_1 = require("../../lib/prisma");
async function suggestAlternativePayment(caseRecord, customMessage) {
    const messageContent = customMessage ||
        'Your payment could not be completed with the current payment method. You can try using an alternative payment method (e.g., UPI, Netbanking, or another card) to complete your transaction.';
    console.log(`💡 [SIMULATED] Alternative payment suggestion logged for case ${caseRecord.id}`);
    await prisma_1.prisma.agentAction.create({
        data: {
            caseId: caseRecord.id,
            actionType: 'TOOL_EXECUTED',
            aiReasoning: 'Sent alternative payment method suggestion to customer',
            status: 'SUCCESS',
            metadata: JSON.stringify({
                tool: 'SUGGEST_ALTERNATIVE_PAYMENT',
                isSimulated: true,
                channel: 'SIMULATED_NOTIFICATION',
                messageContent,
            }),
        },
    });
    return {
        success: true,
        messageContent,
        simulatedChannel: 'SIMULATED_NOTIFICATION',
    };
}
