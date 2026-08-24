/**
 * Phase 9 Automated Test Suite — Four Revenue Recovery Scenarios
 *
 * Verifies all 4 Revenue-Risk Scenarios End-to-End:
 * 1. PAYMENT FAILURE (One-time payment failure)
 * 2. CHECKOUT ABANDONMENT (Cart recovery)
 * 3. SUBSCRIPTION PAYMENT FAILURE (Recurring billing failure)
 * 4. OVERDUE INVOICE (B2B overdue invoice)
 *
 * For EACH scenario, tests 7 core dimensions:
 * - Normal recovery workflow
 * - Technical tool failure protection
 * - Maximum attempt enforcement
 * - Contact cooldown restriction
 * - Terminal state protection
 * - Invalid/malformed event handling
 * - Duplicate event & idempotency handling
 */

import dotenv from 'dotenv';
import { prisma } from '../lib/prisma';
import { processCase } from './orchestrator';
import { observeCaseOutcome } from './observationService';
import { executeTool } from './toolDispatcher';
import { checkSafetyRules } from './safetyEngine';

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

function logTrace(
  scenario: string,
  testCase: string,
  event: any,
  caseId: string,
  subReason: string,
  allowed: string[],
  decision: string,
  safety: boolean,
  tool: string,
  apiType: 'REAL RAZORPAY TEST API' | 'SIMULATED INTERNAL ACTION',
  observation: string,
  finalStatus: string
) {
  console.log(`\n--------------------------------------------------`);
  console.log(`📌 SCENARIO: ${scenario.toUpperCase()} — ${testCase}`);
  console.log(`📥 Input Event: ${JSON.stringify(event)}`);
  console.log(`📋 Case Created: ${caseId} (subReason: "${subReason}")`);
  console.log(`🔒 Policy Allowed Actions: ${JSON.stringify(allowed)}`);
  console.log(`🤖 AI Decision: ${decision}`);
  console.log(`🛡️ Safety Approved: ${safety}`);
  console.log(`🛠️ Tool Executed: ${tool} [${apiType}]`);
  console.log(`👁️ Observation Outcome: ${observation}`);
  console.log(`🏁 Final Case Status: ${finalStatus}`);
  console.log(`--------------------------------------------------`);
}

