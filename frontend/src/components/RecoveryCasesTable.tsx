import React from 'react';
import { StatusBadge } from './StatusBadge';

export interface Customer {
  id: string;
  email: string;
  name: string;
}

export interface AgentAction {
  id: string;
  actionType: string;
  aiReasoning: string;
  status: string;
  metadata?: string;
  timestamp: string;
}

export interface RecoveryCase {
  id: string;
  customerId: string;
  customer?: Customer;
  type: string;
  amount: number;
  status: string;
  riskReason: string;
  subReason?: string;
  attemptCount: number;
  lastContactedAt?: string;
  lockedForProcessing: boolean;
  razorpayPaymentLinkId?: string;
  actions?: AgentAction[];
  createdAt: string;
  observationOutcome?: string;
}

interface RecoveryCasesTableProps {
  cases: RecoveryCase[];
  loading: boolean;
  selectedCaseId: string | null;
  processingCaseId: string | null;
  onSelectCase: (caseId: string) => void;
  onRunAgent: (caseId: string, e: React.MouseEvent) => void;
  onRefresh: () => void;
}

export const RecoveryCasesTable: React.FC<RecoveryCasesTableProps> = ({
  cases,
  loading,
  selectedCaseId,
  processingCaseId,
  onSelectCase,
  onRunAgent,
  onRefresh,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden mb-8">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-slate-950 text-xs tracking-wider uppercase">
            RECOVERY CASES ({cases.length})
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            All payment failure cases recorded and tracked by RecoverXAI
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
          >
            View All Cases →
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 font-medium">Loading recovery cases...</div>
      ) : cases.length === 0 ? (
        <div className="p-12 text-center text-slate-500">
          <div className="text-3xl mb-2">📋</div>
          <p className="text-sm font-bold text-slate-800">No recovery cases found</p>
          <p className="text-xs text-slate-400 mt-1">Simulate a payment failure event using the simulator above.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-6">Case ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Case Type</th>
                <th className="py-3 px-4">Risk Reason</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4 text-center">Attempts</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Action</th>
                <th className="py-3 px-6 text-right">Action / Trace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {cases.map((c, index) => {
                const isSelected = selectedCaseId === c.id;
                const isProcessing = processingCaseId === c.id;
                const email = c.customer?.email || `user_${index + 100}@example.com`;
                const username = email.split('@')[0];

                return (
                  <tr
                    key={c.id}
                    onClick={() => onSelectCase(c.id)}
                    className={`hover:bg-indigo-50/30 transition-colors cursor-pointer ${
                      isSelected ? 'bg-indigo-50/60' : ''
                    }`}
                  >
                    {/* Case ID */}
                    <td className="py-3.5 px-6 font-mono font-bold text-indigo-600 whitespace-nowrap">
                      RCV-{c.id.slice(0, 8)}
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-indigo-900 text-[11px]">{email}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{username}</div>
                    </td>

                    {/* Case Type */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="bg-indigo-50/70 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold border border-indigo-100">
                        {c.type.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Risk Reason */}
                    <td className="py-3.5 px-4">
                      <span className="bg-indigo-50/70 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold border border-indigo-100 font-mono">
                        {c.subReason || c.riskReason}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 font-black text-slate-950 whitespace-nowrap">
                      ₹{c.amount.toFixed(2)}
                    </td>

                    {/* Attempts */}
                    <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                      {c.attemptCount}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={c.status} />
                    </td>

                    {/* Last Action */}
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {c.lastContactedAt ? `${Math.max(1, Math.floor((Date.now() - new Date(c.lastContactedAt).getTime()) / 60000))}m ago` : 'Just now'}
                    </td>

                    {/* Action / Terminal Protection */}
                    <td className="py-3.5 px-6 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {c.status === 'OPEN' ? (
                          <>
                            <button
                              disabled={isProcessing}
                              onClick={(e) => onRunAgent(c.id, e)}
                              className="text-[10px] font-bold text-slate-500 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 px-2 py-0.5 rounded transition-colors cursor-pointer disabled:opacity-50"
                              title="Optional manual retry for debug"
                            >
                              {isProcessing ? 'Processing...' : 'Manual Retry'}
                            </button>

                            <button
                              onClick={() => onSelectCase(c.id)}
                              className="text-indigo-600 hover:text-indigo-800 text-[11px] font-bold hover:underline"
                            >
                              View Trace →
                            </button>
                          </>
                        ) : c.status === 'RECOVERED' ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              ✓ Recovered
                            </span>
                            <button
                              onClick={() => onSelectCase(c.id)}
                              className="text-indigo-600 hover:text-indigo-800 text-[11px] font-bold hover:underline"
                            >
                              Trace →
                            </button>
                          </div>
                        ) : c.status === 'ESCALATED' ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              ⚠️ Escalated
                            </span>
                            <button
                              onClick={() => onSelectCase(c.id)}
                              className="text-indigo-600 hover:text-indigo-800 text-[11px] font-bold hover:underline"
                            >
                              Trace →
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              Case Closed
                            </span>
                            <button
                              onClick={() => onSelectCase(c.id)}
                              className="text-indigo-600 hover:text-indigo-800 text-[11px] font-bold hover:underline"
                            >
                              Trace →
                            </button>
                          </div>
                        )}
                        <span className="text-slate-300 font-bold ml-1">⋮</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
