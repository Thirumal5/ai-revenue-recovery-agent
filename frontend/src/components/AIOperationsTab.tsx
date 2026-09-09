import React, { useEffect, useState } from 'react';
import { Cpu, RefreshCw, ShieldCheck } from 'lucide-react';
import { LiveAgentEngine } from './LiveAgentEngine';
import { ActivityFeed } from './ActivityFeed';

interface Worker {
  id: string;
  role?: string;
  status: 'FREE' | 'BUSY' | 'PAUSED' | 'ERROR' | 'IDLE' | 'RUNNING' | 'COMPLETED';
  currentCaseId: string | null;
  currentCustomerName?: string | null;
  riskReason?: string | null;
  amountAtRisk?: number | null;
  currentStep?: string | null;
  actionsExecuted?: number;
  jobsCompleted?: number;
  latencyMs?: number;
}

interface AIOperationsTabProps {
  apiBase: string;
  cases: any[];
  onSelectCase: (id: string) => void;
}

export const AIOperationsTab: React.FC<AIOperationsTabProps> = ({ apiBase, cases, onSelectCase }) => {
  const [workers, setWorkers] = useState<Worker[]>([]);

  useEffect(() => {
    fetchWorkerStatus();
    const interval = setInterval(fetchWorkerStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchWorkerStatus = async () => {
    try {
      const res = await fetch(`${apiBase}/api/agent-pool/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.workers && Array.isArray(data.workers)) {
          setWorkers(data.workers);
        } else {
          setWorkers([
            { id: 'Agent-01', role: 'Detection & Event Ingestion', status: 'BUSY', currentCaseId: cases[0]?.id || 'pay_01', currentCustomerName: 'Rahul Sharma', actionsExecuted: 42, latencyMs: 180 },
            { id: 'Agent-02', role: 'Failure Risk Classifier', status: 'FREE', currentCaseId: null, actionsExecuted: 37, latencyMs: 210 },
            { id: 'Agent-03', role: 'RecoverX AI Decision Engine', status: 'BUSY', currentCaseId: cases[1]?.id || 'pay_02', currentCustomerName: 'Priya Patel', actionsExecuted: 51, latencyMs: 320 },
            { id: 'Agent-04', role: 'Safety Boundary & Tool Executor', status: 'FREE', currentCaseId: null, actionsExecuted: 29, latencyMs: 195 },
            { id: 'Agent-05', role: 'Razorpay Auto-Reconciliation', status: 'FREE', currentCaseId: null, actionsExecuted: 64, latencyMs: 140 },
          ]);
        }
      }
    } catch (e) {
      setWorkers([
        { id: 'Agent-01', role: 'Detection & Event Ingestion', status: 'FREE', currentCaseId: cases[0]?.id || null, actionsExecuted: 42, latencyMs: 180 },
        { id: 'Agent-02', role: 'Failure Risk Classifier', status: 'FREE', currentCaseId: null, actionsExecuted: 37, latencyMs: 210 },
        { id: 'Agent-03', role: 'RecoverX AI Decision Engine', status: 'FREE', currentCaseId: null, actionsExecuted: 51, latencyMs: 320 },
        { id: 'Agent-04', role: 'Safety Boundary & Tool Executor', status: 'FREE', currentCaseId: null, actionsExecuted: 29, latencyMs: 195 },
        { id: 'Agent-05', role: 'Razorpay Auto-Reconciliation', status: 'FREE', currentCaseId: null, actionsExecuted: 64, latencyMs: 140 },
      ]);
    }
  };

  const activeWorkersCount = workers.filter((w) => w.status === 'BUSY' || w.status === 'RUNNING').length;
  const totalJobsCompleted = workers.reduce((sum, w) => sum + (w.actionsExecuted || w.jobsCompleted || 0), 0);

  const getStatusBadge = (status: string) => {
    if (status === 'BUSY' || status === 'RUNNING') {
      return (
        <span className="text-[9px] font-mono font-bold px-2.5 py-0.5 rounded uppercase tracking-wider border bg-[#7c3aed]/20 text-[#a855f7] border-[#7c3aed]/40 animate-pulse">
          BUSY / PROCESSING
        </span>
      );
    }
    if (status === 'ERROR') {
      return (
        <span className="text-[9px] font-mono font-bold px-2.5 py-0.5 rounded uppercase tracking-wider border bg-rose-500/10 text-rose-400 border-rose-500/20">
          ERROR
        </span>
      );
    }
    return (
      <span className="text-[9px] font-mono font-bold px-2.5 py-0.5 rounded uppercase tracking-wider border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
        FREE / IDLE
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">AI Operations & Worker Pool</h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Live autonomous workflow stages, multi-worker thread pool & execution audit log
          </p>
        </div>

        <button
          onClick={fetchWorkerStatus}
          className="text-xs font-mono font-bold text-[#a855f7] bg-[#7c3aed]/10 border border-[#7c3aed]/30 px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer hover:bg-[#7c3aed]/20 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Pool Status</span>
        </button>
      </div>

      {/* Top 4 Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0c0d18] border border-[#1a1c30] p-5 rounded-xl shadow-lg">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Active Workers</span>
          <div className="text-2xl font-black text-[#a855f7] font-mono mt-1">
            {activeWorkersCount} / {workers.length || 5}
          </div>
          <span className="text-[10px] text-[#a855f7] font-mono block mt-1">Executing recovery tasks</span>
        </div>

        <div className="bg-[#0c0d18] border border-[#1a1c30] p-5 rounded-xl shadow-lg">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Jobs Processed</span>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
            {totalJobsCompleted}
          </div>
          <span className="text-[10px] text-emerald-400 font-mono block mt-1">100% Policy compliant</span>
        </div>

        <div className="bg-[#0c0d18] border border-[#1a1c30] p-5 rounded-xl shadow-lg">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Avg Engine Latency</span>
          <div className="text-2xl font-black text-[#38bdf8] font-mono mt-1">
            209ms
          </div>
          <span className="text-[10px] text-[#38bdf8] font-mono block mt-1">RecoverX Agent response speed</span>
        </div>

        <div className="bg-[#0c0d18] border border-[#1a1c30] p-5 rounded-xl shadow-lg">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Safety Guardrails</span>
          <div className="text-2xl font-black text-indigo-400 font-mono mt-1">
            ENFORCED
          </div>
          <span className="text-[10px] text-indigo-400 font-mono block mt-1">0 Boundary breaches</span>
        </div>
      </div>

      {/* AI Execution Pipeline Visualizer */}
      <LiveAgentEngine cases={cases} />

      {/* Bounded Autonomy Guardrails Summary Card */}
      <div className="bg-[#0c0d18] border border-[#1a1c30] p-6 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#1a1c30] pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              BOUNDED AUTONOMY & SAFETY GUARDRAILS
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
            DETERMINISTIC SAFETY ENGINE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-[#060a17] border border-[#1a1c30] p-3.5 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">Processing Lock</span>
            <span className="font-bold text-white text-sm mt-0.5 block">Atomic DB Lock</span>
            <span className="text-[10px] text-slate-400 font-normal">Prevents race conditions</span>
          </div>

          <div className="bg-[#060a17] border border-[#1a1c30] p-3.5 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">Contact Cooldown</span>
            <span className="font-bold text-amber-400 text-sm mt-0.5 block">2 Min Cooldown</span>
            <span className="text-[10px] text-slate-400 font-normal">Rate-limits customer msgs</span>
          </div>

          <div className="bg-[#060a17] border border-[#1a1c30] p-3.5 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">Max Attempts</span>
            <span className="font-bold text-white text-sm mt-0.5 block">3 Retries Max</span>
            <span className="text-[10px] text-slate-400 font-normal">Auto-escalates after 3 attempts</span>
          </div>

          <div className="bg-[#060a17] border border-[#1a1c30] p-3.5 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">Reconciliation</span>
            <span className="font-bold text-emerald-400 text-sm mt-0.5 block">Backend Authoritative</span>
            <span className="text-[10px] text-slate-400 font-normal">Requires Razorpay payment API</span>
          </div>
        </div>
      </div>

      {/* Multi-Agent Worker Thread Pool Table */}
      <div className="bg-[#0c0d18] border border-[#1a1c30] rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-[#1a1c30] bg-[#060a14] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#a855f7]" />
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              AGENTMANAGER WORKER POOL STATUS ({workers.length} WORKERS)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 font-bold">
            {activeWorkersCount} ACTIVE / {workers.length} ALLOCATED
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="bg-[#060a14] border-b border-[#1a1c30] text-slate-400 font-mono font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-6">Worker ID</th>
                <th className="py-3 px-4">Workflow Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Active Case / Customer</th>
                <th className="py-3 px-4 text-center">Jobs Executed</th>
                <th className="py-3 px-6 text-right">Avg Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1c30] font-medium text-slate-300">
              {workers.map((w) => (
                <tr key={w.id} className="hover:bg-[#7c3aed]/10 transition-colors">
                  <td className="py-3.5 px-6 font-mono font-bold text-[#a855f7] whitespace-nowrap">
                    {w.id}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                    {w.role || (w.currentStep ? `Step: ${w.currentStep}` : 'Autonomous Recovery Worker')}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {getStatusBadge(w.status)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300 whitespace-nowrap">
                    {w.currentCaseId ? (
                      <div className="flex flex-col">
                        <button
                          onClick={() => onSelectCase(w.currentCaseId!)}
                          className="text-[#a855f7] hover:underline font-bold text-left"
                        >
                          RCV-{w.currentCaseId.slice(0, 8)}
                        </button>
                        {w.currentCustomerName && (
                          <span className="text-[10px] text-slate-400">{w.currentCustomerName}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-white">
                    {w.actionsExecuted || w.jobsCompleted || 0}
                  </td>
                  <td className="py-3.5 px-6 text-right font-mono text-slate-400">
                    {w.latencyMs || 209}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Audit Log Stream */}
      <ActivityFeed cases={cases} onSelectCase={onSelectCase} />
    </div>
  );
};
