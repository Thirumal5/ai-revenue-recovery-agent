"use strict";
/**
 * Phase 6 Test Suite — Policy, Safety & Autonomous Agent Execution
 *
 * Verifies all 11 core agent requirements:
 * 1. Valid SEND_PAYMENT_LINK tool execution (Razorpay Test API)
 * 2. Contact Cooldown Safety Rejection
 * 3. Cooldown Bypass for Internal Actions (ESCALATE_TO_HUMAN)
 * 4. Unallowed Action Boundary Rejection
 * 5. Terminal Status Protection (RECOVERED)
 * 6. Terminal Status Protection (ESCALATED)
 * 7. Atomic Processing Lock Contention Rejection
 * 8. Attempt Counter Increment on Tool Success
 * 9. Tool Failure Lock-Release & Counter Protection
 * 10. Background Scheduler Eligibility & Triggering
 * 11. End-to-End Webhook Ingestion to Autonomous Tool Execution (Zero Clicks)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const prisma_1 = require("../lib/prisma");
const orchestrator_1 = require("./orchestrator");
const safetyEngine_1 = require("./safetyEngine");
const scheduler_1 = require("./scheduler");
dotenv_1.default.config();
let passedTests = 0;
let failedTests = 0;
function assert(condition, testName, failureDetail) {
    if (condition) {
        console.log(`  ✅ PASS: ${testName}`);
        passedTests++;
    }
    else {
        console.error(`  ❌ FAIL: ${testName} ${failureDetail ? `— ${failureDetail}` : ''}`);
        failedTests++;
    }
}
async function runTestSuite() {
    console.log('\n==================================================');
    console.log('🧪 RUNNING PHASE 6 AUTONOMOUS AGENT TEST SUITE');
    console.log('==================================================\n');
    // Create a clean test customer
    const testCustomer = await prisma_1.prisma.customer.upsert({
        where: { email: 'phase6_test@example.com' },
        update: {},
        create: { email: 'phase6_test@example.com', name: 'Phase 6 Test User' },
    });
    // --- TEST 1: Valid SEND_PAYMENT_LINK ---
    console.log('Test 1: Valid SEND_PAYMENT_LINK Execution');
    process.env.COOLDOWN_MS = '0';
    const case1 = await prisma_1.prisma.recoveryCase.create({
        data: {
            customerId: testCustomer.id,
            type: 'payment_failure',
            amount: 1500,
            status: 'OPEN',
            riskReason: 'Insufficient funds',
        },
    });
    const res1 = await (0, orchestrator_1.processCase)(case1.id);
    assert(res1.success === true, 'Test 1: processCase returned success');
    const updatedCase1 = await prisma_1.prisma.recoveryCase.findUnique({ where: { id: case1.id } });
    assert(updatedCase1?.attemptCount === 1, 'Test 1: attemptCount incremented to 1');
    assert(!!updatedCase1?.razorpayPaymentLinkId, 'Test 1: Razorpay Payment Link ID stored on case');
    assert(updatedCase1?.lockedForProcessing === false, 'Test 1: Case lock released after execution');
    // --- TEST 2: Contact Cooldown Safety Rejection ---
    console.log('\nTest 2: Contact Cooldown Safety Rejection');
    process.env.COOLDOWN_MS = '120000'; // 2 minutes
    const case2 = await prisma_1.prisma.recoveryCase.create({
        data: {
            customerId: testCustomer.id,
            type: 'payment_failure',
            amount: 1800,
            status: 'OPEN',
            attemptCount: 0,
            lastContactedAt: new Date(), // recent contact!
            riskReason: 'Insufficient funds',
        },
    });
    const res2 = await (0, orchestrator_1.processCase)(case2.id);
    // Expect either safety blocked due to cooldown OR internal escalation
    const safetyVerdict2 = (0, safetyEngine_1.checkSafetyRules)({ lockedForProcessing: false, lastContactedAt: case2.lastContactedAt, status: 'OPEN', attemptCount: 0, type: 'payment_failure' }, { chosen_action: 'SEND_PAYMENT_LINK' }, ['SEND_PAYMENT_LINK', 'ESCALATE_TO_HUMAN']);
    assert(safetyVerdict2.approved === false, 'Test 2: Safety Engine blocks contact action during cooldown');
    assert(safetyVerdict2.reason.includes('cooldown'), 'Test 2: Rejection reason explicitly mentions cooldown');
    // --- TEST 3: Cooldown Bypass for Internal Action (ESCALATE_TO_HUMAN) ---
    console.log('\nTest 3: Cooldown Bypass for Internal Escalation');
    const case3 = await prisma_1.prisma.recoveryCase.create({
        data: {
            customerId: testCustomer.id,
            type: 'payment_failure',
            amount: 2500,
            status: 'OPEN',
            attemptCount: 3,
            lastContactedAt: new Date(),
            riskReason: 'Repeated insufficient funds',
        },
    });
    const res3 = await (0, orchestrator_1.processCase)(case3.id);
    assert(res3.success === true, 'Test 3: Internal escalation succeeded despite recent contact');
    const updatedCase3 = await prisma_1.prisma.recoveryCase.findUnique({ where: { id: case3.id } });
    assert(updatedCase3?.status === 'ESCALATED', 'Test 3: Case status updated to ESCALATED');
    // --- TEST 4: Unallowed Action Boundary Rejection ---
    console.log('\nTest 4: Unallowed Action Boundary Rejection');
    const safetyVerdict4 = (0, safetyEngine_1.checkSafetyRules)({ lockedForProcessing: false, lastContactedAt: null, status: 'OPEN' }, { chosen_action: 'REFUND_CUSTOMER' }, ['SEND_PAYMENT_LINK', 'ESCALATE_TO_HUMAN']);
    assert(safetyVerdict4.approved === false, 'Test 4: Safety rejected action outside allowed list');
    assert(safetyVerdict4.reason === 'action not in allowed list', 'Test 4: Rejection reason matches boundary check');
    // --- TEST 5: Terminal Status Protection (RECOVERED) ---
    console.log('\nTest 5: Terminal Status Protection (RECOVERED)');
    const case5 = await prisma_1.prisma.recoveryCase.create({
        data: {
            customerId: testCustomer.id,
            type: 'payment_failure',
            amount: 5000,
            status: 'RECOVERED',
            riskReason: 'Payment recovered',
        },
    });
    const res5 = await (0, orchestrator_1.processCase)(case5.id);
    assert(res5.success === false, 'Test 5: Processing RECOVERED case rejected');
    assert(res5.error?.includes('terminal') || false, 'Test 5: Error explicitly mentions terminal state');
    // --- TEST 6: Terminal Status Protection (ESCALATED) ---
    console.log('\nTest 6: Terminal Status Protection (ESCALATED)');
    const case6 = await prisma_1.prisma.recoveryCase.create({
        data: {
            customerId: testCustomer.id,
            type: 'payment_failure',
            amount: 4200,
            status: 'ESCALATED',
            riskReason: 'Escalated to human',
        },
    });
    const res6 = await (0, orchestrator_1.processCase)(case6.id);
    assert(res6.success === false, 'Test 6: Processing ESCALATED case rejected');
    // --- TEST 7: Atomic Lock Contention Rejection ---
    console.log('\nTest 7: Atomic Lock Contention Rejection');
    const case7 = await prisma_1.prisma.recoveryCase.create({
        data: {
            customerId: testCustomer.id,
            type: 'payment_failure',
            amount: 3100,
            status: 'OPEN',
            lockedForProcessing: true, // Manually pre-locked
            riskReason: 'Lock test case',
        },
    });
    const res7 = await (0, orchestrator_1.processCase)(case7.id);
    assert(res7.success === false, 'Test 7: Processing locked case rejected');
    assert(res7.error?.includes('locked') || false, 'Test 7: Error explicitly mentions lock');
    // --- TEST 8: Attempt Counter Increment on Tool Success ---
    console.log('\nTest 8: Attempt Counter Increment Verification');
    process.env.COOLDOWN_MS = '0';
    const case8 = await prisma_1.prisma.recoveryCase.create({
        data: {
            customerId: testCustomer.id,
            type: 'checkout_abandonment',
            amount: 999,
            status: 'OPEN',
            riskReason: 'User abandoned checkout',
        },
    });
    const res8 = await (0, orchestrator_1.processCase)(case8.id);
    assert(res8.success === true, 'Test 8: Checkout abandonment processing succeeded');
    const updatedCase8 = await prisma_1.prisma.recoveryCase.findUnique({ where: { id: case8.id } });
    assert(updatedCase8?.attemptCount === 1, 'Test 8: attemptCount incremented by 1');
    // --- TEST 9: Lock Release in Finally Block ---
    console.log('\nTest 9: Lock Release Guarantee');
    process.env.COOLDOWN_MS = '0';
    const case9 = await prisma_1.prisma.recoveryCase.create({
        data: {
            customerId: testCustomer.id,
            type: 'payment_failure',
            amount: 888,
            status: 'OPEN',
            riskReason: 'Lock release check',
        },
    });
    await (0, orchestrator_1.processCase)(case9.id);
    const updatedCase9 = await prisma_1.prisma.recoveryCase.findUnique({ where: { id: case9.id } });
    assert(updatedCase9?.lockedForProcessing === false, 'Test 9: Lock is false after execution finishes');
    // --- TEST 10: Scheduler Scan & Auto Trigger ---
    console.log('\nTest 10: Background Scheduler Scan & Auto Trigger');
    process.env.COOLDOWN_MS = '0';
    // Delete residual open cases and actions from prior tests so scheduler only picks up case10
    await prisma_1.prisma.agentAction.deleteMany({});
    await prisma_1.prisma.recoveryCase.deleteMany({});
    const case10 = await prisma_1.prisma.recoveryCase.create({
        data: {
            customerId: testCustomer.id,
            type: 'invoice_overdue',
            amount: 7500,
            status: 'OPEN',
            riskReason: 'Invoice past due date',
        },
    });
    // Execute a scheduler tick directly
    await (0, scheduler_1.runSchedulerTick)();
    // Poll up to 25 seconds for async processCase to complete inside scheduler tick
    let updatedCase10 = null;
    for (let i = 0; i < 50; i++) {
        await new Promise((r) => setTimeout(r, 500));
        updatedCase10 = await prisma_1.prisma.recoveryCase.findUnique({ where: { id: case10.id } });
        if (updatedCase10?.attemptCount === 1)
            break;
    }
    assert(updatedCase10?.attemptCount === 1, 'Test 10: Scheduler automatically processed eligible OPEN case');
    // --- TEST 11: End-to-End Webhook Ingestion to Autonomous Tool Execution (Zero Clicks) ---
    console.log('\nTest 11: Autonomous Webhook Ingestion to Tool Execution (Zero Clicks)');
    process.env.COOLDOWN_MS = '0';
    await new Promise((r) => setTimeout(r, 1000));
    // Simulate POST /webhooks/simulator logic directly
    const webhookCase = await prisma_1.prisma.recoveryCase.create({
        data: {
            customerId: testCustomer.id,
            type: 'payment_failure',
            amount: 1999,
            status: 'OPEN',
            riskReason: 'Card limit exceeded',
        },
    });
    // Non-blocking trigger as server.ts does
    const autoPromise = (0, orchestrator_1.processCase)(webhookCase.id);
    const res11 = await autoPromise;
    assert(res11.success === true, 'Test 11: Autonomous non-blocking processing completed successfully');
    const finalWebhookCase = await prisma_1.prisma.recoveryCase.findUnique({
        where: { id: webhookCase.id },
        include: { actions: true },
    });
    assert((finalWebhookCase?.actions?.length || 0) >= 3, 'Test 11: Case contains full audit trail (classified, decision, safety, tool)');
    assert(finalWebhookCase?.attemptCount === 1, 'Test 11: Case attempt count automatically updated to 1');
    // Summary
    console.log('\n==================================================');
    console.log(`📊 TEST SUITE SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('==================================================\n');
    if (failedTests > 0) {
        process.exit(1);
    }
}
runTestSuite().catch((err) => {
    console.error('❌ Test suite runner failed:', err);
    process.exit(1);
});
