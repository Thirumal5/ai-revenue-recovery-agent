import React from 'react';
import type { RecoveryCase } from './RecoveryCasesTable';
import { StatusBadge } from './StatusBadge';
import { Mail, Phone } from 'lucide-react';

export interface CustomerData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  totalCases: number;
  openCases: number;
  revenueAtRisk: number;
  recoveredRevenue: number;
  recoveryRate: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  cases: RecoveryCase[];
}

interface CustomerDetailDrawerProps {
  customer: CustomerData | null;
  onClose: () => void;
  onSelectCase: (caseId: string) => void;
}

export const CustomerDetailDrawer: React.FC<CustomerDetailDrawerProps> = ({
  customer,
  onClose,
  onSelectCase,
}) => {
  if (!customer) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-[#090d18] border-l border-[#1e293b] h-full shadow-2xl flex flex-col justify-between text-slate-300 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-[#1e293b] bg-[#060a14] flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="font-extrabold text-white text-lg">{customer.name}</span>
              <span
                className={`text-[10px] font-extrabold font-mono px-2.5 py-0.5 rounded-full border ${
                  customer.riskLevel === 'HIGH'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : customer.riskLevel === 'MEDIUM'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}
              >
                {customer.riskLevel} RISK
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono mt-1">
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3 text-slate-500" />
                {customer.email}
              </span>
              {customer.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-500" />
                  {customer.phone}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl font-bold p-1 cursor-pointer transition-colors"
          >
            ×
          </button>
        </div>

        {/* Drawer Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
          {/* Revenue Overview Section */}
          <div>
            <h4 className="text-xs font-mono font-extrabold text-slate-400 uppercase tracking-wider mb-3">
              REVENUE EXPOSURE & PERFORMANCE
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#0f1524] p-3.5 rounded-xl border border-[#1e293b]">
                <span className="text-slate-400 text-[10px] font-mono font-bold block">Revenue at Risk</span>
                <span className="text-sm font-black font-mono text-white mt-1 block">
                  ₹{customer.revenueAtRisk.toFixed(0)}
                </span>
              </div>

              <div className="bg-[#0f1524] p-3.5 rounded-xl border border-[#1e293b]">
                <span className="text-slate-400 text-[10px] font-mono font-bold block">Recovered</span>
                <span className="text-sm font-black font-mono text-emerald-400 mt-1 block">
                  ₹{customer.recoveredRevenue.toFixed(0)}
                </span>
              </div>

              <div className="bg-[#0f1524] p-3.5 rounded-xl border border-[#1e293b]">
                <span className="text-slate-400 text-[10px] font-mono font-bold block">Open Cases</span>
                <span className="text-sm font-black font-mono text-[#a855f7] mt-1 block">
                  {customer.openCases}
                </span>
              </div>

              <div className="bg-[#0f1524] p-3.5 rounded-xl border border-[#1e293b]">
                <span className="text-slate-400 text-[10px] font-mono font-bold block">Recovery Rate</span>
                <span className="text-sm font-black font-mono text-[#38bdf8] mt-1 block">
                  {customer.recoveryRate}%
                </span>
              </div>
            </div>
          </div>

          {/* Recovery History Section */}
          <div>
            <h4 className="text-xs font-mono font-extrabold text-slate-400 uppercase tracking-wider mb-3">
              RECOVERY HISTORY ({customer.cases.length})
            </h4>

            {customer.cases.length === 0 ? (
              <div className="bg-[#0f1524] p-6 rounded-xl border border-[#1e293b] text-center text-slate-500 font-mono text-xs">
                No recovery cases recorded for this customer.
              </div>
            ) : (
              <div className="space-y-3">
                {customer.cases.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onClose();
                      onSelectCase(c.id);
                    }}
                    className="bg-[#0f1524] p-4 rounded-xl border border-[#1e293b] hover:border-[#7c3aed]/50 hover:bg-[#141b2e] transition-all cursor-pointer shadow-sm flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-extrabold text-[#a855f7] text-xs">
                          RCV-{c.id.slice(0, 8)}
                        </span>
                        <StatusBadge status={c.status} />
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        Type: <span className="font-semibold text-slate-200">{c.type}</span> • Reason:{' '}
                        <span className="font-mono text-slate-300">{c.subReason || c.riskReason}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-1">
                        {new Date(c.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-black text-white font-mono text-sm">₹{c.amount.toFixed(0)}</div>
                      <div className="text-[10px] font-mono font-bold text-[#a855f7] hover:underline mt-1">
                        Inspect Trace →
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
