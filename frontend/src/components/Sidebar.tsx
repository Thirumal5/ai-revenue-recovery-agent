import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  CreditCard,
  Cpu,
  TrendingUp,
  Settings,
} from 'lucide-react';

export type TabType = 'overview' | 'recovery' | 'ai_ops' | 'analytics' | 'settings';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  health: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, health }) => {
  const isHealthy = health.includes('running') || health.includes('ok');

  const navItems: Array<{ id: TabType; label: string; icon: React.ElementType }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'recovery', label: 'Recovery', icon: CreditCard },
    { id: 'ai_ops', label: 'AI Operations', icon: Cpu },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#070b14] border-r border-[#1a1c30] flex flex-col h-screen sticky top-0 shrink-0 z-30 font-sans select-none overflow-hidden shadow-2xl">
      {/* Brand Header with Logo */}
      <div className="p-5 border-b border-[#1a1c30] shrink-0 bg-[#060913]">
        <div className="flex items-center gap-3">
          {/* Custom Logo Icon */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#6366f1] flex items-center justify-center text-white shadow-[0_0_20px_rgba(124,58,237,0.4)] border border-[#a855f7]/30">
            <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
              <path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 2.8L18 8v8l-6 3.75L6 16V8l6-3.2s0 0 0 0z" />
              <circle cx="12" cy="12" r="2.5" className="fill-white animate-pulse" />
            </svg>
          </div>

          <div>
            <h1 className="font-black text-white text-base tracking-tight leading-snug">
              RecoverX
            </h1>
            <span className="text-[9px] text-[#a855f7] font-mono font-bold tracking-widest uppercase block">
              AUTONOMOUS RECOVERY
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="p-3 space-y-1.5 overflow-y-auto flex-1 scrollbar-none bg-[#070b14]">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all relative cursor-pointer ${
                isActive
                  ? 'text-white bg-[#7c3aed]/15 border border-[#7c3aed]/40 shadow-[0_0_15px_rgba(124,58,237,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#0f1424]'
              }`}
            >
              {/* Left Purple Indicator Bar */}
              {isActive && (
                <motion.div
                  layoutId="purpleLeftBar"
                  className="absolute left-0 top-2 bottom-2 w-1 bg-[#7c3aed] rounded-r-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}

              <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-[#a855f7]' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom System Status */}
      <div className="p-4 border-t border-[#1a1c30] bg-[#050810] shrink-0 text-[11px] font-mono text-slate-400 space-y-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-rose-500'}`} />
          <span className="text-slate-300 font-semibold">System Health: {isHealthy ? 'Online' : 'Degraded'}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
          <span>Autonomous Engine Live</span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          <span>Razorpay Test Mode</span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className={`w-1.5 h-1.5 rounded-full ${isHealthy ? 'bg-emerald-400' : 'bg-rose-500'}`} />
          <span>{isHealthy ? 'Backend Connected' : 'Backend Offline'}</span>
        </div>
      </div>
    </aside>
  );
};
