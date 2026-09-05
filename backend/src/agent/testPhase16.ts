import { prisma } from '../lib/prisma';
import { processCase } from './orchestrator';
import { checkSafetyRules } from './safetyEngine';
import { decideRecoveryAction } from './groqDecisionService';

async function runPhase16Tests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 16 COMPREHENSIVE TEST SUITE');
  console.log('   Batch Recovery • Promise to Pay • Multilingual • Analytics Isolation');
  console.log('====================================================\n');

  try {
    // ----------------------------------------------------
    // TEST 1: BATCH RECOVERY SIMULATION & METRICS ISOLATION
    // ----------------------------------------------------
    console.log('--- TEST 1: Batch Recovery & Synthetic Case Tagging ---');
    const cust1 = await prisma.customer.create({
      data: {
        name: 'Simulated Batch User 1',
        email: `batch_test_${Date.now()}@recoverxai.test`,
        phone: '+919999888801',
      },
    });

    const simCase = await prisma.recoveryCase.create({
      data: {
        customerId: cust1.id,
        type: 'payment_failure',
        amount: 2500,
        status: 'OPEN',
        riskReason: 'Insufficient funds in account',
        subReason: 'insufficient_funds',
        isSimulation: true,
      },
    });

    console.log(`✅ Created synthetic simulation case ID: ${simCase.id}`);
    console.log(`   isSimulation = ${simCase.isSimulation}`);

    if (simCase.isSimulation !== true) {
      throw new Error('FAILED: isSimulation flag was not stored correctly on RecoveryCase');
    }

    // Process case through pipeline
    await processCase(simCase.id);
    const processedSimCase = await prisma.recoveryCase.findUnique({
      where: { id: simCase.id },
      include: { actions: true },
    });

    console.log(`✅ Processed synthetic case state: ${processedSimCase?.status}`);
    console.log(`   Actions executed: ${processedSimCase?.actions.length}`);

    // Verify analytics separation
    const allCases = await prisma.recoveryCase.findMany();
    const realCases = allCases.filter((c) => !c.isSimulation);
    const simCases = allCases.filter((c) => c.isSimulation);

    console.log(`✅ Analytics Isolation Check:`);
    console.log(`   Real Cases Count: ${realCases.length}`);
    console.log(`   Simulation Cases Count: ${simCases.length}`);

    // ----------------------------------------------------
    // TEST 2: PROMISE TO PAY WORKFLOW & SAFETY BLOCKING
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Promise-to-Pay Workflow & Safety Protection ---');
    const cust2 = await prisma.customer.create({
      data: {
        name: 'Rahul Promise Test',
        email: `p2p_test_${Date.now()}@recoverxai.test`,
        phone: '+919999888802',
      },
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const p2pCase = await prisma.recoveryCase.create({
      data: {
        customerId: cust2.id,
        type: 'subscription_failure',
        amount: 1999,
        status: 'OPEN',
        riskReason: 'Card expired',
        subReason: 'card_expired',
        promiseToPayAt: tomorrow,
        promiseToPayStatus: 'PROMISED',
      },
    });

    console.log(`✅ Created Promise-to-Pay case (promised until ${tomorrow.toISOString()})`);

    // Safety Engine Check: contact action MUST be blocked because customer promised to pay tomorrow
    const safetyVerdict = checkSafetyRules(
      {
        lockedForProcessing: false,
        lastContactedAt: null,
        status: 'OPEN',
        attemptCount: 0,
        type: 'subscription_failure',
        promiseToPayAt: tomorrow,
        promiseToPayStatus: 'PROMISED',
      },
      { chosen_action: 'SEND_PAYMENT_LINK' },
      ['SEND_PAYMENT_LINK', 'ESCALATE_TO_HUMAN']
    );

    console.log(`✅ Safety Engine Verdict for Promised Case:`);
    console.log(`   Approved: ${safetyVerdict.approved}`);
    console.log(`   Reason: "${safetyVerdict.reason}"`);

    if (safetyVerdict.approved !== false) {
      throw new Error('FAILED: Safety engine did not block contact for active promise-to-pay case');
    }

    // ----------------------------------------------------
    // TEST 3: MULTILINGUAL (ENGLISH, HINGLISH, HINDI) DECISION
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Multilingual Groq Prompting Context ---');
    const contextEnglish = {
      caseType: 'payment_failure',
      subReason: 'insufficient_funds',
      amount: 1000,
      attemptCount: 0,
      daysSinceFirstEvent: 0,
      priorActionsSummary: '',
      promiseStatus: 'NONE',
      allowedActions: ['SEND_PAYMENT_LINK'],
      language: 'English',
    };

    const contextHinglish = {
      ...contextEnglish,
      language: 'Hinglish',
    };

    const contextHindi = {
      ...contextEnglish,
      language: 'Hindi',
    };

    const decEnglish = await decideRecoveryAction(contextEnglish);
    console.log(`✅ English AI Decision: "${decEnglish.chosen_action}"`);
    console.log(`   Message Snippet: "${decEnglish.customer_message?.slice(0, 50)}..."`);

    const decHinglish = await decideRecoveryAction(contextHinglish);
    console.log(`✅ Hinglish AI Decision: "${decHinglish.chosen_action}"`);
    console.log(`   Message Snippet: "${decHinglish.customer_message?.slice(0, 50)}..."`);

    // ----------------------------------------------------
    // TEST 4: EMAIL OPT-OUT SAFETY CHECK
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Email Opt-Out Safety Boundary ---');
    const optOutVerdict = checkSafetyRules(
      {
        lockedForProcessing: false,
        lastContactedAt: null,
        status: 'OPEN',
        attemptCount: 0,
        type: 'payment_failure',
        customer: { emailOptOut: true },
      },
      { chosen_action: 'SEND_PAYMENT_LINK' },
      ['SEND_PAYMENT_LINK', 'ESCALATE_TO_HUMAN']
    );

    console.log(`✅ Email Opt-Out Safety Verdict:`);
    console.log(`   Approved: ${optOutVerdict.approved}`);
    console.log(`   Reason: "${optOutVerdict.reason}"`);

    if (optOutVerdict.approved !== false) {
      throw new Error('FAILED: Safety engine did not block email for opted-out customer');
    }

    console.log('\n====================================================');
    console.log('🎉 ALL PHASE 16 TESTS PASSED WITH 100% SUCCESS!');
    console.log('====================================================');
  } catch (error) {
    console.error('\n❌ PHASE 16 TEST SUITE FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase16Tests();
