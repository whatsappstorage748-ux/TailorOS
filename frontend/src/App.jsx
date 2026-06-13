import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import OrderForm from './components/OrderForm';
import CustomerHistory from './components/CustomerHistory';
import Analytics from './components/Analytics';
import { Scissors, LayoutDashboard, History, Ruler, BarChart } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('create');
  // Trigger database refreshes on other tabs when an order is created or completed
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleOrderCreated = (order) => {
    setRefreshTrigger(prev => prev + 1);
    setTimeout(() => {
      setActiveTab('dashboard');
    }, 1500);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0b0f19] font-sans overflow-hidden select-none relative">
      
      {/* FLOATING NAVIGATION ISLAND (3D shadows in the air) */}
      <div className="fixed top-4 right-8 z-50 flex items-center space-x-3 bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-800 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
        <button
          onClick={() => setActiveTab('create')}
          className={`p-2.5 rounded-xl transition-all duration-300 ${
            activeTab === 'create'
              ? 'bg-brand-600 text-white shadow-[0_8px_20px_rgba(14,130,235,0.45)] scale-110 -translate-y-1'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="New Measurement Order"
        >
          <Ruler className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`p-2.5 rounded-xl transition-all duration-300 ${
            activeTab === 'dashboard'
              ? 'bg-brand-600 text-white shadow-[0_8px_20px_rgba(14,130,235,0.45)] scale-110 -translate-y-1'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Dashboard & Search"
        >
          <LayoutDashboard className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`p-2.5 rounded-xl transition-all duration-300 ${
            activeTab === 'history'
              ? 'bg-brand-600 text-white shadow-[0_8px_20px_rgba(14,130,235,0.45)] scale-110 -translate-y-1'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Customer CRM Registry"
        >
          <History className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`p-2.5 rounded-xl transition-all duration-300 ${
            activeTab === 'analytics'
              ? 'bg-brand-600 text-white shadow-[0_8px_20px_rgba(14,130,235,0.45)] scale-110 -translate-y-1'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Earnings & CRM Analytics"
        >
          <BarChart className="w-5 h-5" />
        </button>
      </div>

      {/* HEADER BAR */}
      <header className="h-20 border-b border-slate-900/60 bg-slate-900/10 backdrop-blur-md px-8 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-brand-600 rounded-lg text-white shadow-md shadow-brand-500/20">
            <Scissors className="w-5 h-5 rotate-90" />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-100 uppercase tracking-widest leading-none">Captain Tailors</h1>
            <span className="text-[10px] text-brand-400 font-bold uppercase tracking-wider">
              {activeTab === 'create' && 'New Measurement Order'}
              {activeTab === 'dashboard' && 'Operations Dashboard'}
              {activeTab === 'history' && 'Customer CRM Registry'}
              {activeTab === 'analytics' && 'Business Earnings & CRM Analytics'}
            </span>
          </div>
        </div>
      </header>

      {/* Workspace Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6 w-full max-w-7xl mx-auto flex flex-col">
        {activeTab === 'create' && (
          <OrderForm onOrderCreated={handleOrderCreated} />
        )}
        {activeTab === 'dashboard' && (
          <Dashboard refreshTrigger={refreshTrigger} />
        )}
        {activeTab === 'history' && (
          <CustomerHistory />
        )}
        {activeTab === 'analytics' && (
          <Analytics />
        )}
      </div>

    </div>
  );
}
