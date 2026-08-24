"use strict";
/**
 * TOOL: escalateToHuman — 🟢 REAL EXECUTION (Internal State Change)
 *
 * Updates the recovery case status to "ESCALATED" in the database.
 * This is a real, permanent state change — the case is marked as requiring
 * human intervention and will not be auto-processed again.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.escalateToHuman = escalateToHuman;
const prisma_1 = require("../../lib/prisma");
async function escalateToHuman(caseRecord, reason) {
    await prisma_1.prisma.recoveryCase.update({
        where: { id: caseRecord.id },
        data: { status: 'ESCALATED' },
    });
    console.log(`🚨 Case ${caseRecord.id} ESCALATED to human: ${reason}`);
    return {
        success: true,
        newStatus: 'ESCALATED',
    };
}
