import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStyles = () => {
    switch (status) {
      case 'OPEN':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'PROCESSING':
        return 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse';
      case 'RECOVERED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ESCALATED':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'CLOSED_NO_RECOVERY':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'CLOSED_NO_RECOVERY':
        return 'CLOSED';
      default:
        return status;
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStyles()}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {getLabel()}
    </span>
  );
};
