import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './components/Dashboard';
import OrderForm from './components/OrderForm';
import CustomerHistory from './components/CustomerHistory';
import Analytics from './components/Analytics';
import AuthPage from './components/AuthPage';
import LandingPage from './components/LandingPage';
import AdminPanel from './components/AdminPanel';
import Profile from './components/Profile';
import { Scissors, LayoutDashboard, UserSearch, ClipboardList, BarChart2, LogOut, Menu, User, Shield, CreditCard, DollarSign, X } from 'lucide-react';
import { isOnline, syncPendingData, initSync } from './utils/syncManager';

const NAV_ITEMS = [
  { id: 'create',    label: 'New Order',       icon: ClipboardList },
  { id: 'dashboard', label: 'Dashboard',        icon: LayoutDashboard },
  { id: 'history',   label: 'Customers',        icon: UserSearch },
  { id: 'analytics', label: 'Sales & Expenses', icon: BarChart2 },
];

export const API_BASE = ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '' && !window.Capacitor)
  ? `http://${window.location.hostname}:5000`
  : (window.Capacitor ? 'https://tailoros-production.up.railway.app' : window.location.origin);

// Helper to wrap fetch and automatically add Authorization header
export const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem('tailor_token');
  const headers = {
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    const hadToken = !!localStorage.getItem('tailor_token');
    localStorage.removeItem('tailor_token');
    localStorage.removeItem('tailor_user');
    // Prevent infinite redirect loop if we are already logged out on the landing page
    if (hadToken || window.location.pathname !== '/') {
      window.location.href = '/';
    }
  }
  return response;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 15,   // 15 min — cached data reused on tab switches
      gcTime: 1000 * 60 * 30,       // 30 min — keeps data in memory even when tab unmounts
      refetchOnWindowFocus: false,   // don't refetch just because the user switched browser tabs
      networkMode: 'offlineFirst',
    },
  },
});

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('tailor_token'));
  const [activeTab, setActiveTab] = useState('create');
  const [visitedTabs, setVisitedTabs] = useState(['create']);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [user, setUser] = useState(null);
  
  // Connection state
  const [online, setOnline] = useState(isOnline());
  
  // Landing Page view state
  const [view, setView] = useState('landing'); 
  const [selectedPlanIntent, setSelectedPlanIntent] = useState(null);
  
  // Hamburger Dropdown toggle
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Payroll Settings Modal state
  const [showPayrollSettings, setShowPayrollSettings] = useState(false);
  const [payrollMode, setPayrollMode] = useState(localStorage.getItem('payroll_frequency') || 'Monthly');

  const isAdminRoute = window.location.pathname === '/admin';

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      syncPendingData();
    };
    const handleOffline = () => {
      setOnline(false);
    };
    const handleSyncComplete = () => {
      queryClient.invalidateQueries();
    };
    const handleStorage = (e) => {
      if (e.key === 'tailor_token' || e.key === 'tailor_user') {
        window.location.reload();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-sync-complete', handleSyncComplete);
    window.addEventListener('storage', handleStorage);

    // Non-blocking: React renders first, then sync happens in background
    initSync();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-sync-complete', handleSyncComplete);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (token) {
      loadUserProfile();
    }
  }, [token]);

  // Keep track of which tabs have been visited to keep them mounted
  useEffect(() => {
    if (!visitedTabs.includes(activeTab)) {
      setVisitedTabs(prev => [...prev, activeTab]);
    }
  }, [activeTab, visitedTabs]);

  const loadUserProfile = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/auth/profile`);
      if (res.ok) {
        const data = await res.json();
        setUser(data.owner);
        localStorage.setItem('tailor_user', JSON.stringify(data.owner));
      }
    } catch (e) {
      // Fallback to local storage if API fails
      try {
        const userData = JSON.parse(localStorage.getItem('tailor_user'));
        setUser(userData);
      } catch (err) {}
    }
  };

  const handleLogin = (newToken) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('tailor_token');
    localStorage.removeItem('tailor_user');
    setToken(null);
    setUser(null);
    setView('landing');
  };

  const handleOrderCreated = () => {
    setRefreshTrigger(prev => prev + 1);
    setTimeout(() => setActiveTab('dashboard'), 1200);
  };

  // If path is /admin, render Admin Panel directly
  if (isAdminRoute) {
    return <AdminPanel />;
  }

  // Unauthenticated Flow
  if (!token) {
    if (view === 'auth') {
      return (
        <AuthPage 
          onLogin={handleLogin} 
          initialPlan={selectedPlanIntent} 
          onBackToLanding={() => setView('landing')}
        />
      );
    }
    return (
      <LandingPage 
        onSelectPlan={(plan) => {
          setSelectedPlanIntent(plan);
          setView('auth');
        }}
        onSignIn={() => {
          setSelectedPlanIntent(null);
          setView('auth');
        }}
      />
    );
  }

  // Calculate Trial Expiry Days Remaining
  const getTrialDaysRemaining = () => {
    if (!user || user.subscription_status !== 'TRIAL') return null;
    if (!user.subscription_expiry) return 0;
    const expiry = new Date(user.subscription_expiry);
    const diffTime = expiry - new Date();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const trialDays = getTrialDaysRemaining();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex flex-col h-screen bg-gray-50 font-sans overflow-hidden">
        
        {/* Offline Banner */}
        {!online && (
          <div className="bg-rose-500 text-white text-xs font-semibold py-2 px-4 text-center flex items-center justify-center gap-2 z-50">
            <span>⚠️ You are currently offline. TailorOS is running in Offline Mode. Some features may be unavailable.</span>
          </div>
        )}

        {/* Sticky Trial Banner */}
      {user && user.subscription_status === 'TRIAL' && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-semibold py-2.5 px-4 text-center flex items-center justify-center gap-2 z-50 shadow-md">
          <span>⚠️ Your shop is on a 14-Day Free Trial. {trialDays} {trialDays === 1 ? 'day' : 'days'} remaining.</span>
          <button 
            onClick={() => setActiveTab('profile')} 
            className="ml-3 bg-white text-orange-700 px-3 py-1 rounded-md hover:bg-orange-50 font-bold active:scale-95 transition-all text-[11px]"
          >
            Upgrade Plan
          </button>
        </div>
      )}

      {/* ── TOP HEADER (Brand & Breadcrumb) ───────────────────── */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 sm:px-5 gap-4 sm:gap-6 z-30 flex-shrink-0 shadow-sm relative">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mr-4">
          <div className="p-1.5 bg-brand-600 rounded-md text-white">
            <Scissors className="w-4 h-4 rotate-90" />
          </div>
          <span className="text-sm font-bold text-gray-900 tracking-tight">TailorOS</span>
        </div>

        {/* Online/Offline Status Indicator */}
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border transition-all mr-auto ${
          online 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
            : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          {online ? 'Cloud Sync Active' : 'Offline Mode'}
        </div>

        {/* Desktop Navigation links — hidden on mobile */}
        <nav className="hidden sm:flex items-center gap-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id);
                setShowDropdown(false);
              }}
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

        {/* Hamburger / Menu Dropdown Trigger */}
        <div className="ml-auto flex items-center gap-3 relative">
          {user && <span className="text-xs text-gray-500 hidden sm:block">{user.shop_name}</span>}
          
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 focus:outline-none transition-colors border border-gray-200"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Three Lines Dropdown Menu */}
          {showDropdown && (
            <div className="absolute right-0 top-10 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1.5 animate-fadeIn">
              <div className="px-4 py-2 border-b border-gray-100 text-left">
                <span className="font-bold text-xs text-gray-900 block truncate">{user?.shop_name}</span>
                <span className="text-[10px] text-gray-500 block truncate">{user?.email}</span>
              </div>
              
              <button
                onClick={() => {
                  setActiveTab('profile');
                  setShowDropdown(false);
                }}
                className={`w-full flex items-center gap-2 px-4 py-2 text-xs text-left text-gray-700 hover:bg-gray-50 transition-colors ${
                  activeTab === 'profile' ? 'font-bold text-brand-700 bg-brand-50/40' : ''
                }`}
              >
                <User className="w-4 h-4 text-gray-400" />
                Shop Profile Settings
              </button>

              <button
                onClick={() => {
                  setShowPayrollSettings(true);
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs text-left text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <DollarSign className="w-4 h-4 text-gray-400" />
                Payroll Settings
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs text-left text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4 text-red-400" />
                Logout Shop
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Payroll Settings Modal */}
      {showPayrollSettings && (
        <div className="modal-overlay" onClick={() => setShowPayrollSettings(false)}>
          <div className="modal-panel max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-sm font-semibold text-gray-900">Payroll Settings</h3>
              <button className="btn-ghost p-1.5" onClick={() => setShowPayrollSettings(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <label className="section-label">Payroll Frequency</label>
              <select 
                className="field-input" 
                value={payrollMode}
                onChange={(e) => {
                  const val = e.target.value;
                  setPayrollMode(val);
                  localStorage.setItem('payroll_frequency', val);
                  window.dispatchEvent(new Event('payroll-settings-changed'));
                }}
              >
                <option value="Monthly">Monthly</option>
                <option value="Weekly">Weekly</option>
              </select>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Choose how often you manage staff payments. Weekly tracking enables 4 tabs per employee for partial payments.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pb-16 sm:pb-0">
        <div className="max-w-7xl mx-auto px-3 py-4 sm:px-5 sm:py-6">
          <div className={activeTab === 'create' ? '' : 'hidden'}>
            {visitedTabs.includes('create') && <OrderForm onOrderCreated={handleOrderCreated} />}
          </div>
          <div className={activeTab === 'dashboard' ? '' : 'hidden'}>
            {visitedTabs.includes('dashboard') && <Dashboard refreshTrigger={refreshTrigger} />}
          </div>
          <div className={activeTab === 'history' ? '' : 'hidden'}>
            {visitedTabs.includes('history') && <CustomerHistory />}
          </div>
          <div className={activeTab === 'analytics' ? '' : 'hidden'}>
            {visitedTabs.includes('analytics') && <Analytics />}
          </div>
          <div className={activeTab === 'profile' ? '' : 'hidden'}>
            {visitedTabs.includes('profile') && <Profile />}
          </div>
        </div>
      </main>

      {/* ── MOBILE BOTTOM NAVIGATION BAR ───────────────────────── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 flex justify-around items-center h-16 pb-safe shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id);
                setShowDropdown(false);
              }}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className={`text-[10px] font-medium tracking-wide ${isActive ? 'font-semibold' : ''}`}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>

    </div>
    </QueryClientProvider>
  );
}
