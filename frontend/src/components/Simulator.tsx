import React from 'react';

interface SimulatorProps {
  onTrigger: (eventType: string, riskReason: string, amount: number) => void;
  isSimulating: boolean;
}

export const Simulator: React.FC<SimulatorProps> = ({ onTrigger, isSimulating }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 mb-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="font-extrabold text-slate-950 text-xs tracking-wider uppercase">TEST MODE SIMULATOR</h3>
            <span className="bg-indigo-50 text-indigo-700 text-[11px] font-bold px-2.5 py-0.5 rounded-md border border-indigo-200">
              Razorpay Test Environment
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Simulate payment failure events. All events are processed automatically by the autonomous agent.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          disabled={isSimulating}
          onClick={() => onTrigger('payment.failed', 'Insufficient funds', 50)}
          className="flex flex-col text-left p-4 rounded-xl border border-indigo-100 bg-indigo-50/30 hover:bg-indigo-50 hover:border-indigo-300 transition-all cursor-pointer disabled:opacity-50 group shadow-2xs"
        >
          <div className="flex items-center justify-between w-full mb-1">
            <span className="text-xs font-extrabold text-indigo-700 group-hover:text-indigo-900">+ Insufficient Funds</span>
          </div>
          <div className="flex items-center justify-between w-full mt-2">
            <span className="text-[11px] text-slate-500 font-mono">payment.failed</span>
            <span className="text-xs font-bold text-slate-900">₹50.00</span>
          </div>
        </button>

        <button
          disabled={isSimulating}
          onClick={() => onTrigger('subscription.halted', 'Card expired', 120)}
          className="flex flex-col text-left p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-indigo-50/40 hover:border-indigo-200 transition-all cursor-pointer disabled:opacity-50 group shadow-2xs"
        >
          <div className="flex items-center justify-between w-full mb-1">
            <span className="text-xs font-extrabold text-slate-900 group-hover:text-indigo-700">+ Card Expired</span>
          </div>
          <div className="flex items-center justify-between w-full mt-2">
            <span className="text-[11px] text-slate-500 font-mono">subscription.halted</span>
            <span className="text-xs font-bold text-slate-900">₹120.00</span>
          </div>
        </button>

        <button
          disabled={isSimulating}
          onClick={() => onTrigger('payment.failed', 'UPI cap limit exceeded', 30)}
          className="flex flex-col text-left p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-indigo-50/40 hover:border-indigo-200 transition-all cursor-pointer disabled:opacity-50 group shadow-2xs"
        >
          <div className="flex items-center justify-between w-full mb-1">
            <span className="text-xs font-extrabold text-slate-900 group-hover:text-indigo-700">+ UPI Limit Exceeded</span>
          </div>
          <div className="flex items-center justify-between w-full mt-2">
            <span className="text-[11px] text-slate-500 font-mono">payment.failed</span>
            <span className="text-xs font-bold text-slate-900">₹30.00</span>
          </div>
        </button>

        <button
          disabled={isSimulating}
          onClick={() => onTrigger('checkout.abandoned', 'Checkout abandoned', 85)}
          className="flex flex-col text-left p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-indigo-50/40 hover:border-indigo-200 transition-all cursor-pointer disabled:opacity-50 group shadow-2xs"
        >
          <div className="flex items-center justify-between w-full mb-1">
            <span className="text-xs font-extrabold text-slate-900 group-hover:text-indigo-700">+ Checkout Abandoned</span>
          </div>
          <div className="flex items-center justify-between w-full mt-2">
            <span className="text-[11px] text-slate-500 font-mono">checkout.abandoned</span>
            <span className="text-xs font-bold text-slate-900">₹85.00</span>
          </div>
        </button>
      </div>
    </div>
  );
};
