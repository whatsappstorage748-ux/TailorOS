import React, { useState, useEffect } from 'react';
import { User, Shield, Camera, Check, CreditCard, Loader2, Sparkles, Clock, AlertTriangle, MessageSquare, RefreshCw } from 'lucide-react';
import { fetchWithAuth } from '../App';

const API_BASE = ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '' && !window.Capacitor)
  ? `http://${window.location.hostname}:5000`
  : (window.Capacitor ? 'https://tailoros-production.up.railway.app' : window.location.origin);

export default function Profile() {
  const [owner, setOwner] = useState(null);
  const [shopName, setShopName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [logoBase64, setLogoBase64] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Subscription upgrade state
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paying, setPaying] = useState(false);
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4444');
  const [cardExpiry, setCardExpiry] = useState('12/29');
  const [cardCVV, setCardCVV] = useState('123');

  // WhatsApp connection state
  const [whatsappStatus, setWhatsappStatus] = useState('DISCONNECTED'); // DISCONNECTED, QR, CONNECTED, VERIFIED, FAILED
  const [whatsappQr, setWhatsappQr] = useState(null);
  const [whatsappError, setWhatsappError] = useState(null);
  const [whatsappLoading, setWhatsappLoading] = useState(true);
  
  // Test message state
  const [testMobile, setTestMobile] = useState('');
  const [testStatus, setTestStatus] = useState(null);
  const [testSending, setTestSending] = useState(false);

  const checkWhatsAppStatus = async (showLoading = false) => {
    if (showLoading) setWhatsappLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/whatsapp/verify`);
      if (res.ok) {
        const data = await res.json();
        setWhatsappStatus(data.status);
        setWhatsappQr(data.qr);
        setWhatsappError(data.error);
      }
    } catch (err) {
      console.error('Failed to fetch WhatsApp status:', err);
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleTestMessage = async (e) => {
    e.preventDefault();
    if (!testMobile) return;
    setTestSending(true);
    setTestStatus(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/whatsapp/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: testMobile })
      });
      if (res.ok) {
        setTestStatus({ success: true, message: 'Test message sent successfully!' });
        setTestMobile('');
      } else {
        const data = await res.json();
        setTestStatus({ success: false, message: data.message || 'Failed to send' });
      }
    } catch (err) {
      setTestStatus({ success: false, message: 'Network error while sending test' });
    } finally {
      setTestSending(false);
      setTimeout(() => setTestStatus(null), 4000);
    }
  };

  const handleWhatsAppLogout = async () => {
    if (!window.confirm('Are you sure you want to disconnect this WhatsApp device?')) return;
    setWhatsappLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/whatsapp/logout`, {
        method: 'POST'
      });
      if (res.ok) {
        setWhatsappStatus('DISCONNECTED');
        setWhatsappQr(null);
        checkWhatsAppStatus(true);
      }
    } catch (err) {
      console.error('Failed to log out WhatsApp:', err);
    } finally {
      setWhatsappLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    checkWhatsAppStatus(true);
    
    // Poll every 60 seconds while the Profile component is mounted
    const interval = setInterval(() => {
      checkWhatsAppStatus(false);
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const loadProfile = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/auth/profile`);
      if (res.ok) {
        const data = await res.json();
        setOwner(data.owner);
        setShopName(data.owner.shop_name);
        setContactNumber(data.owner.contact_number);
        if (data.owner.shop_logo) {
          setLogoPreview(`${API_BASE}/${data.owner.shop_logo}`);
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoBase64(reader.result);
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setSaving(true);

    try {
      const res = await fetchWithAuth(`${API_BASE}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shop_name: shopName,
          contact_number: contactNumber,
          shop_logo: logoBase64
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update profile');

      setOwner(data.owner);
      // Sync local storage user details
      localStorage.setItem('tailor_user', JSON.stringify(data.owner));
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMockPayment = async (e) => {
    e.preventDefault();
    setPaying(true);
    setError(null);

    try {
      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, 2000));

      const res = await fetchWithAuth(`${API_BASE}/api/auth/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan: selectedPlan.name })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Subscription failed');

      setOwner(prev => ({
        ...prev,
        subscription_tier: data.owner.subscription_tier,
        subscription_status: data.owner.subscription_status,
        subscription_expiry: data.owner.subscription_expiry
      }));

      // Update local storage
      const localUser = JSON.parse(localStorage.getItem('tailor_user'));
      localUser.subscription_tier = data.owner.subscription_tier;
      localUser.subscription_status = data.owner.subscription_status;
      localUser.subscription_expiry = data.owner.subscription_expiry;
      localStorage.setItem('tailor_user', JSON.stringify(localUser));

      setShowCheckout(false);
      setMessage(`Successfully upgraded to the ${selectedPlan.name} plan!`);
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setPaying(false);
    }
  };

  const openCheckout = (planName, price) => {
    setSelectedPlan({ name: planName, price });
    setShowCheckout(true);
  };

  if (!owner) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  const plans = [
    { name: 'STARTER', displayName: 'Starter', price: 99, features: ['Digital measurements', 'Customer directory', 'Standard invoice generation'], badge: 'Try for ₹1' },
    { name: 'GROWTH', displayName: 'Growth', price: 499, features: ['Unlimited orders', 'WhatsApp PDF invoices', 'Employee payroll tracker', 'Full expense manager'], badge: 'Recommended' },
    { name: 'SCALE', displayName: 'Scale', price: 999, features: ['Multiple staff members', 'Advanced analytics dashboard', 'Dedicated account support'], badge: 'Best Value' }
  ];

  // Expiry check
  const expiryDate = owner.subscription_expiry ? new Date(owner.subscription_expiry) : null;
  const daysRemaining = expiryDate ? Math.max(0, Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24))) : 0;

  return (
    <div className="space-y-6 pb-12 relative max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">TailorOS Shop Settings</h1>
          <p className="text-sm text-gray-500">Configure your shop identity and manage SaaS subscriptions</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-50 text-brand-700 rounded-lg text-sm font-semibold border border-brand-100 shadow-sm">
          <Shield className="w-4 h-4" />
          <span>Shop Code: {owner.shop_code}</span>
        </div>
      </div>

      {message && (
        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-200 shadow-sm flex items-center gap-2 text-sm font-medium animate-fadeIn">
          <span className="text-emerald-500">✓</span>
          {message}
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 shadow-sm text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column - Shop Profile Info */}
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <User className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-bold text-gray-900">Shop Information</h2>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shadow-inner">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Shop Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-gray-400 text-center font-medium px-2">No Logo Uploaded</span>
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 p-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md border border-white cursor-pointer active:scale-95 transition-all">
                  <Camera className="w-4 h-4" />
                  <input type="file" onChange={handleLogoChange} className="hidden" accept="image/*" />
                </label>
              </div>
              <div className="text-center sm:text-left">
                <h3 className="font-semibold text-gray-900">{shopName || 'Unnamed Shop'}</h3>
                <p className="text-xs text-gray-500 mt-1">Upload a shop logo to display on all automatically sent PDF invoices.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name *</label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-sm focus:ring-brand-500 focus:border-brand-500 text-gray-900 bg-white"
                  style={{ color: '#000000', backgroundColor: '#ffffff' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number *</label>
                <input
                  type="text"
                  required
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-sm focus:ring-brand-500 focus:border-brand-500 text-gray-900 bg-white"
                  style={{ color: '#000000', backgroundColor: '#ffffff' }}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner Email (Credentials)</label>
                <input
                  type="email"
                  disabled
                  value={owner.email}
                  className="w-full border border-gray-200 bg-gray-50 text-gray-500 rounded-lg px-3.5 py-2 text-sm cursor-not-allowed"
                  style={{ color: '#6b7280', backgroundColor: '#f9fafb' }}
                />
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm px-6 py-2.5 rounded-xl shadow-sm hover:shadow active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Settings
              </button>
            </div>
          </form>

          {/* WhatsApp Web Integration Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-gray-900">WhatsApp Web Integration (Beta)</h2>
              </div>
              <button 
                type="button"
                onClick={() => checkWhatsAppStatus(true)}
                disabled={whatsappLoading}
                className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg border border-gray-200 transition-all disabled:opacity-50"
                title="Refresh Status"
              >
                <RefreshCw className={`w-4 h-4 ${whatsappLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {whatsappLoading && whatsappStatus === 'DISCONNECTED' && !whatsappQr ? (
              <div className="flex flex-col items-center justify-center py-6 space-y-2">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                <p className="text-xs text-gray-500">Checking WhatsApp service status...</p>
              </div>
            ) : (whatsappStatus === 'CONNECTED' || whatsappStatus === 'VERIFIED') ? (
              <div className="space-y-4">
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
                    <Check className="w-6 h-6 stroke-[3px]" />
                  </div>
                  <div className="flex-1 text-center sm:text-left space-y-1.5">
                    <h3 className="font-bold text-emerald-900 text-sm">
                      WhatsApp {whatsappStatus === 'VERIFIED' ? 'Verified & Operational' : 'Connected'}
                    </h3>
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      Your shop's WhatsApp account is connected. Automatic invoice PDFs and delivery notifications will be sent directly to your customers' numbers.
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleWhatsAppLogout}
                        className="bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs px-4 py-2 rounded-xl border border-red-200 transition-all active:scale-95"
                      >
                        Link New WhatsApp (Disconnect Current)
                      </button>
                    </div>
                  </div>
                </div>
                
                {whatsappStatus === 'VERIFIED' && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">Test Connection</h4>
                    <form onSubmit={handleTestMessage} className="flex flex-col sm:flex-row gap-2">
                      <input 
                        type="text" 
                        placeholder="Enter mobile number" 
                        value={testMobile}
                        onChange={(e) => setTestMobile(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-brand-500" 
                        required
                        style={{ color: '#000000', backgroundColor: '#ffffff' }}
                      />
                      <button 
                        type="submit" 
                        disabled={testSending}
                        className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-semibold active:scale-95 disabled:opacity-50 flex items-center justify-center min-w-[120px]"
                      >
                        {testSending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Test Message'}
                      </button>
                    </form>
                    {testStatus && (
                      <p className={`mt-2 text-xs font-semibold ${testStatus.success ? 'text-emerald-600' : 'text-red-600'}`}>
                        {testStatus.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : whatsappStatus === 'FAILED' ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="p-3 bg-red-100 rounded-full text-red-600">
                  <AlertTriangle className="w-6 h-6 stroke-[3px]" />
                </div>
                <div className="flex-1 text-center sm:text-left space-y-1.5">
                  <h3 className="font-bold text-red-900 text-sm">Connection Lost / Sending Failed</h3>
                  <p className="text-xs text-red-700 leading-relaxed">
                    We lost connection to your WhatsApp device or a recent message failed to send. Please check your phone's internet connection.
                  </p>
                  <p className="text-xs font-semibold text-red-800">Error: {whatsappError || 'Unknown'}</p>
                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => checkWhatsAppStatus(true)}
                      className="bg-white text-red-600 font-semibold text-xs px-4 py-2 rounded-xl border border-red-200 transition-all hover:bg-red-50"
                    >
                      Retry Connection
                    </button>
                    <button
                      type="button"
                      onClick={handleWhatsAppLogout}
                      className="bg-red-600 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all hover:bg-red-700"
                    >
                      Reset & Re-link
                    </button>
                  </div>
                </div>
              </div>
            ) : whatsappStatus === 'QR' && whatsappQr ? (
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="bg-gray-50 p-4 border border-gray-200 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-inner mx-auto md:mx-0">
                  <img src={whatsappQr} alt="WhatsApp QR Code" className="w-48 h-48 rounded-lg" />
                  <span className="text-[10px] text-gray-400 font-semibold mt-2.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-ping" />
                    QR Code updates automatically
                  </span>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Link Your WhatsApp Device</h3>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Scan the QR code to link your phone's WhatsApp. This allows the system to send customer invoices automatically.
                    </p>
                  </div>
                  <ol className="text-xs text-gray-600 space-y-2 list-decimal pl-4">
                    <li>Open <strong>WhatsApp</strong> on your phone.</li>
                    <li>Tap <strong>Menu</strong> (Android) or <strong>Settings</strong> (iPhone).</li>
                    <li>Select <strong>Linked Devices</strong> and tap <strong>Link a Device</strong>.</li>
                    <li>Point your phone camera to this screen to scan the QR code.</li>
                  </ol>
                  {whatsappError && (
                    <div className="bg-red-50 text-red-700 p-2.5 rounded-xl border border-red-100 text-[11px] font-medium leading-relaxed">
                      ⚠️ Error: {whatsappError}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center space-y-3">
                <p className="text-xs text-gray-600 leading-relaxed">
                  WhatsApp connection is currently disconnected or the server is starting. Generate a new QR code to link your phone.
                </p>
                <div>
                  <button
                    type="button"
                    onClick={() => checkWhatsAppStatus(true)}
                    className="bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-sm active:scale-95 transition-all"
                  >
                    Generate WhatsApp QR Code
                  </button>
                </div>
                {whatsappError && (
                  <p className="text-[10px] text-red-500">Error: {whatsappError}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Subscription Summary Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-[#0f172a] text-white rounded-2xl border border-slate-800 shadow-xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[300px]">
            {/* Background design elements */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="space-y-6 relative z-10">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-blue-400">
                  <Sparkles className="w-5 h-5 fill-current" />
                  <span className="font-bold text-sm tracking-wider uppercase">SaaS License</span>
                </div>
                <span className={`text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-full ${
                  owner.subscription_status === 'TRIAL' 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {owner.subscription_status}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-xs font-semibold block uppercase">Current Tier</span>
                <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent block mt-1">
                  {owner.subscription_tier} PLAN
                </span>
              </div>

              <div className="flex items-start gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                <Clock className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 text-xs block">Validity Details</span>
                  {owner.subscription_status === 'TRIAL' ? (
                    <span className="text-xs font-medium text-amber-200 mt-0.5 block">
                      {daysRemaining > 0 ? `${daysRemaining} trial days remaining` : 'Trial expired today'}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-300 mt-0.5 block">
                      Expires: {expiryDate ? expiryDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-6 relative z-10">
              {owner.subscription_status === 'TRIAL' && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-[11px] text-amber-300 leading-normal">
                    Upgrade to prevent data lock when trial period terminates.
                  </span>
                </div>
              )}
              <a href="#plans" className="block text-center bg-white text-slate-950 font-bold text-sm py-3 rounded-xl hover:bg-slate-100 transition-colors active:scale-95">
                Upgrade / Manage Plan
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Plans Selection Section */}
      <div id="plans" className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6 mt-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">TailorOS SaaS Subscription Tiers</h2>
          <p className="text-sm text-gray-500">Pick the plan that suits your volume and team size</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan) => {
            const isCurrent = owner.subscription_tier === plan.name && owner.subscription_status !== 'EXPIRED';
            const priceText = plan.price;
            
            return (
              <div 
                key={plan.name} 
                className={`p-6 rounded-xl border flex flex-col justify-between transition-all ${
                  isCurrent 
                    ? 'border-brand-500 bg-brand-50/20 shadow-sm' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-900 text-base">{plan.displayName}</h3>
                    {isCurrent ? (
                      <span className="bg-brand-100 text-brand-700 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 border border-brand-200">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      plan.badge && (
                        <span className="bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-gray-200">
                          {plan.badge}
                        </span>
                      )
                    )}
                  </div>

                  <div className="flex items-baseline gap-0.5 mb-4">
                    <span className="text-2xl font-extrabold text-gray-900">₹{priceText}</span>
                    <span className="text-gray-500 text-xs">/month</span>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2 text-xs text-gray-600">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => openCheckout(plan.name, plan.price)}
                  disabled={isCurrent && owner.subscription_status === 'ACTIVE'}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold active:scale-95 transition-all cursor-pointer ${
                    isCurrent && owner.subscription_status === 'ACTIVE'
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                      : 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm'
                  }`}
                >
                  {isCurrent && owner.subscription_status === 'ACTIVE' ? 'Current Plan' : (plan.name === 'STARTER' ? 'Subscribe for ₹1' : 'Subscribe Plan')}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Checkout Modal / Checkout Page (Simulated Payment Page) */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden animate-slideUp">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-400" />
                <span className="font-bold text-sm tracking-wider uppercase">TailorOS Checkout</span>
              </div>
              <button 
                onClick={() => setShowCheckout(false)} 
                className="text-gray-400 hover:text-white transition-colors text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleMockPayment} className="p-6 space-y-5">
              {/* Plan summary block */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Upgrading plan</span>
                  <span className="font-extrabold text-slate-900 text-base">{selectedPlan?.name} Premium License</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 line-through block">₹{selectedPlan?.price}</span>
                  <span className="text-lg font-extrabold text-brand-600">
                    {selectedPlan?.name === 'STARTER' ? '₹1.00' : `₹${selectedPlan?.price}.00`}
                  </span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Credit / Debit Card</h4>
                
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">CARD NUMBER</label>
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500 tracking-widest font-mono text-gray-900 bg-white"
                    style={{ color: '#000000', backgroundColor: '#ffffff' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">EXPIRY DATE</label>
                    <input
                      type="text"
                      required
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500 font-mono text-gray-900 bg-white"
                      style={{ color: '#000000', backgroundColor: '#ffffff' }}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">CVV CODE</label>
                    <input
                      type="password"
                      required
                      placeholder="•••"
                      maxLength="3"
                      value={cardCVV}
                      onChange={(e) => setCardCVV(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500 font-mono text-center text-gray-900 bg-white"
                      style={{ color: '#000000', backgroundColor: '#ffffff' }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 text-[10px] text-gray-400 text-center flex items-center justify-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                <span>Simulated payment mode. Transaction passes automatically with a mock response.</span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCheckout(false)}
                  className="w-1/2 py-3 px-4 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paying}
                  className="w-1/2 py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-[0_4px_10px_rgba(77,142,255,0.25)] disabled:opacity-50 cursor-pointer"
                >
                  {paying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Confirm Pay'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
