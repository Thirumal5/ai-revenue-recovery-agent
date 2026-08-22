import React from 'react';

interface CaseItem {
  id: string;
  amount: number;
  status: string;
}

interface KPICardsProps {
  cases: CaseItem[];
}

export const KPICards: React.FC<KPICardsProps> = ({ cases }) => {
  const openOrEscalatedCases = cases.filter((c) => c.status === 'OPEN' || c.status === 'ESCALATED');
  const revenueAtRisk = openOrEscalatedCases.reduce((sum, c) => sum + c.amount, 0);

  const recoveredCases = cases.filter((c) => c.status === 'RECOVERED');
  const recoveredRevenue = recoveredCases.reduce((sum, c) => sum + c.amount, 0);

  const openCasesCount = cases.filter((c) => c.status === 'OPEN').length;

  const totalExposure = revenueAtRisk + recoveredRevenue;
  const recoveryRate = totalExposure > 0
    ? ((recoveredRevenue / totalExposure) * 100).toFixed(1)
    : (cases.length > 0 && recoveredCases.length > 0 ? '100.0' : '0.0');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
      {/* 1. Revenue at Risk */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
              Revenue at Risk <span className="text-slate-400 font-normal">ⓘ</span>
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-100/70 text-purple-700 flex items-center justify-center font-bold text-base">
              💼
            </div>
          </div>
          <div className="text-2xl font-black text-slate-950 tracking-tight">
            ₹{revenueAtRisk.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 text-xs">
          <span className="text-slate-500 font-medium">
            Across {openOrEscalatedCases.length} active cases
          </span>
          <span className="text-indigo-600 bg-indigo-50 font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5">
            Active Risk
          </span>
        </div>
      </div>

      {/* 2. Recovered Revenue */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
              Recovered Revenue <span className="text-slate-400 font-normal">ⓘ</span>
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center font-bold text-base">
              📈
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 tracking-tight">
            ₹{recoveredRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 text-xs">
          <span className="text-slate-500 font-medium">Successfully recovered</span>
          <span className="text-emerald-600 bg-emerald-50 font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5">
            Saved
          </span>
        </div>
      </div>

      {/* 3. Open Cases */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
              Open Cases <span className="text-slate-400 font-normal">ⓘ</span>
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center font-bold text-base">
              📁
            </div>
          </div>
          <div className="text-2xl font-black text-slate-950 tracking-tight">
            {openCasesCount}
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 text-xs">
          <span className="text-slate-500 font-medium">Awaiting recovery action</span>
          <span className="text-blue-600 bg-blue-50 font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5">
            Open
          </span>
        </div>
      </div>

      {/* 4. Recovery Rate */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
              Recovery Rate <span className="text-slate-400 font-normal">ⓘ</span>
            </span>
            <div className="w-9 h-9 rounded-xl bg-orange-100/70 text-orange-700 flex items-center justify-center font-bold text-base">
              🍰
            </div>
          </div>
          <div className="text-2xl font-black text-slate-950 tracking-tight">
            {recoveryRate}%
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 text-xs">
          <span className="text-slate-500 font-medium">Recovered / total risk</span>
          <span className="text-orange-600 bg-orange-50 font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5">
            Rate
          </span>
        </div>
      </div>
    </div>
  );
};
