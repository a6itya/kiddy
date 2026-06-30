import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Rosters from './pages/Rosters';
import { CenterProvider } from './context/CenterContext';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');

  return (
    <CenterProvider>
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

        <main className="flex-1 ml-64 p-10 max-w-7xl">
          {currentTab === 'dashboard' && <Dashboard />}
          {currentTab === 'rosters' && <Rosters />}
          {currentTab === 'billing' && (
            <div className="text-slate-500 text-center py-12 bg-white rounded-xl border border-slate-200">
              Billing and automated invoice component layer placeholder.
            </div>
          )}
        </main>
      </div>
    </CenterProvider>
  );
}