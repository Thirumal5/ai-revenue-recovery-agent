import React, { useEffect, useState } from 'react';

function App() {
  const [health, setHealth] = useState<string>('Checking backend...');

  useEffect(() => {
    fetch('http://localhost:3001/api/health')
      .then(res => res.json())
      .then(data => setHealth(data.message))
      .catch(() => setHealth('Backend is not running. Please start it!'));
  }, []);

  const triggerInsufficientFunds = async () => {
    try {
      const fakeWebhook = {
        type: 'payment.failed',
        payload: {
          payment: {
            entity: {
              amount: 5000,
              error_code: "BAD_REQUEST_ERROR",
              error_description: "Insufficient funds",
              contact: "+919876543210",
              email: "test@example.com"
            }
          }
        }
      };

      const response = await fetch('http://localhost:3001/webhooks/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fakeWebhook)
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Simulated: Insufficient Funds!\nBackend created Recovery Case ID: ${data.caseId}`);
      } else {
        alert(`Error from backend: ${data.error}`);
      }
    } catch (error) {
      alert("Failed to send event to backend. Make sure the backend is running!");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">RecoverXAI</h1>
        <p className="text-gray-500">Revenue Recovery Dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">System Status</h2>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full animate-pulse ${health.includes('running') ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <p className="text-gray-900 font-medium">{health}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Payment Simulator (Phase 3A)</h2>
          <div className="flex flex-col gap-3">
            <button
              onClick={triggerInsufficientFunds}
              className="px-4 py-3 bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors text-left cursor-pointer"
            >
              Simulate: Insufficient Funds
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
