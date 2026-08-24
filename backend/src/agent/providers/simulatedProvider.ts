/**
 * Phase 11 — Simulated Communication Provider
 *
 * Default provider used during development/demo mode (`COMMUNICATION_MODE=SIMULATED`).
 * Logs message delivery into the MessageLog table without sending real emails/SMS.
 */

import { prisma } from '../../lib/prisma';
import { ICommunicationProvider, SendMessageRequest, SendMessageResponse } from './ICommunicationProvider';

export class SimulatedProvider implements ICommunicationProvider {
  async send(req: SendMessageRequest): Promise<SendMessageResponse> {
    const providerMessageId = `sim_${req.channel.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    console.log(`📡 [SIMULATED PROVIDER] Channel: ${req.channel} | Recipient: ${req.recipient}`);
    console.log(`   Message SID: ${providerMessageId}`);
    console.log(`   Body: "${req.bodyText.slice(0, 80)}${req.bodyText.length > 80 ? '...' : ''}"`);

    // Create MessageLog record in DB
    await prisma.messageLog.create({
      data: {
        caseId: req.caseId,
        channel: req.channel,
        provider: 'SIMULATED',
        providerMessageId,
        recipient: req.recipient,
        subject: req.subject || `${req.channel} Notification`,
        bodyText: req.bodyText,
        deliveryStatus: 'DELIVERED',
      },
    });

    return {
      success: true,
      provider: 'SIMULATED',
      providerMessageId,
      deliveryStatus: 'DELIVERED',
      isSimulated: true,
    };
  }
}
