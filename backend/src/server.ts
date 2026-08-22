import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './lib/prisma';
import { processCase } from './agent/orchestrator';
import { startScheduler } from './agent/scheduler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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

// Phase 4: Event Processor Webhook Endpoint
app.post('/webhooks/simulator', async (req, res) => {
  const event = req.body;
  const paymentEntity = event.payload?.payment?.entity;
  
  console.log('\n================================');
  console.log('🚨 SIMULATOR EVENT RECEIVED 🚨');
  console.log(`Event Type: ${event.type}`);
  
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
