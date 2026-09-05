/**
 * Phase 14 — Resend Email Provider
 *
 * Active when `COMMUNICATION_MODE=REAL` and `RESEND_API_KEY` is configured.
 * Dispatches real transactional emails via the official Resend Node SDK.
 *
 * Security & Integrity Protections:
 * - Credentials loaded strictly from environment variables (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`).
 * - Never returns fake success when credentials are missing or API fails.
 * - Resend API acceptance sets deliveryStatus = 'SENT' (never claims 'DELIVERED' without webhook confirmation).
 * - Never leaks API keys or secrets in logs, responses, or error details.
 */

import { Resend } from 'resend';
import { prisma } from '../../lib/prisma';
import { ICommunicationProvider, SendMessageRequest, SendMessageResponse } from './ICommunicationProvider';

export class ResendProvider implements ICommunicationProvider {
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || '';
    this.fromEmail = process.env.RESEND_FROM_EMAIL || '';
    this.fromName = process.env.RESEND_FROM_NAME || 'RecoverXAI';
  }

  async send(req: SendMessageRequest): Promise<SendMessageResponse> {
    const apiKey = process.env.RESEND_API_KEY || this.apiKey;
    const fromEmail = process.env.RESEND_FROM_EMAIL || this.fromEmail;
    const fromName = process.env.RESEND_FROM_NAME || this.fromName || 'RecoverXAI';

    // 1. Strict Configuration Verification — Fail closed in REAL mode if unconfigured
    if (!apiKey || !fromEmail) {
      const configErr = !apiKey && !fromEmail
        ? 'RESEND_API_KEY and RESEND_FROM_EMAIL are missing from environment'
        : !apiKey
        ? 'RESEND_API_KEY is missing from environment'
        : 'RESEND_FROM_EMAIL is missing from environment';

      console.error(`❌ [RESEND PROVIDER ERROR] ${configErr}`);

      try {
        await prisma.messageLog.create({
          data: {
            caseId: req.caseId,
            channel: 'EMAIL',
            provider: 'RESEND',
            recipient: req.recipient,
            subject: req.subject || 'Payment Recovery Notice',
            bodyText: req.bodyText,
            deliveryStatus: 'FAILED',
            errorDetails: configErr,
          },
        });
      } catch (dbErr) {
        // Ignored if caseId is not in DB during standalone testing
      }

      return {
        success: false,
        provider: 'RESEND',
        deliveryStatus: 'FAILED',
        error: configErr,
        isSimulated: false,
      };
    }

    // 2. Dispatch via Official Resend SDK
    try {
      const resend = new Resend(apiKey);
      const fromHeader = `${fromName} <${fromEmail}>`;

      const { data, error } = await resend.emails.send({
        from: fromHeader,
        to: [req.recipient],
        subject: req.subject || 'Action Required: Payment Recovery Notice',
        text: req.bodyText,
      });

      if (error) {
        const sanitizedErrMsg = error.message ? error.message.replace(/re_[a-zA-Z0-9_]+/g, 're_***') : 'Resend API rejected dispatch request';
        console.error(`❌ [RESEND DISPATCH FAILED] ${sanitizedErrMsg}`);

        try {
          await prisma.messageLog.create({
            data: {
              caseId: req.caseId,
              channel: 'EMAIL',
              provider: 'RESEND',
              recipient: req.recipient,
              subject: req.subject || 'Payment Recovery Notice',
              bodyText: req.bodyText,
              deliveryStatus: 'FAILED',
              errorDetails: sanitizedErrMsg,
            },
          });
        } catch (dbErr) {}

        return {
          success: false,
          provider: 'RESEND',
          deliveryStatus: 'FAILED',
          error: sanitizedErrMsg,
          isSimulated: false,
        };
      }

      const providerMessageId = data?.id || `resend_${Date.now()}`;
      console.log(`📧 [RESEND DISPATCH ACCEPTED] Message ID: ${providerMessageId} | Recipient: ${req.recipient}`);

      // 3. Resend API accepted the request -> Status is SENT (NOT DELIVERED until confirmed)
      try {
        await prisma.messageLog.create({
          data: {
            caseId: req.caseId,
            channel: 'EMAIL',
            provider: 'RESEND',
            providerMessageId,
            recipient: req.recipient,
            subject: req.subject || 'Payment Recovery Notice',
            bodyText: req.bodyText,
            deliveryStatus: 'SENT',
          },
        });
      } catch (dbErr) {}

      return {
        success: true,
        provider: 'RESEND',
        providerMessageId,
        deliveryStatus: 'SENT',
        isSimulated: false,
      };
    } catch (err: any) {
      const safeErr = err?.message ? err.message.replace(/re_[a-zA-Z0-9_]+/g, 're_***') : 'Unexpected error during Resend email dispatch';
      console.error(`❌ [RESEND EXCEPTION] ${safeErr}`);

      try {
        await prisma.messageLog.create({
          data: {
            caseId: req.caseId,
            channel: 'EMAIL',
            provider: 'RESEND',
            recipient: req.recipient,
            subject: req.subject || 'Payment Recovery Notice',
            bodyText: req.bodyText,
            deliveryStatus: 'FAILED',
            errorDetails: safeErr,
          },
        });
      } catch (dbErr) {}

      return {
        success: false,
        provider: 'RESEND',
        deliveryStatus: 'FAILED',
        error: safeErr,
        isSimulated: false,
      };
    }
  }
}
