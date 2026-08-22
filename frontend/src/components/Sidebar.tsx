import React from 'react';

interface SidebarProps {
  activeTab: 'overview' | 'cases' | 'activity' | 'customers' | 'analytics' | 'settings';
  setActiveTab: (tab: 'overview' | 'cases' | 'activity' | 'customers' | 'analytics' | 'settings') => void;
  health: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, health }) => {
  const isHealthy = health.includes('running') || health.includes('ok');

  const navItems = [
    { id: 'overview' as const, label: 'Overview', icon: '🏠' },
    { id: 'cases' as const, label: 'Recovery Cases', icon: '📋' },
    { id: 'activity' as const, label: 'Agent Activity', icon: '⚡' },
    { id: 'customers' as const, label: 'Customers', icon: '👥' },
    { id: 'analytics' as const, label: 'Analytics', icon: '📈' },
    { id: 'settings' as const, label: 'Settings', icon: '⚙️' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col h-screen sticky top-0 shrink-0 z-30 font-sans overflow-y-auto scrollbar-thin">
      {/* Top Section: Brand + Nav */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-extrabold text-base shadow-xs">
              ⚡
            </div>
            <span className="font-black text-slate-950 text-xl tracking-tight">RecoverXAI</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Autonomous AI Revenue Recovery</p>
        </div>

        {/* Navigation List */}
        <nav className="p-4 space-y-1 overflow-y-auto flex-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Fixed/Scrollable Section */}
      <div className="p-4 space-y-4 shrink-0 border-t border-slate-100/60 bg-white">
        {/* Purple Autonomous Engine Card */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 rounded-2xl p-4 text-white shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white">
              ⚡
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-400/30">
              <span>● ACTIVE</span>
            </div>
          </div>

          <h4 className="font-extrabold text-xs tracking-wider uppercase mb-1">AUTONOMOUS ENGINE</h4>
          <p className="text-[11px] text-indigo-100/90 leading-tight mb-3">
            Monitoring & recovering lost revenue 24/7
          </p>

          <div className="space-y-1 text-[10px] font-medium border-t border-white/10 pt-2 text-indigo-200">
            <div className="flex justify-between">
              <span className="text-indigo-300/80">Worker</span>
              <span className="font-bold text-white">Recovery Agent #01</span>
            </div>
            <div className="flex justify-between">
              <span className="text-indigo-300/80">Scheduler</span>
              <span className="font-bold text-white">Every 30 seconds</span>
            </div>
          </div>
        </div>

        {/* Environment & Backend Indicators */}
        <div className="space-y-2 pt-1 text-[11px] font-medium text-slate-500">
          <div>
            <span className="text-slate-400 block text-[10px]">Environment</span>
            <span className="flex items-center gap-1.5 text-slate-700 font-semibold mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Razorpay Test Mode
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px]">Backend</span>
            <span className="flex items-center gap-1.5 text-slate-700 font-semibold mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isHealthy ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              {isHealthy ? 'Connected' : 'Offline'}
            </span>
          </div>

          <div className="text-[10px] text-slate-400 pt-1">
            RecoverXAI v1.0.0
          </div>
        </div>
      </div>
    </aside>
  );
};
