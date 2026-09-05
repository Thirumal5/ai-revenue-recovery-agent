import React from 'react';
import type { TabType } from './Sidebar';
import { Bell } from 'lucide-react';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  health: string;
  cases: any[];
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, cases }) => {
  const openCasesCount = cases.filter((c) => c.status === 'OPEN').length;

  const tabLabels: Record<TabType, string> = {
    overview: 'Overview',
    recovery: 'Recovery',
    ai_ops: 'AI Operations',
    analytics: 'Analytics',
    settings: 'Settings',
  };

  return (
    <header className="h-16 bg-[#060913] border-b border-[#1a1c30] px-6 flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-md">
      {/* Left Title */}
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-black text-white tracking-tight">
          {tabLabels[activeTab]}
        </h1>
        <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
          RAZORPAY TEST MODE
        </span>
      </div>

      {/* Right Header Status Controls */}
      <div className="flex items-center gap-3">
        {/* Autonomous Engine Live Pill */}
        <div className="flex items-center gap-2 bg-[#7c3aed]/15 border border-[#7c3aed]/40 px-3 py-1 rounded-full text-xs font-mono font-bold text-white shadow-[0_0_12px_rgba(124,58,237,0.2)]">
          <span className="w-2 h-2 rounded-full bg-[#a855f7] animate-pulse" />
          <span>AUTONOMOUS ENGINE LIVE</span>
        </div>

        {/* Bell Icon with Badge */}
        <div className="p-2 rounded-xl bg-[#0f1424] border border-[#1a1c30] text-slate-400 relative">
          <Bell className="w-4 h-4" />
          {openCasesCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#7c3aed] rounded-full border border-black" />
          )}
        </div>
      </div>
    </header>
  );
};
