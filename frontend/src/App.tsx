import React, { useEffect, useState } from 'react';

function App() {
  const [health, setHealth] = useState<string>('Checking backend...');

  useEffect(() => {
    fetch('http://localhost:3000/api/health')
      .then(res => res.json())
      .then(data => setHealth(data.message))
      .catch(() => setHealth('Backend is not running. Please start it!'));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
        
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AI Agent
        </h1>
        <p className="text-gray-500 mb-8">Revenue Recovery Dashboard</p>
        
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Backend Connection</p>
          <div className="flex items-center justify-center gap-2">
            <div className={`w-3 h-3 rounded-full animate-pulse ${health.includes('running') ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <p className="text-gray-900 font-medium">{health}</p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
