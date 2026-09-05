import React from 'react';
import { KPICards } from './KPICards';
import { LiveAgentEngine } from './LiveAgentEngine';
import { HorizontalRecoveryPipeline } from './HorizontalRecoveryPipeline';
import { ActivityFeed } from './ActivityFeed';
import { Play, Cpu } from 'lucide-react';

interface OverviewTabProps {
  cases: any[];
  processingCaseId: string | null;
  onSelectCase: (id: string) => void;
  onNavigateToRecovery: () => void;
  onNavigateToAIOps: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  cases,
  processingCaseId,
  onSelectCase,
  onNavigateToRecovery,
  onNavigateToAIOps,
}) => {
  return (
    <div className="space-y-6">
      {/* Overview Header & Primary Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0c0d18] border border-[#1a1c30] p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white tracking-tight">
              Autonomous Revenue Recovery
            </h1>
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              BOUNDED AUTONOMY LIVE
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Detect revenue at risk. Recover it automatically. Verify every outcome.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToRecovery}
            className="px-4 py-2.5 bg-gradient-to-r from-[#7c3aed] to-[#6366f1] hover:from-[#6d28d9] hover:to-[#4f46e5] text-white text-xs font-mono font-bold rounded-xl shadow-lg shadow-[#7c3aed]/25 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Start Recovery Test</span>
          </button>

          <button
            onClick={onNavigateToAIOps}
            className="px-4 py-2.5 bg-[#121424] hover:bg-[#1a1c30] border border-[#1a1c30] hover:border-slate-700 text-slate-200 text-xs font-mono font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5 text-[#a855f7]" />
            <span>View AI Operations</span>
          </button>
        </div>
      </div>

      {/* 4 Core KPI Metric Cards */}
      <KPICards cases={cases} />

      {/* Middle Row: Recovery Pipeline & Live Agent Network */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <HorizontalRecoveryPipeline cases={cases} />
        </div>
        <div>
          <LiveAgentEngine cases={cases} activeProcessingCaseId={processingCaseId} />
        </div>
      </div>

      {/* Bottom Row: Live Autonomous Activity & Cases Feed */}
      <ActivityFeed cases={cases} onSelectCase={onSelectCase} />
    </div>
  );
};
