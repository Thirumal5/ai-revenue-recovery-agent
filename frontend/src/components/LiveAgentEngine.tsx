import React from 'react';
import { Eye, Brain, MessageSquare, AlertTriangle, Cpu } from 'lucide-react';

interface LiveAgentEngineProps {
  cases: any[];
  activeProcessingCaseId?: string | null;
}

export const LiveAgentEngine: React.FC<LiveAgentEngineProps> = () => {
  return (
    <div className="bg-[#0c0d18] border border-[#1a1c30] rounded-2xl p-6 shadow-xl relative overflow-hidden h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-white font-sans tracking-tight">Live Agent Network</h2>
        <span className="w-2 h-2 rounded-full bg-[#8b5cf6] animate-ping" />
      </div>

      {/* Circular Topology Matching Image 2 */}
      <div className="relative w-full h-56 flex items-center justify-center my-auto">
        {/* Central CPU Node */}
        <div className="relative z-10 w-14 h-14 rounded-2xl bg-[#7c3aed]/20 border-2 border-[#7c3aed] flex items-center justify-center shadow-[0_0_30px_rgba(124,58,237,0.5)]">
          <Cpu className="w-7 h-7 text-[#a855f7] animate-pulse" />
        </div>

        {/* Outer Circular Ring */}
        <div className="absolute w-44 h-44 rounded-full border border-dashed border-[#7c3aed]/30 pointer-events-none" />

        {/* Outer Nodes */}
        {/* Top-Left: Detection */}
        <div className="absolute top-2 left-6 flex flex-col items-center">
          <div className="w-9 h-9 rounded-xl bg-[#121424] border border-[#1a1c30] flex items-center justify-center text-slate-300 shadow-md">
            <Eye className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-1 font-bold">Detection</span>
        </div>

        {/* Top-Right: Risk Agent */}
        <div className="absolute top-2 right-6 flex flex-col items-center">
          <div className="w-9 h-9 rounded-xl bg-[#7c3aed]/20 border border-[#7c3aed] flex items-center justify-center text-[#a855f7] shadow-[0_0_12px_rgba(124,58,237,0.4)]">
            <Brain className="w-4 h-4 text-[#a855f7]" />
          </div>
          <span className="text-[10px] font-mono text-white mt-1 font-bold">Risk Agent</span>
          <span className="text-[8px] font-mono font-bold text-[#a855f7] bg-[#7c3aed]/20 border border-[#7c3aed]/40 px-1.5 py-0.2 rounded mt-0.5">
            Active
          </span>
        </div>

        {/* Bottom-Left: Contact */}
        <div className="absolute bottom-2 left-6 flex flex-col items-center">
          <div className="w-9 h-9 rounded-xl bg-[#121424] border border-[#1a1c30] flex items-center justify-center text-slate-300 shadow-md">
            <MessageSquare className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-1 font-bold">Contact</span>
        </div>

        {/* Bottom-Right: Escalation */}
        <div className="absolute bottom-2 right-6 flex flex-col items-center">
          <div className="w-9 h-9 rounded-xl bg-[#121424] border border-[#1a1c30] flex items-center justify-center text-slate-300 shadow-md">
            <AlertTriangle className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-1 font-bold">Escalation</span>
          <span className="text-[8px] font-mono text-slate-500 bg-[#121424] border border-[#1a1c30] px-1.5 py-0.2 rounded mt-0.5">
            Idle
          </span>
        </div>
      </div>
    </div>
  );
};
