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
}

export interface AIDecisionPayload {
  chosen_action: string;
  customer_message?: string | null;
  reasoning?: string;
}

export async function executeTool(
  chosenAction: string,
  caseRecord: CasePayload,
  customer: CustomerPayload,
  aiDecision: AIDecisionPayload
): Promise<ToolExecutionResult> {
  console.log(`🛠️ Tool Dispatcher executing registered tool: "${chosenAction}"`);

  switch (chosenAction) {
    case 'SEND_PAYMENT_LINK': {
      const res = await sendPaymentLink(caseRecord, customer);
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
      const msg = aiDecision.customer_message || 'Please update your card details to continue your subscription.';
      const res = await sendCardUpdateReminder({ id: caseRecord.id }, msg);
      return {
        success: res.success,
        tool: 'SEND_CARD_UPDATE_REMINDER',
        message: res.messageContent,
      };
    }

    case 'SEND_REMINDER': {
      const msg = aiDecision.customer_message || 'This is a friendly reminder regarding your pending payment.';
      const res = await sendReminder({ id: caseRecord.id }, msg);
      return {
        success: res.success,
        tool: 'SEND_REMINDER',
        message: res.messageContent,
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
