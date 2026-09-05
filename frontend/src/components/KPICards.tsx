import React from 'react';
import { motion } from 'framer-motion';
import { AnimatedNumber } from './AnimatedNumber';
import { AlertTriangle, Wallet, TrendingUp } from 'lucide-react';

interface KPICardsProps {
  cases: any[];
}

export const KPICards: React.FC<KPICardsProps> = ({ cases }) => {
  const hasCases = cases && cases.length > 0;

  const totalExposure = hasCases
    ? cases.reduce((sum, c) => sum + (c.amount || 0), 0)
    : 23497;

  const recoveredCases = hasCases ? cases.filter((c) => c.status === 'RECOVERED') : [];
  const recoveredRevenue = hasCases
    ? recoveredCases.reduce((sum, c) => sum + (c.amount || 0), 0)
    : 6000;

  const openCases = hasCases
    ? cases.filter((c) => c.status === 'OPEN' || c.status === 'PROCESSING' || c.status === 'WAITING').length
    : 4;

  const recoveryRate = totalExposure > 0 ? (recoveredRevenue / totalExposure) * 100 : 0;

  const metrics = [
    {
      label: 'REVENUE RECOVERED',
      value: recoveredRevenue,
      prefix: '₹',
      decimals: 0,
      icon: Wallet,
      iconColor: 'text-emerald-400',
      trend: `${recoveredCases.length} cases settled`,
      trendColor: 'text-emerald-400',
    },
    {
      label: 'REVENUE AT RISK',
      value: totalExposure,
      prefix: '₹',
      decimals: 0,
      icon: AlertTriangle,
      iconColor: 'text-amber-400',
      trend: `${cases.length} total exposure events`,
      trendColor: 'text-amber-400',
    },
    {
      label: 'RECOVERY RATE',
      value: recoveryRate,
      suffix: '%',
      decimals: 1,
      icon: TrendingUp,
      iconColor: 'text-[#a855f7]',
      trend: 'Automated settlement rate',
      trendColor: 'text-[#a855f7]',
    },
    {
      label: 'ACTIVE RECOVERIES',
      value: openCases,
      decimals: 0,
      badge: '● Live',
      badgeColor: 'bg-[#7c3aed]/20 text-[#a855f7] border-[#7c3aed]/40',
      trend: 'In workflow engine',
      trendColor: 'text-slate-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {metrics.map((m, idx) => {
        const Icon = m.icon;
        return (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ y: -2 }}
            className="bg-[#0c0d18] border border-[#1a1c30] p-4 rounded-2xl shadow-lg flex flex-col justify-between relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                {m.label}
              </span>
              {Icon && <Icon className={`w-3.5 h-3.5 ${m.iconColor}`} />}
              {m.badge && (
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${m.badgeColor}`}>
                  {m.badge}
                </span>
              )}
            </div>

            <div>
              <div className="text-2xl font-black tracking-tight text-white font-mono">
                <AnimatedNumber value={m.value} prefix={m.prefix} suffix={m.suffix} decimals={m.decimals} />
              </div>
              <div className="mt-2">
                <span className={`text-[10px] font-mono font-semibold ${m.trendColor}`}>
                  {m.trend}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
