/**
 * Phase 11 — Twilio Provider (SMS & WhatsApp)
 *
 * Active when `COMMUNICATION_MODE=REAL` and Twilio credentials are configured.
 * Dispatches real SMS and WhatsApp messages via Twilio REST API.
 */

import { prisma } from '../../lib/prisma';
import { ICommunicationProvider, SendMessageRequest, SendMessageResponse } from './ICommunicationProvider';

export class TwilioProvider implements ICommunicationProvider {
  private accountSid: string;
  private authToken: string;
  private fromPhone: string;
  private whatsappFromPhone: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.fromPhone = process.env.TWILIO_FROM_PHONE || '+15005550006';
    this.whatsappFromPhone = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
  }

  async send(req: SendMessageRequest): Promise<SendMessageResponse> {
    const isWhatsApp = req.channel === 'WHATSAPP';
    const providerName = isWhatsApp ? 'TWILIO_WHATSAPP' : 'TWILIO_SMS';

    if (!this.accountSid || !this.authToken) {
      console.warn(`⚠️ Twilio credentials missing. Falling back to failed dispatch status for ${req.channel}.`);
      const fallbackId = `tw_fallback_${Date.now()}`;
      await prisma.messageLog.create({
        data: {
          caseId: req.caseId,
          channel: req.channel,
          provider: providerName,
          providerMessageId: fallbackId,
          recipient: req.recipient,
          bodyText: req.bodyText,
          deliveryStatus: 'FAILED',
          errorDetails: 'TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not configured',
        },
      });
      return {
        success: false,
        provider: providerName,
        providerMessageId: fallbackId,
        deliveryStatus: 'FAILED',
        error: 'Twilio credentials not configured in environment',
        isSimulated: false,
      };
    }

    try {
      const fromNumber = isWhatsApp
        ? (this.whatsappFromPhone.startsWith('whatsapp:') ? this.whatsappFromPhone : `whatsapp:${this.whatsappFromPhone}`)
        : this.fromPhone;
      
      const toNumber = isWhatsApp
        ? (req.recipient.startsWith('whatsapp:') ? req.recipient : `whatsapp:${req.recipient}`)
        : req.recipient;

      const authHeader = 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const params = new URLSearchParams({
        To: toNumber,
        From: fromNumber,
        Body: req.bodyText,
      });

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = await response.json();

      if (response.ok && data.sid) {
        await prisma.messageLog.create({
          data: {
            caseId: req.caseId,
            channel: req.channel,
            provider: providerName,
            providerMessageId: data.sid,
            recipient: req.recipient,
            bodyText: req.bodyText,
            deliveryStatus: data.status ? data.status.toUpperCase() : 'QUEUED',
          },
        });

        return {
          success: true,
          provider: providerName,
          providerMessageId: data.sid,
          deliveryStatus: 'QUEUED',
          isSimulated: false,
        };
      } else {
        await prisma.messageLog.create({
          data: {
            caseId: req.caseId,
            channel: req.channel,
            provider: providerName,
            providerMessageId: data.sid || null,
            recipient: req.recipient,
            bodyText: req.bodyText,
            deliveryStatus: 'FAILED',
            errorDetails: data.message || 'Twilio API error',
          },
        });

        return {
          success: false,
          provider: providerName,
          providerMessageId: data.sid || undefined,
          deliveryStatus: 'FAILED',
          error: data.message || 'Twilio API request failed',
          isSimulated: false,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        provider: providerName,
        deliveryStatus: 'FAILED',
        error: err.message,
        isSimulated: false,
      };
    }
  }
}
