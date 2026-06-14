import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import OrderForm from './components/OrderForm';
import CustomerHistory from './components/CustomerHistory';
import Analytics from './components/Analytics';
import { Scissors, LayoutDashboard, UserSearch, ClipboardList, BarChart2, ChevronRight } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'create',    label: 'New Order',       icon: ClipboardList },
  { id: 'dashboard', label: 'Dashboard',        icon: LayoutDashboard },
  { id: 'history',   label: 'Customers',        icon: UserSearch },
  { id: 'analytics', label: 'Sales & Expenses', icon: BarChart2 },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('create');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleOrderCreated = () => {
    setRefreshTrigger(prev => prev + 1);
    setTimeout(() => setActiveTab('dashboard'), 1200);
  };

  const activeItem = NAV_ITEMS.find(n => n.id === activeTab);

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans overflow-hidden">

      {/* ── TOP NAVIGATION BAR ──────────────────────────────────── */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center px-5 gap-6 z-30 flex-shrink-0 shadow-sm">

        {/* Brand */}
        <div className="flex items-center gap-2.5 mr-4">
          <div className="p-1.5 bg-brand-600 rounded-md text-white">
            <Scissors className="w-4 h-4 rotate-90" />
          </div>
          <span className="text-sm font-bold text-gray-900 tracking-tight">Captain Tailors</span>
        </div>

        {/* Navigation links — horizontal, inline, like Shopify Admin */}
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 ${
                activeTab === id
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </nav>

        {/* Breadcrumb right — functional label */}
        <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
          <span className="font-medium text-gray-700">Captain Tailors</span>
          <ChevronRight className="w-3 h-3" />
          <span>{activeItem?.label}</span>
        </div>
      </header>

      {/* ── MAIN CONTENT ────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-5 py-6">
          {activeTab === 'create'    && <OrderForm    onOrderCreated={handleOrderCreated} />}
          {activeTab === 'dashboard' && <Dashboard    refreshTrigger={refreshTrigger} />}
          {activeTab === 'history'   && <CustomerHistory />}
          {activeTab === 'analytics' && <Analytics />}
        </div>
      </main>

    </div>
  );
}
