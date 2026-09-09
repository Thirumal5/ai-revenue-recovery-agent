import React, { useState } from 'react';
import { RecoveryCasesTable } from './RecoveryCasesTable';
import type { RecoveryCase } from './RecoveryCasesTable';
import { RecoveryPlayground } from './RecoveryPlayground';
import { CustomerDetailDrawer, type CustomerData } from './CustomerDetailDrawer';
import { Play, Layers, TestTube, Cpu, CheckCircle2, UserPlus, Sparkles } from 'lucide-react';

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
type BatchType = 'automated' | 'manual';

interface ManualBatchItem {
  name: string;
  email: string;
  phone: string;
  scenario: string;
  amount: number;
  riskReason: string;
}

const TEMPLATE_5_CUSTOMERS: ManualBatchItem[] = [
  { name: 'Rahul Sharma', email: 'rahul.sharma@example.com', phone: '+919876543210', scenario: 'payment_failure', amount: 1500, riskReason: 'UPI transaction cap exceeded' },
  { name: 'Priya Patel', email: 'priya.patel@example.com', phone: '+919876543211', scenario: 'subscription_failure', amount: 2499, riskReason: 'Card expired or invalid' },
  { name: 'Ananya Verma', email: 'ananya.verma@example.com', phone: '+919876543212', scenario: 'payment_failure', amount: 3500, riskReason: 'Insufficient funds in account' },
  { name: 'Vikram Singh', email: 'vikram.singh@example.com', phone: '+919876543213', scenario: 'checkout_abandonment', amount: 1200, riskReason: 'Bank gateway server timeout' },
  { name: 'Sneha Reddy', email: 'sneha.reddy@example.com', phone: '+919876543214', scenario: 'invoice_overdue', amount: 5000, riskReason: 'Invoice past 15 days due date' },
];

