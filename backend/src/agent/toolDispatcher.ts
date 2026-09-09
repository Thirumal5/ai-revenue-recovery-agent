/**
 * Component 7 — Centralized Tool Dispatcher & Registry
 *
 * Maps predefined action names chosen by the Groq LLM and approved by the Safety Engine
 * to their respective deterministic execution functions.
 *
 * Execution Order Boundary Enforced:
 * 1. Classifier → 2. Allowed Actions Policy → 3. Groq LLM → 4. Safety Engine → 5. Tool Dispatcher
 */

import { sendPaymentLink } from './tools/sendPaymentLink';
import { sendCardUpdateReminder } from './tools/sendCardUpdateReminder';
import { sendReminder } from './tools/sendReminder';
import { suggestAlternativePayment } from './tools/suggestAlternativePayment';
import { escalateToHuman } from './tools/escalateToHuman';
import { closeCaseNoAction } from './tools/closeCaseNoAction';

export interface ToolExecutionResult {
  success: boolean;
  tool: string;
  paymentLinkId?: string;
  paymentLinkUrl?: string;
  message?: string;
  newStatus?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface CasePayload {
  id: string;
  amount: number;
  razorpayPaymentLinkId?: string | null;
}

export interface CustomerPayload {
  name: string;
  email: string;
  phone?: string | null;
}

export interface AIDecisionPayload {
  chosen_action: string;
  customer_message?: string | null;
  reasoning?: string;
  subReason?: string | null;
  riskReason?: string | null;
}

function buildReasonAwareMessage(
  action: string,
  aiMessage?: string | null,
  subReason?: string | null,
  riskReason?: string | null
): string {
  if (aiMessage && aiMessage.trim().length > 10) {
    return aiMessage;
  }

  const reasonText = `${subReason || ''} ${riskReason || ''}`.toLowerCase();

  if (reasonText.includes('upi') || reasonText.includes('cap') || reasonText.includes('limit')) {
    return 'We noticed your bank daily UPI transfer limit was reached for this transaction. You can complete your payment smoothly by using a credit/debit card, netbanking, or retrying via another UPI app.';
  }
  if (reasonText.includes('card') || reasonText.includes('expire') || reasonText.includes('decline')) {
    return 'Your card appears to have expired or was declined by your issuing bank. Please update your card details or try adding a different debit/credit card to keep your account active without interruption.';
  }
  if (reasonText.includes('fund') || reasonText.includes('balance') || reasonText.includes('insufficient')) {
    return 'We noticed a quick hiccup due to insufficient account balance. We have reserved your account access so you can easily top up and complete your payment with a single click.';
  }
  if (reasonText.includes('timeout') || reasonText.includes('network') || reasonText.includes('gateway')) {
    return 'There was a temporary bank gateway server timeout during your transaction. Please retry your payment using our secure 1-click link.';
  }
  if (reasonText.includes('invoice') || reasonText.includes('overdue') || reasonText.includes('due')) {
    return 'This is a friendly reminder that your invoice payment is currently overdue. Please use the secure link below to complete your payment.';
  }

  if (action === 'SEND_CARD_UPDATE_REMINDER') {
    return 'Please update your card details or try adding a different card to resume your service without interruption.';
  }
  if (action === 'SUGGEST_ALTERNATIVE_PAYMENT') {
    return 'Your payment could not be completed with the primary payment method. Please try using netbanking, UPI, or a different debit/credit card.';
  }

  return 'We noticed your recent payment could not be completed. Please review and complete your payment using our secure link below.';
}

export async function executeTool(
  chosenAction: string,
  caseRecord: CasePayload,
  customer: CustomerPayload,
  aiDecision: AIDecisionPayload
): Promise<ToolExecutionResult> {
  console.log(`🛠️ Tool Dispatcher executing registered tool: "${chosenAction}"`);
  const finalMessage = buildReasonAwareMessage(
    chosenAction,
    aiDecision.customer_message,
    aiDecision.subReason,
    aiDecision.riskReason
  );

  switch (chosenAction) {
    case 'SEND_PAYMENT_LINK': {
      const res = await sendPaymentLink(caseRecord, customer, finalMessage);
      return {
        success: res.success,
        tool: 'SEND_PAYMENT_LINK',
        paymentLinkId: res.paymentLinkId,
        paymentLinkUrl: res.paymentLinkUrl,
        message: res.message || 'Razorpay test payment link created',
        error: res.error,
      };
    }

    case 'SEND_CARD_UPDATE_REMINDER': {
      const res = await sendPaymentLink(caseRecord, customer, finalMessage);
      return {
        success: res.success,
        tool: 'SEND_CARD_UPDATE_REMINDER',
        paymentLinkId: res.paymentLinkId,
        paymentLinkUrl: res.paymentLinkUrl,
        message: res.message || 'Card update reminder dispatched with payment link',
        error: res.error,
      };
    }

    case 'SEND_REMINDER': {
      const res = await sendPaymentLink(caseRecord, customer, finalMessage);
      return {
        success: res.success,
        tool: 'SEND_REMINDER',
        paymentLinkId: res.paymentLinkId,
        paymentLinkUrl: res.paymentLinkUrl,
        message: res.message || 'Payment reminder dispatched with payment link',
        error: res.error,
      };
    }

    case 'SUGGEST_ALTERNATIVE_PAYMENT': {
      const res = await sendPaymentLink(caseRecord, customer, finalMessage);
      return {
        success: res.success,
        tool: 'SUGGEST_ALTERNATIVE_PAYMENT',
        paymentLinkId: res.paymentLinkId,
        paymentLinkUrl: res.paymentLinkUrl,
        message: res.message || 'Alternative payment suggestion dispatched with payment link',
        error: res.error,
      };
    }


    case 'ESCALATE_TO_HUMAN': {
      const reason = aiDecision.reasoning || 'Escalated to human operator by recovery policy';
      const res = await escalateToHuman({ id: caseRecord.id }, reason);
      return {
        success: res.success,
        tool: 'ESCALATE_TO_HUMAN',
        newStatus: res.newStatus,
        message: `Case status updated to ${res.newStatus}`,
      };
    }

    case 'CLOSE_NO_ACTION': {
      const res = await closeCaseNoAction({ id: caseRecord.id });
      return {
        success: res.success,
        tool: 'CLOSE_NO_ACTION',
        newStatus: res.newStatus,
        message: `Case status updated to ${res.newStatus}`,
      };
    }

    default: {
      console.error(`❌ Unregistered or invalid action string: "${chosenAction}"`);
      return {
        success: false,
        tool: chosenAction,
        error: `Action "${chosenAction}" is not a registered internal tool`,
      };
    }
  }
}
