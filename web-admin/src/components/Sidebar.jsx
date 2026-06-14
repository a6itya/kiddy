import React from 'react';

export default function Sidebar({ currentTab, setCurrentTab }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'rosters', label: 'Student Rosters', icon: '👥' },
    { id: 'billing', label: 'Billing & Tuition', icon: '💳' },
  ];

  return (
    <div className="w-64 bg-slate-900 h-screen text-white flex flex-col fixed left-0 top-0">
      <div className="p-6 text-xl font-bold border-b border-slate-800 tracking-wide text-indigo-400">
        BrightStart Admin
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentTab(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
              currentTab === item.id
                ? 'bg-indigo-600 text-white font-medium'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-800 text-sm text-slate-500">
        v1.0.0 Alpha
      </div>
    </div>
  );
}