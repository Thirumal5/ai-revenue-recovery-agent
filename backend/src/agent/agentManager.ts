/**
 * Phase 17 — Multi-Agent Worker Pool Manager
 *
 * Implements a configurable parallel worker pool (MAX_RECOVERY_AGENTS = 5 to 10).
 * Rules:
 * 1. 1 customer/case -> 1 agent worker at a time.
 * 2. An agent cannot take another case until its current case reaches a safe completion/pause state.
 * 3. Never assign the same case to two agents (atomic database claiming).
 * 4. Queueing mechanism when all agents are busy.
 * 5. Case state remains source of truth (Promise-to-Pay / waiting safely releases worker).
 */

import { prisma } from '../lib/prisma';
import { processCase } from './orchestrator';

export interface WorkerState {
  id: string;
  status: 'FREE' | 'BUSY' | 'PAUSED' | 'ERROR';
  currentCaseId: string | null;
  currentCustomerName: string | null;
  riskReason: string | null;
  amountAtRisk: number | null;
  currentStep: string | null;
  startedAt: Date | null;
  actionsExecuted: number;
}

export interface PoolStatus {
  maxWorkers: number;
  activeWorkersCount: number;
  busyWorkersCount: number;
  freeWorkersCount: number;
  queuedCasesCount: number;
  workers: WorkerState[];
  queuedCaseIds: string[];
}

class AgentManager {
  private workers: Map<string, WorkerState> = new Map();
  private maxWorkers: number = 5;
  private queuedCases: string[] = [];

  constructor() {
    this.initPool();
  }

  /**
   * Reads MAX_RECOVERY_AGENTS from env (clamped 1..10, default 5)
   */
  public initPool() {
    const envVal = parseInt(process.env.MAX_RECOVERY_AGENTS || '5', 10);
    this.maxWorkers = isNaN(envVal) ? 5 : Math.max(1, Math.min(10, envVal));

    this.workers.clear();
    for (let i = 1; i <= this.maxWorkers; i++) {
      const id = `Agent-${i.toString().padStart(2, '0')}`;
      this.workers.set(id, {
        id,
        status: 'FREE',
        currentCaseId: null,
        currentCustomerName: null,
        riskReason: null,
        amountAtRisk: null,
        currentStep: 'IDLE',
        startedAt: null,
        actionsExecuted: 0,
      });
    }
    console.log(`🤖 AgentManager initialized with ${this.maxWorkers} worker slots.`);
  }

  public setMaxWorkers(count: number): number {
    const clamped = Math.max(1, Math.min(10, count));
    process.env.MAX_RECOVERY_AGENTS = clamped.toString();
    this.initPool();
    return this.maxWorkers;
  }

  public getMaxWorkers(): number {
    return this.maxWorkers;
  }

  /**
   * Returns complete real-time worker pool state
   */
  public getPoolStatus(): PoolStatus {
    const workersList = Array.from(this.workers.values());
    const busyCount = workersList.filter(w => w.status === 'BUSY').length;
    const freeCount = workersList.filter(w => w.status === 'FREE').length;

    return {
      maxWorkers: this.maxWorkers,
      activeWorkersCount: this.workers.size,
      busyWorkersCount: busyCount,
      freeWorkersCount: freeCount,
      queuedCasesCount: this.queuedCases.length,
      workers: workersList,
      queuedCaseIds: [...this.queuedCases],
    };
  }

  /**
   * Atomically claims a case for a FREE worker and starts processing
   */
  public async assignCaseToWorker(caseId: string, preferredAgentId?: string): Promise<boolean> {
    // Check if case is already assigned/locked in DB
    const existingCase = await prisma.recoveryCase.findUnique({
      where: { id: caseId },
      include: { customer: true },
    });

    if (!existingCase || existingCase.status !== 'OPEN' || existingCase.agentId) {
      // Case not eligible for new worker claim
      return false;
    }

    // Find available free worker
    let targetWorker: WorkerState | undefined;
    if (preferredAgentId && this.workers.get(preferredAgentId)?.status === 'FREE') {
      targetWorker = this.workers.get(preferredAgentId);
    } else {
      targetWorker = Array.from(this.workers.values()).find(w => w.status === 'FREE');
    }

    if (!targetWorker) {
      // All workers busy -> enqueue
      if (!this.queuedCases.includes(caseId)) {
        this.queuedCases.push(caseId);
        await prisma.recoveryCase.update({
          where: { id: caseId },
          data: { agentStatus: 'QUEUED' },
        }).catch(() => {});
      }
      return false;
    }

    // ATOMIC CLAIM: Update DB first
    const claimResult = await prisma.recoveryCase.updateMany({
      where: {
        id: caseId,
        status: 'OPEN',
        agentId: null,
      },
      data: {
        agentId: targetWorker.id,
        agentStatus: 'PROCESSING',
        claimedAt: new Date(),
        lockedForProcessing: false,
      },
    });

    if (claimResult.count === 0) {
      // Another worker claimed it concurrently
      return false;
    }

    // Successfully claimed DB record! Update worker in-memory status
    targetWorker.status = 'BUSY';
    targetWorker.currentCaseId = caseId;
    targetWorker.currentCustomerName = existingCase.customer.name;
    targetWorker.riskReason = existingCase.riskReason;
    targetWorker.amountAtRisk = existingCase.amount;
    targetWorker.currentStep = 'CLASSIFYING';
    targetWorker.startedAt = new Date();
    targetWorker.actionsExecuted += 1;

    // Remove from queue if present
    this.queuedCases = this.queuedCases.filter(id => id !== caseId);

    console.log(`⚡ [AGENT POOL] ${targetWorker.id} assigned Case ${caseId.slice(0, 8)} (${existingCase.customer.name})`);

    // Execute asynchronously (non-blocking for caller)
    setImmediate(() => {
      this.runWorkerPipeline(targetWorker!.id, caseId);
    });

    return true;
  }

