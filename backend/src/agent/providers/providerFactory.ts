/**
 * Phase 11 — Communication Provider Factory
 *
 * Selects between SIMULATED (default for development/demo) and REAL (SendGrid/Twilio)
 * communication providers based on environment configuration (`COMMUNICATION_MODE=SIMULATED|REAL`).
 */

import { ICommunicationProvider } from './ICommunicationProvider';
import { SimulatedProvider } from './simulatedProvider';
import { SendGridProvider } from './sendgridProvider';
import { TwilioProvider } from './twilioProvider';

export class ProviderFactory {
  static getProvider(channel: 'EMAIL' | 'SMS' | 'WHATSAPP'): ICommunicationProvider {
    const mode = process.env.COMMUNICATION_MODE || 'SIMULATED';

    if (mode === 'REAL') {
      if (channel === 'EMAIL') {
        return new SendGridProvider();
      }
      if (channel === 'SMS' || channel === 'WHATSAPP') {
        return new TwilioProvider();
      }
    }

    // Default: Simulated mode for local development, demo mode, and testing
    return new SimulatedProvider();
  }
}
