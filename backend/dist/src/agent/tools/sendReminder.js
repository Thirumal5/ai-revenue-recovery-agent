"use strict";
/**
 * TOOL: sendReminder — 🟡 SIMULATED EXECUTION
 *
 * Does NOT call any real email/SMS/WhatsApp API.
 * Actually runs the function, writes a log row with the full message content
 * stored in the database — not a no-op. The message is "sent" only in
 * simulation; the content and intent are real and logged.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendReminder = sendReminder;
const prisma_1 = require("../../lib/prisma");
async function sendReminder(caseRecord, messageText) {
    // Log the simulated action to the database
    await prisma_1.prisma.agentAction.create({
        data: {
            caseId: caseRecord.id,
            actionType: 'SEND_REMINDER',
            aiReasoning: 'Reminder sent (simulated delivery)',
            status: 'SUCCESS',
            metadata: JSON.stringify({
                simulated: true,
                channel: 'email',
                messageContent: messageText,
                sentAt: new Date().toISOString(),
            }),
        },
    });
    console.log(`📧 [SIMULATED] Reminder logged for case ${caseRecord.id}`);
    return {
        success: true,
        simulated: true,
        messageContent: messageText,
    };
}
