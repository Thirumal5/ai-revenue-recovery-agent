import React, { useState } from 'react';
import { RecoveryCasesTable } from './RecoveryCasesTable';
import type { RecoveryCase } from './RecoveryCasesTable';
import { RecoveryPlayground } from './RecoveryPlayground';
import { CustomerDetailDrawer, type CustomerData } from './CustomerDetailDrawer';
import { Play, Layers, TestTube, Cpu, CheckCircle2 } from 'lucide-react';

interface RecoveryTabProps {
  apiBase?: string;
  cases: RecoveryCase[];
  loading: boolean;
  selectedCaseId: string | null;
  processingCaseId: string | null;
  onSelectCase: (caseId: string) => void;
  onRunAgent: (caseId: string, e: React.MouseEvent) => void;
  onRefresh: () => void;
  onRunSimulation: (eventType: string, riskReason: string, amount: number) => Promise<void>;
  isSimulating: boolean;
}

type SubTabType = 'cases' | 'playground' | 'batch';

export const RecoveryTab: React.FC<RecoveryTabProps> = ({
  apiBase = 'http://localhost:3001',
  cases,
  loading,
  selectedCaseId,
  processingCaseId,
  onSelectCase,
  onRunAgent,
  onRefresh,
}) => {
  const [subTab, setSubTab] = useState<SubTabType>('cases');

  // Customer Drawer State
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);

  // Batch Recovery State
  const [batchCount, setBatchCount] = useState<number>(10);
  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false);
  const [batchSummary, setBatchSummary] = useState<any | null>(null);
  const [batchCases, setBatchCases] = useState<any[]>([]);

  const handleOpenCustomer = async (caseRecord: RecoveryCase) => {
    if (!caseRecord.customerId) return;
    try {
      const res = await fetch(`${apiBase}/api/customers/${caseRecord.customerId}`);
      if (res.ok) {
        const cust = await res.json();
        setSelectedCustomer({
          ...cust,
          revenueAtRisk: cust.cases?.filter((c: any) => c.status === 'OPEN' || c.status === 'ESCALATED').reduce((s: number, c: any) => s + c.amount, 0) || 0,
          recoveredRevenue: cust.cases?.filter((c: any) => c.status === 'RECOVERED').reduce((s: number, c: any) => s + c.amount, 0) || 0,
          openCases: cust.cases?.filter((c: any) => c.status === 'OPEN').length || 0,
          recoveryRate: cust.cases?.length > 0 ? Number(((cust.cases?.filter((c: any) => c.status === 'RECOVERED').length / cust.cases.length) * 100).toFixed(1)) : 0,
          riskLevel: cust.cases?.length > 1 ? 'HIGH' : cust.cases?.length === 1 ? 'MEDIUM' : 'LOW',
        });
      }
    } catch (e) {
      console.error('Failed to fetch customer details', e);
    }
  };

  const handleLaunchBatch = async () => {
    setIsBatchRunning(true);
    setBatchSummary(null);
    setBatchCases([]);

    try {
      const res = await fetch(`${apiBase}/api/recovery/batch-simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: batchCount }),
      });

      if (res.ok) {
        const data = await res.json();
        setBatchSummary(data.summary);
        setBatchCases(data.cases || []);
        await onRefresh();
      } else {
        alert('Batch execution encountered an error.');
      }
    } catch (err) {
      alert('Failed to connect to backend for batch execution.');
    } finally {
      setIsBatchRunning(false);
    }
  };

  const openCasesCount = cases.filter((c) => c.status === 'OPEN' || c.status === 'ESCALATED').length;
  const totalExposure = cases.reduce((sum, c) => sum + (c.amount || 0), 0);
  const recoveredRevenue = cases.filter((c) => c.status === 'RECOVERED').reduce((sum, c) => sum + (c.amount || 0), 0);
  const recoveryRate = totalExposure > 0 ? (recoveredRevenue / totalExposure) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header & Sub-Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0c0d18] border border-[#1a1c30] p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Recovery Management</h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Monitor active cases, simulate payment failures, and launch multi-worker batch recoveries.
          </p>
        </div>

        {/* 3 Sub-Tabs */}
        <div className="bg-[#070b14] border border-[#1a1c30] p-1.5 rounded-xl flex items-center gap-1">
          <button
            onClick={() => setSubTab('cases')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
              subTab === 'cases'
                ? 'bg-[#7c3aed] text-white shadow-[0_0_12px_rgba(124,58,237,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Cases ({cases.length})</span>
          </button>

          <button
            onClick={() => setSubTab('playground')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
              subTab === 'playground'
                ? 'bg-[#7c3aed] text-white shadow-[0_0_12px_rgba(124,58,237,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TestTube className="w-3.5 h-3.5" />
            <span>Test / Playground</span>
          </button>

          <button
            onClick={() => setSubTab('batch')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
              subTab === 'batch'
                ? 'bg-[#7c3aed] text-white shadow-[0_0_12px_rgba(124,58,237,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Batch Recovery</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: CASES */}
      {subTab === 'cases' && (
        <div className="space-y-6">
          {/* Metrics summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0c0d18] border border-[#1a1c30] p-4 rounded-xl shadow-lg">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Active Cases</span>
              <div className="text-2xl font-black text-white font-mono mt-1">{openCasesCount}</div>
            </div>

            <div className="bg-[#0c0d18] border border-[#1a1c30] p-4 rounded-xl shadow-lg">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Revenue At Risk</span>
              <div className="text-2xl font-black text-amber-400 font-mono mt-1">₹{totalExposure.toFixed(0)}</div>
            </div>

            <div className="bg-[#0c0d18] border border-[#1a1c30] p-4 rounded-xl shadow-lg">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Recovered Revenue</span>
              <div className="text-2xl font-black text-emerald-400 font-mono mt-1">₹{recoveredRevenue.toFixed(0)}</div>
            </div>

            <div className="bg-[#0c0d18] border border-[#1a1c30] p-4 rounded-xl shadow-lg">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Recovery Rate</span>
              <div className="text-2xl font-black text-[#a855f7] font-mono mt-1">{recoveryRate.toFixed(1)}%</div>
            </div>
          </div>

          {/* Cases Table */}
          <RecoveryCasesTable
            cases={cases}
            loading={loading}
            selectedCaseId={selectedCaseId}
            processingCaseId={processingCaseId}
            onSelectCase={(id) => {
              const clicked = cases.find((c) => c.id === id);
              if (clicked) handleOpenCustomer(clicked);
              onSelectCase(id);
            }}
            onRunAgent={onRunAgent}
            onRefresh={onRefresh}
          />
        </div>
      )}

      {/* SUB-TAB 2: TEST / PLAYGROUND */}
      {subTab === 'playground' && (
        <RecoveryPlayground
          apiBase={apiBase}
          cases={cases}
          onRefreshCases={async () => { onRefresh(); }}
          onSelectCase={onSelectCase}
        />
      )}

      {/* SUB-TAB 3: BATCH RECOVERY */}
      {subTab === 'batch' && (
        <div className="space-y-6">
          <div className="bg-[#0c0d18] border border-[#1a1c30] p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1a1c30] pb-4">
              <div>
                <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#a855f7]" />
                  Multi-Worker Batch Execution Engine
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Process synthetic recovery cases in parallel across the autonomous worker thread pool.
                </p>
              </div>

              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                PARALLEL WORKER POOL READY
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
              <span className="text-slate-300 font-bold">Select Batch Capacity:</span>
              {[5, 10, 20].map((num) => (
                <button
                  key={num}
                  onClick={() => setBatchCount(num)}
                  className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                    batchCount === num
                      ? 'bg-[#7c3aed] text-white border border-[#7c3aed]'
                      : 'bg-[#121424] text-slate-400 border border-[#1a1c30] hover:text-white'
                  }`}
                >
                  {num} Cases
                </button>
              ))}

              <button
                onClick={handleLaunchBatch}
                disabled={isBatchRunning}
                className="ml-auto px-6 py-2.5 bg-gradient-to-r from-[#7c3aed] to-[#6366f1] hover:from-[#6d28d9] hover:to-[#4f46e5] text-white text-xs font-mono font-bold rounded-xl shadow-lg shadow-[#7c3aed]/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{isBatchRunning ? 'Executing Batch across Workers...' : 'Launch Batch Recovery'}</span>
              </button>
            </div>
          </div>

          {/* Batch Running / Completed Summary */}
          {isBatchRunning && (
            <div className="bg-[#0c0d18] border border-[#1a1c30] p-8 rounded-2xl text-center space-y-3">
              <div className="w-10 h-10 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin mx-auto" />
              <h3 className="text-sm font-mono font-bold text-white uppercase">Dispatching Batch across Worker Pool...</h3>
              <p className="text-xs text-slate-400 font-mono">Executing RecoverX AI Agent decisions and safety rules for {batchCount} cases.</p>
            </div>
          )}

          {batchSummary && (
            <div className="space-y-6">
              <div className="bg-[#0c0d18] border border-[#1a1c30] p-6 rounded-2xl shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#1a1c30] pb-3">
                  <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    BATCH EXECUTION SUMMARY
                  </h4>
                  <span className="text-xs font-mono text-slate-400">
                    Batch Tag: <span className="text-white font-bold">{batchCases[0]?.customerId || 'batch_complete'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-[#070b14] p-3.5 rounded-xl border border-[#1a1c30]">
                    <span className="text-slate-400 text-[10px] font-mono uppercase block">Cases Processed</span>
                    <span className="text-xl font-black font-mono text-white mt-1 block">{batchSummary.casesProcessed}</span>
                  </div>

                  <div className="bg-[#070b14] p-3.5 rounded-xl border border-[#1a1c30]">
                    <span className="text-slate-400 text-[10px] font-mono uppercase block">Total Exposure</span>
                    <span className="text-xl font-black font-mono text-amber-400 mt-1 block">₹{batchSummary.revenueAtRisk}</span>
                  </div>

                  <div className="bg-[#070b14] p-3.5 rounded-xl border border-[#1a1c30]">
                    <span className="text-slate-400 text-[10px] font-mono uppercase block">Recovered Revenue</span>
                    <span className="text-xl font-black font-mono text-emerald-400 mt-1 block">₹{batchSummary.recoveredRevenue}</span>
                  </div>

                  <div className="bg-[#070b14] p-3.5 rounded-xl border border-[#1a1c30]">
                    <span className="text-slate-400 text-[10px] font-mono uppercase block">Batch Recovery Rate</span>
                    <span className="text-xl font-black font-mono text-[#a855f7] mt-1 block">{batchSummary.recoveryRate}%</span>
                  </div>
                </div>
              </div>

              {/* Batch Cases List */}
              <div className="bg-[#0c0d18] border border-[#1a1c30] rounded-2xl overflow-hidden shadow-xl p-4 space-y-3">
                <h4 className="text-xs font-mono font-bold text-white uppercase px-2">Processed Batch Recovery Cases ({batchCases.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {batchCases.map((c: any) => (
                    <div key={c.id} className="bg-[#070b14] border border-[#1a1c30] p-3.5 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-mono font-bold text-[#a855f7]">RCV-{c.id.slice(0, 8)}</div>
                        <div className="text-slate-300 font-semibold">{c.customer?.name || 'Test Customer'}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{c.riskReason || c.type}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-white font-mono">₹{c.amount}</div>
                        <span className={`inline-block text-[9px] font-mono font-bold px-2 py-0.5 rounded mt-1 border ${
                          c.status === 'RECOVERED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {c.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Customer Detail Drawer */}
      <CustomerDetailDrawer
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        onSelectCase={onSelectCase}
      />
    </div>
  );
};
