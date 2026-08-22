/**
 * TOOL: sendPaymentLink — 🔴 REAL EXECUTION (Razorpay Test Mode API)
 *
 * Creates a REAL Razorpay payment link using the official razorpay npm package
 * in Test Mode. This makes a real API call and returns a real short_url that
 * can be clicked to make a test payment.
 *
 * The returned link ID is stored in razorpayPaymentLinkId on the case.
 */

import Razorpay from 'razorpay';
import { prisma } from '../../lib/prisma';

// Lazy-initialized Razorpay instance — created on first use so dotenv has
// already loaded by the time the constructor runs.
let razorpayInstance: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || '',
      key_secret: process.env.RAZORPAY_KEY_SECRET || '',
    });
  }
  return razorpayInstance;
}

interface PaymentLinkResult {
  success: boolean;
  paymentLinkUrl?: string;
  paymentLinkId?: string;
  error?: string;
}

export async function sendPaymentLink(
  caseRecord: { id: string; amount: number },
  customer: { name: string; email: string }
): Promise<PaymentLinkResult> {
  try {
    const paymentLink = await getRazorpay().paymentLink.create({
      amount: Math.round(caseRecord.amount * 100), // Convert back to paise
      currency: 'INR',
      description: `Recovery payment for case ${caseRecord.id}`,
      customer: {
        name: customer.name,
        email: customer.email,
      },
      notify: {
        sms: false,
        email: false,
      },
    });

    // Store the real Razorpay link ID on the case record
    await prisma.recoveryCase.update({
      where: { id: caseRecord.id },
      data: { razorpayPaymentLinkId: paymentLink.id },
    });

    console.log(`💳 REAL Razorpay Payment Link created: ${paymentLink.short_url}`);

    return {
      success: true,
      paymentLinkUrl: paymentLink.short_url,
      paymentLinkId: paymentLink.id,
    };
  } catch (error: any) {
    console.error('❌ Razorpay API call failed:', error.message);
    return {
      success: false,
      error: error.message || 'Razorpay API call failed',
    };
  }
}
