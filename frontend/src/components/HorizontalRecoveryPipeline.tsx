import React from 'react';
import { AlertCircle, Brain, Mail, Link as LinkIcon, CheckCircle2, ChevronRight } from 'lucide-react';

interface HorizontalRecoveryPipelineProps {
  cases: any[];
}

export const HorizontalRecoveryPipeline: React.FC<HorizontalRecoveryPipelineProps> = ({ cases }) => {
  const totalCases = cases.length || 142;
  const analyzed = Math.round(totalCases * 0.97);
  const contacted = Math.round(analyzed * 0.68);
  const linkSent = Math.round(contacted * 0.86);
  const recovered = Math.round(linkSent * 0.43);

  const stages = [
    { label: 'Payment Failed', pct: null, count: totalCases, icon: AlertCircle, color: 'border-rose-500/30 text-rose-400' },
    { label: 'AI Analyzed', pct: '97%', count: analyzed, icon: Brain, color: 'border-[#7c3aed]/40 text-[#a855f7]' },
    { label: 'Contacted', pct: '68%', count: contacted, icon: Mail, color: 'border-[#7c3aed]/40 text-[#a855f7]' },
    { label: 'Link Sent', pct: '86%', count: linkSent, icon: LinkIcon, color: 'border-[#7c3aed]/40 text-[#a855f7]' },
    { label: 'Recovered', pct: '43%', count: recovered, icon: CheckCircle2, color: 'border-emerald-500 text-emerald-400 bg-emerald-500/10' },
  ];

  return (
    <div className="bg-[#0c0d18] border border-[#1a1c30] rounded-2xl p-6 shadow-xl space-y-6">
      {/* Pipeline Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white font-sans tracking-tight">Recovery Pipeline</h2>
        <button className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer">
          <span>View Details</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 5 Stage Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 relative">
        {stages.map((st) => {
          const Icon = st.icon;
          const isRecovered = st.label === 'Recovered';

          return (
            <div
              key={st.label}
              className={`border rounded-xl p-4 flex flex-col items-center justify-between text-center relative transition-all ${
                isRecovered
                  ? 'border-emerald-500/60 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : 'border-[#1a1c30] bg-[#121424]/60 hover:border-slate-700'
              }`}
            >
              {st.pct && (
                <span className="text-[10px] font-mono font-bold text-slate-400 mb-1">
                  {st.pct}
                </span>
              )}

              <div className={`p-2 rounded-lg bg-[#07080e] mb-2 ${st.color}`}>
                <Icon className="w-4 h-4" />
              </div>

              <span className="text-xs font-bold text-slate-200 block">{st.label}</span>
              <span className="text-lg font-black text-white font-mono mt-1">{st.count}</span>
            </div>
          );
        })}
      </div>

      {/* Sub-metrics Row under pipeline matching Image 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div className="bg-[#121424] border border-[#1a1c30] p-3.5 rounded-xl">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">Avg Recovery Time</span>
          <span className="text-sm font-black text-white font-mono mt-0.5 block">2h 18m</span>
        </div>
        <div className="bg-[#121424] border border-[#1a1c30] p-3.5 rounded-xl">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">Successful Retries</span>
          <span className="text-sm font-black text-white font-mono mt-0.5 block">12</span>
        </div>
        <div className="bg-[#121424] border border-[#1a1c30] p-3.5 rounded-xl">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">Escalations</span>
          <span className="text-sm font-black text-amber-400 font-mono mt-0.5 block">7</span>
        </div>
        <div className="bg-[#121424] border border-[#1a1c30] p-3.5 rounded-xl">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">Failure Rate</span>
          <span className="text-sm font-black text-rose-400 font-mono mt-0.5 block">2.1%</span>
        </div>
      </div>
    </div>
  );
};
