"use strict";
/**
 * TOOL: sendPaymentLink — 🔴 REAL EXECUTION (Razorpay Test Mode API)
 *
 * Creates a REAL Razorpay payment link using the official razorpay npm package
 * in Test Mode. Implements idempotency protection to prevent duplicate link
 * creation if a valid link already exists for the case. Includes rate limit retry.
 *
 * Credentials remain strictly on the backend (.env). Never exposes API secret.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPaymentLink = sendPaymentLink;
const razorpay_1 = __importDefault(require("razorpay"));
const prisma_1 = require("../../lib/prisma");
let razorpayInstance = null;
function getRazorpay() {
    if (!razorpayInstance) {
        razorpayInstance = new razorpay_1.default({
            key_id: process.env.RAZORPAY_KEY_ID || '',
            key_secret: process.env.RAZORPAY_KEY_SECRET || '',
        });
    }
    return razorpayInstance;
}
async function sendPaymentLink(caseRecord, customer) {
    try {
        // --- IDEMPOTENCY CHECK ---
        if (caseRecord.razorpayPaymentLinkId) {
            try {
                const existingLink = await getRazorpay().paymentLink.fetch(caseRecord.razorpayPaymentLinkId);
                if (existingLink && typeof existingLink === 'object' && (existingLink.status === 'created' || existingLink.status === 'partially_paid')) {
                    console.log(`💳 [IDEMPOTENT REUSE] Existing Razorpay link retrieved: ${existingLink.short_url}`);
                    return {
                        success: true,
                        tool: 'SEND_PAYMENT_LINK',
                        paymentLinkUrl: existingLink.short_url,
                        paymentLinkId: existingLink.id,
                        message: 'Existing active Razorpay payment link reused',
                    };
                }
            }
            catch (fetchErr) {
                console.warn(`⚠️ Failed to fetch existing payment link ${caseRecord.razorpayPaymentLinkId}, creating new link:`, fetchErr?.message || fetchErr);
            }
        }
        const safeAmount = (caseRecord.amount && caseRecord.amount > 0) ? caseRecord.amount : 1;
        const createPayload = {
            amount: Math.round(safeAmount * 100), // Convert INR to paise (min 1 INR)
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
        let paymentLink = null;
        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                paymentLink = await getRazorpay().paymentLink.create(createPayload);
                break;
            }
            catch (createErr) {
                const errMsg = createErr?.error?.description || createErr?.description || createErr?.message || '';
                if ((errMsg.includes('Too many requests') || createErr?.statusCode === 429) && attempt < maxRetries) {
                    const delay = attempt * 2500;
                    console.warn(`⚠️ Razorpay rate limit hit. Retry ${attempt}/${maxRetries} in ${delay}ms...`);
                    await new Promise((r) => setTimeout(r, delay));
                }
                else {
                    throw createErr;
                }
            }
        }
        if (!paymentLink) {
            throw new Error('Failed to create Razorpay payment link after retries');
        }
        // Store the real Razorpay link ID on the case record
        await prisma_1.prisma.recoveryCase.update({
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
    }
    catch (error) {
        const errorMsg = error?.error?.description || error?.description || error?.message || String(error) || 'Razorpay API call failed';
        console.error('❌ Razorpay API call failed:', errorMsg);
        return {
            success: false,
            tool: 'SEND_PAYMENT_LINK',
            error: errorMsg,
        };
    }
}
