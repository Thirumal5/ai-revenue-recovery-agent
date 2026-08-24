"use strict";
/**
 * TOOL: closeCaseNoAction — 🟢 REAL EXECUTION (Internal State Change)
 *
 * Updates the recovery case status to "CLOSED_NO_RECOVERY" in the database.
 * This is a real, permanent state change — the case is closed without any
 * recovery action being taken (e.g., abandoned checkout that's too old).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeCaseNoAction = closeCaseNoAction;
const prisma_1 = require("../../lib/prisma");
async function closeCaseNoAction(caseRecord) {
    await prisma_1.prisma.recoveryCase.update({
        where: { id: caseRecord.id },
        data: { status: 'CLOSED_NO_RECOVERY' },
    });
    console.log(`🔒 Case ${caseRecord.id} CLOSED — no recovery action taken`);
    return {
        success: true,
        newStatus: 'CLOSED_NO_RECOVERY',
    };
}
