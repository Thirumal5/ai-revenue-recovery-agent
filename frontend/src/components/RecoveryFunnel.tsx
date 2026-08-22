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
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
      <div>
        <div className="border-b border-slate-100 pb-3 mb-6">
          <h3 className="font-extrabold text-slate-950 text-xs tracking-wider uppercase">RECOVERY FUNNEL</h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5 font-sans">End-to-end autonomous recovery pipeline stage counts</p>
        </div>

        {/* Horizontal Pipeline */}
        <div className="relative flex items-center justify-between gap-2 py-4">
          {/* Horizontal connecting line */}
          <div className="absolute top-1/2 left-6 right-6 h-0.5 bg-slate-200 -translate-y-4 z-0"></div>

          {stages.map((stage, idx) => (
            <div key={idx} className="relative z-10 flex flex-col items-center text-center">
              {/* Icon Bubble */}
              <div className={`w-10 h-10 rounded-full ${stage.color} flex items-center justify-center font-bold text-sm shadow-xs mb-3 ring-4 ring-white`}>
                {stage.icon}
              </div>

              {/* Step number and title */}
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">{stage.num}</span>
              <span className="text-xs font-bold text-slate-900 mt-0.5">{stage.title}</span>

              {/* Metrics */}
              <span className="text-sm font-black text-slate-950 mt-1">{stage.count}</span>
              <span className="text-[11px] font-medium text-slate-400">{stage.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