  /**
   * Internal pipeline execution for assigned worker
   */
  private async runWorkerPipeline(agentId: string, caseId: string) {
    const worker = this.workers.get(agentId);
    if (!worker) return;

    try {
      worker.currentStep = 'AI_DECISION';

      // Run orchestrator logic
      const result = await processCase(caseId, agentId);

      // Check case final status
      const updatedCase = await prisma.recoveryCase.findUnique({
        where: { id: caseId },
      });

      if (updatedCase) {
        if (updatedCase.promiseToPayStatus === 'PROMISED') {
          await prisma.recoveryCase.update({
            where: { id: caseId },
            data: { agentStatus: 'WAITING', releasedAt: new Date() },
          });
        } else if (['RECOVERED', 'ESCALATED', 'CLOSED_NO_RECOVERY'].includes(updatedCase.status)) {
          await prisma.recoveryCase.update({
            where: { id: caseId },
            data: { agentStatus: 'RELEASED', releasedAt: new Date() },
          });
        } else {
          await prisma.recoveryCase.update({
            where: { id: caseId },
            data: { agentStatus: 'WAITING', releasedAt: new Date() },
          });
        }
      }
    } catch (err: any) {
      console.error(`❌ [AGENT POOL] ${agentId} error processing Case ${caseId}:`, err.message);
      worker.status = 'ERROR';
      await prisma.recoveryCase.update({
        where: { id: caseId },
        data: { agentStatus: 'ERROR', lockedForProcessing: false },
      }).catch(() => {});
    } finally {
      // Always safely release worker to FREE
      worker.status = 'FREE';
      worker.currentCaseId = null;
      worker.currentCustomerName = null;
      worker.riskReason = null;
      worker.amountAtRisk = null;
      worker.currentStep = 'IDLE';
      worker.startedAt = null;

      console.log(`🔓 [AGENT POOL] ${agentId} released Case ${caseId.slice(0, 8)}. Ready for next job.`);

      // Automatically pull next queued case
      this.processNextInQueue();
    }
  }

  /**
   * Checks queue or DB for next unassigned OPEN case
   */
  public async processNextInQueue() {
    const freeWorker = Array.from(this.workers.values()).find(w => w.status === 'FREE');
    if (!freeWorker) return;

    let nextCaseId: string | undefined = this.queuedCases.shift();

    if (!nextCaseId) {
      // Find eligible unassigned OPEN case from DB
      const nextCase = await prisma.recoveryCase.findFirst({
        where: {
          status: 'OPEN',
          agentId: null,
          lockedForProcessing: false,
        },
        orderBy: { createdAt: 'asc' },
      });

      if (nextCase) {
        nextCaseId = nextCase.id;
      }
    }

    if (nextCaseId) {
      await this.assignCaseToWorker(nextCaseId, freeWorker.id);
    }
  }

  /**
   * Creates N synthetic simulation recovery cases and dispatches them across pool
   */
  public async dispatchParallelBatch(count: number = 10, isSimulation: boolean = true): Promise<{
    createdCount: number;
    dispatchedCount: number;
    queuedCount: number;
    cases: any[];
  }> {
    const syntheticScenarios = [
      { type: 'payment_failure', riskReason: 'Insufficient funds in account', amount: 1200 },
      { type: 'payment_failure', riskReason: 'Card expired', amount: 2500 },
      { type: 'subscription_failure', riskReason: 'Mandate execution failed', amount: 890 },
      { type: 'checkout_abandonment', riskReason: 'UPI limit exceeded', amount: 1500 },
      { type: 'invoice_overdue', riskReason: 'Invoice payment overdue by 3 days', amount: 4500 },
      { type: 'payment_failure', riskReason: 'Network timeout during gateway processing', amount: 3100 },
      { type: 'subscription_failure', riskReason: 'Bank account frozen', amount: 750 },
      { type: 'checkout_abandonment', riskReason: 'Authentication failed (3DS challenge)', amount: 1990 },
      { type: 'invoice_overdue', riskReason: 'Vendor payment delayed', amount: 5200 },
      { type: 'payment_failure', riskReason: 'Card daily spending limit exceeded', amount: 2800 },
    ];

    const createdCases: any[] = [];
    let dispatched = 0;
    let queued = 0;

    for (let i = 0; i < count; i++) {
      const scenario = syntheticScenarios[i % syntheticScenarios.length];
      const timestamp = Date.now() + i;
      const email = `batch_worker_${timestamp}@recoverxai.test`;
      const name = `Batch Demo User ${i + 1}`;

      // Find or create customer
      let customer = await prisma.customer.findUnique({ where: { email } });
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            name,
            email,
            phone: `+9198765${Math.floor(10005 + Math.random() * 89999)}`,
            emailOptOut: false,
          },
        });
      }

      // Create Recovery Case
      const caseRecord = await prisma.recoveryCase.create({
        data: {
          customerId: customer.id,
          type: scenario.type,
          amount: scenario.amount,
          status: 'OPEN',
          riskReason: scenario.riskReason,
          isSimulation,
          language: 'English',
        },
      });

      createdCases.push(caseRecord);

      // Attempt immediate worker assignment
      const assigned = await this.assignCaseToWorker(caseRecord.id);
      if (assigned) {
        dispatched++;
      } else {
        queued++;
      }
    }

    return {
      createdCount: createdCases.length,
      dispatchedCount: dispatched,
      queuedCount: queued,
      cases: createdCases,
    };
  }
}

export const agentManager = new AgentManager();
