import React from 'react';
import { ShieldCheck, Cpu, CreditCard, Mail, Server, Radio } from 'lucide-react';

interface SettingsProps {
  apiBase: string;
}

export const Settings: React.FC<SettingsProps> = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-white tracking-tight">System Settings & Configuration</h1>
        <p className="text-xs text-slate-400 font-medium mt-0.5">
          Manage integrations, recovery policy safety limits & system environment credentials
        </p>
      </div>

      {/* Organization Info */}
      <div className="bg-[#0d1322] border border-[#1e293b] rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-[#1e293b] pb-3">
          <Server className="w-4 h-4 text-[#a855f7]" />
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            ORGANIZATION & ENVIRONMENT
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-[#060a17] border border-[#1e293b] p-3.5 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">Merchant Name</span>
            <span className="font-bold text-white text-sm">RecoveryX Enterprise</span>
          </div>
          <div className="bg-[#060a17] border border-[#1e293b] p-3.5 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">Environment Mode</span>
            <span className="font-bold text-emerald-400 text-sm flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              PRODUCTION READY (TEST KEYS)
            </span>
          </div>
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="bg-[#0d1322] border border-[#1e293b] rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-[#1e293b] pb-3">
          <Radio className="w-4 h-4 text-[#38bdf8]" />
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            CONNECTED FINTECH & AI INTEGRATIONS
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-[#060a17] border border-[#1e293b] p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#7c3aed]/10 text-[#a855f7]">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block">Razorpay API</span>
                <span className="text-[10px] text-slate-500 font-mono">Payment Links & Webhooks</span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              CONNECTED
            </span>
          </div>

          <div className="bg-[#060a17] border border-[#1e293b] p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block">Groq AI Engine</span>
                <span className="text-[10px] text-slate-500 font-mono">Llama-3.3 70B Decision Policy</span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              CONNECTED
            </span>
          </div>

          <div className="bg-[#060a17] border border-[#1e293b] p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block">SendGrid Email</span>
                <span className="text-[10px] text-slate-500 font-mono">Payment Recovery Delivery</span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              ACTIVE
            </span>
          </div>

          <div className="bg-[#060a17] border border-[#1e293b] p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block">Safety Engine</span>
                <span className="text-[10px] text-slate-500 font-mono">Allowed Action Boundaries</span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              ENFORCED
            </span>
          </div>
        </div>
      </div>

      {/* Recovery Policies */}
      <div className="bg-[#0d1322] border border-[#1e293b] rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-[#1e293b] pb-3">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            RECOVERY POLICIES & BOUNDARIES
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="bg-[#060a17] border border-[#1e293b] p-3.5 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">Max Retry Attempts</span>
            <span className="font-bold text-white text-base">3 Retries</span>
          </div>
          <div className="bg-[#060a17] border border-[#1e293b] p-3.5 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">Cooldown Window</span>
            <span className="font-bold text-white text-base">24 Hours</span>
          </div>
          <div className="bg-[#060a17] border border-[#1e293b] p-3.5 rounded-xl">
            <span className="text-slate-500 text-[10px] uppercase block">Escalation Policy</span>
            <span className="font-bold text-amber-400 text-base">AUTO_ESCALATE</span>
          </div>
        </div>
      </div>
    </div>
  );
};
