import React, { useEffect, useState } from 'react';
import { Cpu, Activity, Zap, ArrowDown, Play } from 'lucide-react';

export interface WorkerState {
  id: string;
  status: 'FREE' | 'BUSY' | 'PAUSED' | 'ERROR';
  currentCaseId: string | null;
  currentCustomerName: string | null;
  riskReason: string | null;
  amountAtRisk: number | null;
  currentStep: string | null;
  startedAt: string | null;
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

interface MultiAgentDashboardProps {
  apiBase: string;
  onSelectCase: (caseId: string) => void;
}

export const MultiAgentDashboard: React.FC<MultiAgentDashboardProps> = ({ apiBase, onSelectCase }) => {
  const [poolStatus, setPoolStatus] = useState<PoolStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [batchCount, setBatchCount] = useState<number>(10);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchMessage, setDispatchMessage] = useState<string | null>(null);

  const fetchPoolStatus = async () => {
    try {
      const res = await fetch(`${apiBase}/api/agent-pool/status`);
      if (res.ok) {
        const data = await res.json();
        setPoolStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch agent pool status', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoolStatus();
    const interval = setInterval(fetchPoolStatus, 1500);
    return () => clearInterval(interval);
  }, [apiBase]);

  const handleCapacityChange = async (newCapacity: number) => {
    try {
      const res = await fetch(`${apiBase}/api/agent-pool/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxWorkers: newCapacity }),
      });
      if (res.ok) {
        const data = await res.json();
        setPoolStatus(data.poolStatus);
      }
    } catch (err) {
      console.error('Failed to update worker pool capacity', err);
    }
  };

  const handleDispatchBatch = async () => {
    setIsDispatching(true);
    setDispatchMessage(`Dispatching ${batchCount} cases across worker pool...`);
    try {
      const res = await fetch(`${apiBase}/api/recovery/batch-parallel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: batchCount }),
      });
      if (res.ok) {
        const data = await res.json();
        setDispatchMessage(`✅ ${data.message}`);
        fetchPoolStatus();
      } else {
        setDispatchMessage('❌ Failed to dispatch batch recovery.');
      }
    } catch (err) {
      console.error('Failed to run batch parallel recovery', err);
      setDispatchMessage('❌ Network error during batch dispatch.');
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white tracking-tight">Multi-Agent Worker Pool</h1>
            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase">
              PARALLEL ARCHITECTURE
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            Concurrent recovery agents executing atomic case resolution with DB locking & audit attribution
          </p>
        </div>

        {/* Capacity Scaler Controls */}
        <div className="bg-[#0a0a0f] border border-white/10 p-2 rounded-2xl shadow-md flex items-center gap-3">
          <span className="text-xs font-bold text-zinc-400 pl-2">Worker Pool Slots:</span>
          <div className="flex items-center gap-1">
            {[3, 5, 8, 10].map((cap) => (
              <button
                key={cap}
                onClick={() => handleCapacityChange(cap)}
                className={`px-3 py-1 text-xs font-black rounded-xl transition-all ${
                  poolStatus?.maxWorkers === cap
                    ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.4)]'
                    : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                }`}
              >
                {cap} Workers
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Network Topology Diagram */}
      <div className="bg-[#0a0a0f]/90 border border-white/10 p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-400" />
            <span>AGENT WORKFORCE TOPOLOGY NETWORK</span>
          </h3>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            AUTONOMOUS ROUTING
          </span>
        </div>

        <div className="flex flex-col items-center py-4 space-y-2 relative">
          {/* Node 1: Detection */}
          <div className="bg-[#12121a] border border-blue-500/40 text-blue-300 font-black text-xs px-6 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <span>DETECTION AGENT</span>
          </div>

          <ArrowDown className="w-4 h-4 text-zinc-600 animate-bounce" />

          {/* Node 2: Risk */}
          <div className="bg-[#12121a] border border-amber-500/40 text-amber-300 font-black text-xs px-6 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>RISK CLASSIFIER AGENT</span>
          </div>

          <ArrowDown className="w-4 h-4 text-zinc-600 animate-bounce" />

          {/* Node 3: RecoverX AI Decision */}
          <div className="bg-[#12121a] border border-purple-500/40 text-purple-300 font-black text-xs px-6 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-400" />
            <span>RECOVERX AI DECISION AGENT</span>
          </div>

          <ArrowDown className="w-4 h-4 text-zinc-600 animate-bounce" />

          {/* Branching Nodes */}
          <div className="grid grid-cols-2 gap-8 w-full max-w-md pt-2">
            <div className="bg-[#12121a] border border-emerald-500/40 text-emerald-300 font-black text-xs p-3 rounded-xl shadow-lg text-center">
              <span>RECOVERY AGENT</span>
              <span className="text-[9px] font-normal text-zinc-400 block mt-0.5">Email & Link Dispatch</span>
            </div>

            <div className="bg-[#12121a] border border-rose-500/40 text-rose-300 font-black text-xs p-3 rounded-xl shadow-lg text-center">
              <span>ESCALATION AGENT</span>
              <span className="text-[9px] font-normal text-zinc-400 block mt-0.5">Human Hand-off</span>
            </div>
          </div>
        </div>
      </div>

      {/* Batch Dispatcher */}
      <div className="bg-gradient-to-r from-purple-950/60 via-[#0a0a0f] to-indigo-950/60 border border-purple-500/30 p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-black text-xs text-white uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" />
            <span>BATCH PARALLEL SIMULATION DISPATCHER</span>
          </h3>
          <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
            Demonstrate real-time parallel execution across worker pool
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={batchCount}
            onChange={(e) => setBatchCount(Number(e.target.value))}
            className="bg-[#12121a] text-white border border-white/10 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer"
          >
            <option value={5}>5 Cases</option>
            <option value={10}>10 Cases</option>
            <option value={15}>15 Cases</option>
            <option value={20}>20 Cases</option>
          </select>

          <button
            onClick={handleDispatchBatch}
            disabled={isDispatching}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>{isDispatching ? 'Dispatching...' : 'Launch Batch'}</span>
          </button>
        </div>
      </div>

      {dispatchMessage && (
        <div className="p-4 rounded-xl bg-purple-500/10 text-purple-200 text-xs font-bold border border-purple-500/30 flex items-center justify-between">
          <span>{dispatchMessage}</span>
          <button onClick={() => setDispatchMessage(null)} className="text-purple-400 hover:text-purple-200">✕</button>
        </div>
      )}

      {/* Live Worker Pool Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
            <span>LIVE WORKER SLOTS ({poolStatus?.workers.length || 0})</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </h2>
          <span className="text-[10px] text-zinc-500 font-mono">Auto-polling (1.5s)</span>
        </div>

        {loading ? (
          <div className="bg-[#0a0a0f] p-12 rounded-2xl border border-white/10 text-center text-xs text-zinc-400">
            Loading worker pool status...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {poolStatus?.workers.map((worker) => (
              <div
                key={worker.id}
                className={`bg-[#0a0a0f]/90 border rounded-2xl p-5 shadow-lg relative overflow-hidden ${
                  worker.status === 'BUSY'
                    ? 'border-purple-500/60 ring-2 ring-purple-500/20'
                    : 'border-white/10'
                }`}
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-white font-black text-xs flex items-center justify-center font-mono">
                      {worker.id.replace('Agent-', '#')}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-white text-xs">{worker.id}</h3>
                      <span className="text-[10px] text-zinc-500 font-medium block">
                        {worker.actionsExecuted} jobs completed
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] font-black px-2.5 py-0.5 rounded-full border uppercase font-mono ${
                      worker.status === 'BUSY'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 animate-pulse'
                        : worker.status === 'FREE'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {worker.status}
                  </span>
                </div>

                {worker.status === 'BUSY' && worker.currentCaseId ? (
                  <div className="space-y-2 text-xs">
                    <div className="bg-purple-500/10 p-3 rounded-xl border border-purple-500/20">
                      <span className="text-[9px] font-bold text-purple-300 uppercase block">Customer</span>
                      <span className="font-bold text-white text-xs block mt-0.5">
                        {worker.currentCustomerName || 'Processing Case...'}
                      </span>
                      <button
                        onClick={() => onSelectCase(worker.currentCaseId!)}
                        className="text-[10px] font-bold text-purple-400 hover:underline mt-1 block font-mono"
                      >
                        Case ID: {worker.currentCaseId.slice(0, 10)}... →
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-zinc-500 bg-white/[0.02] rounded-xl border border-dashed border-white/5">
                    <span className="text-xs font-bold text-zinc-400 block">Worker Available</span>
                    <span className="text-[10px] text-zinc-500 block mt-0.5">Awaiting next case assignment</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
