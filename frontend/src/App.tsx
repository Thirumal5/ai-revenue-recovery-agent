import React, { useEffect, useState } from 'react';  
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import type { RecoveryCase } from './components/RecoveryCasesTable';
import { AgentExecutionDrawer } from './components/AgentExecutionDrawer';
import { Analytics } from './components/Analytics';
import { Settings } from './components/Settings';
import { OverviewTab } from './components/OverviewTab';
import { RecoveryTab } from './components/RecoveryTab';
import { AIOperationsTab } from './components/AIOperationsTab';
import type { TabType } from './components/Sidebar';

const API_BASE = 'http://localhost:3001';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

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
        await pollCaseProgress(data.caseId);
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
    <div className="h-screen bg-[#060913] text-slate-300 flex antialiased font-sans overflow-hidden relative">
      {/* Global Dark Spatial Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[20%] w-[50vw] h-[50vh] bg-purple-900/10 blur-[120px] rounded-full mix-blend-screen opacity-50" />
      </div>

      {/* Left Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} health={health} />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative z-10">
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} health={health} cases={cases} />

        <main className="flex-1 p-6 md:p-8 max-w-[1400px] w-full mx-auto overflow-y-auto">
          {/* Tab 1: Overview Command Center */}
          {activeTab === 'overview' && (
            <OverviewTab
              cases={cases}
              processingCaseId={processingCaseId}
              onSelectCase={(id) => setSelectedCaseId(id)}
              onNavigateToRecovery={() => setActiveTab('recovery')}
              onNavigateToAIOps={() => setActiveTab('ai_ops')}
            />
          )}

          {/* Tab 2: Recovery Management */}
          {activeTab === 'recovery' && (
            <RecoveryTab
              apiBase={API_BASE}
              cases={cases}
              loading={loading}
              selectedCaseId={selectedCaseId}
              processingCaseId={processingCaseId}
              onSelectCase={(id) => setSelectedCaseId(id)}
              onRunAgent={runAgentManually}
              onRefresh={fetchCases}
              onRunSimulation={triggerSimulator}
              isSimulating={isSimulating}
            />
          )}

          {/* Tab 3: AI Operations & Worker Pool */}
          {activeTab === 'ai_ops' && (
            <AIOperationsTab
              apiBase={API_BASE}
              cases={cases}
              onSelectCase={(id) => setSelectedCaseId(id)}
            />
          )}

          {/* Tab 4: Analytics */}
          {activeTab === 'analytics' && <Analytics apiBase={API_BASE} />}

          {/* Tab 5: Settings */}
          {activeTab === 'settings' && <Settings apiBase={API_BASE} />}
        </main>
      </div>

      {/* Case Detail Slide-over Drawer */}
      <AgentExecutionDrawer
        caseRecord={selectedCase}
        onClose={() => setSelectedCaseId(null)}
        onRunAgent={runAgentManually}
        isProcessing={Boolean(processingCaseId && processingCaseId === selectedCaseId)}
      />
    </div>
  );
}
