import React from 'react';
import type { RecoveryCase } from './RecoveryCasesTable';
import { StatusBadge } from './StatusBadge';

export interface CustomerData {
  id: string;
  name: string;
  email: string;
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="font-extrabold text-slate-950 text-lg">{customer.name}</span>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                  customer.riskLevel === 'HIGH'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : customer.riskLevel === 'MEDIUM'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {customer.riskLevel} RISK
              </span>
            </div>
            <div className="text-xs text-slate-500 font-medium">{customer.email}</div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 text-xl font-bold p-1 cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Drawer Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
          {/* Revenue Overview Section */}
          <div>
            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">
              REVENUE OVERVIEW
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 text-[10px] font-bold block">Revenue at Risk</span>
                <span className="text-sm font-black text-slate-950 mt-1 block">
                  ₹{customer.revenueAtRisk.toFixed(2)}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 text-[10px] font-bold block">Recovered</span>
                <span className="text-sm font-black text-emerald-600 mt-1 block">
                  ₹{customer.recoveredRevenue.toFixed(2)}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 text-[10px] font-bold block">Open Cases</span>
                <span className="text-sm font-black text-slate-950 mt-1 block">
                  {customer.openCases}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-slate-400 text-[10px] font-bold block">Recovery Rate</span>
                <span className="text-sm font-black text-slate-950 mt-1 block">
                  {customer.recoveryRate}%
                </span>
              </div>
            </div>
          </div>

          {/* Recovery History Section */}
          <div>
            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">
              RECOVERY HISTORY ({customer.cases.length})
            </h4>

            {customer.cases.length === 0 ? (
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200/80 text-center text-slate-400">
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
                    className="bg-white p-4 rounded-xl border border-slate-200/80 hover:border-indigo-200 hover:bg-indigo-50/20 transition-all cursor-pointer shadow-2xs flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-extrabold text-indigo-600 text-xs">
                          RCV-{c.id.slice(0, 8)}
                        </span>
                        <StatusBadge status={c.status} />
                      </div>
                      <div className="text-[11px] text-slate-600 font-medium">
                        Type: <span className="font-semibold text-slate-800">{c.type}</span> • Reason:{' '}
                        <span className="font-mono text-indigo-700">{c.subReason || c.riskReason}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {new Date(c.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-black text-slate-950 text-sm">₹{c.amount.toFixed(2)}</div>
                      <div className="text-[10px] font-semibold text-indigo-600 hover:underline mt-1">
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
