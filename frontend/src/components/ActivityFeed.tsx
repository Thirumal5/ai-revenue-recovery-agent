import React from 'react';
import type { RecoveryCase } from './RecoveryCasesTable';

interface ActivityFeedProps {
  cases: RecoveryCase[];
}

interface FlattenedActivity {
  id: string;
  caseId: string;
  actionType: string;
  aiReasoning: string;
  status: string;
  timestamp: string;
  customerEmail?: string;
  amount: number;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ cases }) => {
  // Flatten all AgentAction items across all cases and sort descending
  const activities: FlattenedActivity[] = [];

  cases.forEach((c) => {
    (c.actions || []).forEach((act) => {
      activities.push({
        id: act.id,
        caseId: c.id,
        actionType: act.actionType,
        aiReasoning: act.aiReasoning,
        status: act.status,
        timestamp: act.timestamp,
        customerEmail: c.customer?.email,
        amount: c.amount,
      });
    });
  });

  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/50">
        <h3 className="font-bold text-slate-900 text-sm tracking-tight uppercase">Agent Activity Audit Log</h3>
        <p className="text-xs text-slate-500">Real-time chronological log of autonomous AI decisions and tool executions</p>
      </div>

      {activities.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500 font-medium">No activity logged yet. Trigger a simulated event above to observe the agent.</div>
      ) : (
        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {activities.map((act) => {
            const timeStr = new Date(act.timestamp).toLocaleTimeString();
            const dateStr = new Date(act.timestamp).toLocaleDateString();

            return (
              <div key={act.id} className="p-4 hover:bg-slate-50/60 transition-colors flex items-start gap-4 text-xs">
                <div className="text-[11px] font-mono text-slate-400 whitespace-nowrap pt-0.5">
                  <div>{timeStr}</div>
                  <div className="text-[10px] text-slate-300">{dateStr}</div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-indigo-600">RCV-{act.caseId.slice(0, 8)}</span>
                    <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-mono font-bold text-[10px]">
                      {act.actionType}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      act.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {act.status}
                    </span>
                  </div>
                  <p className="text-slate-700 font-medium text-xs">{act.aiReasoning}</p>
                </div>

                <div className="text-right text-[11px] text-slate-500 whitespace-nowrap">
                  <div>{act.customerEmail}</div>
                  <div className="font-bold text-slate-800">₹{act.amount.toFixed(2)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
