import React, { useEffect, useState } from 'react';

interface AnalyticsData {
  totalRevenueAtRisk: number;
  recoveredRevenue: number;
  recoveryRate: number;
  totalCases: number;
  openCases: number;
  recoveredCases: number;
  escalatedCases: number;
  closedCases: number;
  totalAttempts: number;
  averageAttemptsPerCase: number;
  caseTypeDistribution: Record<string, number>;
  riskReasonDistribution: Record<string, number>;
  agentDecisionDistribution: Record<string, number>;
  agentPerformance: {
    casesProcessed: number;
    totalDecisions: number;
    safetyChecks: number;
    approvedActions: number;
    blockedActions: number;
    toolExecutions: number;
  };
}

interface AnalyticsProps {
  apiBase: string;
}

export const Analytics: React.FC<AnalyticsProps> = ({ apiBase }) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/analytics`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-500 font-medium">Loading analytics data...</div>;
  }

  if (!data || data.totalCases === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-500 space-y-3">
        <div className="text-4xl">📈</div>
        <h3 className="font-extrabold text-slate-950 text-base">No recovery analytics available yet</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Create a test recovery case using the simulator to populate this analytics dashboard with real recovery intelligence.
        </p>
      </div>
    );
  }

  const caseTypes = Object.entries(data.caseTypeDistribution);
  const maxCaseTypeCount = Math.max(...caseTypes.map(([, count]) => count), 1);

  const riskReasons = Object.entries(data.riskReasonDistribution);
  const maxRiskReasonCount = Math.max(...riskReasons.map(([, count]) => count), 1);

  const agentDecisions = Object.entries(data.agentDecisionDistribution);
  const maxDecisionCount = Math.max(...agentDecisions.map(([, count]) => count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight">Recovery Analytics</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Understand revenue risk, agent decisions, and recovery performance
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Live Data</span>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Total Revenue at Risk</span>
          <span className="text-2xl font-black text-slate-950 tracking-tight mt-2 block">
            ₹{data.totalRevenueAtRisk.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">Across active cases</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Total Recovered Revenue</span>
          <span className="text-2xl font-black text-emerald-600 tracking-tight mt-2 block">
            ₹{data.recoveredRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">Saved by autonomous agent</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Recovery Rate</span>
          <span className="text-2xl font-black text-slate-950 tracking-tight mt-2 block">
            {data.recoveryRate}%
          </span>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">Recovered / total exposure</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Total Recovery Cases</span>
          <span className="text-2xl font-black text-indigo-600 tracking-tight mt-2 block">
            {data.totalCases}
          </span>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">Tracked in database</span>
        </div>
      </div>

      {/* Row 1: Charts (Revenue Performance & Case Type Distribution) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Revenue Performance */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-950 text-xs tracking-wider uppercase mb-1">
              REVENUE PERFORMANCE
            </h3>
            <p className="text-xs text-slate-500 font-medium mb-6">Revenue at risk vs. recovered revenue</p>

            <div className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between font-bold mb-1">
                  <span className="text-slate-700">Revenue at Risk</span>
                  <span className="text-slate-950">₹{data.totalRevenueAtRisk.toFixed(2)}</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (data.totalRevenueAtRisk / (data.totalRevenueAtRisk + data.recoveredRevenue || 1)) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between font-bold mb-1">
                  <span className="text-slate-700">Recovered Revenue</span>
                  <span className="text-emerald-600">₹{data.recoveredRevenue.toFixed(2)}</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (data.recoveredRevenue / (data.totalRevenueAtRisk + data.recoveredRevenue || 1)) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Overall Recovery Efficiency:</span>
            <span className="text-indigo-600 font-bold">{data.recoveryRate}% efficiency</span>
          </div>
        </div>

        {/* Chart 2: Case Type Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <h3 className="font-extrabold text-slate-950 text-xs tracking-wider uppercase mb-1">
            CASE TYPE DISTRIBUTION
          </h3>
          <p className="text-xs text-slate-500 font-medium mb-6">Distribution across revenue loss triggers</p>

          <div className="space-y-3 text-xs">
            {caseTypes.map(([type, count]) => {
              const pct = Math.round((count / maxCaseTypeCount) * 100);
              return (
                <div key={type}>
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span className="text-slate-800 capitalize">{type.replace('_', ' ')}</span>
                    <span className="text-slate-950">{count} cases ({((count / data.totalCases) * 100).toFixed(0)}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 2: Risk Reason & Agent Decision Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 3: Risk Reason Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <h3 className="font-extrabold text-slate-950 text-xs tracking-wider uppercase mb-1">
            RISK REASON DISTRIBUTION
          </h3>
          <p className="text-xs text-slate-500 font-medium mb-6">Root cause breakdown of payment failures</p>

          <div className="space-y-3 text-xs">
            {riskReasons.map(([reason, count]) => {
              const pct = Math.round((count / maxRiskReasonCount) * 100);
              return (
                <div key={reason}>
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span className="text-indigo-700 font-mono text-[11px]">{reason}</span>
                    <span className="text-slate-950">{count} occurrences</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 4: Agent Decision Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <h3 className="font-extrabold text-slate-950 text-xs tracking-wider uppercase mb-1">
            AGENT DECISION DISTRIBUTION
          </h3>
          <p className="text-xs text-slate-500 font-medium mb-6">Actions selected by Groq LLM</p>

          <div className="space-y-3 text-xs">
            {agentDecisions.map(([action, count]) => {
              const pct = Math.round((count / maxDecisionCount) * 100);
              return (
                <div key={action}>
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span className="font-mono text-slate-800 text-[11px]">{action}</span>
                    <span className="text-slate-950">{count} times</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 3: Recovery Performance Breakdown & Agent Audit Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recovery Case Performance */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <h3 className="font-extrabold text-slate-950 text-xs tracking-wider uppercase mb-4">
            RECOVERY PERFORMANCE BREAKDOWN
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <span className="text-slate-500 text-[11px] font-bold block">Average Attempts / Case</span>
              <span className="text-xl font-black text-slate-950 mt-1 block">
                {data.averageAttemptsPerCase}
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <span className="text-slate-500 text-[11px] font-bold block">Total Attempts</span>
              <span className="text-xl font-black text-slate-950 mt-1 block">
                {data.totalAttempts}
              </span>
            </div>
          </div>

          <div className="space-y-2.5 text-xs font-semibold">
            <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span>Recovered Cases</span>
              <span className="font-bold">{data.recoveredCases} cases</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
              <span>Escalated Cases</span>
              <span className="font-bold">{data.escalatedCases} cases</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200">
              <span>Open Cases</span>
              <span className="font-bold">{data.openCases} cases</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
              <span>Closed Cases</span>
              <span className="font-bold">{data.closedCases} cases</span>
            </div>
          </div>
        </div>

        {/* Autonomous Agent Performance */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <h3 className="font-extrabold text-slate-950 text-xs tracking-wider uppercase mb-1">
            AUTONOMOUS AGENT AUDIT METRICS
          </h3>
          <p className="text-xs text-slate-500 font-medium mb-4">Derived from audit logs</p>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <span className="text-slate-400 font-bold block text-[11px]">Cases Processed</span>
              <span className="text-lg font-black text-slate-950 mt-0.5 block">{data.agentPerformance.casesProcessed}</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <span className="text-slate-400 font-bold block text-[11px]">AI Decisions</span>
              <span className="text-lg font-black text-indigo-600 mt-0.5 block">{data.agentPerformance.totalDecisions}</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <span className="text-slate-400 font-bold block text-[11px]">Safety Checks</span>
              <span className="text-lg font-black text-slate-950 mt-0.5 block">{data.agentPerformance.safetyChecks}</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <span className="text-slate-400 font-bold block text-[11px]">Approved Actions</span>
              <span className="text-lg font-black text-emerald-600 mt-0.5 block">{data.agentPerformance.approvedActions}</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <span className="text-slate-400 font-bold block text-[11px]">Blocked Actions</span>
              <span className="text-lg font-black text-red-600 mt-0.5 block">{data.agentPerformance.blockedActions}</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <span className="text-slate-400 font-bold block text-[11px]">Tool Executions</span>
              <span className="text-lg font-black text-purple-600 mt-0.5 block">{data.agentPerformance.toolExecutions}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
