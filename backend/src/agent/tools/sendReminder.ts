import { prisma } from '../../lib/prisma';
import { ProviderFactory } from '../providers/providerFactory';

interface ReminderResult {
  success: boolean;
  simulated: boolean;
  messageContent: string;
  providerMessageId?: string;
  channel: string;
}

export async function sendReminder(
  caseRecord: { id: string },
  customer: { name?: string; email: string; phone?: string | null },
  messageText: string,
  preferredChannel: 'EMAIL' | 'SMS' | 'WHATSAPP' = 'EMAIL'
): Promise<ReminderResult> {
  const recipient = (preferredChannel === 'EMAIL' ? customer.email : customer.phone) || customer.email || '+15005550006';
  const greeting = customer.name ? `Hi ${customer.name},\n\n` : `Hi there,\n\n`;
  const fullBody = `${greeting}${messageText}\n\nIf you have any questions or need assistance, we're always here to help.\n\nWarm regards,\nRecoverXAI Support Team`;

  const provider = ProviderFactory.getProvider(preferredChannel);

  const dispatchResult = await provider.send({
    caseId: caseRecord.id,
    recipient: recipient!,
    channel: preferredChannel,
    subject: 'Friendly Check-in Regarding Your Account — RecoverXAI',
    bodyText: fullBody,
  });


  // Log action row to AgentAction table
  await prisma.agentAction.create({
    data: {
      caseId: caseRecord.id,
      actionType: 'TOOL_EXECUTED',
      aiReasoning: `Reminder dispatched via ${dispatchResult.provider} (${preferredChannel})`,
      status: dispatchResult.success ? 'SUCCESS' : 'FAILED',
      metadata: JSON.stringify({
        tool: 'SEND_REMINDER',
        channel: preferredChannel,
        provider: dispatchResult.provider,
        providerMessageId: dispatchResult.providerMessageId,
        isSimulated: dispatchResult.isSimulated,
        messageContent: messageText,
        sentAt: new Date().toISOString(),
      }),
    },
  });

  console.log(`📧 [${dispatchResult.provider}] Reminder sent via ${preferredChannel} for case ${caseRecord.id}`);

  return {
    success: dispatchResult.success,
    simulated: dispatchResult.isSimulated,
    messageContent: messageText,
    providerMessageId: dispatchResult.providerMessageId,
    channel: preferredChannel,
  };
}

