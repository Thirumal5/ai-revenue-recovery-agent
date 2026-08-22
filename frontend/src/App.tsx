import React, { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { KPICards } from './components/KPICards';
import { AgentStatus } from './components/AgentStatus';
import { RecoveryFunnel } from './components/RecoveryFunnel';
import { Simulator } from './components/Simulator';
import { RecoveryCasesTable } from './components/RecoveryCasesTable';
import type { RecoveryCase } from './components/RecoveryCasesTable';
import { AgentExecutionDrawer } from './components/AgentExecutionDrawer';
import { ActivityFeed } from './components/ActivityFeed';
import { Customers } from './components/Customers';
import { Analytics } from './components/Analytics';
import { Settings } from './components/Settings';

const API_BASE = 'http://localhost:3001';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'cases' | 'activity' | 'customers' | 'analytics' | 'settings'>('overview');
  const [health, setHealth] = useState<string>('Checking backend...');
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [processingCaseId, setProcessingCaseId] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  useEffect(() => {
    checkHealth();
    fetchCases();
  }, []);

  const checkHealth = () => {
    fetch(`${API_BASE}/api/health`)
      .then((res) => res.json())
      .then((data) => setHealth(data.message))
      .catch(() => setHealth('Backend is offline. Run `npm run dev` in backend directory.'));
  };

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/cases`);
      if (res.ok) {
        const data = await res.json();
        setCases(data);
      }
    } catch (err) {
      console.error('Failed to fetch cases', err);
    } finally {
      setLoading(false);
    }
  };

  // Poll case after webhook triggers background auto-processing
  const pollCaseProgress = async (caseId: string, attemptsLeft = 10) => {
    setProcessingCaseId(caseId);
    try {
      const res = await fetch(`${API_BASE}/api/cases/${caseId}`);
      if (res.ok) {
        const caseData: RecoveryCase = await res.json();
        await fetchCases();

        if ((caseData.lockedForProcessing || !caseData.actions || caseData.actions.length === 0) && attemptsLeft > 0) {
          setTimeout(() => pollCaseProgress(caseId, attemptsLeft - 1), 600);
        } else {
          setProcessingCaseId(null);
          setSelectedCaseId(caseId);
        }
      }
    } catch (err) {
      console.error('Failed to poll case progress', err);
      setProcessingCaseId(null);
    }
  };

  // Webhook Simulator trigger
  const triggerSimulator = async (eventType: string, riskReason: string, amount: number) => {
    setIsSimulating(true);
    try {
      const fakeWebhook = {
        type: eventType,
        payload: {
          payment: {
            entity: {
              amount: amount * 100, // paise
              error_code: 'BAD_REQUEST_ERROR',
              error_description: riskReason,
              contact: '+919876543210',
              email: `user_${Math.floor(Math.random() * 1000)}@example.com`,
            },
          },
        },
      };

      const response = await fetch(`${API_BASE}/webhooks/simulator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fakeWebhook),
      });

      const data = await response.json();
      if (response.ok && data.caseId) {
        await fetchCases();
        pollCaseProgress(data.caseId);
      } else {
        alert(`Error from backend: ${data.error}`);
      }
    } catch (error) {
      alert('Failed to connect to backend.');
    } finally {
      setIsSimulating(false);
    }
  };

  // Manual trigger for debugging/demo override
  const runAgentManually = async (caseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProcessingCaseId(caseId);

    try {
      const res = await fetch(`${API_BASE}/api/cases/${caseId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        await fetchCases();
        setSelectedCaseId(caseId);
      }
    } catch (err: any) {
      alert(`Agent execution failed: ${err.message}`);
    } finally {
      setProcessingCaseId(null);
    }
  };

  const selectedCase = cases.find((c) => c.id === selectedCaseId) || null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-950 flex antialiased font-sans">
      {/* Left Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} health={health} />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} health={health} cases={cases} />

        <main className="p-8 max-w-[1400px] w-full mx-auto overflow-y-auto">
          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <>
              <KPICards cases={cases} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <AgentStatus
                  totalCasesProcessed={cases.length}
                  lastActivityTime={cases.length > 0 ? cases[0].createdAt : undefined}
                />
                <RecoveryFunnel cases={cases} />
              </div>
              <Simulator onTrigger={triggerSimulator} isSimulating={isSimulating} />
              <RecoveryCasesTable
                cases={cases}
                loading={loading}
                selectedCaseId={selectedCaseId}
                processingCaseId={processingCaseId}
                onSelectCase={(id) => setSelectedCaseId(id)}
                onRunAgent={runAgentManually}
                onRefresh={fetchCases}
              />
            </>
          )}

          {/* Tab 2: Recovery Cases */}
          {activeTab === 'cases' && (
            <>
              <Simulator onTrigger={triggerSimulator} isSimulating={isSimulating} />
              <RecoveryCasesTable
                cases={cases}
                loading={loading}
                selectedCaseId={selectedCaseId}
                processingCaseId={processingCaseId}
                onSelectCase={(id) => setSelectedCaseId(id)}
                onRunAgent={runAgentManually}
                onRefresh={fetchCases}
              />
            </>
          )}

          {/* Tab 3: Agent Activity */}
          {activeTab === 'activity' && (
            <ActivityFeed cases={cases} />
          )}

          {/* Tab 4: Customers */}
          {activeTab === 'customers' && (
            <Customers apiBase={API_BASE} onSelectCase={(id) => setSelectedCaseId(id)} />
          )}

          {/* Tab 5: Analytics */}
          {activeTab === 'analytics' && (
            <Analytics apiBase={API_BASE} />
          )}

          {/* Tab 6: Settings */}
          {activeTab === 'settings' && (
            <Settings apiBase={API_BASE} />
          )}
        </main>
      </div>

      {/* Execution Trace Drawer (Slide-Over) */}
      <AgentExecutionDrawer recoveryCase={selectedCase} onClose={() => setSelectedCaseId(null)} />
    </div>
  );
}
