import React, { useState, useEffect } from 'react';
import { 
  Shield, Users, ClipboardList, TrendingUp, Calendar, Search, LogOut, 
  CheckCircle, AlertOctagon, Settings, Database, Edit, Plus, Trash2, 
  ArrowUpRight, ArrowLeft, Loader2, CreditCard, Clock, MessageSquare
} from 'lucide-react';

export default function AdminPanel() {
  const [token, setToken] = useState(localStorage.getItem('tailor_admin_token'));
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  
  // Auth Form Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Dashboard state
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [shops, setShops] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Detail Shop Modal State
  const [selectedShop, setSelectedShop] = useState(null);
  const [shopDetails, setShopDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Moderation action inputs
  const [extendDays, setExtendDays] = useState('14');
  const [changePlanValue, setChangePlanValue] = useState('GROWTH');

  // CMS Content State
  const [cms, setCms] = useState({
    hero: { main_heading: '', sub_heading: '', primary_cta_text: '', secondary_cta_text: '' },
    branding: { support_email: '', contact_number: '', footer_text: '' },
    features: [],
    plans: [],
    faqs: []
  });
  
  // CMS Form Inputs
  const [heroHeading, setHeroHeading] = useState('');
  const [heroSub, setHeroSub] = useState('');
  const [brandEmail, setBrandEmail] = useState('');
  const [brandPhone, setBrandPhone] = useState('');
  const [brandFooter, setBrandFooter] = useState('');

  // Feature Add Form
  const [showAddFeature, setShowAddFeature] = useState(false);
  const [newFeatTitle, setNewFeatTitle] = useState('');
  const [newFeatDesc, setNewFeatDesc] = useState('');
  const [newFeatIcon, setNewFeatIcon] = useState('group');

  // FAQ Add Form
  const [showAddFAQ, setShowAddFAQ] = useState(false);
  const [newFAQQuest, setNewFAQQuest] = useState('');
  const [newFAQAns, setNewFAQAns] = useState('');

  // Plan Edit Form
  const [editingPlan, setEditingPlan] = useState(null);
  const [planPrice, setPlanPrice] = useState(0);
  const [planDesc, setPlanDesc] = useState('');
  const [planBadge, setPlanBadge] = useState('');

  useEffect(() => {
    checkSetupStatus();
  }, []);

  useEffect(() => {
    if (token) {
      loadDashboardData();
    }
  }, [token, activeTab]);

  const checkSetupStatus = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/admin/setup-check');
      const data = await res.json();
      setNeedsSetup(data.needsSetup);
    } catch (err) {
      console.error('Failed to verify setup status:', err);
    } finally {
      setCheckingSetup(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = needsSetup ? '/api/admin/setup' : '/api/admin/login';
    try {
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Authentication failed');

      localStorage.setItem('tailor_admin_token', data.token);
      setToken(data.token);
      setNeedsSetup(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tailor_admin_token');
    setToken(null);
  };

  const adminFetch = async (url, options = {}) => {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      handleLogout();
      throw new Error('Session expired');
    }
    return res;
  };

  const loadDashboardData = async () => {
    try {
      if (activeTab === 'overview') {
        const res = await adminFetch('http://localhost:5000/api/admin/stats');
        const data = await res.json();
        setStats(data);
      } else if (activeTab === 'users') {
        const res = await adminFetch('http://localhost:5000/api/admin/users');
        const data = await res.json();
        setShops(data.users || []);
      } else if (activeTab === 'audit') {
        const res = await adminFetch('http://localhost:5000/api/admin/audit-logs');
        const data = await res.json();
        setAuditLogs(data.logs || []);
      } else if (activeTab === 'cms') {
        const res = await fetch('http://localhost:5000/api/admin/cms');
        const data = await res.json();
        setCms(data);
        setHeroHeading(data.hero.main_heading);
        setHeroSub(data.hero.sub_heading);
        setBrandEmail(data.branding.support_email);
        setBrandPhone(data.branding.contact_number);
        setBrandFooter(data.branding.footer_text);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  const viewShopDetails = async (shop) => {
    setSelectedShop(shop);
    setLoadingDetails(true);
    setShopDetails(null);
    try {
      const res = await adminFetch(`http://localhost:5000/api/admin/users/${shop.id}`);
      const data = await res.json();
      setShopDetails(data.metrics);
      setChangePlanValue(shop.subscription_tier);
    } catch (err) {
      console.error('Error loading shop details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Moderation Action handlers
  const handleSuspend = async (shopId, action) => {
    try {
      const res = await adminFetch(`http://localhost:5000/api/admin/users/${shopId}/${action}`, { method: 'POST' });
      if (res.ok) {
        // reload
        loadDashboardData();
        setSelectedShop(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExtendTrial = async (shopId) => {
    try {
      const res = await adminFetch(`http://localhost:5000/api/admin/users/${shopId}/extend-trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: extendDays })
      });
      if (res.ok) {
        loadDashboardData();
        setSelectedShop(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleChangePlan = async (shopId) => {
    try {
      const res = await adminFetch(`http://localhost:5000/api/admin/users/${shopId}/change-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: changePlanValue })
      });
      if (res.ok) {
        loadDashboardData();
        setSelectedShop(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetTrial = async (shopId) => {
    if (!window.confirm('Reset this shop to a fresh 14-day free trial?')) return;
    try {
      const res = await adminFetch(`http://localhost:5000/api/admin/users/${shopId}/reset`, { method: 'POST' });
      if (res.ok) {
        loadDashboardData();
        setSelectedShop(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // CMS Edit Handlers
  const handleSaveHero = async (e) => {
    e.preventDefault();
    try {
      const res = await adminFetch('http://localhost:5000/api/admin/cms/hero', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          main_heading: heroHeading,
          sub_heading: heroSub,
          primary_cta_text: cms.hero.primary_cta_text,
          secondary_cta_text: cms.hero.secondary_cta_text
        })
      });
      if (res.ok) {
        alert('Hero section updated successfully');
        loadDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveBranding = async (e) => {
    e.preventDefault();
    try {
      const res = await adminFetch('http://localhost:5000/api/admin/cms/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          support_email: brandEmail,
          contact_number: brandPhone,
          footer_text: brandFooter
        })
      });
      if (res.ok) {
        alert('Branding settings updated successfully');
        loadDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFeature = async (e) => {
    e.preventDefault();
    try {
      const res = await adminFetch('http://localhost:5000/api/admin/cms/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newFeatTitle,
          description: newFeatDesc,
          icon: newFeatIcon
        })
      });
      if (res.ok) {
        setShowAddFeature(false);
        setNewFeatTitle('');
        setNewFeatDesc('');
        loadDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFeature = async (id) => {
    if (!window.confirm('Delete this feature card?')) return;
    try {
      const res = await adminFetch(`http://localhost:5000/api/admin/cms/features/${id}`, { method: 'DELETE' });
      if (res.ok) loadDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFAQ = async (e) => {
    e.preventDefault();
    try {
      const res = await adminFetch('http://localhost:5000/api/admin/cms/faqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: newFAQQuest,
          answer: newFAQAns
        })
      });
      if (res.ok) {
        setShowAddFAQ(false);
        setNewFAQQuest('');
        setNewFAQAns('');
        loadDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFAQ = async (id) => {
    if (!window.confirm('Delete this FAQ item?')) return;
    try {
      const res = await adminFetch(`http://localhost:5000/api/admin/cms/faqs/${id}`, { method: 'DELETE' });
      if (res.ok) loadDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  const openEditPlan = (plan) => {
    setEditingPlan(plan);
    setPlanPrice(plan.price);
    setPlanDesc(plan.description);
    setPlanBadge(plan.badge_text || '');
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    try {
      const res = await adminFetch('http://localhost:5000/api/admin/cms/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingPlan.name,
          price: Number(planPrice),
          description: planDesc,
          badge_text: planBadge
        })
      });
      if (res.ok) {
        setEditingPlan(null);
        loadDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Login/Setup Render Check
  if (checkingSetup) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0A0C10] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
        {/* Background Nebula */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_15%_30%,rgba(77,142,255,0.05),transparent_35%)]" />
          <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_85%_70%,rgba(111,0,190,0.05),transparent_35%)]" />
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
          <div className="mx-auto w-12 h-12 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight">
            {needsSetup ? 'First-Time Admin Setup' : 'TailorOS Central Admin'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            {needsSetup ? 'Configure first administrative account credentials' : 'Sign in to access SaaS platform moderator controls'}
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
          <div className="bg-[#11131b]/60 backdrop-blur-md py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-white/10">
            <form className="space-y-6" onSubmit={handleAuth}>
              {error && (
                <div className="bg-red-950/20 text-red-400 p-3 rounded-lg text-sm border border-red-500/20 font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-300">Admin Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 block w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2 text-sm text-white focus:ring-blue-500 focus:border-blue-500"
                  placeholder="admin@tailoros.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 block w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2 text-sm text-white focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-md active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? 'Processing...' : (needsSetup ? 'Register Admin & Login' : 'Sign In')}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Filtered registry list
  const filteredShops = shops.filter(s => 
    s.shop_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.shop_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#0f172a] text-slate-400 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-6 border-b border-slate-800 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-400" />
            <span className="font-bold text-white tracking-wide text-lg">TailorOS Admin</span>
          </div>
          
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'overview' ? 'bg-slate-800 text-white' : 'hover:bg-slate-850 hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              SaaS Overview
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'users' ? 'bg-slate-800 text-white' : 'hover:bg-slate-850 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              Shop Owners Registry
            </button>
            <button
              onClick={() => setActiveTab('cms')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'cms' ? 'bg-slate-800 text-white' : 'hover:bg-slate-850 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              Landing Page CMS
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'audit' ? 'bg-slate-800 text-white' : 'hover:bg-slate-850 hover:text-white'
              }`}
            >
              <Database className="w-4 h-4" />
              Moderator Audit Logs
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8 bg-gray-50 h-screen">
        
        {/* Tab 1: Overview */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-8">
            <div className="border-b border-gray-200 pb-4">
              <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
              <p className="text-sm text-gray-500">Real-time metrics, signup velocities, and estimated ARR/MRR revenues</p>
            </div>

            {/* Financial Revenue Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Estimated MRR</span>
                <span className="text-3xl font-extrabold text-blue-600 mt-2">₹{stats.estimatedMRR.toLocaleString('en-IN')}</span>
                <span className="text-[10px] text-gray-400 mt-1 block">Active licenses * Price level</span>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Estimated ARR</span>
                <span className="text-3xl font-extrabold text-purple-600 mt-2">₹{(stats.estimatedMRR * 12).toLocaleString('en-IN')}</span>
                <span className="text-[10px] text-gray-400 mt-1 block">Annualized Run Rate (MRR * 12)</span>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Shop Owners</span>
                <span className="text-3xl font-extrabold text-slate-900 mt-2">{stats.activeCount}</span>
                <span className="text-[10px] text-gray-400 mt-1 block">Total active tenants on platform</span>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Suspended Accounts</span>
                <span className="text-3xl font-extrabold text-red-600 mt-2">{stats.suspendedCount}</span>
                <span className="text-[10px] text-red-400 mt-1 block">Incomplete / Blocked access</span>
              </div>
            </div>

            {/* Trial Splits and Platform totals */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm col-span-1 space-y-4">
                <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-3">Subscription Status Splits</h3>
                <div className="space-y-3.5 pt-1">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-gray-500">TRIAL users</span>
                    <span className="text-slate-900">{stats.statusCounts.TRIAL || 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-gray-500">ACTIVE paid</span>
                    <span className="text-emerald-600">{stats.statusCounts.ACTIVE || 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-gray-500">EXPIRED trials</span>
                    <span className="text-amber-600">{stats.statusCounts.EXPIRED || 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-gray-500">CANCELLED tier</span>
                    <span className="text-gray-400">{stats.statusCounts.CANCELLED || 0}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm col-span-1 space-y-4">
                <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-3">New Signups Velocity</h3>
                <div className="space-y-3.5 pt-1">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-gray-500">Today signups</span>
                    <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">{stats.signupsToday}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-gray-500">This month signups</span>
                    <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs font-bold">{stats.signupsThisMonth}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm col-span-1 space-y-4">
                <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-3">Platform Totals</h3>
                <div className="space-y-3.5 pt-1">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-gray-500">Total Customers</span>
                    <span className="text-slate-900 font-bold">{stats.totalCustomers}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-gray-500">Total Orders (Global)</span>
                    <span className="text-slate-900 font-bold">{stats.totalOrders}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Users Registry */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Shop Owners Registry</h1>
                <p className="text-sm text-gray-500">Audit, suspend, upgrade plans, or extend trial limits for tenant stores</p>
              </div>
              <div className="relative w-full sm:w-64 shadow-sm rounded-lg border border-gray-300 bg-white">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search code, name, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border-0 focus:ring-0 focus:outline-none"
                />
              </div>
            </div>

            {/* Shop Grid */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold">
                    <th className="px-6 py-4">Shop details</th>
                    <th className="px-6 py-4">Shop code</th>
                    <th className="px-6 py-4">Subscription</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredShops.map((shop) => (
                    <tr key={shop.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-bold text-gray-900 block">{shop.shop_name}</span>
                          <span className="text-xs text-gray-400 block">{shop.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">{shop.shop_code}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                          {shop.subscription_tier}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          !shop.is_active 
                            ? 'bg-red-50 text-red-700 border border-red-200' 
                            : shop.subscription_status === 'TRIAL' 
                              ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            !shop.is_active ? 'bg-red-500' : shop.subscription_status === 'TRIAL' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                          {!shop.is_active ? 'Suspended' : shop.subscription_status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => viewShopDetails(shop)}
                          className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          Inspect Details
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredShops.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                        No shop owners match search filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: CMS Landing Editor */}
        {activeTab === 'cms' && cms && (
          <div className="space-y-8">
            <div className="border-b border-gray-200 pb-4">
              <h1 className="text-2xl font-bold text-gray-900">Landing Page CMS</h1>
              <p className="text-sm text-gray-500">Edit variables, pricing plans, features and FAQs of the public facing website</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Hero & Branding forms */}
              <div className="space-y-6">
                <form onSubmit={handleSaveHero} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                  <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                    <Edit className="w-4 h-4 text-blue-500" /> Hero Content
                  </h3>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Main Heading</label>
                    <input
                      type="text"
                      value={heroHeading}
                      onChange={(e) => setHeroHeading(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Sub Heading</label>
                    <textarea
                      value={heroSub}
                      onChange={(e) => setHeroSub(e.target.value)}
                      rows="3"
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer">
                      Save Hero Page CMS
                    </button>
                  </div>
                </form>

                <form onSubmit={handleSaveBranding} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                  <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-purple-500" /> Branding & Footer
                  </h3>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Support Email</label>
                    <input
                      type="email"
                      value={brandEmail}
                      onChange={(e) => setBrandEmail(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Contact Number</label>
                    <input
                      type="text"
                      value={brandPhone}
                      onChange={(e) => setBrandPhone(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Footer Text</label>
                    <input
                      type="text"
                      value={brandFooter}
                      onChange={(e) => setBrandFooter(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer">
                      Save Branding Settings
                    </button>
                  </div>
                </form>
              </div>

              {/* Plans edit forms */}
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                  <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-500" /> SaaS Billing Plans
                  </h3>
                  
                  <div className="space-y-3.5">
                    {cms.plans.map(plan => (
                      <div key={plan.id} className="flex justify-between items-center p-3.5 border border-gray-150 rounded-xl">
                        <div>
                          <span className="font-bold text-slate-800 block">{plan.display_name} Plan</span>
                          <span className="text-xs text-gray-500">₹{plan.price} / month</span>
                        </div>
                        <button
                          onClick={() => openEditPlan(plan)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {editingPlan && (
                    <form onSubmit={handleSavePlan} className="p-4 border border-emerald-100 bg-emerald-50/20 rounded-xl space-y-4 animate-fadeIn">
                      <h4 className="font-bold text-emerald-800 text-sm">Editing Plan: {editingPlan.display_name}</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Plan Price (INR)</label>
                          <input
                            type="number"
                            required
                            value={planPrice}
                            onChange={(e) => setPlanPrice(e.target.value)}
                            className="mt-1 block w-full text-xs border border-gray-300 rounded-lg p-2"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Badge Label</label>
                          <input
                            type="text"
                            value={planBadge}
                            onChange={(e) => setPlanBadge(e.target.value)}
                            className="mt-1 block w-full text-xs border border-gray-300 rounded-lg p-2"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Plan Description</label>
                        <textarea
                          required
                          value={planDesc}
                          onChange={(e) => setPlanDesc(e.target.value)}
                          rows="2"
                          className="mt-1 block w-full text-xs border border-gray-300 rounded-lg p-2"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button 
                          type="button" 
                          onClick={() => setEditingPlan(null)}
                          className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded text-xs"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit"
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold"
                        >
                          Update Plan
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>

            {/* Features list management */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-500" /> Feature Showcase Cards
                </h3>
                <button
                  onClick={() => setShowAddFeature(!showAddFeature)}
                  className="bg-blue-600 hover:bg-blue-750 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Feature Card
                </button>
              </div>

              {showAddFeature && (
                <form onSubmit={handleAddFeature} className="p-4 border border-blue-100 bg-blue-50/20 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4 items-end animate-fadeIn">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Feature Title</label>
                    <input
                      type="text"
                      required
                      value={newFeatTitle}
                      onChange={(e) => setNewFeatTitle(e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Lucide Icon name</label>
                    <select
                      value={newFeatIcon}
                      onChange={(e) => setNewFeatIcon(e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white"
                    >
                      <option value="group">Users / Group</option>
                      <option value="straighten">Ruler / Measurements</option>
                      <option value="receipt_long">Invoice / Bills</option>
                      <option value="send_to_mobile">WhatsApp / Mobile</option>
                      <option value="badge">Badge / Employee</option>
                      <option value="monitoring">Graph / Expenses</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description</label>
                    <input
                      type="text"
                      required
                      value={newFeatDesc}
                      onChange={(e) => setNewFeatDesc(e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded-lg p-2"
                    />
                  </div>
                  <div className="sm:col-span-3 flex justify-end gap-2">
                    <button type="button" onClick={() => setShowAddFeature(false)} className="px-3 py-1 bg-gray-100 text-gray-500 rounded text-xs">Cancel</button>
                    <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold">Save Card</button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {cms.features.map(feat => (
                  <div key={feat.id} className="p-4 border border-gray-150 rounded-xl relative group bg-slate-50/50">
                    <button
                      onClick={() => handleDeleteFeature(feat.id)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-bold text-sm text-slate-800 block mb-1">{feat.title}</span>
                    <span className="text-xs text-gray-500 block leading-normal">{feat.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQs management */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-500" /> FAQ List
                </h3>
                <button
                  onClick={() => setShowAddFAQ(!showAddFAQ)}
                  className="bg-purple-600 hover:bg-purple-755 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add FAQ Item
                </button>
              </div>

              {showAddFAQ && (
                <form onSubmit={handleAddFAQ} className="p-4 border border-purple-100 bg-purple-50/20 rounded-xl space-y-4 animate-fadeIn">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Question</label>
                    <input
                      type="text"
                      required
                      value={newFAQQuest}
                      onChange={(e) => setNewFAQQuest(e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Answer</label>
                    <textarea
                      required
                      value={newFAQAns}
                      onChange={(e) => setNewFAQAns(e.target.value)}
                      rows="2"
                      className="w-full text-xs border border-gray-300 rounded-lg p-2"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowAddFAQ(false)} className="px-3 py-1 bg-gray-100 text-gray-500 rounded text-xs">Cancel</button>
                    <button type="submit" className="px-3 py-1 bg-purple-600 text-white rounded text-xs font-semibold">Save Item</button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {cms.faqs.map(faq => (
                  <div key={faq.id} className="p-4 border border-gray-150 rounded-xl relative group bg-slate-50/50 flex justify-between items-start gap-4">
                    <div>
                      <span className="font-bold text-sm text-slate-800 block mb-1">{faq.question}</span>
                      <span className="text-xs text-gray-500 block leading-normal">{faq.answer}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteFAQ(faq.id)}
                      className="text-red-500 hover:text-red-750 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Audit Logs */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h1 className="text-2xl font-bold text-gray-900">Moderator Audit Logs</h1>
              <p className="text-sm text-gray-500">Security history of administrative modifications across the SaaS database</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold">
                    <th className="px-6 py-4">Admin Email</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Affected Shop</th>
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-semibold text-slate-800">{log.admin_email}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-bold">
                          {log.action_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono">{log.target_shop || 'Global'}</td>
                      <td className="px-6 py-4 text-xs text-gray-400">
                        {new Date(log.timestamp).toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {log.previous_value && log.new_value ? (
                          <span>Changed: {log.previous_value} ➔ {log.new_value}</span>
                        ) : log.new_value ? (
                          <span>{log.new_value}</span>
                        ) : (
                          <span>N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                        No audit logs recorded yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* Shop Detail Inspector Modal */}
      {selectedShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-slideUp">
            
            {/* Header */}
            <div className="bg-[#0f172a] text-white p-5 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base text-white">{selectedShop.shop_name}</h3>
                <span className="text-xs text-slate-400 font-mono">Code: {selectedShop.shop_code}</span>
              </div>
              <button 
                onClick={() => setSelectedShop(null)} 
                className="text-gray-400 hover:text-white transition-colors text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              
              {loadingDetails ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                </div>
              ) : shopDetails ? (
                <div className="space-y-6">
                  {/* Detailed Counters */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customers</span>
                      <span className="text-lg font-extrabold text-slate-900 mt-1 block">{shopDetails.totalCustomers}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Orders</span>
                      <span className="text-lg font-extrabold text-slate-900 mt-1 block">{shopDetails.totalOrders}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Employees</span>
                      <span className="text-lg font-extrabold text-slate-900 mt-1 block">{shopDetails.totalEmployees}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Expenses</span>
                      <span className="text-lg font-extrabold text-slate-900 mt-1 block">₹{shopDetails.totalExpenses}</span>
                    </div>
                  </div>

                  {/* License Info */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                    <div>
                      <span className="text-xs text-gray-400 block font-medium">Registered Email</span>
                      <span className="text-slate-900 font-semibold">{selectedShop.email}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 block font-medium">Contact Number</span>
                      <span className="text-slate-900 font-semibold">{selectedShop.contact_number}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 block font-medium">Current Plan Tier</span>
                      <span className="text-slate-900 font-semibold">{selectedShop.subscription_tier}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 block font-medium">License status</span>
                      <span className="text-slate-900 font-semibold">{selectedShop.subscription_status}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 block font-medium">Account created</span>
                      <span className="text-slate-900 font-semibold">
                        {new Date(selectedShop.created_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 block font-medium">Trial / License Expiry</span>
                      <span className="text-slate-900 font-semibold">
                        {selectedShop.subscription_expiry 
                          ? new Date(selectedShop.subscription_expiry).toLocaleDateString('en-IN') 
                          : 'Unlimited'}
                      </span>
                    </div>
                  </div>

                  {/* Moderation Actions */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
                      Moderation Actions
                    </h4>

                    {/* Suspension Switch */}
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-800 text-sm block">Account Suspension</span>
                        <span className="text-xs text-gray-500 block">Blocks owner from authenticating into TailorOS</span>
                      </div>
                      {selectedShop.is_active ? (
                        <button
                          onClick={() => handleSuspend(selectedShop.id, 'suspend')}
                          className="bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                        >
                          Suspend Access
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSuspend(selectedShop.id, 'reactivate')}
                          className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                        >
                          Reactivate Shop
                        </button>
                      )}
                    </div>

                    {/* Extend Trial */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <span className="font-bold text-slate-800 text-sm block">Extend Free Trial</span>
                        <span className="text-xs text-gray-500 block">Add trial days to this shop's subscription</span>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <input
                          type="number"
                          value={extendDays}
                          onChange={(e) => setExtendDays(e.target.value)}
                          className="w-16 text-center border border-gray-300 rounded-lg text-xs"
                        />
                        <button
                          onClick={() => handleExtendTrial(selectedShop.id)}
                          className="bg-slate-100 hover:bg-slate-200 border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold"
                        >
                          Extend Days
                        </button>
                      </div>
                    </div>

                    {/* Upgrade Plan manually */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <span className="font-bold text-slate-800 text-sm block">Manually Change Plan</span>
                        <span className="text-xs text-gray-500 block">Manually update user to a premium SaaS license tier</span>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <select
                          value={changePlanValue}
                          onChange={(e) => setChangePlanValue(e.target.value)}
                          className="border border-gray-300 rounded-lg text-xs bg-white px-2 py-1.5"
                        >
                          <option value="STARTER">Starter</option>
                          <option value="GROWTH">Growth</option>
                          <option value="SCALE">Scale</option>
                        </select>
                        <button
                          onClick={() => handleChangePlan(selectedShop.id)}
                          className="bg-brand-600 hover:bg-brand-750 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                        >
                          Upgrade Plan
                        </button>
                      </div>
                    </div>

                    {/* Reset Trial */}
                    <div className="flex justify-between items-center pt-2">
                      <div>
                        <span className="font-bold text-slate-800 text-sm block">Reset Trial to 14 days</span>
                        <span className="text-xs text-gray-500 block">Resets subscription tier to Starter and trial expiry to +14 days</span>
                      </div>
                      <button
                        onClick={() => handleResetTrial(selectedShop.id)}
                        className="bg-amber-50 text-amber-700 hover:bg-amber-105 border border-amber-200 px-4 py-2 rounded-xl text-xs font-bold"
                      >
                        Reset Trial
                      </button>
                    </div>

                    {/* View As Owner (Coming Soon) */}
                    <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                      <div>
                        <span className="font-bold text-slate-800 text-sm block">View As Shop Owner</span>
                        <span className="text-xs text-gray-500 block">Troubleshoot shop problems inside view mode</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500">Failed to load shop details metrics</div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
