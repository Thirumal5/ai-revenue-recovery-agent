/**
 * Component 4 — Autonomous Background Scheduler
 *
 * Periodically polls the database for OPEN recovery cases that are eligible
 * for another recovery attempt based on safety cooldowns.
 *
 * Rules:
 * 1. Does NOT contain AI logic or call LLM directly.
 * 2. Does NOT execute tools directly.
 * 3. Only queries eligible cases and delegates processing to orchestrator `processCase(caseId)`.
 * 4. Atomic locking inside `processCase()` prevents race conditions.
 */

import { prisma } from '../lib/prisma';
import { processCase } from './orchestrator';

let schedulerInterval: NodeJS.Timeout | null = null;

export async function runSchedulerTick(): Promise<void> {
  const rawCooldown = process.env.COOLDOWN_MS;
  const cooldownMs = rawCooldown && !isNaN(Number(rawCooldown)) ? Number(rawCooldown) : 86400000;
  const cooldownCutoff = new Date(Date.now() - cooldownMs);

  console.log('🔎 Scheduler checking for eligible recovery cases...');

  try {
    // Query eligible cases: status OPEN, unlocked, and lastContactedAt is null or past cooldownCutoff
    const eligibleCases = await prisma.recoveryCase.findMany({
      where: {
        status: 'OPEN',
        lockedForProcessing: false,
        OR: [
          { lastContactedAt: null },
          { lastContactedAt: { lte: cooldownCutoff } },
        ],
      },
      select: {
        id: true,
        type: true,
        attemptCount: true,
        lastContactedAt: true,
      },
    });

    if (eligibleCases.length > 0) {
      console.log(`📋 Found ${eligibleCases.length} eligible case(s)`);
      
      for (const caseRecord of eligibleCases) {
        console.log(`⚡ Auto-processing case: ${caseRecord.id}`);
        // Asynchronously process each case; isolate errors so one case failure doesn't halt the scheduler
        processCase(caseRecord.id)
          .then((res) => {
            if (res.success) {
              console.log(`✅ Scheduler processing completed: ${caseRecord.id}`);
            } else {
              console.log(`❌ Scheduler processing skipped/failed: ${caseRecord.id} (${res.error || 'blocked'})`);
            }
          })
          .catch((err: any) => {
            console.error(`❌ Scheduler processing failed: ${caseRecord.id}`, err?.message || err);
          });
      }
    }
  } catch (error: any) {
    console.error('❌ Scheduler scan error:', error?.message || error);
  }
}

export function startScheduler(): void {
  const rawInterval = process.env.CHECK_INTERVAL_MS;
  const intervalMs = rawInterval && !isNaN(Number(rawInterval)) ? Number(rawInterval) : 30000;

  if (schedulerInterval) {
    console.log('⚠️ RecoverXAI Scheduler is already running.');
    return;
  }

  console.log('🤖 RecoverXAI Scheduler started');
  console.log(`⏱️ Scheduler interval: ${intervalMs}ms`);

  // Run initial tick asynchronously on startup, then poll periodically
  runSchedulerTick().catch((err) => console.error('❌ Initial scheduler tick failed:', err));

  schedulerInterval = setInterval(() => {
    runSchedulerTick().catch((err) => console.error('❌ Scheduled tick failed:', err));
  }, intervalMs);
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('🛑 RecoverXAI Scheduler stopped.');
  }
}
