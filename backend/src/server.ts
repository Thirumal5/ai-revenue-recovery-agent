import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { prisma } from './lib/prisma';
import { processCase } from './agent/orchestrator';
import { startScheduler } from './agent/scheduler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(
  express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);


// --- Utility: Map raw Razorpay event types to clean case categories ---
function mapEventTypeToCategory(eventType: string): string {
  const mapping: Record<string, string> = {
    'payment.failed':       'payment_failure',
    'subscription.halted':  'subscription_failure',
    'subscription.paused':  'subscription_failure',
    'checkout.abandoned':   'checkout_abandonment',
    'invoice.expired':      'invoice_overdue',
  };
  return mapping[eventType] || 'payment_failure';
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Revenue Recovery Backend is running' });
});

// GET /api/customers - Derived customer-level aggregation from DB
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        cases: {
          include: { actions: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = customers.map((c) => {
      const cases = c.cases || [];
      const totalCases = cases.length;
      const openCases = cases.filter((cs) => cs.status === 'OPEN').length;
      const openOrEscalated = cases.filter((cs) => cs.status === 'OPEN' || cs.status === 'ESCALATED');
      const revenueAtRisk = openOrEscalated.reduce((sum, cs) => sum + cs.amount, 0);
      const recoveredCases = cases.filter((cs) => cs.status === 'RECOVERED');
      const recoveredRevenue = recoveredCases.reduce((sum, cs) => sum + cs.amount, 0);
      const totalExposure = revenueAtRisk + recoveredRevenue;
      const recoveryRate = totalExposure > 0 ? (recoveredRevenue / totalExposure) * 100 : (totalCases > 0 && recoveredCases.length > 0 ? 100 : 0);

      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      if (openCases >= 2 || revenueAtRisk > 100) {
        riskLevel = 'HIGH';
      } else if (openCases === 1) {
        riskLevel = 'MEDIUM';
      }

      return {
        id: c.id,
        name: c.name,
        email: c.email,
        createdAt: c.createdAt,
        totalCases,
        openCases,
        revenueAtRisk,
        recoveredRevenue,
        recoveryRate: Number(recoveryRate.toFixed(1)),
        riskLevel,
        cases,
      };
    });

    res.json(result);
  } catch (error) {
    console.error("Failed to fetch customers:", error);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

// GET /api/analytics - DB-backed analytics aggregation
app.get('/api/analytics', async (req, res) => {
  try {
    const cases = await prisma.recoveryCase.findMany({
      include: { actions: true },
    });

    const totalCases = cases.length;
    const openCasesList = cases.filter((c) => c.status === 'OPEN' || c.status === 'ESCALATED');
    const totalRevenueAtRisk = openCasesList.reduce((sum, c) => sum + c.amount, 0);

    const recoveredCasesList = cases.filter((c) => c.status === 'RECOVERED');
    const recoveredRevenue = recoveredCasesList.reduce((sum, c) => sum + c.amount, 0);

    const openCases = cases.filter((c) => c.status === 'OPEN').length;
    const recoveredCases = recoveredCasesList.length;
    const escalatedCases = cases.filter((c) => c.status === 'ESCALATED').length;
    const closedCases = cases.filter((c) => c.status === 'CLOSED_NO_RECOVERY').length;

    const totalExposure = totalRevenueAtRisk + recoveredRevenue;
    const recoveryRate = totalExposure > 0 ? (recoveredRevenue / totalExposure) * 100 : (totalCases > 0 && recoveredCases > 0 ? 100 : 0);

    const totalAttempts = cases.reduce((sum, c) => sum + c.attemptCount, 0);

    // Distribution aggregations
    const caseTypeDist: Record<string, number> = {};
    const riskReasonDist: Record<string, number> = {};
    const decisionDist: Record<string, number> = {
      'SEND_PAYMENT_LINK': 0,
      'SEND_CARD_UPDATE_REMINDER': 0,
      'SEND_REMINDER': 0,
      'ESCALATE_TO_HUMAN': 0,
      'CLOSE_NO_ACTION': 0,
    };

    let totalDecisions = 0;
    let safetyChecks = 0;
    let approvedActions = 0;
    let blockedActions = 0;
    let toolExecutions = 0;

    cases.forEach((c) => {
      // Case type
      const type = c.type || 'payment_failure';
      caseTypeDist[type] = (caseTypeDist[type] || 0) + 1;

      // Risk reason
      const reason = c.subReason || c.riskReason || 'unknown';
      riskReasonDist[reason] = (riskReasonDist[reason] || 0) + 1;

      // Actions
      (c.actions || []).forEach((act) => {
        if (act.actionType === 'AI_DECISION') {
          totalDecisions++;
          try {
            const meta = JSON.parse(act.metadata || '{}');
            const chosen = meta.chosen_action || 'SEND_PAYMENT_LINK';
            decisionDist[chosen] = (decisionDist[chosen] || 0) + 1;
          } catch (e) {
            decisionDist['SEND_PAYMENT_LINK']++;
          }
        } else if (act.actionType === 'SAFETY_CHECK') {
          safetyChecks++;
          if (act.status === 'SUCCESS') approvedActions++;
          else blockedActions++;
        } else if (act.actionType === 'TOOL_EXECUTED' && act.status === 'SUCCESS') {
          toolExecutions++;
        }
      });
    });

    res.json({
      totalRevenueAtRisk,
      recoveredRevenue,
      recoveryRate: Number(recoveryRate.toFixed(1)),
      totalCases,
      openCases,
      recoveredCases,
      escalatedCases,
      closedCases,
      totalAttempts,
      averageAttemptsPerCase: totalCases > 0 ? Number((totalAttempts / totalCases).toFixed(1)) : 0,
      caseTypeDistribution: caseTypeDist,
      riskReasonDistribution: riskReasonDist,
      agentDecisionDistribution: decisionDist,
      agentPerformance: {
        casesProcessed: totalCases,
        totalDecisions,
        safetyChecks,
        approvedActions,
        blockedActions,
        toolExecutions,
      },
    });
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// GET /api/settings/config - Safe non-sensitive system settings
app.get('/api/settings/config', (req, res) => {
  res.json({
    autonomousEngine: {
      status: 'ACTIVE',
      scheduler: 'Running',
      scanInterval: '30 seconds',
      cooldown: '2 minutes (Demo Mode)',
      processing: 'Background / Autonomous',
    },
    aiConfig: {
      provider: 'Groq',
      model: 'llama-3.3-70b-versatile',
      decisionMode: 'Structured JSON',
      role: 'Recovery Decision Engine',
      description: 'Groq evaluates allowed recovery actions and selects the most appropriate strategy. Deterministic safety rules validate decisions before tool execution.',
    },
    paymentIntegration: {
      provider: 'Razorpay',
      environment: 'Test Mode',
      paymentLinks: 'Enabled',
      credentialsStatus: 'Secured (Backend Only)',
      securityNotice: 'API credentials are securely stored on the backend and are never exposed to the frontend.',
    },
    safetyEngine: {
      status: 'ENABLED',
      rules: [
        { name: 'Processing Lock', description: 'Prevents race conditions using atomic update locks' },
        { name: 'Allowed Actions Boundary', description: 'Strict policy boundary restricting AI tools' },
        { name: 'Customer Contact Cooldown', description: 'Enforces 2m contact cooldown for customer messages' },
        { name: 'Terminal Case Protection', description: 'Prevents modifying completed cases' },
      ],
    },
    database: {
      type: 'SQLite (Prisma ORM)',
      entities: ['RecoveryCase', 'Customer', 'AgentAction'],
      status: 'Connected',
    },
  });
});

// Phase 11 Part A: Real Razorpay Webhook Ingestion with Signature Verification
app.post('/webhooks/razorpay', async (req: any, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  // FAIL CLOSED RULE: Missing webhook secret yields 503 Service Unavailable
  if (!secret) {
    console.error('❌ [RAZORPAY WEBHOOK] RAZORPAY_WEBHOOK_SECRET not configured in environment. Failing closed.');
    res.status(503).json({ error: 'Webhook secret not configured in environment' });
    return;
  }

  // Signature verification using HMAC SHA256
  const signature = req.headers['x-razorpay-signature'] as string;
  if (!signature) {
    console.error('❌ [RAZORPAY WEBHOOK] Missing x-razorpay-signature header');
    res.status(401).json({ error: 'Missing x-razorpay-signature header' });
    return;
  }

  const rawBody = req.rawBody || JSON.stringify(req.body);
  const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  if (signature !== expectedSignature) {
    console.error('❌ [RAZORPAY WEBHOOK] Invalid Razorpay webhook signature');
    res.status(401).json({ error: 'Invalid Razorpay webhook signature' });
    return;
  }

  const event = req.body;
  const eventId = (req.headers['x-razorpay-event-id'] as string) || event.event_id || event.id;

  console.log(`\n==================================================`);
  console.log(`💳 VERIFIED RAZORPAY WEBHOOK RECEIVED: ${event.type}`);
  console.log(`   Event ID: ${eventId || 'N/A'}`);
  console.log(`==================================================\n`);

  // Idempotency Check: prevent duplicate event processing
  if (eventId) {
    const existingAction = await prisma.agentAction.findFirst({
      where: {
        metadata: {
          contains: eventId,
        },
      },
    });
    if (existingAction) {
      console.log(`⚠️ Duplicate Razorpay webhook event ${eventId} ignored.`);
      res.json({ status: 'ignored', reason: 'duplicate_event', eventId });
      return;
    }
  }

  // Official Razorpay Event Types: payment.captured, payment_link.paid, order.paid
  const successEvents = ['payment.captured', 'payment_link.paid', 'order.paid'];

  if (successEvents.includes(event.type)) {
    const paymentEntity = event.payload?.payment?.entity;
    const paymentLinkEntity = event.payload?.payment_link?.entity;
    const orderEntity = event.payload?.order?.entity;

    const plinkId = paymentLinkEntity?.id || paymentEntity?.payment_link_id;
    const orderId = orderEntity?.id || paymentEntity?.order_id;
    const caseIdInNotes = paymentEntity?.notes?.caseId || paymentLinkEntity?.notes?.caseId;
    const email = paymentEntity?.email || paymentLinkEntity?.customer?.email;

    let targetCase = null;

    if (caseIdInNotes) {
      targetCase = await prisma.recoveryCase.findUnique({ where: { id: caseIdInNotes } });
    }
    if (!targetCase && plinkId) {
      targetCase = await prisma.recoveryCase.findFirst({
        where: { razorpayPaymentLinkId: plinkId, status: 'OPEN' },
      });
    }
    if (!targetCase && email) {
      targetCase = await prisma.recoveryCase.findFirst({
        where: { customer: { email }, status: 'OPEN' },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (targetCase) {
      if (targetCase.status === 'RECOVERED') {
        console.log(`ℹ️ Case ${targetCase.id} is already RECOVERED. Ignoring duplicate event.`);
        res.json({ status: 'already_recovered', caseId: targetCase.id });
        return;
      }

      await prisma.recoveryCase.update({
        where: { id: targetCase.id },
        data: {
          status: 'RECOVERED',
          observationOutcome: 'RECOVERED',
          lockedForProcessing: false,
        },
      });

      const amountPaid = (paymentEntity?.amount || paymentLinkEntity?.amount || orderEntity?.amount_paid || 0) / 100;

      await prisma.agentAction.create({
        data: {
          caseId: targetCase.id,
          actionType: 'OBSERVATION',
          aiReasoning: `Verified Razorpay payment success event (${event.type}) received. Revenue recovered!`,
          status: 'SUCCESS',
          metadata: JSON.stringify({
            eventId,
            event: event.type,
            paymentId: paymentEntity?.id,
            paymentLinkId: plinkId,
            orderId,
            amount: amountPaid,
            verified: true,
          }),
        },
      });

      console.log(`🎉 Case ${targetCase.id} successfully updated to RECOVERED via verified Razorpay webhook!`);
      res.json({ status: 'RECOVERED', caseId: targetCase.id, amount: amountPaid });
      return;
    }
  }

  res.json({ status: 'received', event: event.type });
});

// Phase 4 & Phase 11: Event Processor Webhook Endpoint
app.post('/webhooks/simulator', async (req, res) => {
  const event = req.body;
  const paymentEntity = event.payload?.payment?.entity || event.payload?.payment_link?.entity;
  
  console.log('\n================================');
  console.log('🚨 EVENT RECEIVED AT WEBHOOK 🚨');
  console.log(`Event Type: ${event.type}`);
  
  // Payment Recovery Match: Payment captured or Payment Link Paid
  if (event.type === 'payment.captured' || event.type === 'payment_link.paid') {
    const plinkId = paymentEntity?.id || event.payload?.payment_link?.entity?.id;
    const email = paymentEntity?.email;

    let targetCase = null;
    if (plinkId) {
      targetCase = await prisma.recoveryCase.findFirst({
        where: { razorpayPaymentLinkId: plinkId, status: 'OPEN' },
      });
    }
    if (!targetCase && email) {
      targetCase = await prisma.recoveryCase.findFirst({
        where: { customer: { email }, status: 'OPEN' },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (targetCase) {
      await prisma.recoveryCase.update({
        where: { id: targetCase.id },
        data: { status: 'RECOVERED', observationOutcome: 'RECOVERED' },
      });

      await prisma.agentAction.create({
        data: {
          caseId: targetCase.id,
          actionType: 'OBSERVATION',
          aiReasoning: `Payment captured via Razorpay webhook event (${event.type}). Revenue recovered!`,
          status: 'SUCCESS',
          metadata: JSON.stringify({
            event: event.type,
            paymentId: paymentEntity?.id,
            amount: (paymentEntity?.amount || 0) / 100,
          }),
        },
      });

      console.log(`🎉 Case ${targetCase.id} updated to RECOVERED via Razorpay payment event!`);
      res.json({ status: 'RECOVERED', caseId: targetCase.id });
      return;
    }
  }

  if (!paymentEntity?.email) {
    res.status(400).json({ error: "Missing email" });
    return;
  }

  try {
    // 1. Find or create Customer
    let customer = await prisma.customer.findUnique({
      where: { email: paymentEntity.email }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          email: paymentEntity.email,
          name: paymentEntity.email.split('@')[0], 
          phone: paymentEntity.contact || null,
        }
      });
      console.log(`👤 Created new Customer: ${customer.email}`);
    } else {
      console.log(`👤 Found existing Customer: ${customer.email}`);
    }

    // 2. Create Recovery Case
    const recoveryCase = await prisma.recoveryCase.create({
      data: {
        customerId: customer.id,
        type: mapEventTypeToCategory(event.type),
        amount: paymentEntity.amount / 100, 
        status: "OPEN",
        riskReason: paymentEntity.error_description || "Unknown"
      }
    });

    console.log(`Created Recovery Case: ${recoveryCase.id}`);
    console.log(`Case Type: ${recoveryCase.type}`);
    console.log(`Failure Reason: ${recoveryCase.riskReason}`);
    console.log('================================\n');

    // 3. Component 3: Trigger processCase asynchronously (non-blocking)
    processCase(recoveryCase.id).catch((err) => {
      console.error(`⚠️ Auto-processing failed for case ${recoveryCase.id}:`, err);
    });
    
    // Webhook immediately returns non-blocking response
    res.json({ 
      status: 'received', 
      caseId: recoveryCase.id 
    });
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ error: "Database operation failed" });
  }
});

// Phase 11: SendGrid Webhook Endpoint (Status Callbacks)
app.post('/webhooks/providers/sendgrid', async (req, res) => {
  const events = Array.isArray(req.body) ? req.body : [req.body];
  for (const evt of events) {
    const msgId = evt.sg_message_id || evt.message_id;
    if (msgId) {
      const statusMap: Record<string, string> = {
        delivered: 'DELIVERED',
        bounce: 'BOUNCED',
        dropped: 'FAILED',
        deferred: 'QUEUED',
      };
      const deliveryStatus = statusMap[evt.event] || evt.event?.toUpperCase() || 'SENT';
      await prisma.messageLog.updateMany({
        where: { providerMessageId: msgId },
        data: { deliveryStatus, errorDetails: evt.reason || null },
      });
    }
  }
  res.json({ status: 'ok' });
});

// Phase 11: Twilio Webhook Endpoint (SMS / WhatsApp Status Callbacks)
app.post('/webhooks/providers/twilio', async (req, res) => {
  const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;
  if (MessageSid) {
    const deliveryStatus = MessageStatus ? MessageStatus.toUpperCase() : 'SENT';
    await prisma.messageLog.updateMany({
      where: { providerMessageId: MessageSid },
      data: {
        deliveryStatus,
        errorDetails: ErrorCode ? `${ErrorCode}: ${ErrorMessage}` : null,
      },
    });
  }
  res.json({ status: 'ok' });
});

// Phase 11: Customer Inbound Opt-Out Webhook
app.post('/webhooks/providers/inbound-optout', async (req, res) => {
  const { recipient, channel, keyword } = req.body;
  if (!recipient) {
    res.status(400).json({ error: 'Missing recipient' });
    return;
  }

  const optKeywords = ['STOP', 'UNSUBSCRIBE', 'OPT-OUT', 'OPTOUT'];
  const isOptOut = !keyword || optKeywords.includes(keyword.toUpperCase());

  if (isOptOut) {
    const customer = await prisma.customer.findFirst({
      where: {
        OR: [{ email: recipient }, { phone: recipient }],
      },
    });

    if (customer) {
      const updateData: Record<string, boolean> = {};
      if (channel === 'SMS') updateData.smsOptOut = true;
      if (channel === 'WHATSAPP') updateData.whatsappOptOut = true;
      if (channel === 'EMAIL') updateData.emailOptOut = true;
      if (!channel) {
        updateData.smsOptOut = true;
        updateData.whatsappOptOut = true;
        updateData.emailOptOut = true;
      }

      await prisma.customer.update({
        where: { id: customer.id },
        data: updateData,
      });

      console.log(`🚫 Customer ${customer.email} opted out of ${channel || 'ALL'} communications`);
      res.json({ status: 'opted_out', customerId: customer.id });
      return;
    }
  }

  res.json({ status: 'ignored' });
});


// Phase 5: AI Agent Process Endpoint (Manual Trigger preserved for testing)
app.post('/api/cases/:id/process', async (req, res) => {
  try {
    console.log(`\n🚀 Manual processing requested for case: ${req.params.id}`);
    const result = await processCase(req.params.id);
    res.json(result);
  } catch (error: any) {
    console.error("Agent Error:", error);
    res.status(500).json({ error: "Agent processing failed", details: error.message });
  }
});

// GET /api/cases/:id (Single case lookup with audit actions)
app.get('/api/cases/:id', async (req, res) => {
  try {
    const caseRecord = await prisma.recoveryCase.findUnique({
      where: { id: req.params.id },
      include: { customer: true, actions: true },
    });
    if (!caseRecord) {
      res.status(404).json({ error: "Case not found" });
      return;
    }
    res.json(caseRecord);
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ error: "Failed to fetch case" });
  }
});

// List all cases (for dashboard)
app.get('/api/cases', async (req, res) => {
  try {
    const cases = await prisma.recoveryCase.findMany({
      include: { customer: true, actions: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(cases);
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ error: "Failed to fetch cases" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
  // Component 4: Start background autonomous agent scheduler
  startScheduler();
});
