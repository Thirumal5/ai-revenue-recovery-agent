import React, { useEffect, useState } from 'react';
import { CustomerDetailDrawer, type CustomerData } from './CustomerDetailDrawer';

interface CustomersProps {
  apiBase: string;
  onSelectCase: (caseId: string) => void;
}

export const Customers: React.FC<CustomersProps> = ({ apiBase, onSelectCase }) => {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/customers`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error('Failed to fetch customers', err);
    } finally {
      setLoading(false);
    }
  };

  // Top summary metrics
  const totalCustomers = customers.length;
  const customersWithOpenCases = customers.filter((c) => c.openCases > 0).length;
  const totalRevenueAtRisk = customers.reduce((sum, c) => sum + c.revenueAtRisk, 0);
  const totalRecoveredRevenue = customers.reduce((sum, c) => sum + c.recoveredRevenue, 0);

  // Filtered customer list
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRisk = riskFilter === 'ALL' || c.riskLevel === riskFilter;
    return matchesSearch && matchesRisk;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight">Customers</h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Customer recovery history, risk exposure, and revenue protection
        </p>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Total Customers</span>
          <span className="text-2xl font-black text-slate-950 tracking-tight mt-2 block">{totalCustomers}</span>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">Active exposure database</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Customers With Open Cases</span>
          <span className="text-2xl font-black text-indigo-600 tracking-tight mt-2 block">{customersWithOpenCases}</span>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">Requiring recovery action</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Total Revenue at Risk</span>
          <span className="text-2xl font-black text-slate-950 tracking-tight mt-2 block">
            ₹{totalRevenueAtRisk.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">Across active cases</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Total Recovered Revenue</span>
          <span className="text-2xl font-black text-emerald-600 tracking-tight mt-2 block">
            ₹{totalRecoveredRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">Recovered by agent</span>
        </div>
      </div>

      {/* Customer Controls & Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Controls header */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search customer name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white font-medium shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Risk Filter:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-bold text-slate-700 cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="HIGH">High Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="LOW">Low Risk</option>
            </select>
          </div>
        </div>

        {/* Customer Table */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 font-medium">Loading customer exposure data...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <div className="text-3xl mb-2">👥</div>
            <p className="text-sm font-bold text-slate-800">No customer recovery data found</p>
            <p className="text-xs text-slate-400 mt-1">Simulate a payment failure to record customer revenue exposure.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-4">Total Cases</th>
                  <th className="py-3.5 px-4">Open Cases</th>
                  <th className="py-3.5 px-4">Revenue at Risk</th>
                  <th className="py-3.5 px-4">Recovered Revenue</th>
                  <th className="py-3.5 px-4">Recovery Rate</th>
                  <th className="py-3.5 px-4">Risk Level</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredCustomers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCustomer(c)}
                    className="hover:bg-indigo-50/30 transition-colors cursor-pointer"
                  >
                    {/* Customer Info */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="font-bold text-slate-950 text-xs flex items-center gap-2">
                        <span>{c.name}</span>
                        <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                          TEST CUSTOMER
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-normal">{c.email}</div>
                    </td>

                    {/* Total Cases */}
                    <td className="py-4 px-4 font-bold text-slate-700">{c.totalCases}</td>

                    {/* Open Cases */}
                    <td className="py-4 px-4 font-bold text-indigo-600">{c.openCases}</td>

                    {/* Revenue at Risk */}
                    <td className="py-4 px-4 font-black text-slate-950">₹{c.revenueAtRisk.toFixed(2)}</td>

                    {/* Recovered Revenue */}
                    <td className="py-4 px-4 font-black text-emerald-600">₹{c.recoveredRevenue.toFixed(2)}</td>

                    {/* Recovery Rate */}
                    <td className="py-4 px-4 font-bold text-slate-800">{c.recoveryRate}%</td>

                    {/* Risk Level */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                          c.riskLevel === 'HIGH'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : c.riskLevel === 'MEDIUM'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {c.riskLevel}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-4 px-6 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedCustomer(c)}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-1 rounded-lg text-xs transition-colors cursor-pointer"
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Detail Drawer */}
      <CustomerDetailDrawer
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        onSelectCase={onSelectCase}
      />
    </div>
  );
};
