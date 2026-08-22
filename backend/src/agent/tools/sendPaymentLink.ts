/**
 * TOOL: sendPaymentLink — 🔴 REAL EXECUTION (Razorpay Test Mode API)
 *
 * Creates a REAL Razorpay payment link using the official razorpay npm package
 * in Test Mode. Implements idempotency protection to prevent duplicate link
 * creation if a valid link already exists for the case. Includes rate limit retry.
 *
 * Credentials remain strictly on the backend (.env). Never exposes API secret.
 */

import Razorpay from 'razorpay';
import { prisma } from '../../lib/prisma';

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

export interface PaymentLinkResult {
  success: boolean;
  tool: string;
  paymentLinkUrl?: string;
  paymentLinkId?: string;
  message?: string;
  error?: string;
}

export async function sendPaymentLink(
  caseRecord: { id: string; amount: number; razorpayPaymentLinkId?: string | null },
  customer: { name: string; email: string }
): Promise<PaymentLinkResult> {
  try {
    // --- IDEMPOTENCY CHECK ---
    if (caseRecord.razorpayPaymentLinkId) {
      try {
        const existingLink = await getRazorpay().paymentLink.fetch(caseRecord.razorpayPaymentLinkId);
        if (existingLink && (existingLink.status === 'created' || existingLink.status === 'partially_paid')) {
          console.log(`💳 [IDEMPOTENT REUSE] Existing Razorpay link retrieved: ${existingLink.short_url}`);
          return {
            success: true,
            tool: 'SEND_PAYMENT_LINK',
            paymentLinkUrl: existingLink.short_url,
            paymentLinkId: existingLink.id,
            message: 'Existing active Razorpay payment link reused',
          };
        }
      } catch (fetchErr: any) {
        console.warn(`⚠️ Failed to fetch existing payment link ${caseRecord.razorpayPaymentLinkId}, creating new link:`, fetchErr.message);
      }
    }

    const createPayload = {
      amount: Math.round(caseRecord.amount * 100), // Convert INR to paise
      currency: 'INR',
      description: `Recovery payment for case ${caseRecord.id}`,
      customer: {
        name: customer.name || 'Valued Customer',
        email: customer.email || 'customer@example.com',
      },
      notify: {
        sms: false,
        email: false,
      },
    };

    let paymentLink: any;
    try {
      paymentLink = await getRazorpay().paymentLink.create(createPayload);
    } catch (createErr: any) {
      const errMsg = createErr?.error?.description || createErr?.description || createErr?.message || '';
      if (errMsg.includes('Too many requests') || createErr?.statusCode === 429) {
        console.warn('⚠️ Razorpay rate limit hit. Pausing 1.2s before single retry...');
        await new Promise((r) => setTimeout(r, 1200));
        paymentLink = await getRazorpay().paymentLink.create(createPayload);
      } else {
        throw createErr;
      }
    }

    // Store the real Razorpay link ID on the case record
    await prisma.recoveryCase.update({
      where: { id: caseRecord.id },
      data: { razorpayPaymentLinkId: paymentLink.id },
    });

    console.log(`💳 REAL Razorpay Payment Link created: ${paymentLink.short_url}`);

    return {
      success: true,
      tool: 'SEND_PAYMENT_LINK',
      paymentLinkUrl: paymentLink.short_url,
      paymentLinkId: paymentLink.id,
      message: 'New Razorpay payment link created successfully',
    };
  } catch (error: any) {
    const errorMsg = error?.error?.description || error?.description || error?.message || 'Razorpay API call failed';
    console.error('❌ Razorpay API call failed:', errorMsg);
    return {
      success: false,
      tool: 'SEND_PAYMENT_LINK',
      error: errorMsg,
    };
  }
}
