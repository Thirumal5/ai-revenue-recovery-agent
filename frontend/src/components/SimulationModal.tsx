import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Play, CheckCircle2, Activity, Brain, Send } from 'lucide-react';

interface SimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunSimulation: (eventType: string, riskReason: string, amount: number) => Promise<void>;
  isSimulating: boolean;
}

export const SimulationModal: React.FC<SimulationModalProps> = ({
  isOpen,
  onClose,
  onRunSimulation,
  isSimulating,
}) => {
  const [scenario, setScenario] = useState<'insufficient' | 'expired' | 'upi' | 'abandoned'>('insufficient');
  const [amount, setAmount] = useState<number>(2499);
  const [currentStep, setCurrentStep] = useState<number>(0);

  const presets = [
    {
      id: 'insufficient',
      name: 'Insufficient Funds',
      eventType: 'payment_failure',
      riskReason: 'Insufficient balance in customer bank account',
      defaultAmount: 2499,
      description: 'Customer card has insufficient funds for subscription renewal.',
    },
    {
      id: 'expired',
      name: 'Card Expired',
      eventType: 'payment_failure',
      riskReason: 'Payment instrument expired (Card MM/YY invalid)',
      defaultAmount: 4999,
      description: 'Saved credit card expired prior to automated retry attempt.',
    },
    {
      id: 'upi',
      name: 'UPI Daily Limit Exceeded',
      eventType: 'payment_failure',
      riskReason: 'Bank transaction limit reached for UPI handle',
      defaultAmount: 9999,
      description: 'Daily transaction limit exceeded on customer bank VPA.',
    },
    {
      id: 'abandoned',
      name: 'Checkout Abandoned',
      eventType: 'checkout_abandonment',
      riskReason: 'User exited checkout session after OTP screen',
      defaultAmount: 1499,
      description: 'High-intent buyer dropped off before completing payment authorization.',
    },
  ];

  const selectedPreset = presets.find((p) => p.id === scenario) || presets[0];

  const handleRun = async () => {
    setCurrentStep(1);
    const timer1 = setTimeout(() => setCurrentStep(2), 600);
    const timer2 = setTimeout(() => setCurrentStep(3), 1200);
    const timer3 = setTimeout(() => setCurrentStep(4), 1800);

    try {
      await onRunSimulation(
        selectedPreset.eventType,
        selectedPreset.riskReason,
        amount || selectedPreset.defaultAmount
      );
      setCurrentStep(5);
    } catch (e) {
      setCurrentStep(0);
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    }
  };

  if (!isOpen) return null;

  const steps = [
    { num: 1, label: 'EVENT DETECTED', icon: Activity },
    { num: 2, label: 'RISK CLASSIFIED', icon: Zap },
    { num: 3, label: 'AI STRATEGY SELECTED', icon: Brain },
    { num: 4, label: 'RECOVERY EXECUTED', icon: Send },
    { num: 5, label: 'RECOVERED / COMPLETED', icon: CheckCircle2 },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#0d1322] border border-[#1e293b] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#1e293b] bg-[#060a17] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#a855f7]" />
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                SIMULATE PAYMENT RECOVERY
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <div className="p-6 space-y-5">
            {/* Presets */}
            <div>
              <label className="text-xs font-mono font-bold uppercase text-slate-400 block mb-2">
                Select Failure Scenario Preset
              </label>
              <div className="grid grid-cols-2 gap-2">
                {presets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setScenario(p.id as any);
                      setAmount(p.defaultAmount);
                    }}
                    className={`p-3 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                      scenario === p.id
                        ? 'bg-[#7c3aed]/15 border-[#7c3aed] text-white shadow-sm'
                        : 'bg-[#060a17] border-[#1e293b] text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-bold block text-white">{p.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 block truncate">
                      ₹{p.defaultAmount}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="bg-[#060a17] border border-[#1e293b] p-3.5 rounded-xl text-xs">
              <span className="text-[10px] font-mono text-[#a855f7] font-bold block uppercase mb-1">
                Scenario Details
              </span>
              <p className="text-slate-300 font-medium">{selectedPreset.description}</p>
            </div>

            {/* Amount Input */}
            <div>
              <label className="text-xs font-mono font-bold uppercase text-slate-400 block mb-1.5">
                Recovery Exposure Amount (₹)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-[#060a17] border border-[#1e293b] focus:border-[#7c3aed] px-4 py-2.5 rounded-xl text-white font-mono text-sm outline-none transition-colors"
                placeholder="2499"
              />
            </div>

            {/* Live Sequential Step Node Execution */}
            {currentStep > 0 && (
              <div className="bg-[#060a17] border border-[#1e293b] p-4 rounded-xl space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-2">
                  AI Execution Sequence
                </span>
                <div className="space-y-2">
                  {steps.map((st) => {
                    const StepIcon = st.icon;
                    const isDone = currentStep >= st.num;
                    const isCurrent = currentStep === st.num;

                    return (
                      <div
                        key={st.num}
                        className={`flex items-center gap-3 p-2 rounded-lg text-xs font-mono transition-all ${
                          isDone
                            ? 'text-white bg-[#7c3aed]/10 border border-[#7c3aed]/30'
                            : 'text-slate-500 bg-transparent'
                        }`}
                      >
                        <StepIcon className={`w-4 h-4 ${isDone ? 'text-[#a855f7]' : 'text-slate-600'}`} />
                        <span className="font-bold flex-1">{st.label}</span>
                        {isCurrent && <span className="text-[10px] text-[#a855f7] animate-pulse">EXECUTING...</span>}
                        {isDone && !isCurrent && <span className="text-[10px] text-emerald-400">✓ PASSED</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#1e293b] bg-[#060a17] flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              disabled={isSimulating}
              onClick={handleRun}
              className="px-5 py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-mono font-bold rounded-xl shadow-lg shadow-[#7c3aed]/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{isSimulating ? 'Running Simulation...' : 'Run Recovery Simulation'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