const TEMPLATE_10_CUSTOMERS: ManualBatchItem[] = [
  ...TEMPLATE_5_CUSTOMERS,
  { name: 'Arjun Mehta', email: 'arjun.mehta@example.com', phone: '+919876543215', scenario: 'subscription_failure', amount: 1999, riskReason: 'Mandate execution failed' },
  { name: 'Kavya Nair', email: 'kavya.nair@example.com', phone: '+919876543216', scenario: 'payment_failure', amount: 2800, riskReason: 'Card daily spending limit exceeded' },
  { name: 'Rohan Gupta', email: 'rohan.gupta@example.com', phone: '+919876543217', scenario: 'invoice_overdue', amount: 4500, riskReason: 'Vendor payment delayed' },
  { name: 'Neha Joshi', email: 'neha.joshi@example.com', phone: '+919876543218', scenario: 'subscription_failure', amount: 750, riskReason: 'Bank account frozen' },
  { name: 'Aditya Rao', email: 'aditya.rao@example.com', phone: '+919876543219', scenario: 'payment_failure', amount: 3100, riskReason: 'Network timeout during gateway processing' },
];

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
  const [batchType, setBatchType] = useState<BatchType>('manual');
  const [batchCount, setBatchCount] = useState<number>(10);
  const [manualCount, setManualCount] = useState<number>(5);
  const [manualItems, setManualItems] = useState<ManualBatchItem[]>(TEMPLATE_5_CUSTOMERS);
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

  const handleSelectManualCount = (count: number) => {
    setManualCount(count);
    if (count === 5) {
      setManualItems(TEMPLATE_5_CUSTOMERS);
    } else {
      setManualItems(TEMPLATE_10_CUSTOMERS);
    }
  };

  const handleManualItemChange = (index: number, field: keyof ManualBatchItem, value: any) => {
    const updated = [...manualItems];
    updated[index] = { ...updated[index], [field]: value };
    setManualItems(updated);
  };

  const handleLaunchBatch = async () => {
    setIsBatchRunning(true);
    setBatchSummary(null);
    setBatchCases([]);

    try {
      let endpoint = `${apiBase}/api/recovery/batch-simulate`;
      let body: any = { count: batchCount };

      if (batchType === 'manual') {
        endpoint = `${apiBase}/api/recovery/batch-manual`;
        body = { items: manualItems };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
          <div className="bg-[#0c0d18] border border-[#1a1c30] p-6 rounded-2xl shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1a1c30] pb-4">
              <div>
                <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#a855f7]" />
                  Multi-Worker Batch Execution Engine
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Execute manual customer batch creation or automated synthetic testing across the worker pool.
                </p>
              </div>

              {/* Mode Selector Toggle */}
              <div className="bg-[#070b14] border border-[#1a1c30] p-1 rounded-xl flex items-center gap-1 self-start sm:self-auto">
                <button
                  onClick={() => setBatchType('manual')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    batchType === 'manual'
                      ? 'bg-[#7c3aed] text-white shadow-[0_0_10px_rgba(124,58,237,0.3)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Manual Customer Batch</span>
                </button>

                <button
                  onClick={() => setBatchType('automated')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    batchType === 'automated'
                      ? 'bg-[#7c3aed] text-white shadow-[0_0_10px_rgba(124,58,237,0.3)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Automated Testing</span>
                </button>
              </div>
            </div>

            {/* MANUAL BATCH CONTROLS */}
            {batchType === 'manual' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#070b14] border border-[#1a1c30] p-3.5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-300 font-bold">Select Customer Batch Size:</span>
                    {[5, 10].map((num) => (
                      <button
                        key={num}
                        onClick={() => handleSelectManualCount(num)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          manualCount === num
                            ? 'bg-[#7c3aed] text-white border border-[#7c3aed]'
                            : 'bg-[#121424] text-slate-400 border border-[#1a1c30] hover:text-white'
                        }`}
                      >
                        {num} Customers
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleLaunchBatch}
                    disabled={isBatchRunning}
                    className="px-6 py-2 bg-gradient-to-r from-[#7c3aed] to-[#6366f1] hover:from-[#6d28d9] hover:to-[#4f46e5] text-white text-xs font-mono font-bold rounded-xl shadow-lg shadow-[#7c3aed]/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>{isBatchRunning ? 'Processing Batch...' : `Launch Manual Batch (${manualItems.length} Cases)`}</span>
                  </button>
                </div>

                {/* Editable Manual Customer Items List */}
                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block px-1">
                    Customer Batch Records ({manualItems.length} Customer Scenarios Loaded)
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {manualItems.map((item, idx) => (
                      <div key={idx} className="bg-[#070b14] border border-[#1a1c30] p-3.5 rounded-xl space-y-2.5 text-xs font-mono">
                        <div className="flex items-center justify-between border-b border-[#1a1c30] pb-2">
                          <span className="font-bold text-[#a855f7]">Customer #{idx + 1}</span>
                          <span className="text-[10px] text-slate-500 font-bold uppercase">{item.scenario.replace('_', ' ')}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] text-slate-500 uppercase block mb-1">Customer Name</label>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleManualItemChange(idx, 'name', e.target.value)}
                              className="w-full bg-[#0c0d18] border border-[#1a1c30] rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-[#7c3aed]"
                            />
                          </div>

                          <div>
                            <label className="text-[9px] text-slate-500 uppercase block mb-1">Amount (₹)</label>
                            <input
                              type="number"
                              value={item.amount}
                              onChange={(e) => handleManualItemChange(idx, 'amount', Number(e.target.value))}
                              className="w-full bg-[#0c0d18] border border-[#1a1c30] rounded-lg px-2.5 py-1.5 text-amber-400 font-bold focus:outline-none focus:border-[#7c3aed]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] text-slate-500 uppercase block mb-1">Specific Failure Reason</label>
                          <input
                            type="text"
                            value={item.riskReason}
                            onChange={(e) => handleManualItemChange(idx, 'riskReason', e.target.value)}
                            className="w-full bg-[#0c0d18] border border-[#1a1c30] rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-[#7c3aed]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* AUTOMATED BATCH CONTROLS */}
            {batchType === 'automated' && (
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                <span className="text-slate-300 font-bold">Select Automated Test Capacity:</span>
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
                    {num} Synthetic Cases
                  </button>
                ))}

                <button
                  onClick={handleLaunchBatch}
                  disabled={isBatchRunning}
                  className="ml-auto px-6 py-2.5 bg-gradient-to-r from-[#7c3aed] to-[#6366f1] hover:from-[#6d28d9] hover:to-[#4f46e5] text-white text-xs font-mono font-bold rounded-xl shadow-lg shadow-[#7c3aed]/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>{isBatchRunning ? 'Executing Automated Test...' : `Launch Automated Test (${batchCount} Cases)`}</span>
                </button>
              </div>
            )}
          </div>

          {/* Batch Running Loading Spinner */}
          {isBatchRunning && (
            <div className="bg-[#0c0d18] border border-[#1a1c30] p-8 rounded-2xl text-center space-y-3">
              <div className="w-10 h-10 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin mx-auto" />
              <h3 className="text-sm font-mono font-bold text-white uppercase">Dispatching Batch across Multi-Worker Pool...</h3>
              <p className="text-xs text-slate-400 font-mono">
                Processing {batchType === 'manual' ? manualItems.length : batchCount} cases asynchronously across workers Agent-01 to Agent-05.
              </p>
            </div>
          )}

          {/* Batch Completed Summary */}
          {batchSummary && (
            <div className="space-y-6">
              <div className="bg-[#0c0d18] border border-[#1a1c30] p-6 rounded-2xl shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#1a1c30] pb-3">
                  <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    BATCH EXECUTION SUMMARY
                  </h4>
                  <span className="text-xs font-mono text-slate-400">
                    Mode: <span className="text-white font-bold uppercase">{batchType}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-[#070b14] p-3.5 rounded-xl border border-[#1a1c30]">
                    <span className="text-slate-400 text-[10px] font-mono uppercase block">Cases Created</span>
                    <span className="text-xl font-black font-mono text-white mt-1 block">{batchSummary.casesProcessed}</span>
                  </div>

                  <div className="bg-[#070b14] p-3.5 rounded-xl border border-[#1a1c30]">
                    <span className="text-slate-400 text-[10px] font-mono uppercase block">Total Exposure</span>
                    <span className="text-xl font-black font-mono text-amber-400 mt-1 block">₹{batchSummary.revenueAtRisk}</span>
                  </div>

                  <div className="bg-[#070b14] p-3.5 rounded-xl border border-[#1a1c30]">
                    <span className="text-slate-400 text-[10px] font-mono uppercase block">Worker Pool Status</span>
                    <span className="text-xl font-black font-mono text-emerald-400 mt-1 block">DISPATCHED</span>
                  </div>

                  <div className="bg-[#070b14] p-3.5 rounded-xl border border-[#1a1c30]">
                    <span className="text-slate-400 text-[10px] font-mono uppercase block">Execution Mode</span>
                    <span className="text-xl font-black font-mono text-[#a855f7] mt-1 block">ASYNCHRONOUS</span>
                  </div>
                </div>
              </div>

              {/* Batch Cases List */}
              <div className="bg-[#0c0d18] border border-[#1a1c30] rounded-2xl overflow-hidden shadow-xl p-4 space-y-3">
                <h4 className="text-xs font-mono font-bold text-white uppercase px-2">Dispatched Batch Recovery Cases ({batchCases.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {batchCases.map((c: any) => (
                    <div
                      key={c.id}
                      onClick={() => onSelectCase(c.id)}
                      className="bg-[#070b14] border border-[#1a1c30] hover:border-[#7c3aed]/50 p-3.5 rounded-xl flex items-center justify-between text-xs cursor-pointer transition-colors"
                    >
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
