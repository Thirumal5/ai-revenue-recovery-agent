// Recovery Playground - Pro Max Dark Luxury UI
import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  UserPlus,
  Zap,
  CreditCard,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  FileText,
  ArrowRight,
  Activity,
  Trash2,
  Send,
  User,
  Info,
} from 'lucide-react';
import type { RecoveryCase } from './RecoveryCasesTable';

interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  totalCases?: number;
  openCases?: number;
  recoveredRevenue?: number;
  cases?: RecoveryCase[];
}

interface RecoveryPlaygroundProps {
  apiBase: string;
  cases: RecoveryCase[];
  onRefreshCases: () => Promise<void>;
  onSelectCase: (caseId: string) => void;
}

export const RecoveryPlayground: React.FC<RecoveryPlaygroundProps> = ({
  apiBase,
  cases,
  onRefreshCases,
  onSelectCase,
}) => {
  // Section A State: Customer creation
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [custName, setCustName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custLoading, setCustLoading] = useState(false);
  const [custError, setCustError] = useState<string | null>(null);
  const [custSuccess, setCustSuccess] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Section B State: Recovery Case creation
  const [amount, setAmount] = useState<string>('1000');
  const [scenario, setScenario] = useState<string>('payment_failure');
  const [riskReason, setRiskReason] = useState<string>('Insufficient Funds');
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [createdNotice, setCreatedNotice] = useState<{ id: string; status: string } | null>(null);

  // Dev Demo Reset State
  const [resetting, setResetting] = useState(false);

  // Live polling ref
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchCustomers();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  useEffect(() => {
    if (cases.length > 0 && !activeCaseId) {
      setActiveCaseId(cases[0].id);
    }
  }, [cases]);

  // Live reconciliation polling for active case
  useEffect(() => {
    if (!activeCaseId) return;

    const currentCase = cases.find((c) => c.id === activeCaseId);
    if (currentCase && currentCase.status !== 'OPEN') {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    // Start 2.5s polling loop while case is OPEN
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      await onRefreshCases();
    }, 2500);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [activeCaseId, cases, onRefreshCases]);

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${apiBase}/api/customers`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
        if (data.length > 0 && !selectedCustomerId) {
          setSelectedCustomerId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  const handleResetPlayground = async () => {
    if (!window.confirm('Reset Playground: Are you sure you want to clear all synthetic test customers and recovery cases?')) {
      return;
    }

    setResetting(true);
    try {
      const res = await fetch(`${apiBase}/api/demo/reset`, { method: 'POST' });
      if (res.ok) {
        setCustomers([]);
        setSelectedCustomerId('');
        setActiveCaseId(null);
        setCreatedNotice(null);
        await onRefreshCases();
      } else {
        const errData = await res.json();
        alert(`Reset failed: ${errData.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert('Network error attempting demo reset.');
    } finally {
      setResetting(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustError(null);
    setCustSuccess(null);

    const trimmedName = custName.trim();
    const trimmedEmail = custEmail.trim();
    const trimmedPhone = custPhone.trim();

    if (!trimmedName) {
      setCustError('Customer name is required');
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setCustError('Please enter a valid email address');
      return;
    }
    if (!trimmedPhone || !/^\+?[0-9\s\-]{8,15}$/.test(trimmedPhone)) {
      setCustError('Please enter a valid phone number (e.g. +919876543210)');
      return;
    }

    setCustLoading(true);

    try {
      const res = await fetch(`${apiBase}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCustError(data.error || 'Failed to create customer');
      } else {
        setCustName('');
        setCustEmail('');
        setCustPhone('');
        setCustSuccess(`Test Customer "${data.name}" created successfully`);
        await fetchCustomers();
        setSelectedCustomerId(data.id);
      }
    } catch (err) {
      setCustError('Network error connecting to server');
    } finally {
      setCustLoading(false);
    }
  };

  const handleTriggerRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setTriggerError(null);
    setCreatedNotice(null);

    if (!selectedCustomerId) {
      setTriggerError('Please select or create a test customer first');
      return;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setTriggerError('Please enter a valid positive amount');
      return;
    }

    setTriggerLoading(true);

    try {
      const res = await fetch(`${apiBase}/api/recovery-cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          amount: numAmount,
          scenario,
          riskReason,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setTriggerError(data.error || 'Failed to trigger recovery case');
      } else {
        // Reset recovery case form inputs to defaults
        setAmount('1000');
        setScenario('payment_failure');
        setRiskReason('Insufficient Funds');

        setActiveCaseId(data.caseId);
        setCreatedNotice({ id: data.caseId, status: 'OPEN' });
        onSelectCase(data.caseId);
        await onRefreshCases();
      }
    } catch (err) {
      setTriggerError('Network error triggering recovery case');
    } finally {
      setTriggerLoading(false);
    }
  };

  // Selected case logic for rendering timeline & details
  const activeCase = cases.find((c) => c.id === activeCaseId) || cases[0] || null;

  // Extract payment link metadata, AI decisions, & communication details safely
  let paymentLinkUrl: string | null = null;
  let aiDecisionName: string | null = null;
  let safetyVerdict: string | null = null;
  let webhookVerified = false;
  let razorpayPaymentId: string | null = null;
  let webhookEventId: string | null = null;
  let webhookEventType: string | null = null;
  let webhookTimestamp: string | null = null;
  let commProvider: string | null = null;
  let commChannel: string | null = null;
  let commStatusText: string | null = null;
  let commMessageSid: string | null = null;
  let isSimulatedComm = true;

  if (activeCase && activeCase.actions) {
    activeCase.actions.forEach((act) => {
      let meta: any = {};
      try {
        meta = JSON.parse((act as any).metadata || '{}');
      } catch {}

      if (act.actionType === 'AI_DECISION') {
        aiDecisionName = meta.chosen_action || 'SEND_PAYMENT_LINK';
      } else if (act.actionType === 'SAFETY_CHECK') {
        safetyVerdict = act.status === 'SUCCESS' ? 'APPROVED' : 'BLOCKED';
      } else if (act.actionType === 'TOOL_EXECUTED') {
        if (meta.paymentLinkUrl) paymentLinkUrl = meta.paymentLinkUrl;
        if (meta.provider) commProvider = meta.provider;
        if (meta.channel) commChannel = meta.channel;
        if (meta.messageSid) commMessageSid = meta.messageSid;
        if (meta.mode) isSimulatedComm = meta.mode === 'SIMULATED';
        commStatusText = isSimulatedComm ? 'Email Simulation Recorded' : (act.status || 'SENT');
      } else if (act.actionType === 'OBSERVATION' && meta.verified) {
        webhookVerified = true;
        if (meta.paymentId) razorpayPaymentId = meta.paymentId;
        if (meta.eventId) webhookEventId = meta.eventId;
        if (meta.event) webhookEventType = meta.event;
        webhookTimestamp = act.timestamp;
      }
    });
  }

  // Fallback payment link display if Razorpay Payment Link ID is attached
  if (!paymentLinkUrl && activeCase?.razorpayPaymentLinkId) {
    paymentLinkUrl = `https://rzp.io/i/${activeCase.razorpayPaymentLinkId}`;
  }

  // Backend-driven 11-step timeline logic derived from actual DB state
  const isCaseRecovered = activeCase?.status === 'RECOVERED';
  const isCaseFailed = activeCase?.status === 'CLOSED_NO_RECOVERY';
  const isCaseEscalated = activeCase?.status === 'ESCALATED';

  const timelineSteps = [
    {
      num: 1,
      title: 'EVENT RECEIVED',
      desc: 'Payment failure event ingested',
      done: !!activeCase,
    },
    {
      num: 2,
      title: 'CUSTOMER IDENTIFIED',
      desc: activeCase?.customer ? `${activeCase.customer.name}` : 'Customer identified',
      done: !!activeCase?.customer,
    },
    {
      num: 3,
      title: 'CLASSIFIED',
      desc: `Sub-reason: ${activeCase?.riskReason || 'Payment Failure'}`,
      done: !!activeCase && (activeCase.actions?.length || 0) > 0,
    },
    {
      num: 4,
      title: 'AI DECISION',
      desc: `Groq action: ${aiDecisionName || 'Evaluating...'}`,
      done: !!aiDecisionName,
    },
    {
      num: 5,
      title: 'SAFETY CHECK',
      desc: `Verdict: ${safetyVerdict || 'Checked'}`,
      done: !!safetyVerdict,
    },
    {
      num: 6,
      title: 'ACTION EXECUTED',
      desc: commStatusText ? `Execution: ${commStatusText}` : 'Tool execution running',
      done: !!commStatusText || !!paymentLinkUrl,
    },
    {
      num: 7,
      title: 'PAYMENT LINK CREATED',
      desc: paymentLinkUrl ? 'Razorpay Test link generated' : 'Pending payment link generation',
      done: !!paymentLinkUrl,
    },
    {
      num: 8,
      title: 'WAITING FOR PAYMENT',
      desc: isCaseRecovered ? 'Payment completed by customer' : 'Waiting for customer payment...',
      done: isCaseRecovered || !!paymentLinkUrl,
    },
    {
      num: 9,
      title: 'WEBHOOK RECEIVED',
      desc: isCaseRecovered ? 'Razorpay webhook event received' : 'Payment not yet verified',
      done: isCaseRecovered || webhookVerified,
    },
    {
      num: 10,
      title: 'PAYMENT VERIFIED',
      desc: isCaseRecovered ? 'HMAC SHA-256 signature verified' : 'Awaiting signature verification',
      done: isCaseRecovered || webhookVerified,
    },
    {
      num: 11,
      title: isCaseRecovered ? 'RECOVERED' : isCaseEscalated ? 'ESCALATED' : isCaseFailed ? 'CLOSED' : 'STATUS',
      desc: isCaseRecovered ? 'Payment Verified • Agent Stopped' : isCaseEscalated ? 'Escalated to merchant' : 'Agent active for open case',
      done: isCaseRecovered || isCaseEscalated || isCaseFailed,
    },
  ];

  return (
    <div className="space-y-8 pb-12 font-sans text-zinc-300">
      {/* HEADER BANNER WITH BADGES AND DEV RESET */}
      <div className="bg-[#0F0F10]/80 backdrop-blur-3xl border border-white/10 rounded-2xl p-6 shadow-2xl text-white relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/10 blur-[60px] rounded-full pointer-events-none" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2.5 flex-wrap text-white">
                Recovery Playground
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black px-2.5 py-0.5 rounded-full tracking-wide uppercase shadow-[0_0_10px_rgba(245,158,11,0.15)]">
                  TEST MODE
                </span>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black px-2.5 py-0.5 rounded-full tracking-wide uppercase shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                  AI ACTIVE
                </span>
                <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-black px-2.5 py-0.5 rounded-full tracking-wide uppercase shadow-[0_0_10px_rgba(139,92,246,0.15)]">
                  RAZORPAY TEST
                </span>
              </h2>
              <p className="text-xs text-zinc-400 font-medium mt-0.5">
                Test the autonomous AI revenue recovery lifecycle safely using synthetic test customers and real Razorpay Test Mode checkouts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            <button
              onClick={handleResetPlayground}
              disabled={resetting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-bold text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.1)] transition-colors cursor-pointer disabled:opacity-50"
              title="Deletes synthetic demo customers + their recovery cases (Dev Only)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{resetting ? 'Resetting...' : 'Reset Playground'}</span>
            </button>
          </div>
        </div>

        <div className="relative z-10 bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-zinc-300 font-medium mt-3 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <strong>Fail-Closed Webhook Reconciliation:</strong> Recovery transitions to <strong className="text-emerald-400">RECOVERED</strong> strictly after receiving an HMAC-SHA256 verified Razorpay payment webhook. No fake frontend state overrides permitted.
          </span>
        </div>
      </div>

      {/* SECTION A & B GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION A — CREATE TEST CUSTOMER */}
        <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
              <h3 className="font-extrabold text-sm text-white tracking-tight flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-purple-400" />
                1. Create Test Customer
              </h3>
              <span className="text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md uppercase">
                TEST CUSTOMER
              </span>
            </div>

            {custError && (
              <div className="mb-4 bg-rose-500/10 text-rose-400 text-xs p-3 rounded-xl border border-rose-500/20 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{custError}</span>
              </div>
            )}

            {custSuccess && (
              <div className="mb-4 bg-emerald-500/10 text-emerald-400 text-xs p-3 rounded-xl border border-emerald-500/20 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{custSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-300 font-bold mb-1">Customer Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Thirumal T"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 font-medium placeholder-zinc-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-1">Email Address *</label>
                <input
                  type="email"
                  placeholder="e.g. thiruit2004@gmail.com"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 font-medium placeholder-zinc-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-1">Mobile Phone *</label>
                <input
                  type="text"
                  placeholder="e.g. +919876543210"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 font-medium placeholder-zinc-600 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={custLoading}
                className="w-full mt-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-[1.02] text-white font-extrabold py-3 px-4 rounded-xl text-xs shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{custLoading ? 'Creating Test Customer...' : '+ Create Test Customer'}</span>
              </button>
            </form>
          </div>

          {/* Customer Selection Table */}
          <div className="mt-6 border-t border-white/5 pt-4">
            <h4 className="font-extrabold text-xs text-white mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-zinc-500" />
                <span>Demo Customers ({customers.length})</span>
              </span>
              <span className="text-[10px] text-amber-400 font-extrabold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                SYNTHETIC ONLY
              </span>
            </h4>

            <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {customers.length === 0 ? (
                <div className="bg-white/5 border border-dashed border-white/10 rounded-xl p-5 text-center">
                  <p className="text-xs text-zinc-400 font-bold">No test customers yet.</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Create one above to begin a recovery simulation.</p>
                </div>
              ) : (
                customers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCustomerId(c.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      selectedCustomerId === c.id
                        ? 'bg-purple-500/10 border-purple-500/30 text-white shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-400'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{c.name}</span>
                        <span className="text-[9px] bg-amber-500/10 text-amber-400 font-black px-1.5 py-0.5 rounded border border-amber-500/20">
                          TEST CUSTOMER
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500 font-medium">
                        {c.email} {c.phone ? `• ${c.phone}` : ''}
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedCustomerId === c.id ? 'border-purple-400' : 'border-white/20'}`}>
                      {selectedCustomerId === c.id && <div className="w-2 h-2 rounded-full bg-purple-400" />}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* SECTION B — TRIGGER RECOVERY CASE */}
        <div className={`bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col justify-between transition-opacity ${!selectedCustomerId ? 'opacity-50 pointer-events-none' : ''}`}>
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
              <h3 className="font-extrabold text-sm text-white tracking-tight flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                2. Trigger Recovery Case
              </h3>
              <span className="text-[10px] font-black bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-md uppercase">
                TEST EVENT
              </span>
            </div>

            {triggerError && (
              <div className="mb-4 bg-rose-500/10 text-rose-400 text-xs p-3 rounded-xl border border-rose-500/20 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{triggerError}</span>
              </div>
            )}

            {createdNotice && (
              <div className="mb-4 bg-emerald-500/10 text-emerald-400 text-xs p-3 rounded-xl border border-emerald-500/20 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Recovery case #{createdNotice.id.slice(0, 8)} triggered successfully!</span>
              </div>
            )}

            <form onSubmit={handleTriggerRecovery} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-300 font-bold mb-1">Target Customer</label>
                <div className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-zinc-300 font-medium flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-400" />
                  {selectedCustomerId ? customers.find(c => c.id === selectedCustomerId)?.name || selectedCustomerId : 'Select a customer from Step 1'}
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-1">Risk Event Type *</label>
                <select
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 font-bold cursor-pointer"
                >
                  <option value="payment_failure">Payment Failure</option>
                  <option value="cart_abandonment">Cart Abandonment</option>
                  <option value="subscription_lapse">Subscription Lapse</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-1">Risk Sub-Reason *</label>
                <select
                  value={riskReason}
                  onChange={(e) => setRiskReason(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 font-bold cursor-pointer"
                >
                  <option value="Insufficient Funds">Insufficient Funds (NSF)</option>
                  <option value="Card Expired">Card Expired</option>
                  <option value="Do Not Honor">Do Not Honor (Bank Declined)</option>
                  <option value="High Risk Transaction">High Fraud Risk</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-1">Amount at Risk (₹) *</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={triggerLoading || !selectedCustomerId}
                className="w-full mt-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:scale-[1.02] text-white font-extrabold py-3 px-4 rounded-xl text-xs shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>{triggerLoading ? 'Injecting Event...' : 'Inject Risk Event & Trigger Agent'}</span>
              </button>
            </form>
          </div>

          <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] text-zinc-400 font-medium flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <p>
              Clicking trigger simulates a real webhook from your billing provider. The backend agent will instantly wake up, ingest the event, run safety checks, and decide on a recovery action via Groq AI.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION C, D & E — ACTIVE RECOVERY EXECUTION TIMELINE */}
      {activeCase && (
        <div className="space-y-6">
          {/* SECTION C — TIMELINE TRACE */}
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
              <div>
                <h3 className="font-extrabold text-base text-white tracking-tight flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  3. Agent Execution Trace
                </h3>
                <p className="text-[11px] text-zinc-400 font-mono mt-1 font-bold">
                  RCV-{activeCase.id.slice(0, 8)} • {activeCase.status} • {activeCase.customer?.email} • ₹{activeCase.amount?.toFixed(2)} • {activeCase.type}
                </p>
              </div>
              <button
                onClick={onRefreshCases}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 flex items-center justify-center transition-colors cursor-pointer"
                title="Refresh timeline manually"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {timelineSteps.map((step) => (
                <div
                  key={step.num}
                  className={`p-3.5 rounded-xl border transition-all ${
                    step.done
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                      : 'bg-white/5 border-white/10 text-zinc-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${
                        step.done ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/10 text-zinc-400'
                      }`}
                    >
                      STEP {step.num}
                    </span>
                    {step.done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-zinc-600" />
                    )}
                  </div>
                  <h4 className="font-extrabold text-xs tracking-tight mb-1 text-white">{step.title}</h4>
                  <p className="text-[11px] leading-tight opacity-90">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION D — PAYMENT VERIFICATION & RAZORPAY TEST MODE CARD */}
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 border-b border-white/10 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-white tracking-tight flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-400" />
                  4. Payment Verification & Razorpay Test Mode
                </h3>
                <p className="text-xs text-zinc-400 font-medium">
                  Interact directly with the generated Razorpay Test Mode checkout to test real HMAC-signed webhook reconciliation.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                  RAZORPAY TEST MODE
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black border ${
                    isCaseRecovered
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  }`}
                >
                  STATUS: {activeCase?.status || 'PENDING'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
              {/* Payment Verification Steps Card */}
              <div className="space-y-3 bg-black/40 border border-white/10 rounded-xl p-4 text-xs">
                <div className="font-extrabold text-white border-b border-white/10 pb-2 flex items-center justify-between">
                  <span>Payment Verification Tracker</span>
                  <span className="text-[10px] text-zinc-400 font-medium">FAIL-CLOSED HMAC</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${paymentLinkUrl ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-zinc-600'}`}></span>
                    <span className={paymentLinkUrl ? 'font-bold text-white' : 'text-zinc-500'}>Payment Link Created</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${paymentLinkUrl && !isCaseRecovered ? 'bg-amber-400 animate-pulse' : isCaseRecovered ? 'bg-emerald-400' : 'bg-zinc-600'}`}></span>
                    <span className={paymentLinkUrl ? 'font-bold text-white' : 'text-zinc-500'}>
                      {isCaseRecovered ? 'Payment Completed' : 'Waiting for Customer Payment'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${webhookVerified || isCaseRecovered ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-zinc-600'}`}></span>
                    <span className={webhookVerified || isCaseRecovered ? 'font-bold text-white' : 'text-zinc-500'}>
                      Razorpay Webhook Received
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${webhookVerified || isCaseRecovered ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-zinc-600'}`}></span>
                    <span className={webhookVerified || isCaseRecovered ? 'font-bold text-white' : 'text-zinc-500'}>
                      HMAC-SHA256 Signature Verified
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isCaseRecovered ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-zinc-600'}`}></span>
                    <span className={isCaseRecovered ? 'font-extrabold text-emerald-400' : 'text-zinc-500'}>
                      Recovery Completed (RECOVERED)
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 text-[11px]">
                  <span className="font-semibold text-zinc-400">Verification Status: </span>
                  <span className={`font-bold ${isCaseRecovered ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {isCaseRecovered ? 'Payment verified by Razorpay.' : 'Waiting for Razorpay confirmation...'}
                  </span>
                </div>
              </div>

              {/* Checkout Experience Box */}
              <div className="space-y-4">
                {paymentLinkUrl ? (
                  <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">Razorpay Test Mode Link Generated</span>
                      <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                        LIVE READY
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                      Click below to open the real Razorpay Test Mode checkout (₹{activeCase?.amount || 1000}). Once payment is submitted, the status will automatically reconcile to <strong>RECOVERED</strong> via live automated polling.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <a
                        href={paymentLinkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-[1.02] text-white font-extrabold py-2.5 px-4 rounded-xl text-xs shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all"
                      >
                        <span>Open Razorpay Checkout</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>

                    {isCaseRecovered && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-2 text-xs text-zinc-200 shadow-xl">
                        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                          <span className="font-extrabold flex items-center gap-1.5 text-emerald-400">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            Verified Payment Receipt
                          </span>
                          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-md uppercase">
                            RECOVERED
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                          <div>
                            <span className="text-zinc-400 font-semibold block">Razorpay Payment ID:</span>
                            <strong className="font-mono text-white">{razorpayPaymentId || `pay_rzp_${activeCase?.id?.slice(0, 8)}`}</strong>
                          </div>
                          <div>
                            <span className="text-zinc-400 font-semibold block">Amount Recovered:</span>
                            <strong className="text-emerald-400 font-bold">₹{activeCase?.amount || 1000}</strong>
                          </div>
                          <div>
                            <span className="text-zinc-400 font-semibold block">Payment Method:</span>
                            <span className="text-white font-medium">Razorpay Test Mode</span>
                          </div>
                          <div>
                            <span className="text-zinc-400 font-semibold block">Verification Method:</span>
                            <span className="text-white font-medium">HMAC-SHA256 Webhook Verification</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center text-xs text-zinc-400 font-medium">
                    No payment link generated yet. Trigger a recovery case in Step 2 to generate a Razorpay link.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION E — COMMUNICATION ATTRIBUTION & SANITIZED AUDIT METADATA */}
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <h3 className="font-extrabold text-base text-white tracking-tight flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                5. Communication Status & Sanitized Audit Metadata
              </h3>
              <button
                onClick={() => onSelectCase(activeCase.id)}
                className="text-xs font-extrabold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>View Deep Audit Drawer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Communication Status Card */}
              <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="font-extrabold text-white flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-indigo-400" />
                    Communication Attribution
                  </span>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                      isSimulatedComm
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {isSimulatedComm ? 'SIMULATED' : 'REAL'}
                  </span>
                </div>

                {isSimulatedComm ? (
                  <div className="space-y-1">
                    <p className="font-bold text-zinc-200">Channel: {commChannel || 'EMAIL'} (Simulation Recorded)</p>
                    <p className="text-[11px] text-zinc-400 leading-snug">
                      Message generated successfully. No external message was sent to real users.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="font-bold text-zinc-200">Provider: {commProvider || 'RESEND'} ({commChannel || 'EMAIL'})</p>
                    <p className="text-[11px] text-zinc-400 font-mono">Message ID: {commMessageSid || 'N/A'}</p>
                    <p className={`text-[11px] font-bold ${commStatusText === 'FAILED' ? 'text-rose-400' : 'text-emerald-400'}`}>
                      Delivery Status: {commStatusText || 'SENT'}
                    </p>
                  </div>
                )}
              </div>

              {/* Sanitized Webhook Metadata Card */}
              <div className="bg-black/40 border border-white/10 rounded-xl p-4 text-xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="font-extrabold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Sanitized Webhook Metadata
                  </span>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                      webhookVerified ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/10 text-zinc-400'
                    }`}
                  >
                    {webhookVerified ? 'VERIFIED' : 'AWAITING'}
                  </span>
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-zinc-400 font-medium">Event Type</span>
                    <span className="font-bold font-mono text-white">{webhookEventType || 'payment.captured'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400 font-medium">HMAC Signature</span>
                    <span className="font-bold text-emerald-400">{webhookVerified ? 'VERIFIED (SHA-256)' : 'Pending'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400 font-medium">Event ID</span>
                    <span className="font-mono text-zinc-300">{webhookEventId || 'evt_rzp_...'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400 font-medium">Razorpay Payment ID</span>
                    <span className="font-mono text-zinc-300">{razorpayPaymentId || 'pay_test_...' }</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400 font-medium">Case ID</span>
                    <span className="font-mono text-zinc-300">{activeCase.id.slice(0, 14)}...</span>
                  </div>
                  {webhookTimestamp && (
                    <div className="flex justify-between">
                      <span className="text-zinc-400 font-medium">Verified Timestamp</span>
                      <span className="font-mono text-zinc-300">{new Date(webhookTimestamp).toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
