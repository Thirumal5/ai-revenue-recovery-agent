/**
 * Phase 11 — SendGrid Email Provider
 *
 * Active when `COMMUNICATION_MODE=REAL` and `SENDGRID_API_KEY` is configured.
 * Dispatches real transactional emails via SendGrid v3 API.
 */

import { prisma } from '../../lib/prisma';
import { ICommunicationProvider, SendMessageRequest, SendMessageResponse } from './ICommunicationProvider';

export class SendGridProvider implements ICommunicationProvider {
  private apiKey: string;
  private fromEmail: string;

  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY || '';
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'billing@recoverxai.com';
  }

  async send(req: SendMessageRequest): Promise<SendMessageResponse> {
    if (!this.apiKey) {
      console.warn('⚠️ SendGrid API Key missing. Falling back to simulated dispatch for email.');
      const simulatedId = `sg_fallback_${Date.now()}`;
      await prisma.messageLog.create({
        data: {
          caseId: req.caseId,
          channel: 'EMAIL',
          provider: 'SENDGRID',
          providerMessageId: simulatedId,
          recipient: req.recipient,
          subject: req.subject || 'Payment Recovery Notice',
          bodyText: req.bodyText,
          deliveryStatus: 'FAILED',
          errorDetails: 'SENDGRID_API_KEY not configured in environment',
        },
      });
      return {
        success: false,
        provider: 'SENDGRID',
        providerMessageId: simulatedId,
        deliveryStatus: 'FAILED',
        error: 'SENDGRID_API_KEY not configured',
        isSimulated: false,
      };
    }

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: req.recipient }] }],
          from: { email: this.fromEmail, name: 'RecoverXAI Billing' },
          subject: req.subject || 'Action Required: Your Payment Notice',
          content: [
            {
              type: 'text/plain',
              value: req.bodyText,
            },
          ],
        }),
      });

      const messageIdHeader = response.headers.get('x-message-id') || `sg_${Date.now()}`;

      if (response.ok || response.status === 202) {
        await prisma.messageLog.create({
          data: {
            caseId: req.caseId,
            channel: 'EMAIL',
            provider: 'SENDGRID',
            providerMessageId: messageIdHeader,
            recipient: req.recipient,
            subject: req.subject || 'Payment Notice',
            bodyText: req.bodyText,
            deliveryStatus: 'SENT',
          },
        });

        return {
          success: true,
          provider: 'SENDGRID',
          providerMessageId: messageIdHeader,
          deliveryStatus: 'SENT',
          isSimulated: false,
        };
      } else {
        const errorText = await response.text();
        await prisma.messageLog.create({
          data: {
            caseId: req.caseId,
            channel: 'EMAIL',
            provider: 'SENDGRID',
            providerMessageId: messageIdHeader,
            recipient: req.recipient,
            subject: req.subject || 'Payment Notice',
            bodyText: req.bodyText,
            deliveryStatus: 'FAILED',
            errorDetails: errorText,
          },
        });

        return {
          success: false,
          provider: 'SENDGRID',
          providerMessageId: messageIdHeader,
          deliveryStatus: 'FAILED',
          error: `SendGrid API error: ${response.status} - ${errorText}`,
          isSimulated: false,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        provider: 'SENDGRID',
        deliveryStatus: 'FAILED',
        error: err.message,
        isSimulated: false,
      };
    }
  }
}
