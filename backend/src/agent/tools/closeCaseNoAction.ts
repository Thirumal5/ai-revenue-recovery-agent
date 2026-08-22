/**
 * TOOL: closeCaseNoAction — 🟢 REAL EXECUTION (Internal State Change)
 *
 * Updates the recovery case status to "CLOSED_NO_RECOVERY" in the database.
 * This is a real, permanent state change — the case is closed without any
 * recovery action being taken (e.g., abandoned checkout that's too old).
 */

import { prisma } from '../../lib/prisma';

interface CloseResult {
  success: boolean;
  newStatus: string;
}

export async function closeCaseNoAction(
  caseRecord: { id: string }
): Promise<CloseResult> {
  await prisma.recoveryCase.update({
    where: { id: caseRecord.id },
    data: { status: 'CLOSED_NO_RECOVERY' },
  });

  console.log(`🔒 Case ${caseRecord.id} CLOSED — no recovery action taken`);

  return {
    success: true,
    newStatus: 'CLOSED_NO_RECOVERY',
  };
}
