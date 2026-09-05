import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, Play, CheckCircle2 } from 'lucide-react';
import type { RecoveryCase } from './RecoveryCasesTable';

interface AgentExecutionDrawerProps {
  caseRecord: RecoveryCase | null;
  onClose: () => void;
  onRunAgent: (caseId: string, e: React.MouseEvent) => void;
  isProcessing: boolean;
}

export const AgentExecutionDrawer: React.FC<AgentExecutionDrawerProps> = ({
  caseRecord,
  onClose,
  onRunAgent,
  isProcessing,
}) => {
  if (!caseRecord) return null;

  const customerName = caseRecord.customer?.name || 'Customer';

  // Find real Groq AI Decision Action if present
  const aiDecisionAction = caseRecord.actions?.find((a) => a.actionType === 'AI_DECISION');
  let aiMetadata: any = {};
  if ((aiDecisionAction as any)?.metadata) {
    try {
      aiMetadata = JSON.parse((aiDecisionAction as any).metadata);
    } catch {}
  }

  const rationaleText = aiDecisionAction?.aiReasoning
    ? aiDecisionAction.aiReasoning
    : `RecoverX AI Agent evaluated failure scenario "${caseRecord.riskReason}" for ₹${caseRecord.amount}. Policy boundary recommends automated retry and payment link dispatch.`;

  // Sort case actions chronologically for timeline
  const actionsList = [...(caseRecord.actions || [])].sort(
    (a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-xs flex justify-end">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="w-full max-w-md bg-[#090a14] border-l border-[#1a1c30] h-full shadow-2xl flex flex-col justify-between overflow-hidden"
        >
          {/* Top Bar */}
          <div className="px-6 py-5 border-b border-[#1a1c30] bg-[#07080e] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block">
                CASE: {caseRecord.id}
              </span>
              <div className="flex items-center gap-3 mt-1">
                <h2 className="text-lg font-black text-white">{customerName}</h2>
                <span
                  className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase border ${
                    caseRecord.amount > 5000
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}
                >
                  {caseRecord.amount > 5000 ? 'HIGH RISK' : 'MEDIUM RISK'}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1 font-sans">
            {/* AI Decision Rationale Box */}
            <div className="bg-[#7c3aed]/10 border border-[#7c3aed]/40 p-4 rounded-xl space-y-2 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-[#a855f7]" />
                  <span className="text-xs font-mono font-bold text-[#a855f7] uppercase tracking-wider">
                    AI DECISION RATIONALE
                  </span>
                </div>
                {aiMetadata.chosen_action && (
                  <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {aiMetadata.chosen_action}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                {rationaleText}
              </p>
              {aiMetadata.confidence && (
                <div className="text-[10px] font-mono text-slate-400 pt-1">
                  Confidence Score: <span className="text-white font-bold">{(aiMetadata.confidence * 100).toFixed(0)}%</span>
                </div>
              )}
            </div>

            {/* Recovery Timeline */}
            <div className="space-y-4">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
                RECOVERY TIMELINE TRACE ({actionsList.length + 1} EVENTS)
              </span>

              <div className="relative pl-6 space-y-6">
                {/* Vertical Timeline Bar */}
                <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-[#1a1c30]" />

                {/* Event 1: Payment Failed Event Ingested */}
                <div className="relative flex items-start gap-3">
                  <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block">
                      {new Date(caseRecord.createdAt).toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-white block">Payment Failure Event Ingested</span>
                    <span className="text-[11px] text-rose-400 block mt-0.5">
                      Reason: {caseRecord.riskReason} (₹{caseRecord.amount})
                    </span>
                  </div>
                </div>

                {/* Event 2+: Real Agent Actions */}
                {actionsList.map((act) => (
                  <div key={act.id} className="relative flex items-start gap-3">
                    <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-[#7c3aed]/20 border-2 border-[#7c3aed] flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7]" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 block">
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <span className="text-xs font-bold text-white block">
                        {act.actionType.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] text-slate-300 block mt-0.5">
                        {act.aiReasoning}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Terminal Status Event if RECOVERED */}
                {caseRecord.status === 'RECOVERED' && (
                  <div className="relative flex items-start gap-3">
                    <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 block">Verified Status</span>
                      <span className="text-xs font-bold text-emerald-400 block">RECOVERED</span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Payment verified via Razorpay webhook. Workflow stopped.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div className="p-6 border-t border-[#1a1c30] bg-[#07080e] space-y-2">
            <button
              disabled={isProcessing || caseRecord.status === 'RECOVERED'}
              onClick={(e) => onRunAgent(caseRecord.id, e)}
              className="w-full py-3 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 text-white text-xs font-mono font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#7c3aed]/25"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{isProcessing ? 'Executing Agent Workflow...' : 'Execute Recovery Action Now'}</span>
            </button>

            {caseRecord.razorpayPaymentLinkId && (
              <a
                href={`https://rzp.io/i/${caseRecord.razorpayPaymentLinkId}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 bg-[#121424] hover:bg-[#1e2038] border border-[#1a1c30] text-slate-200 text-xs font-mono font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Open Razorpay Test Checkout →</span>
              </a>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
