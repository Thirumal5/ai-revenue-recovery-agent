import React from 'react';

interface CaseItem {
  id: string;
  status: string;
  actions?: Array<{ actionType: string; status: string }>;
}

interface RecoveryFunnelProps {
  cases: CaseItem[];
}

export const RecoveryFunnel: React.FC<RecoveryFunnelProps> = ({ cases }) => {
  const totalEvents = cases.length;

  const classifiedCount = cases.filter(c =>
    c.actions?.some(a => a.actionType === 'EVENT_CLASSIFIED')
  ).length;

  const decisionCount = cases.filter(c =>
    c.actions?.some(a => a.actionType === 'AI_DECISION')
  ).length;

  const safetyPassedCount = cases.filter(c =>
    c.actions?.some(a => a.actionType === 'SAFETY_CHECK' && a.status === 'SUCCESS')
  ).length;

  const toolExecutedCount = cases.filter(c =>
    c.actions?.some(a => a.actionType === 'TOOL_EXECUTED' && a.status === 'SUCCESS')
  ).length;

  const recoveredCount = cases.filter(c => c.status === 'RECOVERED').length;

  const stages = [
    { num: '01', title: 'Risk Event', desc: 'Events detected', count: totalEvents, icon: '⚡', color: 'bg-indigo-500 text-white' },
    { num: '02', title: 'Classification', desc: 'Classified', count: classifiedCount, icon: '📋', color: 'bg-amber-500 text-white' },
    { num: '03', title: 'Groq Decision', desc: 'Decisions made', count: decisionCount, icon: '🧠', color: 'bg-purple-500 text-white' },
    { num: '04', title: 'Safety Check', desc: 'Approved', count: safetyPassedCount, icon: '🛡️', color: 'bg-blue-500 text-white' },
    { num: '05', title: 'Tool Execution', desc: 'Executed', count: toolExecutedCount, icon: '🚀', color: 'bg-pink-500 text-white' },
    { num: '06', title: 'Recovery', desc: 'Recovered', count: recoveredCount, icon: '🟢', color: 'bg-emerald-500 text-white' },
  ];

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 shadow-2xl flex flex-col justify-between">
      <div>
        <div className="border-b border-white/10 pb-3 mb-6">
          <h3 className="font-extrabold text-white text-xs tracking-wider uppercase">RECOVERY FUNNEL</h3>
          <p className="text-xs text-zinc-500 font-medium mt-0.5 font-sans">End-to-end autonomous recovery pipeline stage counts</p>
        </div>

        {/* Horizontal Pipeline */}
        <div className="relative flex items-center justify-between gap-2 py-4">
          {/* Horizontal connecting line */}
          <div className="absolute top-1/2 left-6 right-6 h-[1px] bg-white/10 -translate-y-4 z-0"></div>

          {stages.map((stage, idx) => (
            <div key={idx} className="relative z-10 flex flex-col items-center text-center">
              {/* Icon Bubble */}
              <div className={`w-10 h-10 rounded-full ${stage.color} flex items-center justify-center font-bold text-sm shadow-[0_0_15px_rgba(255,255,255,0.1)] mb-3 ring-4 ring-[#0F0F10]`}>
                {stage.icon}
              </div>

              {/* Step number and title */}
              <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase">{stage.num}</span>
              <span className="text-xs font-bold text-white mt-0.5">{stage.title}</span>

              {/* Metrics */}
              <span className="text-sm font-black text-white mt-1 drop-shadow-md">{stage.count}</span>
              <span className="text-[11px] font-medium text-zinc-400">{stage.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
