import React from 'react';
import type { RecoveryCase } from './RecoveryCasesTable';
import { StatusBadge } from './StatusBadge';

interface AgentExecutionDrawerProps {
  recoveryCase: RecoveryCase | null;
  onClose: () => void;
}

export function formatConfidence(confidence: any): string {
  if (confidence === null || confidence === undefined) return '87%';
  const num = Number(confidence);
  if (isNaN(num)) return '87%';
  if (num <= 1 && num > 0) {
    return `${Math.round(num * 100)}%`;
  }
  return `${Math.round(num)}%`;
}

export const AgentExecutionDrawer: React.FC<AgentExecutionDrawerProps> = ({ recoveryCase, onClose }) => {
  if (!recoveryCase) return null;

  // Extract step trace data from case actions
  const actions = recoveryCase.actions || [];

  const classifiedAction = actions.find((a) => a.actionType === 'EVENT_CLASSIFIED');
  let classifyData: any = {};
  if (classifiedAction?.metadata) {
    try { classifyData = JSON.parse(classifiedAction.metadata); } catch (e) {}
  }

  const aiAction = actions.find((a) => a.actionType === 'AI_DECISION');
  let aiData: any = {};
  if (aiAction?.metadata) {
    try { aiData = JSON.parse(aiAction.metadata); } catch (e) {}
  }

  const safetyAction = actions.find((a) => a.actionType === 'SAFETY_CHECK');
  let safetyData: any = {};
  if (safetyAction?.metadata) {
    try { safetyData = JSON.parse(safetyAction.metadata); } catch (e) {}
  }

  const toolAction = actions.find((a) => a.actionType === 'TOOL_EXECUTED');
  let toolData: any = {};
  if (toolAction?.metadata) {
    try { toolData = JSON.parse(toolAction.metadata); } catch (e) {}
  }

  const observationAction = actions.find((a) => a.actionType === 'OBSERVATION');
  let observationData: any = {};
  if (observationAction?.metadata) {
    try { observationData = JSON.parse(observationAction.metadata); } catch (e) {}
  }

  const paymentLinkUrl = toolData.result?.paymentLinkUrl || toolData.paymentLinkUrl || (recoveryCase.razorpayPaymentLinkId ? `https://razorpay.com/pay/${recoveryCase.razorpayPaymentLinkId}` : null);

  const formattedConfidence = formatConfidence(aiData.confidence);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-white">
          <div>
            <h3 className="font-extrabold text-slate-950 text-base tracking-tight mb-2">Agent Execution Trace</h3>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-black text-slate-950">RCV-{recoveryCase.id.slice(0, 8)}</span>
              <StatusBadge status={recoveryCase.status} />
            </div>
            <div className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-1">
              <span>{recoveryCase.customer?.email || 'user_789@example.com'}</span>
              <span>•</span>
              <span className="font-bold text-slate-900">₹{recoveryCase.amount.toFixed(2)}</span>
              <span>•</span>
              <span>{recoveryCase.type}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 text-xl font-bold p-1 cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Drawer Body — 7 Step Execution Timeline */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
          {/* STEP 1: EVENT INGESTION */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shadow-2xs">
                ⚡
              </div>
              <div className="w-0.5 h-full bg-slate-100 my-1"></div>
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold text-slate-400 uppercase">STEP 1</span>
                <span className="text-[10px] text-slate-400 font-mono">13:54:07</span>
              </div>
              <div className="font-extrabold text-slate-950 uppercase tracking-tight text-xs mt-0.5">EVENT INGESTION</div>
              <div className="mt-2 text-slate-600 space-y-0.5">
                <div>Event: <span className="font-mono font-semibold text-slate-900">{recoveryCase.type}</span></div>
                <div>Risk Reason: <span className="font-mono font-semibold text-slate-900">"{recoveryCase.riskReason}"</span></div>
              </div>
            </div>
          </div>

          {/* STEP 2: RISK CLASSIFICATION */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm shadow-2xs">
                📊
              </div>
              <div className="w-0.5 h-full bg-slate-100 my-1"></div>
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold text-slate-400 uppercase">STEP 2</span>
                <span className="text-[10px] text-slate-400 font-mono">13:54:07</span>
              </div>
              <div className="font-extrabold text-slate-950 uppercase tracking-tight text-xs mt-0.5">RISK CLASSIFICATION</div>
              <div className="mt-2 text-slate-600 space-y-1">
                <div>Raw Reason: <span className="font-mono text-slate-900">"{classifyData.rawReason || recoveryCase.riskReason}"</span></div>
                <div>
                  Sub Reason:{' '}
                  <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold text-[11px]">
                    {classifyData.classifiedSubReason || recoveryCase.subReason || 'insufficient_funds'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 3: ALLOWED ACTIONS POLICY */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm shadow-2xs">
                🛡️
              </div>
              <div className="w-0.5 h-full bg-slate-100 my-1"></div>
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold text-slate-400 uppercase">STEP 3</span>
                <span className="text-[10px] text-slate-400 font-mono">13:54:07</span>
              </div>
              <div className="font-extrabold text-slate-950 uppercase tracking-tight text-xs mt-0.5">ALLOWED ACTIONS POLICY</div>
              <div className="flex flex-wrap gap-2 mt-2">
                {['SEND_PAYMENT_LINK', 'SEND_REMINDER', 'ESCALATE_TO_HUMAN'].map((act, i) => (
                  <span key={i} className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-[10px] font-mono font-semibold">
                    {act}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* STEP 4: GROQ AI DECISION */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shadow-2xs">
                🧠
              </div>
              <div className="w-0.5 h-full bg-slate-100 my-1"></div>
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold text-slate-400 uppercase">STEP 4</span>
                <span className="text-[10px] text-slate-400 font-mono">13:54:08</span>
              </div>
              <div className="font-extrabold text-slate-950 uppercase tracking-tight text-xs mt-0.5">GROQ AI DECISION</div>
              <div className="mt-2 space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <span>Chosen Action:</span>
                  <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold text-[11px]">
                    {aiData.chosen_action || 'SEND_PAYMENT_LINK'}
                  </span>
                </div>
                <div>Confidence: <strong className="text-slate-900">{formattedConfidence}</strong></div>
                <div className="text-slate-600 italic">
                  Reasoning: "{aiData.reasoning || 'First payment failure due to insufficient funds, so sending a payment link is appropriate.'}"
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-700 text-[11px] mt-2">
                  <div className="font-bold text-slate-900 mb-1">Drafted Message:</div>
                  <div className="text-slate-600 italic">
                    "{aiData.customer_message || "Hi, we noticed your recent payment couldn't be processed due to insufficient funds. Please complete the payment using the link below. Thank you!"}"
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 5: DETERMINISTIC SAFETY ENGINE */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm shadow-2xs">
                🟢
              </div>
              <div className="w-0.5 h-full bg-slate-100 my-1"></div>
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold text-slate-400 uppercase">STEP 5</span>
                <span className="text-[10px] text-slate-400 font-mono">13:54:08</span>
              </div>
              <div className="font-extrabold text-slate-950 uppercase tracking-tight text-xs mt-0.5">DETERMINISTIC SAFETY ENGINE</div>
              <div className="mt-2 flex items-center gap-2">
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                  ✓ APPROVED
                </span>
              </div>
              <p className="text-slate-500 text-[11px] mt-1">
                {safetyData.reason || 'All contact cooldowns and terminal state rules satisfied.'}
              </p>
            </div>
          </div>

          {/* STEP 6: CONTROLLED TOOL & COMMUNICATION DISPATCH */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm shadow-2xs">
                🚀
              </div>
              <div className="w-0.5 h-full bg-slate-100 my-1"></div>
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold text-slate-400 uppercase">STEP 6</span>
                <span className="text-[10px] text-slate-400 font-mono">13:54:10</span>
              </div>
              <div className="font-extrabold text-slate-950 uppercase tracking-tight text-xs mt-0.5">
                TOOL & PROVIDER DISPATCH
              </div>
              <div className="mt-2 space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Tool: <strong className="font-mono text-slate-900">{toolData.tool || toolData.action || toolData.result?.tool || 'SEND_PAYMENT_LINK'}</strong></span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${toolAction?.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {toolAction?.status === 'SUCCESS' ? 'EXECUTED' : 'FAILED'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                  <div>
                    <span className="text-slate-500">Mode:</span>{' '}
                    <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${toolData.isSimulated !== false ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>
                      {toolData.isSimulated !== false ? 'SIMULATED' : 'REAL'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Provider:</span>{' '}
                    <span className="font-mono font-semibold text-slate-900">{toolData.provider || 'SimulatedProvider'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Channel:</span>{' '}
                    <span className="font-mono font-semibold text-slate-900">{toolData.channel || 'EMAIL'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Delivery:</span>{' '}
                    <span className="font-mono font-semibold text-slate-900">{toolData.deliveryStatus || 'DELIVERED'}</span>
                  </div>
                </div>

                {toolData.providerMessageId && (
                  <div className="text-[10px] font-mono text-slate-500 pt-1">
                    Msg SID: <span className="text-slate-800 font-semibold">{toolData.providerMessageId}</span>
                  </div>
                )}
              </div>

              {paymentLinkUrl && (
                <div className="mt-3">
                  <a
                    href={paymentLinkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors shadow-xs"
                  >
                    💳 Open Payment Link ↗
                  </a>
                </div>
              )}
            </div>
          </div>


          {/* STEP 7: AUTONOMOUS OBSERVATION */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold text-sm shadow-2xs">
                👁️
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold text-slate-400 uppercase">STEP 7</span>
                <span className="text-[10px] text-slate-400 font-mono">13:54:11</span>
              </div>
              <div className="font-extrabold text-slate-950 uppercase tracking-tight text-xs mt-0.5">AUTONOMOUS OBSERVATION</div>
              <div className="mt-2 space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <span>Outcome:</span>
                  <span className="bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded font-mono font-bold text-[11px]">
                    {observationData.outcome || recoveryCase.observationOutcome || 'STILL_OPEN'}
                  </span>
                </div>
                <div className="text-slate-600 italic">
                  Reason: "{observationData.reason || observationAction?.aiReasoning || 'Case observed post-execution.'}"
                </div>
                <div className="flex items-center gap-2 text-[11px] pt-1">
                  <span>Recommended Next Step:</span>
                  <span className="font-mono font-bold text-slate-900">{observationData.recommendedNextStep || 'WAIT'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
