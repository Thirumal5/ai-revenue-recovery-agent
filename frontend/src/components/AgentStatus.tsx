import React from 'react';

interface AgentStatusProps {
  totalCasesProcessed: number;
  lastActivityTime?: string;
}

export const AgentStatus: React.FC<AgentStatusProps> = ({ totalCasesProcessed, lastActivityTime }) => {
  return (
    <div className="bg-[#0B0F19] text-white rounded-2xl p-6 shadow-md flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 mb-4">
          <h3 className="font-extrabold text-white text-xs tracking-wider uppercase">AUTONOMOUS RECOVERY ENGINE</h3>
          <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>ACTIVE</span>
          </div>
        </div>

        <p className="text-xs text-slate-300 font-normal leading-relaxed mb-6">
          RecoverXAI is continuously monitoring, deciding and executing recovery actions.
        </p>

        <div className="space-y-3.5 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-400 font-medium">
              <span>🤖</span>
              <span>Worker</span>
            </div>
            <span className="font-bold text-white">Recovery Agent #01</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-400 font-medium">
              <span>⚙️</span>
              <span>Scheduler</span>
            </div>
            <span className="font-bold text-white">Every 30 seconds</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-400 font-medium">
              <span>🛡️</span>
              <span>Customer Cooldown</span>
            </div>
            <span className="font-bold text-white">2 minutes (Demo)</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-400 font-medium">
              <span>📊</span>
              <span>Cases Processed</span>
            </div>
            <span className="font-bold text-white">{totalCasesProcessed}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-400 font-medium">
              <span>🕒</span>
              <span>Last Activity</span>
            </div>
            <span className="font-bold text-white">
              {lastActivityTime
                ? `${Math.max(1, Math.floor((Date.now() - new Date(lastActivityTime).getTime()) / 60000))}m ago`
                : totalCasesProcessed > 0
                ? 'Just now'
                : 'Waiting for events'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
