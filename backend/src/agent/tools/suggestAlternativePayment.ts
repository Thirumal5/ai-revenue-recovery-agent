import { prisma } from '../../lib/prisma';
import { ProviderFactory } from '../providers/providerFactory';

export interface SuggestAlternativePaymentResult {
  success: boolean;
  messageContent: string;
  simulatedChannel: string;
  providerMessageId?: string;
}

export async function suggestAlternativePayment(
  caseRecord: { id: string },
  customer: { email: string; phone?: string | null },
  customMessage?: string,
  preferredChannel: 'EMAIL' | 'SMS' | 'WHATSAPP' = 'EMAIL'
): Promise<SuggestAlternativePaymentResult> {
  const messageContent =
    customMessage ||
    'Your payment could not be completed with the current payment method. You can try using an alternative payment method (e.g., UPI, Netbanking, or another card) to complete your transaction.';

  const recipient = (preferredChannel === 'EMAIL' ? customer.email : customer.phone) || customer.email || '+15005550006';


  const provider = ProviderFactory.getProvider(preferredChannel);

  const dispatchResult = await provider.send({
    caseId: caseRecord.id,
    recipient: recipient!,
    channel: preferredChannel,
    subject: 'Alternative Payment Method Suggestion',
    bodyText: messageContent,
  });


  await prisma.agentAction.create({
    data: {
      caseId: caseRecord.id,
      actionType: 'TOOL_EXECUTED',
      aiReasoning: `Alternative payment suggestion dispatched via ${dispatchResult.provider} (${preferredChannel})`,
      status: dispatchResult.success ? 'SUCCESS' : 'FAILED',
      metadata: JSON.stringify({
        tool: 'SUGGEST_ALTERNATIVE_PAYMENT',
        channel: preferredChannel,
        provider: dispatchResult.provider,
        providerMessageId: dispatchResult.providerMessageId,
        isSimulated: dispatchResult.isSimulated,
        messageContent,
        sentAt: new Date().toISOString(),
      }),
    },
  });

  console.log(`💡 [${dispatchResult.provider}] Alternative payment suggestion sent via ${preferredChannel} for case ${caseRecord.id}`);

  return {
    success: dispatchResult.success,
    messageContent,
    simulatedChannel: preferredChannel,
    providerMessageId: dispatchResult.providerMessageId,
  };
}

