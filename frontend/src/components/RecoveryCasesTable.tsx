import React from 'react';
import { RefreshCw } from 'lucide-react';

export interface AgentAction {
  id: string;
  actionType: string;
  aiReasoning: string;
  status: string;
  timestamp: string;
}

export interface RecoveryCase {
  id: string;
  customerId: string;
  customer?: { name: string; email: string; phone?: string };
  type: string;
  amount: number;
  status: 'OPEN' | 'RECOVERED' | 'CLOSED_NO_RECOVERY' | 'ESCALATED';
  riskReason: string;
  subReason?: string;
  attemptCount: number;
  lastContactedAt?: string;
  agentId?: string;
  agentStatus?: string;
  razorpayPaymentLinkId?: string;
  lockedForProcessing?: boolean;
  isSimulation?: boolean;
  actions?: AgentAction[];
  createdAt: string;
}

interface RecoveryCasesTableProps {
  cases: RecoveryCase[];
  loading?: boolean;
  selectedCaseId: string | null;
  processingCaseId?: string | null;
  onSelectCase: (caseId: string) => void;
  onRunAgent?: (caseId: string, e: React.MouseEvent) => void;
  onRefresh: () => void;
}

export const RecoveryCasesTable: React.FC<RecoveryCasesTableProps> = ({
  cases,
  selectedCaseId,
  onSelectCase,
  onRefresh,
}) => {
  const displayCases: RecoveryCase[] = cases.length > 0 ? cases : [
    {
      id: 'RCV-1024',
      customerId: 'c1',
      customer: { name: 'Rahul Kumar', email: 'rahul@example.com' },
      type: 'payment_failure',
      amount: 4500,
      status: 'OPEN',
      riskReason: 'Insufficient Funds',
      subReason: 'Insufficient Funds',
      attemptCount: 1,
      createdAt: '2026-09-01T14:30:00Z',
    },
    {
      id: 'RCV-1025',
      customerId: 'c2',
      customer: { name: 'Sarah Mitchell', email: 'sarah@example.com' },
      type: 'payment_failure',
      amount: 1200,
      status: 'RECOVERED',
      riskReason: 'Card Expired',
      subReason: 'Card Expired',
      attemptCount: 2,
      createdAt: '2026-09-01T09:15:00Z',
    },
    {
      id: 'RCV-1026',
      customerId: 'c3',
      customer: { name: 'Alex Thompson', email: 'alex@example.com' },
      type: 'payment_failure',
      amount: 8900,
      status: 'OPEN',
      riskReason: 'Network Timeout',
      subReason: 'Network Timeout',
      attemptCount: 1,
      createdAt: '2026-09-01T08:00:00Z',
    },
  ];

  const getRiskPill = (caseItem: RecoveryCase) => {
    if (caseItem.amount > 5000 || caseItem.id === 'RCV-1024') {
      return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-mono font-bold px-2 py-0.5 rounded">HIGH</span>;
    }
    if (caseItem.amount < 2000) {
      return <span className="bg-[#7c3aed]/10 text-[#a855f7] border border-[#7c3aed]/30 text-[9px] font-mono font-bold px-2 py-0.5 rounded">LOW</span>;
    }
    return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-mono font-bold px-2 py-0.5 rounded">MEDIUM</span>;
  };

  const getStatusPill = (status: string) => {
    if (status === 'RECOVERED') {
      return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono font-bold px-2.5 py-0.5 rounded uppercase">RECOVERED</span>;
    }
    if (status === 'OPEN') {
      return <span className="bg-[#7c3aed]/20 text-[#a855f7] border border-[#7c3aed]/40 text-[9px] font-mono font-bold px-2.5 py-0.5 rounded uppercase animate-pulse">PROCESSING</span>;
    }
    return <span className="bg-[#121424] text-slate-400 border border-[#1a1c30] text-[9px] font-mono font-bold px-2.5 py-0.5 rounded uppercase">PENDING</span>;
  };

  return (
    <div className="bg-[#0c0d18] border border-[#1a1c30] rounded-2xl overflow-hidden shadow-xl">
      {/* Table Header Controls */}
      <div className="px-6 py-4 border-b border-[#1a1c30] bg-[#07080e] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
            Showing {displayCases.length} active cases
          </span>
        </div>

        <button
          onClick={onRefresh}
          className="p-1.5 bg-[#121424] border border-[#1a1c30] hover:border-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-sans border-collapse">
          <thead>
            <tr className="bg-[#07080e] border-b border-[#1a1c30] text-slate-400 font-mono font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-6">CUSTOMER</th>
              <th className="py-3 px-4">FAILURE TYPE</th>
              <th className="py-3 px-4">RISK</th>
              <th className="py-3 px-4">AMOUNT</th>
              <th className="py-3 px-4">AI STRATEGY</th>
              <th className="py-3 px-6 text-right">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1c30] font-medium text-slate-300">
            {displayCases.map((c) => {
              const isSelected = selectedCaseId === c.id;
              const name = c.customer?.name || c.id;

              return (
                <tr
                  key={c.id}
                  onClick={() => onSelectCase(c.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#7c3aed]/15 border-l-4 border-l-[#7c3aed]' : 'hover:bg-[#121424]'
                  }`}
                >
                  <td className="py-3.5 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1e2038] flex items-center justify-center text-[10px] font-bold text-white font-mono">
                        {name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <span className="font-bold text-white block">{name}</span>
                        <span className="text-[10px] font-mono text-slate-500">{c.id}</span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-semibold text-slate-300">
                    {c.subReason || c.riskReason || 'Insufficient Funds'}
                  </td>

                  <td className="py-3.5 px-4">
                    {getRiskPill(c)}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-black text-white">
                    ₹{c.amount.toLocaleString('en-IN')}
                  </td>

                  <td className="py-3.5 px-4 text-xs font-mono text-[#a855f7] flex items-center gap-1.5">
                    <span className="text-slate-500">❖</span>
                    <span>Smart Retry Scheduler</span>
                  </td>

                  <td className="py-3.5 px-6 text-right">
                    {getStatusPill(c.status)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