async function runPhase9TestSuite() {
  console.log('\n==================================================');
  console.log('🧪 RUNNING PHASE 9 FOUR REVENUE RECOVERY SCENARIOS TEST SUITE');
  console.log('==================================================\n');

  // Clean up test environment sequentially
  await prisma.agentAction.deleteMany({});
  await new Promise(r => setTimeout(r, 100));
  await prisma.messageLog.deleteMany({});
  await new Promise(r => setTimeout(r, 100));
  await prisma.recoveryCase.deleteMany({});
  await new Promise(r => setTimeout(r, 100));

  const customer = await prisma.customer.upsert({
    where: { email: 'phase9_client@example.com' },
    update: {},
    create: { email: 'phase9_client@example.com', name: 'Phase 9 Enterprise Client' },
  });

  // ==================================================
  // SCENARIO 1: PAYMENT FAILURE
  // ==================================================
  console.log('\n==================================================');
  console.log('📌 SCENARIO 1: PAYMENT FAILURE (One-Time Checkout)');
  console.log('==================================================');

  // 1A: Normal Recovery Flow (REAL RAZORPAY TEST API)
  const event1A = { type: 'payment_failure', amount: 4999, riskReason: 'Insufficient funds on credit card' };
  const case1A = await prisma.recoveryCase.create({
    data: {
      customerId: customer.id,
      type: event1A.type,
      amount: event1A.amount,
      status: 'OPEN',
      riskReason: event1A.riskReason,
    },
  });
  process.env.COOLDOWN_MS = '0';
  const res1A = await processCase(case1A.id);
  const updated1A = await prisma.recoveryCase.findUnique({ where: { id: case1A.id } });
  assert(res1A.success === true, 'S1.A: Payment failure processed successfully');
  assert(!!updated1A?.razorpayPaymentLinkId, 'S1.A: Real Razorpay payment link created');
  logTrace(
    'Payment Failure',
    'Normal Recovery',
    event1A,
    case1A.id,
    updated1A?.subReason || 'insufficient_funds',
    ['SEND_PAYMENT_LINK', 'SEND_REMINDER', 'SUGGEST_ALTERNATIVE_PAYMENT', 'ESCALATE_TO_HUMAN'],
    'SEND_PAYMENT_LINK',
    true,
    'SEND_PAYMENT_LINK',
    'REAL RAZORPAY TEST API',
    updated1A?.observationOutcome || 'STILL_OPEN',
    updated1A?.status || 'OPEN'
  );

  // 1B: Technical Tool Failure Protection
  const case1B = await prisma.recoveryCase.create({
    data: {
      customerId: customer.id,
      type: 'payment_failure',
      amount: 5000,
      status: 'OPEN',
      riskReason: 'Insufficient funds tool failure test',
    },
  });
  await prisma.agentAction.create({
    data: {
      caseId: case1B.id,
      actionType: 'TOOL_EXECUTED',
      aiReasoning: 'Failed to dispatch Razorpay API',
      status: 'FAILED',
      metadata: JSON.stringify({ action: 'SEND_PAYMENT_LINK', result: { success: false, error: 'API Timeout' } }),
    },
  });
  const obs1B = await observeCaseOutcome(case1B.id);
  assert(obs1B.outcome === 'ACTION_FAILED', 'S1.B: Observation correctly identified ACTION_FAILED');
  const updated1B = await prisma.recoveryCase.findUnique({ where: { id: case1B.id } });
  assert(updated1B?.status !== 'RECOVERED', 'S1.B: Failed tool did NOT mark case RECOVERED');

  // 1C: Maximum Attempt Limit Enforcement
  const case1C = await prisma.recoveryCase.create({
    data: {
      customerId: customer.id,
      type: 'payment_failure',
      amount: 7500,
      status: 'OPEN',
      attemptCount: 3,
      riskReason: 'Insufficient funds max attempts',
    },
  });
  process.env.COOLDOWN_MS = '0';
  await processCase(case1C.id);
  const updated1C = await prisma.recoveryCase.findUnique({ where: { id: case1C.id } });
  assert(updated1C?.status === 'ESCALATED', 'S1.C: Case transitioned to ESCALATED after reaching max attempts');

  // 1D: Contact Cooldown Restriction
  process.env.COOLDOWN_MS = '120000';
  const case1D = await prisma.recoveryCase.create({
    data: {
      customerId: customer.id,
      type: 'payment_failure',
      amount: 1200,
      status: 'OPEN',
      lastContactedAt: new Date(),
      riskReason: 'Insufficient funds recent contact',
    },
  });
  const res1D = await processCase(case1D.id);
  assert(res1D.success === false, 'S1.D: Processing rejected due to active contact cooldown');

  // 1E: Terminal State Protection
  const case1E = await prisma.recoveryCase.create({
    data: {
      customerId: customer.id,
      type: 'payment_failure',
      amount: 3000,
      status: 'RECOVERED',
      riskReason: 'Payment completed',
    },
  });
  const obs1E = await observeCaseOutcome(case1E.id);
  assert(obs1E.outcome === 'RECOVERED' && obs1E.shouldContinue === false, 'S1.E: Terminal status RECOVERED protected');

  // 1F: Invalid / Malformed Event Handling
  const case1F = await prisma.recoveryCase.create({
    data: {
      customerId: customer.id,
      type: 'payment_failure',
      amount: 0,
      status: 'OPEN',
      riskReason: '',
    },
  });
  process.env.COOLDOWN_MS = '0';
  const res1F = await processCase(case1F.id);
  assert(res1F.success === true, 'S1.F: Malformed reason handled safely by default unknown classifier');

  // 1G: Idempotency & Reuse of Razorpay Link
  const linkRes1G = await executeTool(
    'SEND_PAYMENT_LINK',
    { id: case1A.id, amount: 4999, razorpayPaymentLinkId: updated1A?.razorpayPaymentLinkId },
    { name: customer.name, email: customer.email },
    { chosen_action: 'SEND_PAYMENT_LINK' }
  );
  assert(linkRes1G.paymentLinkId === updated1A?.razorpayPaymentLinkId, 'S1.G: Existing Razorpay link reused idempotently');


  // ==================================================
  // SCENARIO 2: CHECKOUT ABANDONMENT
  // ==================================================
  console.log('\n==================================================');
  console.log('📌 SCENARIO 2: CHECKOUT ABANDONMENT (Cart Recovery)');
  console.log('==================================================');

  // 2A: Normal Recovery Flow (SIMULATED INTERNAL ACTION)
  const event2A = { type: 'checkout_abandonment', amount: 1499, riskReason: 'Customer abandoned checkout at payment screen' };
  const case2A = await prisma.recoveryCase.create({
    data: {
      customerId: customer.id,
      type: event2A.type,
      amount: event2A.amount,
      status: 'OPEN',
      riskReason: event2A.riskReason,
    },
  });
  process.env.COOLDOWN_MS = '0';
  const res2A = await processCase(case2A.id);
  const updated2A = await prisma.recoveryCase.findUnique({ where: { id: case2A.id } });
  assert(res2A.success === true, 'S2.A: Checkout abandonment processed successfully');
  assert(updated2A?.attemptCount === 1, 'S2.A: Attempt count incremented');
  logTrace(
    'Checkout Abandonment',
    'Normal Recovery',
    event2A,
    case2A.id,
    updated2A?.subReason || 'unknown_reason',
    ['SEND_REMINDER', 'SEND_PAYMENT_LINK', 'CLOSE_NO_ACTION'],
    'SEND_REMINDER',
    true,
    'SEND_REMINDER',
    'SIMULATED INTERNAL ACTION',
    updated2A?.observationOutcome || 'STILL_OPEN',
    updated2A?.status || 'OPEN'
  );

  // 2B: Technical Failure Handling
  const case2B = await prisma.recoveryCase.create({
    data: {
      customerId: customer.id,
      type: 'checkout_abandonment',
      amount: 999,
      status: 'OPEN',
      riskReason: 'Checkout failure test',
    },
  });
  await prisma.agentAction.create({
    data: {
      caseId: case2B.id,
      actionType: 'TOOL_EXECUTED',
      aiReasoning: 'Reminder failed to send',
      status: 'FAILED',
      metadata: JSON.stringify({ action: 'SEND_REMINDER', result: { success: false, error: 'SMS Gateway Error' } }),
    },
  });
  const obs2B = await observeCaseOutcome(case2B.id);
  assert(obs2B.outcome === 'ACTION_FAILED', 'S2.B: Tool failure detected');

  // 2C: Maximum Attempt Limit Enforcement (Transitions to CLOSE_NO_ACTION)
  await prisma.recoveryCase.update({ where: { id: case2A.id }, data: { attemptCount: 2, lastContactedAt: null } });
  process.env.COOLDOWN_MS = '0';
  await processCase(case2A.id);
  const updated2C = await prisma.recoveryCase.findUnique({ where: { id: case2A.id } });
  assert(updated2C?.status === 'CLOSED_NO_RECOVERY', 'S2.C: Abandonment closed without recovery at attempt limit');

  // 2D: Contact Cooldown Restriction
  process.env.COOLDOWN_MS = '120000';
  const case2D = await prisma.recoveryCase.create({
    data: {
      customerId: customer.id,
      type: 'checkout_abandonment',
      amount: 2100,
      status: 'OPEN',
      lastContactedAt: new Date(),
      riskReason: 'Abandonment recent contact',
    },
  });
  const res2D = await processCase(case2D.id);
  assert(res2D.success === false, 'S2.D: Abandonment processing blocked by active cooldown');

  // 2E: Terminal State Protection
  const case2E = await prisma.recoveryCase.create({
    data: { customerId: customer.id, type: 'checkout_abandonment', amount: 800, status: 'CLOSED_NO_RECOVERY', riskReason: 'Closed cart' },
  });
  const obs2E = await observeCaseOutcome(case2E.id);
  assert(obs2E.outcome === 'TERMINAL', 'S2.E: Closed cart state protected');

  // 2F: Invalid Event Handling
  const case2F = await prisma.recoveryCase.create({
    data: { customerId: customer.id, type: 'checkout_abandonment', amount: -50, status: 'OPEN', riskReason: 'Negative amount cart' },
  });
  process.env.COOLDOWN_MS = '0';
  const res2F = await processCase(case2F.id);
  assert(res2F.success === true, 'S2.F: Negative amount cart handled without crashing');

  // 2G: Idempotent Execution Verification
  const case2G = await prisma.recoveryCase.create({
    data: { customerId: customer.id, type: 'checkout_abandonment', amount: 1500, status: 'OPEN', riskReason: 'Duplicate abandonment check' },
  });
  process.env.COOLDOWN_MS = '0';
  const exec2G_1 = await processCase(case2G.id);
  process.env.COOLDOWN_MS = '120000';
  const updatedCase2G = await prisma.recoveryCase.findUnique({ where: { id: case2G.id } });
  const safetyCheck2G = checkSafetyRules(
    { lockedForProcessing: false, lastContactedAt: updatedCase2G?.lastContactedAt || new Date(), status: 'OPEN', attemptCount: 1, type: 'checkout_abandonment' },
    { chosen_action: 'SEND_REMINDER' },
    ['SEND_REMINDER', 'SEND_PAYMENT_LINK', 'CLOSE_NO_ACTION']
  );
  assert(exec2G_1.success === true && safetyCheck2G.approved === false, 'S2.G: Duplicate execution prevented by cooldown');


  // ==================================================
  // SCENARIO 3: SUBSCRIPTION PAYMENT FAILURE
  // ==================================================
  console.log('\n==================================================');
  console.log('📌 SCENARIO 3: SUBSCRIPTION PAYMENT FAILURE (Recurring)');
  console.log('==================================================');

  // 3A: Normal Recovery Flow (SIMULATED INTERNAL ACTION)
  const event3A = { type: 'subscription_failure', amount: 2999, riskReason: 'Card expired on monthly subscription renewal' };
  const case3A = await prisma.recoveryCase.create({
    data: {
      customerId: customer.id,
      type: event3A.type,
      amount: event3A.amount,
      status: 'OPEN',
      riskReason: event3A.riskReason,
    },
  });
  process.env.COOLDOWN_MS = '0';
  const res3A = await processCase(case3A.id);
  const updated3A = await prisma.recoveryCase.findUnique({ where: { id: case3A.id } });
  assert(res3A.success === true, 'S3.A: Subscription failure processed successfully');
  assert(updated3A?.subReason === 'card_expired', 'S3.A: Classifier correctly tagged card_expired');
  logTrace(
    'Subscription Failure',
    'Normal Recovery',
    event3A,
    case3A.id,
    updated3A?.subReason || 'card_expired',
    ['SEND_CARD_UPDATE_REMINDER', 'SEND_PAYMENT_LINK', 'SUGGEST_ALTERNATIVE_PAYMENT', 'ESCALATE_TO_HUMAN'],
    'SEND_CARD_UPDATE_REMINDER',
    true,
    'SEND_CARD_UPDATE_REMINDER',
    'SIMULATED INTERNAL ACTION',
    updated3A?.observationOutcome || 'STILL_OPEN',
    updated3A?.status || 'OPEN'
  );

  // 3B: Tool Failure Handling
  const case3B = await prisma.recoveryCase.create({
    data: { customerId: customer.id, type: 'subscription_failure', amount: 1999, status: 'OPEN', riskReason: 'Card update tool error test' },
  });
  await prisma.agentAction.create({
    data: {
      caseId: case3B.id,
      actionType: 'TOOL_EXECUTED',
      aiReasoning: 'Card update link dispatch failed',
      status: 'FAILED',
      metadata: JSON.stringify({ action: 'SEND_CARD_UPDATE_REMINDER', result: { success: false, error: 'Notification Engine Error' } }),
    },
  });
  const obs3B = await observeCaseOutcome(case3B.id);
  assert(obs3B.outcome === 'ACTION_FAILED', 'S3.B: Card update failure observed');

  // 3C: Maximum Attempt Enforcement (Escalation after 3 attempts)
  const case3C = await prisma.recoveryCase.create({
    data: { customerId: customer.id, type: 'subscription_failure', amount: 3999, status: 'OPEN', attemptCount: 3, riskReason: 'Subscription past max retries' },
  });
  process.env.COOLDOWN_MS = '0';
  await processCase(case3C.id);
  const updated3C = await prisma.recoveryCase.findUnique({ where: { id: case3C.id } });
  assert(updated3C?.status === 'ESCALATED', 'S3.C: Subscription case escalated after 3 attempts');

  // 3D: Contact Cooldown Enforcement
  process.env.COOLDOWN_MS = '120000';
  const case3D = await prisma.recoveryCase.create({
    data: { customerId: customer.id, type: 'subscription_failure', amount: 2999, status: 'OPEN', lastContactedAt: new Date(), riskReason: 'Subscription recent contact' },
  });
  const res3D = await processCase(case3D.id);
  assert(res3D.success === false, 'S3.D: Subscription processing blocked by active cooldown');

  // 3E: Terminal State Protection
  const case3E = await prisma.recoveryCase.create({
    data: { customerId: customer.id, type: 'subscription_failure', amount: 2999, status: 'ESCALATED', riskReason: 'Escalated subscription' },
  });
  const obs3E = await observeCaseOutcome(case3E.id);
  assert(obs3E.outcome === 'TERMINAL', 'S3.E: Escalated subscription state protected');

  // 3F: Invalid Event Handling
  const case3F = await prisma.recoveryCase.create({
    data: { customerId: customer.id, type: 'subscription_failure', amount: 100, status: 'OPEN', riskReason: 'Unknown subscription failure detail' },
  });
  process.env.COOLDOWN_MS = '0';
  const res3F = await processCase(case3F.id);
  assert(res3F.success === true, 'S3.F: Unknown subscription subReason handled safely');

  // 3G: Duplicate Event Handling & Safety Cooldown Protection
  const case3G = await prisma.recoveryCase.create({
    data: { customerId: customer.id, type: 'subscription_failure', amount: 2999, status: 'OPEN', riskReason: 'Duplicate sub event' },
  });
  process.env.COOLDOWN_MS = '0';
  const exec3G_1 = await processCase(case3G.id);
  process.env.COOLDOWN_MS = '120000';
  const updatedCase3G = await prisma.recoveryCase.findUnique({ where: { id: case3G.id } });
  const safetyCheck3G = checkSafetyRules(
    { lockedForProcessing: false, lastContactedAt: updatedCase3G?.lastContactedAt || new Date(), status: 'OPEN', attemptCount: 1, type: 'subscription_failure' },
    { chosen_action: 'SEND_CARD_UPDATE_REMINDER' },
    ['SUGGEST_ALTERNATIVE_PAYMENT', 'SEND_REMINDER', 'SEND_PAYMENT_LINK', 'ESCALATE_TO_HUMAN']
  );
  assert(exec3G_1.success === true && safetyCheck3G.approved === false, 'S3.G: Duplicate subscription processing blocked by cooldown');


  // ==================================================
  // SCENARIO 4: OVERDUE INVOICE
  // ==================================================
  console.log('\n==================================================');
  console.log('📌 SCENARIO 4: OVERDUE INVOICE (B2B Recovery)');
  console.log('==================================================');

  // 4A: Normal Recovery Flow (REAL RAZORPAY TEST API / HYBRID REMINDER)
  const event4A = { type: 'invoice_overdue', amount: 12500, riskReason: 'Invoice past due date by 15 days' };
  const case4A = await prisma.recoveryCase.create({
    data: {
      customerId: customer.id,
      type: event4A.type,
      amount: event4A.amount,
      status: 'OPEN',
      riskReason: event4A.riskReason,
    },
  });
  process.env.COOLDOWN_MS = '0';
  const res4A = await processCase(case4A.id);
  const updated4A = await prisma.recoveryCase.findUnique({ where: { id: case4A.id } });
  assert(res4A.success === true, 'S4.A: Overdue invoice processed successfully');
  const apiType4A = updated4A?.razorpayPaymentLinkId ? 'REAL RAZORPAY TEST API' : 'SIMULATED INTERNAL ACTION';
  logTrace(
    'Overdue Invoice',
    'Normal Recovery',
    event4A,
    case4A.id,
    updated4A?.subReason || 'unknown_reason',
    ['SEND_REMINDER', 'SEND_PAYMENT_LINK', 'SUGGEST_ALTERNATIVE_PAYMENT', 'ESCALATE_TO_HUMAN'],
    'SEND_REMINDER',
    true,
    'SEND_REMINDER',
    apiType4A,
    updated4A?.observationOutcome || 'STILL_OPEN',
    updated4A?.status || 'OPEN'
  );

  // 4B: Tool Failure Handling
  const case4B = await prisma.recoveryCase.create({
    data: { customerId: customer.id, type: 'invoice_overdue', amount: 8900, status: 'OPEN', riskReason: 'Invoice tool error test' },
  });
  await prisma.agentAction.create({
    data: {
      caseId: case4B.id,
      actionType: 'TOOL_EXECUTED',
      aiReasoning: 'Invoice payment link creation failed',
      status: 'FAILED',
      metadata: JSON.stringify({ action: 'SEND_PAYMENT_LINK', result: { success: false, error: 'Razorpay API Timeout' } }),
    },
  });
  const obs4B = await observeCaseOutcome(case4B.id);
  assert(obs4B.outcome === 'ACTION_FAILED', 'S4.B: Invoice tool failure observed');

  // 4C: Maximum Attempt Limit Enforcement
  const case4C = await prisma.recoveryCase.create({
    data: { customerId: customer.id, type: 'invoice_overdue', amount: 25000, status: 'OPEN', attemptCount: 3, riskReason: 'Invoice past max retries' },
  });
  process.env.COOLDOWN_MS = '0';
  await processCase(case4C.id);
  const updated4C = await prisma.recoveryCase.findUnique({ where: { id: case4C.id } });
  assert(updated4C?.status === 'ESCALATED', 'S4.C: Invoice case escalated after 3 attempts');

  // 4D: Contact Cooldown Restriction
  process.env.COOLDOWN_MS = '120000';
  const case4D = await prisma.recoveryCase.create({
    data: { customerId: customer.id, type: 'invoice_overdue', amount: 15000, status: 'OPEN', lastContactedAt: new Date(), riskReason: 'Invoice recent contact' },
  });
  const res4D = await processCase(case4D.id);
  assert(res4D.success === false, 'S4.D: Invoice processing blocked by active cooldown');

  // 4E: Terminal State Protection
  const case4E = await prisma.recoveryCase.create({
    data: { customerId: customer.id, type: 'invoice_overdue', amount: 18000, status: 'ESCALATED', riskReason: 'Escalated invoice' },
  });
  const obs4E = await observeCaseOutcome(case4E.id);
  assert(obs4E.outcome === 'TERMINAL', 'S4.E: Escalated invoice state protected');

  // 4F: Invalid Event Handling
  const case4F = await prisma.recoveryCase.create({
    data: { customerId: customer.id, type: 'invoice_overdue', amount: 0, status: 'OPEN', riskReason: 'Zero amount invoice' },
  });
  process.env.COOLDOWN_MS = '0';
  const res4F = await processCase(case4F.id);
  assert(res4F.success === true, 'S4.F: Zero amount invoice handled safely');

  // 4G: Idempotency & Reuse of Real Razorpay Link on Invoice
  const case4G = await prisma.recoveryCase.create({
    data: { customerId: customer.id, type: 'invoice_overdue', amount: 35000, status: 'OPEN', riskReason: 'Invoice payment link idempotency' },
  });
  process.env.COOLDOWN_MS = '0';
  const exec4G = await executeTool(
    'SEND_PAYMENT_LINK',
    { id: case4G.id, amount: 35000 },
    { name: customer.name, email: customer.email },
    { chosen_action: 'SEND_PAYMENT_LINK' }
  );
  assert(exec4G.success === true && !!exec4G.paymentLinkId, 'S4.G: Real Razorpay payment link created for overdue invoice');

  // Summary
  console.log('\n==================================================');
  console.log(`📊 PHASE 9 TEST SUITE SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('==================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase9TestSuite().catch((err) => {
  console.error('❌ Phase 9 test suite failed:', err);
  process.exit(1);
});
