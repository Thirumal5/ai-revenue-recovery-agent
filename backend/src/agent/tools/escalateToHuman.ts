/**
 * TOOL: escalateToHuman — 🟢 REAL EXECUTION (Internal State Change)
 *
 * Updates the recovery case status to "ESCALATED" in the database.
 * This is a real, permanent state change — the case is marked as requiring
 * human intervention and will not be auto-processed again.
 */

import { prisma } from '../../lib/prisma';

interface EscalateResult {
  success: boolean;
  newStatus: string;
}

export async function escalateToHuman(
  caseRecord: { id: string },
  reason: string
): Promise<EscalateResult> {
  await prisma.recoveryCase.update({
    where: { id: caseRecord.id },
    data: { status: 'ESCALATED' },
  });

  console.log(`🚨 Case ${caseRecord.id} ESCALATED to human: ${reason}`);

  return {
    success: true,
    newStatus: 'ESCALATED',
  };
}
