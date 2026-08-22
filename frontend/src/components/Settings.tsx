import React, { useEffect, useState } from 'react';

interface SettingsConfig {
  autonomousEngine: {
    status: string;
    scheduler: string;
    scanInterval: string;
    cooldown: string;
    processing: string;
  };
  aiConfig: {
    provider: string;
    model: string;
    decisionMode: string;
    role: string;
    description: string;
  };
  paymentIntegration: {
    provider: string;
    environment: string;
    paymentLinks: string;
    credentialsStatus: string;
    securityNotice: string;
  };
  safetyEngine: {
    status: string;
    rules: Array<{ name: string; description: string }>;
  };
  database: {
    type: string;
    entities: string[];
    status: string;
  };
}

interface SettingsProps {
  apiBase: string;
}

export const Settings: React.FC<SettingsProps> = ({ apiBase }) => {
  const [config, setConfig] = useState<SettingsConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/settings/config`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error('Failed to fetch settings config', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !config) {
    return <div className="p-12 text-center text-xs text-slate-500 font-medium">Loading system configuration...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight">Settings</h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          RecoverXAI autonomous engine configuration & safety rules
        </p>
      </div>

      {/* Section 1: Autonomous Engine */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-base">⚡</span>
            <h3 className="font-extrabold text-slate-950 text-xs tracking-wider uppercase">AUTONOMOUS ENGINE</h3>
          </div>
          <span className="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
            ● ACTIVE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-medium">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 block text-[11px]">Worker Scheduler</span>
            <span className="font-bold text-slate-900 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> {config.autonomousEngine.scheduler}
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 block text-[11px]">Scan Interval</span>
            <span className="font-bold text-slate-900 mt-1 block">{config.autonomousEngine.scanInterval}</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 block text-[11px]">Customer Contact Cooldown</span>
            <span className="font-bold text-indigo-700 mt-1 block">{config.autonomousEngine.cooldown}</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 block text-[11px]">Processing Pipeline</span>
            <span className="font-bold text-slate-900 mt-1 block">{config.autonomousEngine.processing}</span>
          </div>
        </div>
      </div>

      {/* Section 2: AI Configuration */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-base">🧠</span>
            <h3 className="font-extrabold text-slate-950 text-xs tracking-wider uppercase">AI CONFIGURATION</h3>
          </div>
          <span className="bg-purple-50 text-purple-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-purple-200">
            {config.aiConfig.provider} LLM
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium mb-4">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 block text-[11px]">LLM Model</span>
            <span className="font-mono font-bold text-slate-900 mt-1 block">{config.aiConfig.model}</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 block text-[11px]">Decision Format</span>
            <span className="font-bold text-slate-900 mt-1 block">{config.aiConfig.decisionMode}</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 block text-[11px]">Agent Role</span>
            <span className="font-bold text-indigo-700 mt-1 block">{config.aiConfig.role}</span>
          </div>
        </div>

        <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100 text-xs text-indigo-900 leading-relaxed font-medium">
          {config.aiConfig.description}
        </div>
      </div>

      {/* Section 3: Payment Integration */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-base">💳</span>
            <h3 className="font-extrabold text-slate-950 text-xs tracking-wider uppercase">PAYMENT INTEGRATION</h3>
          </div>
          <span className="bg-blue-50 text-blue-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
            {config.paymentIntegration.provider}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium mb-4">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 block text-[11px]">Environment Mode</span>
            <span className="font-bold text-slate-900 mt-1 block">{config.paymentIntegration.environment}</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 block text-[11px]">Payment Links</span>
            <span className="font-bold text-emerald-600 mt-1 block">{config.paymentIntegration.paymentLinks}</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 block text-[11px]">Credentials Security</span>
            <span className="font-bold text-emerald-700 mt-1 block">{config.paymentIntegration.credentialsStatus}</span>
          </div>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 font-medium flex items-center gap-2">
          <span>🔒</span>
          <span>{config.paymentIntegration.securityNotice}</span>
        </div>
      </div>

      {/* Section 4: Safety Engine */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-base">🛡️</span>
            <h3 className="font-extrabold text-slate-950 text-xs tracking-wider uppercase">DETERMINISTIC SAFETY ENGINE</h3>
          </div>
          <span className="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
            ● {config.safetyEngine.status}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-medium mb-4">
          {config.safetyEngine.rules.map((rule, idx) => (
            <div key={idx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 flex items-start gap-2.5">
              <span className="text-emerald-500 font-bold mt-0.5">✓</span>
              <div>
                <span className="font-bold text-slate-900 block">{rule.name}</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">{rule.description}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100 text-xs text-emerald-900 font-medium">
          Every AI decision passes through deterministic safety checks before any external tool can execute.
        </div>
      </div>

      {/* Section 5: Database */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-base">🗄️</span>
            <h3 className="font-extrabold text-slate-950 text-xs tracking-wider uppercase">DATABASE & PERSISTENCE</h3>
          </div>
          <span className="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
            ● {config.database.status}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 block text-[11px]">ORM & Storage</span>
            <span className="font-bold text-slate-900 mt-1 block">{config.database.type}</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 block text-[11px]">Persisted Entities</span>
            <div className="flex gap-2 mt-1">
              {config.database.entities.map((e, i) => (
                <span key={i} className="bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-200">
                  {e}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
