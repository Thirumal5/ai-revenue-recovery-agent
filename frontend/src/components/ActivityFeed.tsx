import React from 'react';
import { motion } from 'framer-motion';

interface ActivityFeedProps {
  cases?: any[];
  onSelectCase?: (id: string) => void;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ cases = [], onSelectCase }) => {
  // Extract real live actions from cases if available
  const allActions: any[] = [];
  cases.forEach((c) => {
    if (c.actions && Array.isArray(c.actions)) {
      c.actions.forEach((act: any) => {
        allActions.push({
          ...act,
          caseId: c.id,
          amount: c.amount,
          customerName: c.customer?.name || 'Customer',
        });
      });
    }
  });

  // Sort actions descending by timestamp
  allActions.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

  // Dynamic live events or clean fallback
  const liveEvents = allActions.length > 0
    ? allActions.slice(0, 5).map((act) => ({
        time: new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        color: act.status === 'SUCCESS' ? 'bg-emerald-400' : act.actionType === 'AI_DECISION' ? 'bg-[#7c3aed]' : 'bg-amber-400',
        title: `${act.actionType.replace('_', ' ')} for RCV-${act.caseId.slice(0, 8)} (₹${act.amount})`,
        desc: act.aiReasoning || `Executed ${act.actionType}`,
        highlight: act.actionType === 'AI_DECISION',
        caseId: act.caseId,
      }))
    : [
        {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          color: 'bg-amber-400',
          title: 'Payment failure detected for RCV-1024 (₹1,250).',
          desc: 'Risk Agent analyzing retry probability...',
          highlight: false,
          caseId: null,
        },
        {
          time: new Date(Date.now() - 30000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          color: 'bg-[#7c3aed]',
          title: 'AI Decision: Smart Retry Scheduled',
          desc: 'Optimum retry window identified based on failure classification.',
          highlight: true,
          caseId: null,
        },
        {
          time: new Date(Date.now() - 120000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          color: 'bg-emerald-400',
          title: 'Recovery successful for RCV-0998 (₹4,500).',
          desc: 'Automated settlement completed via Razorpay Link.',
          highlight: false,
          caseId: null,
        },
      ];

  const recentCases = cases.length > 0 ? cases.slice(0, 5) : [
    { id: 'RCV-1024', customer: { name: 'Amit K.' }, amount: 1250, status: 'OPEN', createdAt: new Date().toISOString() },
    { id: 'RCV-0998', customer: { name: 'Priya S.' }, amount: 4500, status: 'RECOVERED', createdAt: new Date(Date.now() - 900000).toISOString() },
    { id: 'RCV-1025', customer: { name: 'Rahul M.' }, amount: 890, status: 'OPEN', createdAt: new Date(Date.now() - 2700000).toISOString() },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Box: Live Autonomous Activity */}
      <div className="bg-[#0c0d18] border border-[#1a1c30] rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-white font-sans tracking-tight">Live Autonomous Activity</h2>
          <span className="text-[9px] font-mono font-bold text-slate-400 bg-[#121424] px-2 py-0.5 rounded border border-[#1a1c30]">
            Real-time Audit
          </span>
        </div>

        <div className="relative pl-6 space-y-4 pt-1">
          {/* Vertical line */}
          <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-[#1a1c30]" />

          {liveEvents.map((ev, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => ev.caseId && onSelectCase && onSelectCase(ev.caseId)}
              className={`relative flex items-start gap-3 p-3 rounded-xl transition-all ${
                ev.caseId ? 'cursor-pointer hover:bg-[#181a30]' : ''
              } ${
                ev.highlight ? 'bg-[#7c3aed]/10 border border-[#7c3aed]/30 shadow-md' : 'bg-[#121424]/40 border border-[#1a1c30]'
              }`}
            >
              <div className={`absolute -left-6 top-4 w-2 h-2 rounded-full ${ev.color} shadow-sm`} />
              <div>
                <span className="text-[10px] font-mono font-semibold text-slate-500 block mb-0.5">
                  {ev.time}
                </span>
                <span className="text-xs font-bold text-white block">{ev.title}</span>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5 line-clamp-2">{ev.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right Box: Recent Activity Table */}
      <div className="bg-[#0c0d18] border border-[#1a1c30] rounded-2xl p-6 shadow-xl flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white font-sans tracking-tight">Recent Activity</h2>
          <span className="text-xs font-mono text-slate-400">
            {cases.length} Total Cases
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="border-b border-[#1a1c30] text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-2">CUSTOMER</th>
                <th className="py-2.5 px-2">AMOUNT</th>
                <th className="py-2.5 px-2">STATUS</th>
                <th className="py-2.5 px-2 text-right">TIME</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1c30]">
              {recentCases.map((r: any) => {
                const name = r.customer?.name || 'Customer';
                const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);

                return (
                  <tr
                    key={r.id}
                    onClick={() => onSelectCase && onSelectCase(r.id)}
                    className="hover:bg-[#121424] transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-2 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#1e2038] flex items-center justify-center text-[10px] font-bold text-slate-300 font-mono">
                        {initials}
                      </div>
                      <div>
                        <span className="font-bold text-white block">{name}</span>
                        <span className="text-[9px] font-mono text-slate-500">RCV-{r.id.slice(0, 8)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 font-mono font-bold text-white">₹{r.amount}</td>
                    <td className="py-3 px-2">
                      <span
                        className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                          r.status === 'RECOVERED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : r.status === 'OPEN'
                            ? 'bg-[#7c3aed]/10 text-[#a855f7] border-[#7c3aed]/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-slate-400 text-[11px]">
                      {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
