import { prisma } from '../lib/prisma';
import dotenv from 'dotenv';
import { sendPaymentLink } from './tools/sendPaymentLink';
import { processCase } from './orchestrator';

dotenv.config();

async function runTest() {
  console.log('🧪 Starting Razorpay Strict Verification E2E Test...');

  // 1. Create a Customer
  const customer = await prisma.customer.create({
    data: {
      name: 'Verification Tester',
      email: `tester_${Date.now()}@example.com`,
      phone: '+919876543210',
    }
  });

  // 2. Create a Recovery Case
  const recoveryCase = await prisma.recoveryCase.create({
    data: {
      customerId: customer.id,
      type: 'payment_failure',
      amount: 1500,
      status: 'OPEN',
      riskReason: 'Insufficient Funds',
    }
  });

  console.log(`✅ Case Created: ${recoveryCase.id}`);

  // 3. Create a Razorpay Payment Link
  const result = await sendPaymentLink(
    { id: recoveryCase.id, amount: recoveryCase.amount },
    { name: customer.name, email: customer.email }
  );

  console.log(`✅ Razorpay Link Generated: ${result.paymentLinkUrl}`);
  console.log(`✅ Razorpay Link ID: ${result.paymentLinkId}`);

  const updatedCase = await prisma.recoveryCase.findUnique({ where: { id: recoveryCase.id } });
  
  if (updatedCase?.razorpayPaymentLinkId !== result.paymentLinkId) {
    console.error('❌ Link ID was not saved to DB!');
    process.exit(1);
  }
  console.log('✅ Link ID verified in DB.');

  // 4. Simulate a Verify Request (Since we aren't running Express here, we test the logic via Razorpay directly or rely on the user testing manually)
  // Instead of testing Express route, we verify the Prisma state.
  if (updatedCase?.status !== 'OPEN') {
    console.error('❌ Case should still be OPEN!');
    process.exit(1);
  }
  console.log('✅ Case correctly remains OPEN pending manual verification.');
  
  console.log('\n=============================================');
  console.log('🎉 Automated pre-verification passed successfully!');
  console.log('To test the final verification:');
  console.log(`1. Open this link: ${result.paymentLinkUrl}`);
  console.log('2. Complete the TEST payment.');
  console.log('3. Click "Verify & Complete Payment" on the Frontend Playground.');
  console.log('=============================================\n');

}

runTest().catch(console.error).finally(() => prisma.$disconnect());
