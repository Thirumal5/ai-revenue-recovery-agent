/**
 * Multi-Step Autonomous Strategy & Action Diversity Test Suite
 *
 * Verifies that RecoverXAI operates as a true multi-step autonomous agent:
 * - Does NOT prematurely escalate after 1 attempt when open.
 * - Evaluates previous action history and observation outcome.
 * - Selects different allowed recovery strategies across attempts (action diversity).
 * - Immediately stops upon RECOVERED or TERMINAL status.
 * - Escalates only when max attempts are reached or policy requires it.
 */

import dotenv from 'dotenv';
import { prisma } from '../lib/prisma';
import { processCase } from './orchestrator';
import { observeCaseOutcome } from './observationService';

dotenv.config();

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, failureDetail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${failureDetail ? `— ${failureDetail}` : ''}`);
    failedTests++;
  }
}

async function runMultiStepTestSuite() {
  console.log('\n==================================================');
  console.log('🧪 RUNNING RECOVERXAI MULTI-STEP STRATEGY TEST SUITE');
  console.log('==================================================\n');

  // Clean test database
  await prisma.messageLog.deleteMany({});
  await prisma.agentAction.deleteMany({});
  await prisma.recoveryCase.deleteMany({});

  const customer = await prisma.customer.upsert({
    where: { email: 'multistep_client@example.com' },
    update: {},
    create: { email: 'multistep_client@example.com', name: 'MultiStep Enterprise Client' },
  });

  // ==================================================
  // TEST 1: MULTI-STEP RECOVERY CYCLE (Insufficient Funds)
  // ==================================================
  console.log('\n--------------------------------------------------');
  console.log('📌 TEST 1: Multi-Step Strategy Cycle for Insufficient Funds');
  console.log('--------------------------------------------------');

  const case1 = await prisma.recoveryCase.create({
    data: {
      customerId: customer.id,
      type: 'payment_failure',
      amount: 5000,
      status: 'OPEN',
      riskReason: 'Insufficient funds on credit card',
    },
  });

  // Attempt 1: Should choose SEND_PAYMENT_LINK
  process.env.COOLDOWN_MS = '0';
  const resAttempt1 = await processCase(case1.id);
  const updatedAttempt1 = await prisma.recoveryCase.findUnique({ where: { id: case1.id }, include: { actions: true } });
  
  assert(resAttempt1.success === true, 'T1.A: Attempt 1 executed successfully');
  assert(updatedAttempt1?.attemptCount === 1, 'T1.A: Attempt count incremented to 1');
  assert(updatedAttempt1?.status === 'OPEN', 'T1.A: Case remains OPEN after Attempt 1 (does NOT escalate prematurely)');
  
  const action1 = updatedAttempt1?.actions.find(a => a.actionType === 'AI_DECISION');
  const chosen1 = action1 ? JSON.parse(action1.metadata || '{}').chosen_action : '';
  assert(chosen1 === 'SEND_PAYMENT_LINK', `T1.A: Attempt 1 chose SEND_PAYMENT_LINK (actual: ${chosen1})`);

  // Attempt 2: Should observe STILL_OPEN, evaluate history, and choose DIFFERENT action (SEND_REMINDER or SUGGEST_ALTERNATIVE_PAYMENT)
  const resAttempt2 = await processCase(case1.id);
  const updatedAttempt2 = await prisma.recoveryCase.findUnique({ where: { id: case1.id }, include: { actions: true } });

  assert(resAttempt2.success === true, 'T1.B: Attempt 2 executed successfully');
  assert(updatedAttempt2?.attemptCount === 2, 'T1.B: Attempt count incremented to 2');
  assert(updatedAttempt2?.status === 'OPEN', 'T1.B: Case remains OPEN after Attempt 2');

  const aiDecisionsAttempt2 = updatedAttempt2?.actions.filter(a => a.actionType === 'AI_DECISION') || [];
  const chosen2 = aiDecisionsAttempt2.length >= 2 ? JSON.parse(aiDecisionsAttempt2[1].metadata || '{}').chosen_action : '';
  assert(chosen2 !== chosen1 && chosen2 !== 'ESCALATE_TO_HUMAN', `T1.B: Attempt 2 demonstrated strategy diversity (chose ${chosen2} instead of repeating ${chosen1})`);

  // Attempt 3: Execute third recovery strategy
  const resAttempt3 = await processCase(case1.id);
  const updatedAttempt3 = await prisma.recoveryCase.findUnique({ where: { id: case1.id }, include: { actions: true } });

  assert(resAttempt3.success === true, 'T1.C: Attempt 3 executed successfully');
  assert(updatedAttempt3?.attemptCount === 3, 'T1.C: Attempt count incremented to 3');

  const aiDecisionsAttempt3 = updatedAttempt3?.actions.filter(a => a.actionType === 'AI_DECISION') || [];
  const chosen3 = aiDecisionsAttempt3.length >= 3 ? JSON.parse(aiDecisionsAttempt3[2].metadata || '{}').chosen_action : '';
  assert(chosen3 !== 'SEND_PAYMENT_LINK', `T1.C: Attempt 3 selected 3rd strategy (${chosen3})`);

  // Attempt 4: Max attempts reached (attemptCount = 3), policy forces ESCALATE_TO_HUMAN
  const resAttempt4 = await processCase(case1.id);
  const updatedAttempt4 = await prisma.recoveryCase.findUnique({ where: { id: case1.id } });

  assert(updatedAttempt4?.status === 'ESCALATED', 'T1.D: Case transitioned to ESCALATED after reaching max attempt limit (3)');


  // ==================================================
  // TEST 2: IMMEDIATE STOP ON RECOVERED STATUS
  // ==================================================
  console.log('\n--------------------------------------------------');
  console.log('📌 TEST 2: Immediate Stop when Case is RECOVERED');
  console.log('--------------------------------------------------');

  const case2 = await prisma.recoveryCase.create({
    data: {
      customerId: customer.id,
      type: 'payment_failure',
      amount: 3500,
      status: 'RECOVERED',
      riskReason: 'Payment completed successfully',
    },
  });

  const resCase2 = await processCase(case2.id);
  assert(resCase2.success === false, 'T2: Re-processing RECOVERED case rejected');
  const obsCase2 = await observeCaseOutcome(case2.id);
  assert(obsCase2.outcome === 'RECOVERED' && obsCase2.shouldContinue === false, 'T2: Observation loop halted for RECOVERED case');


  // ==================================================
  // TEST 3: CHECKOUT ABANDONMENT MULTI-STEP & SILENT CLOSE
  // ==================================================
  console.log('\n--------------------------------------------------');
  console.log('📌 TEST 3: Checkout Abandonment Multi-Step & Silent Close');
  console.log('--------------------------------------------------');

  const case3 = await prisma.recoveryCase.create({
    data: {
      customerId: customer.id,
      type: 'checkout_abandonment',
      amount: 1999,
      status: 'OPEN',
      riskReason: 'Customer abandoned checkout at payment step',
    },
  });

  // Attempt 1: SEND_REMINDER
  process.env.COOLDOWN_MS = '0';
  await processCase(case3.id);
  const updatedCase3_1 = await prisma.recoveryCase.findUnique({ where: { id: case3.id } });
  assert(updatedCase3_1?.attemptCount === 1 && updatedCase3_1?.status === 'OPEN', 'T3.A: Abandonment Attempt 1 executed');

  // Attempt 2: SEND_PAYMENT_LINK
  await processCase(case3.id);
  const updatedCase3_2 = await prisma.recoveryCase.findUnique({ where: { id: case3.id } });
  assert(updatedCase3_2?.attemptCount === 2 && updatedCase3_2?.status === 'OPEN', 'T3.B: Abandonment Attempt 2 executed');

  // Attempt 3: Max attempts reached (2), silently transitions to CLOSED_NO_RECOVERY per policy
  await processCase(case3.id);
  const updatedCase3_3 = await prisma.recoveryCase.findUnique({ where: { id: case3.id } });
  assert(updatedCase3_3?.status === 'CLOSED_NO_RECOVERY', 'T3.C: Abandonment silently closed without human escalation at max attempts');


  // ==================================================
  // TEST 4: SUGGEST_ALTERNATIVE_PAYMENT TOOL EXECUTION
  // ==================================================
  console.log('\n--------------------------------------------------');
  console.log('📌 TEST 4: SUGGEST_ALTERNATIVE_PAYMENT Tool Verification');
  console.log('--------------------------------------------------');

  const case4 = await prisma.recoveryCase.create({
    data: {
      customerId: customer.id,
      type: 'subscription_failure',
      amount: 2999,
      status: 'OPEN',
      riskReason: 'UPI transaction limit exceeded',
    },
  });

  process.env.COOLDOWN_MS = '0';
  const resCase4 = await processCase(case4.id);
  const updatedCase4 = await prisma.recoveryCase.findUnique({ where: { id: case4.id }, include: { actions: true } });
  
  assert(resCase4.success === true, 'T4: Subscription failure processed');
  const toolExecAction = updatedCase4?.actions.find(a => a.actionType === 'TOOL_EXECUTED');
  assert(!!toolExecAction, 'T4: Tool execution logged in AgentAction history');

  // Summary
  console.log('\n==================================================');
  console.log(`📊 MULTI-STEP TEST SUITE SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('==================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runMultiStepTestSuite().catch((err) => {
  console.error('❌ Multi-step test suite failed:', err);
  process.exit(1);
});
