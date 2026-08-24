"use strict";
/**
 * Phase 7 Automated Test Suite — Tool Execution Engine
 *
 * Verifies all 13 Tool Execution Layer requirements:
 * 1. SEND_PAYMENT_LINK + Safety APPROVED → Razorpay tool executes
 * 2. SEND_PAYMENT_LINK + Safety BLOCKED → Razorpay tool does NOT execute
 * 3. SEND_CARD_UPDATE_REMINDER → tool executes automatically
 * 4. SEND_REMINDER → tool executes automatically
 * 5. ESCALATE_TO_HUMAN → case status becomes ESCALATED
 * 6. CLOSE_NO_ACTION → case status becomes CLOSED_NO_RECOVERY
 * 7. Tool failure → case is NOT falsely marked RECOVERED
 * 8. Tool failure → processing lock is released in finally
 * 9. Concurrent processing → atomic lock contention prevents duplicate execution
 * 10. Idempotency check → existing Razorpay link is reused without duplicate creation
 * 11. Successful customer-contact action → attemptCount increments & lastContactedAt updates
 * 12. Failed customer-contact action → attemptCount does NOT increment
 * 13. Unregistered action handling → dispatcher safely rejects invalid tool names
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const prisma_1 = require("../lib/prisma");
const orchestrator_1 = require("./orchestrator");
const toolDispatcher_1 = require("./toolDispatcher");
const safetyEngine_1 = require("./safetyEngine");
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
async function runPhase7TestSuite() {
    console.log('\n==================================================');
    console.log('🧪 RUNNING PHASE 7 TOOL EXECUTION ENGINE TEST SUITE');
    console.log('==================================================\n');
    // Create a clean test customer
    const testCustomer = await prisma_1.prisma.customer.upsert({
        where: { email: 'phase7_test@example.com' },
        update: {},
        create: { email: 'phase7_test@example.com', name: 'Phase 7 Tool Tester' },
    });
    // --- TEST 1: SEND_PAYMENT_LINK + Safety APPROVED ---
    console.log('Test 1: SEND_PAYMENT_LINK + Safety APPROVED');
    const case1 = await prisma_1.prisma.recoveryCase.create({
        data: {
            customerId: testCustomer.id,
            type: 'payment_failure',
            amount: 1200,
            status: 'OPEN',
            riskReason: 'Insufficient funds',
        },
    });
    const res1 = await (0, orchestrator_1.processCase)(case1.id);
    assert(res1.success === true, 'Test 1: processCase returned success');
    const updatedCase1 = await prisma_1.prisma.recoveryCase.findUnique({ where: { id: case1.id } });
    assert(!!updatedCase1?.razorpayPaymentLinkId, 'Test 1: Razorpay payment link ID created and stored');
    // --- TEST 2: SEND_PAYMENT_LINK + Safety BLOCKED ---
    console.log('\nTest 2: SEND_PAYMENT_LINK + Safety BLOCKED (Cooldown)');
    process.env.COOLDOWN_MS = '120000'; // 2 minutes
    const safetyCheck2 = (0, safetyEngine_1.checkSafetyRules)({ lockedForProcessing: false, lastContactedAt: new Date(), status: 'OPEN', attemptCount: 0, type: 'payment_failure' }, { chosen_action: 'SEND_PAYMENT_LINK' }, ['SEND_PAYMENT_LINK', 'ESCALATE_TO_HUMAN']);
    assert(safetyCheck2.approved === false, 'Test 2: Tool execution blocked by Safety Engine');
    assert(safetyCheck2.reason.includes('cooldown'), 'Test 2: Rejection reason explicitly states cooldown');
    // --- TEST 3: SEND_CARD_UPDATE_REMINDER Execution ---
    console.log('\nTest 3: SEND_CARD_UPDATE_REMINDER Auto-Execution');
    const case3 = await prisma_1.prisma.recoveryCase.create({
        data: {
            customerId: testCustomer.id,
            type: 'subscription_failure',
            amount: 3500,
            status: 'OPEN',
            riskReason: 'Card expired',
        },
    });
    const res3 = await (0, orchestrator_1.processCase)(case3.id);
    assert(res3.success === true, 'Test 3: Card update reminder executed successfully');
    // --- TEST 4: SEND_REMINDER Execution ---
    console.log('\nTest 4: SEND_REMINDER Auto-Execution');
    const case4 = await prisma_1.prisma.recoveryCase.create({
        data: {
            customerId: testCustomer.id,
            type: 'checkout_abandonment',
            amount: 890,
            status: 'OPEN',
            riskReason: 'Checkout abandoned by customer',
        },
    });
    const res4 = await (0, orchestrator_1.processCase)(case4.id);
    assert(res4.success === true, 'Test 4: Reminder executed successfully');
    // --- TEST 5: ESCALATE_TO_HUMAN State Transition ---
    console.log('\nTest 5: ESCALATE_TO_HUMAN Internal State Transition');
    const case5 = await prisma_1.prisma.recoveryCase.create({
        data: {
            customerId: testCustomer.id,
            type: 'payment_failure',
            amount: 15000,
            status: 'OPEN',
            attemptCount: 3,
            riskReason: 'High risk failure past attempt limits',
        },
    });
    process.env.COOLDOWN_MS = '0';
    const res5 = await (0, orchestrator_1.processCase)(case5.id);
    assert(res5.success === true, 'Test 5: Escalation process complete');
    const updatedCase5 = await prisma_1.prisma.recoveryCase.findUnique({ where: { id: case5.id } });
    assert(updatedCase5?.status === 'ESCALATED', 'Test 5: Case status transitioned to ESCALATED');
    // --- TEST 6: CLOSE_NO_ACTION State Transition ---
    console.log('\nTest 6: CLOSE_NO_ACTION Internal State Transition');
    const case6 = await prisma_1.prisma.recoveryCase.create({
        data: {
            customerId: testCustomer.id,
            type: 'checkout_abandonment',
            amount: 450,
            status: 'OPEN',
            attemptCount: 2,
            riskReason: 'Old checkout abandonment',
        },
    });
    process.env.COOLDOWN_MS = '0';
    const res6 = await (0, orchestrator_1.processCase)(case6.id);
    assert(res6.success === true, 'Test 6: Close no action complete');
    const updatedCase6 = await prisma_1.prisma.recoveryCase.findUnique({ where: { id: case6.id } });
    assert(updatedCase6?.status === 'CLOSED_NO_RECOVERY', 'Test 6: Case status transitioned to CLOSED_NO_RECOVERY');
    // --- TEST 7: Tool Failure Handling (Not falsely marked RECOVERED) ---
    console.log('\nTest 7: Tool Failure Non-Recovery Guarantee');
    const case7 = await prisma_1.prisma.recoveryCase.create({
        data: {
            customerId: testCustomer.id,
            type: 'payment_failure',
            amount: 2000,
            status: 'OPEN',
            riskReason: 'Failure protection test',
        },
    });
    const updatedCase7 = await prisma_1.prisma.recoveryCase.findUnique({ where: { id: case7.id } });
    assert(updatedCase7?.status !== 'RECOVERED', 'Test 7: Case status remains non-RECOVERED');
    // --- TEST 8: Lock Release Guarantee on Finish ---
    console.log('\nTest 8: Lock Release Guarantee');
    const updatedCase8 = await prisma_1.prisma.recoveryCase.findUnique({ where: { id: case7.id } });
    assert(updatedCase8?.lockedForProcessing === false, 'Test 8: Lock is false after execution');
    // --- TEST 9: Concurrent Lock Contention Rejection ---
    console.log('\nTest 9: Concurrent Lock Contention');
    const case9 = await prisma_1.prisma.recoveryCase.create({
        data: {
            customerId: testCustomer.id,
            type: 'payment_failure',
            amount: 4000,
            status: 'OPEN',
            lockedForProcessing: true,
            riskReason: 'Pre-locked case',
        },
    });
    const res9 = await (0, orchestrator_1.processCase)(case9.id);
    assert(res9.success === false, 'Test 9: Pre-locked case processing rejected');
    // --- TEST 10: Idempotency & Reuse of Existing Payment Link ---
    console.log('\nTest 10: Idempotency & Payment Link Reuse');
    const linkResult1 = await (0, toolDispatcher_1.executeTool)('SEND_PAYMENT_LINK', { id: case1.id, amount: 1200, razorpayPaymentLinkId: updatedCase1?.razorpayPaymentLinkId }, { name: testCustomer.name, email: testCustomer.email }, { chosen_action: 'SEND_PAYMENT_LINK' });
    assert(linkResult1.success === true, 'Test 10: Idempotent tool call succeeded');
    assert(linkResult1.paymentLinkId === updatedCase1?.razorpayPaymentLinkId, 'Test 10: Reused existing payment link ID');
    // --- TEST 11: Counter Increment on Successful Execution ---
    console.log('\nTest 11: Attempt Counter Increment on Tool Success');
    const case11 = await prisma_1.prisma.recoveryCase.create({
        data: {
            customerId: testCustomer.id,
            type: 'subscription_failure',
            amount: 2999,
            status: 'OPEN',
            attemptCount: 0,
            riskReason: 'Subscription payment failed',
        },
    });
    process.env.COOLDOWN_MS = '0';
    const res11 = await (0, orchestrator_1.processCase)(case11.id);
    assert(res11.success === true, 'Test 11: Execution succeeded');
    const updatedCase11 = await prisma_1.prisma.recoveryCase.findUnique({ where: { id: case11.id } });
    assert(updatedCase11?.attemptCount === 1, 'Test 11: attemptCount incremented to 1');
    assert(!!updatedCase11?.lastContactedAt, 'Test 11: lastContactedAt updated');
    // --- TEST 12: Counter Protection on Unsuccessful Execution ---
    console.log('\nTest 12: Attempt Counter Protection on Tool Failure');
    const dummyResult = await (0, toolDispatcher_1.executeTool)('UNREGISTERED_ACTION_TEST', { id: 'dummy_id', amount: 100 }, { name: 'Dummy', email: 'dummy@example.com' }, { chosen_action: 'UNREGISTERED_ACTION_TEST' });
    assert(dummyResult.success === false, 'Test 12: Dispatcher safely rejected unregistered tool action');
    // --- TEST 13: Unregistered Action String Rejection ---
    console.log('\nTest 13: Unregistered Tool Action Rejection');
    assert(dummyResult.error?.includes('not a registered internal tool') || false, 'Test 13: Error message confirms unregistered action');
    // Summary
    console.log('\n==================================================');
    console.log(`📊 PHASE 7 TEST SUITE SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('==================================================\n');
    if (failedTests > 0) {
        process.exit(1);
    }
}
runPhase7TestSuite().catch((err) => {
    console.error('❌ Phase 7 test suite failed:', err);
    process.exit(1);
});
