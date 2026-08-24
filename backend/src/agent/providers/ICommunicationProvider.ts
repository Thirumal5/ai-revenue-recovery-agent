/**
 * Phase 11 — Unified Communication Provider Interface
 *
 * Defines the contract for all messaging providers (Simulated, SendGrid, Twilio).
 * Keeps LLM decisions separated from physical communication infrastructure.
 */

export interface SendMessageRequest {
  caseId: string;
  recipient: string; // Email address or E.164 phone number
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP';
  subject?: string;
  bodyText: string;
  paymentLinkUrl?: string;
  metadata?: Record<string, any>;
}

export interface SendMessageResponse {
  success: boolean;
  provider: 'SENDGRID' | 'TWILIO_SMS' | 'TWILIO_WHATSAPP' | 'SIMULATED';
  providerMessageId?: string;
  deliveryStatus: 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED';
  error?: string;
  isSimulated: boolean;
}

export interface ICommunicationProvider {
  send(req: SendMessageRequest): Promise<SendMessageResponse>;
}
