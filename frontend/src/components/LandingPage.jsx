import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? `http://${window.location.hostname}:5000`
  : 'https://tailoros-production.up.railway.app';

export default function LandingPage({ onSelectPlan, onSignIn }) {
  const [cms, setCms] = useState({
    hero: {
      main_heading: "Run Your Tailor Shop Without Paper Records",
      sub_heading: "Manage measurements, orders, bills, customers, employees, expenses and WhatsApp invoices from one place.",
      primary_cta_text: "Start 14-Day Free Trial",
      secondary_cta_text: "Watch Demo",
      dashboard_preview_url: ""
    },
    branding: {
      logo_url: "",
      hero_banner_url: "",
      footer_text: "Built for Modern Tailors",
      support_email: "support@tailoros.com",
      contact_number: "+91 98765 43210"
    },
    features: [],
    plans: [],
    faqs: []
  });

  const [loading, setLoading] = useState(true);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/cms`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.message) {
          setCms(prev => ({
            ...prev,
            hero: data.hero || prev.hero,
            branding: data.branding || prev.branding,
            features: data.features || [],
            plans: data.plans || [],
            faqs: data.faqs || []
          }));
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching CMS content:', err);
        setLoading(false);
      });
  }, []);

  const getDynamicIcon = (iconName) => {
    if (!iconName) return Icons.HelpCircle;
    const mapping = {
      group: Icons.Users,
      straighten: Icons.Ruler,
      receipt_long: Icons.Receipt,
      send_to_mobile: Icons.Smartphone,
      badge: Icons.UserCheck,
      monitoring: Icons.LineChart,
      scissors: Icons.Scissors,
      play_circle: Icons.PlayCircle
    };
    
    const mapped = mapping[iconName.toLowerCase()];
    if (mapped) return mapped;

    const cleanName = iconName.charAt(0).toUpperCase() + iconName.slice(1);
    return Icons[cleanName] || Icons.HelpCircle;
  };

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] text-gray-900 font-sans selection:bg-brand-500/30 selection:text-brand-900 overflow-x-hidden relative">
      {/* Navigation */}
      <nav className="bg-white/85 backdrop-blur-md fixed top-0 w-full z-50 border-b border-gray-200/85 shadow-sm">
        <div className="flex justify-between items-center px-4 md:px-12 py-4 max-w-7xl mx-auto">
          <a className="flex items-center gap-2.5" href="#">
            <div className="p-1.5 bg-brand-600 rounded-lg text-white">
              <Icons.Scissors className="w-4 h-4 rotate-90" />
            </div>
            <span className="font-bold text-lg tracking-tight text-gray-900">
              TailorOS
            </span>
          </a>
          <div className="hidden md:flex gap-8 items-center">
            <a className="text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-900 transition-colors cursor-pointer" href="#problems">Problems</a>
            <a className="text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-900 transition-colors cursor-pointer" href="#features">Features</a>
            <a className="text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-900 transition-colors cursor-pointer" href="#pricing">Pricing</a>
            <a className="text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-900 transition-colors cursor-pointer" href="#faq">FAQ</a>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => onSignIn()} 
              className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign In
            </button>
            <button 
              onClick={() => onSelectPlan('TRIAL')} 
              className="text-xs font-semibold uppercase tracking-wider bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-lg active:scale-95 transition-all shadow-sm"
            >
              Start Free Trial
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-20 relative z-10">
        
        {/* Hero Section */}
        <section className="px-4 md:px-12 max-w-7xl mx-auto py-16 md:py-24 text-center relative">
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-6 max-w-5xl mx-auto tracking-tight text-gray-900">
            {cms.hero.main_heading.split("Without Paper Records")[0]}
            <span className="text-brand-600 block md:inline">
              Without Paper Records
            </span>
          </h1>
          <p className="text-base md:text-lg text-gray-500 max-w-3xl mx-auto mb-10 leading-relaxed font-normal">
            {cms.hero.sub_heading}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 mb-16">
            <button 
              onClick={() => onSelectPlan('TRIAL')} 
              className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-6 py-3.5 rounded-lg flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              {cms.hero.primary_cta_text}
              <Icons.ArrowRight className="w-4 h-4" />
            </button>
            <a 
              href="#demo"
              className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-sm font-semibold px-6 py-3.5 rounded-lg flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              <Icons.Play className="w-4 h-4 fill-current text-gray-500" />
              {cms.hero.secondary_cta_text}
            </a>
          </div>

          {/* Premium Preview Dashboard Mockup */}
          <div className="relative max-w-5xl mx-auto mt-10 p-2 rounded-2xl bg-white border border-gray-200 shadow-xl">
            <div className="w-full aspect-[16/9] rounded-xl overflow-hidden border border-gray-100 bg-[#f9fafb] flex flex-col items-center justify-center text-gray-500 relative">
              {/* Simulated UI Mockup - Light mode */}
              <div className="absolute inset-0 flex flex-col p-6 text-left select-none pointer-events-none bg-white">
                <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-brand-600 flex items-center justify-center text-white font-bold text-sm">T</div>
                    <span className="font-bold text-gray-900 text-sm">TailorOS Dashboard</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-100 border border-red-200" />
                    <div className="w-3 h-3 rounded-full bg-yellow-100 border border-yellow-200" />
                    <div className="w-3 h-3 rounded-full bg-green-100 border border-green-200" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 flex-1">
                  <div className="col-span-1 bg-[#f9fafb] border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                    <div className="h-8 bg-gray-300 rounded w-1/2 mt-1" />
                    <div className="h-32 bg-gray-100/50 rounded-lg mt-2 flex flex-col gap-2 p-2">
                      <div className="h-3 bg-gray-200 rounded w-full" />
                      <div className="h-3 bg-gray-200 rounded w-5/6" />
                      <div className="h-3 bg-gray-200 rounded w-4/5" />
                    </div>
                  </div>
                  <div className="col-span-2 flex flex-col gap-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-[#f9fafb] border border-gray-200 rounded-lg p-3">
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                        <div className="h-6 bg-brand-50 rounded w-2/3 mt-1" />
                      </div>
                      <div className="bg-[#f9fafb] border border-gray-200 rounded-lg p-3">
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                        <div className="h-6 bg-purple-50 rounded w-2/3 mt-1" />
                      </div>
                      <div className="bg-[#f9fafb] border border-gray-200 rounded-lg p-3">
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                        <div className="h-6 bg-emerald-50 rounded w-2/3 mt-1" />
                      </div>
                    </div>
                    <div className="bg-[#f9fafb] border border-gray-200 rounded-lg p-4 flex-1 flex flex-col gap-3">
                      <div className="h-4 bg-gray-200 rounded w-1/4" />
                      <div className="flex-1 flex items-end gap-2 pt-4">
                        <div className="bg-brand-200 w-full h-[60%] rounded-t border-t border-brand-300" />
                        <div className="bg-purple-200 w-full h-[80%] rounded-t border-t border-purple-300" />
                        <div className="bg-brand-200 w-full h-[40%] rounded-t border-t border-brand-300" />
                        <div className="bg-purple-200 w-full h-[95%] rounded-t border-t border-purple-300" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="z-10 text-center px-4 bg-gray-900 py-3 rounded-full border border-gray-800 shadow-md">
                <span className="text-white font-semibold text-xs tracking-wider uppercase">✨ Premium TailorOS Dashboard Mockup</span>
              </div>
            </div>
          </div>
        </section>

        {/* Problems We Solve Section */}
        <section id="problems" className="px-4 md:px-12 max-w-7xl mx-auto py-16 md:py-24 border-t border-gray-200">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold mb-4 text-gray-900">Tired of Running Your Shop on Paper?</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Traditional paper-based records create operation bottlenecks. See how TailorOS digitizes them.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* The Paper Problem */}
            <div className="p-8 rounded-2xl bg-red-50/50 border border-red-200">
              <h3 className="text-lg font-bold text-red-700 mb-6 flex items-center gap-2">
                <Icons.XCircle className="w-5 h-5 text-red-500" />
                The Old Paper Way
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-gray-600">
                  <span className="text-red-500 font-semibold mt-0.5">❌</span>
                  <span><strong>Lost measurement books</strong> cause major friction with customers.</span>
                </li>
                <li className="flex items-start gap-3 text-gray-600">
                  <span className="text-red-500 font-semibold mt-0.5">❌</span>
                  <span><strong>Missing customer records</strong> prevent recognizing returning customers.</span>
                </li>
                <li className="flex items-start gap-3 text-gray-600">
                  <span className="text-red-500 font-semibold mt-0.5">❌</span>
                  <span><strong>Handwritten bills</strong> look unprofessional and are easily misplaced.</span>
                </li>
                <li className="flex items-start gap-3 text-gray-600">
                  <span className="text-red-500 font-semibold mt-0.5">❌</span>
                  <span><strong>No expense tracking</strong> leads to undetected leakages and losses.</span>
                </li>
                <li className="flex items-start gap-3 text-gray-600">
                  <span className="text-red-500 font-semibold mt-0.5">❌</span>
                  <span><strong>Difficult employee management</strong> makes payroll and advances hard to log.</span>
                </li>
              </ul>
            </div>

            {/* The TailorOS Solution */}
            <div className="p-8 rounded-2xl bg-emerald-50/50 border border-emerald-200 shadow-sm">
              <h3 className="text-lg font-bold text-emerald-700 mb-6 flex items-center gap-2">
                <Icons.CheckCircle2 className="w-5 h-5 text-emerald-500" />
                The TailorOS Advantage
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-gray-700">
                  <span className="text-emerald-500 font-semibold mt-0.5">✅</span>
                  <span><strong>Digital measurements</strong> stored safely in the cloud, accessible in 1 click.</span>
                </li>
                <li className="flex items-start gap-3 text-gray-700">
                  <span className="text-emerald-500 font-semibold mt-0.5">✅</span>
                  <span><strong>Instant database search</strong> retrieves histories by name or mobile number.</span>
                </li>
                <li className="flex items-start gap-3 text-gray-700">
                  <span className="text-emerald-500 font-semibold mt-0.5">✅</span>
                  <span><strong>Dynamic sub-orders</strong> automatically link recurring orders in a single series.</span>
                </li>
                <li className="flex items-start gap-3 text-gray-700">
                  <span className="text-emerald-500 font-semibold mt-0.5">✅</span>
                  <span><strong>Integrated WhatsApp</strong> sends PDF invoices to customers automatically.</span>
                </li>
                <li className="flex items-start gap-3 text-gray-700">
                  <span className="text-emerald-500 font-semibold mt-0.5">✅</span>
                  <span><strong>Payroll & expense modules</strong> manage employee accounts and overall profitability.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Feature Showcase Section */}
        <section id="features" className="px-4 md:px-12 max-w-7xl mx-auto py-16 md:py-24 border-t border-gray-200">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold mb-4 text-gray-900">Tools Engineered for Professional Tailors</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Everything you need to run a high-end tailoring establishment efficiently.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {cms.features.length > 0 ? (
              cms.features.map((feature, idx) => {
                const FeatIcon = getDynamicIcon(feature.icon);
                return (
                  <div key={feature.id || idx} className="p-8 rounded-xl bg-white border border-gray-200 shadow-sm hover:border-brand-500 hover:shadow-md transition-all flex flex-col gap-4 group">
                    <div className="w-12 h-12 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 group-hover:scale-105 transition-transform">
                      <FeatIcon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">{feature.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full text-center text-gray-400">Loading features...</div>
            )}
          </div>
        </section>

        {/* Pricing Tiers Section */}
        <section id="pricing" className="px-4 md:px-12 max-w-7xl mx-auto py-16 md:py-24 border-t border-gray-200">
          <div className="text-center mb-16">
            <span className="text-2xs font-bold uppercase tracking-widest text-brand-700 bg-brand-50 border border-brand-200 px-3 py-1.5 rounded-full">Pricing Plans</span>
            <h2 className="text-3xl font-extrabold mt-4 mb-4 text-gray-900">Choose the Perfect Fit for Your Shop</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">All plans start with a 14-day free trial. Cancel or change anytime.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {cms.plans.length > 0 ? (
              cms.plans.map((plan, idx) => {
                const isGrowth = plan.name === 'GROWTH';
                const features = JSON.parse(plan.features_list || '[]');
                
                return (
                  <div 
                    key={plan.id || idx} 
                    className={`p-8 rounded-xl flex flex-col relative transition-all border ${
                      isGrowth 
                        ? 'bg-white border-2 border-brand-600 shadow-lg md:-translate-y-2' 
                        : 'bg-white border-gray-200 shadow-sm'
                    }`}
                  >
                    {plan.badge_text && (
                      <span className={`absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        isGrowth 
                          ? 'bg-brand-600 text-white' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {plan.badge_text}
                      </span>
                    )}

                    <h3 className="text-base font-bold text-gray-900 mb-2">{plan.display_name}</h3>
                    <p className="text-xs text-gray-500 mb-6 min-h-[40px]">{plan.description}</p>
                    
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-3xl font-extrabold text-gray-900">₹{plan.price}</span>
                      <span className="text-gray-400 text-sm">/ month</span>
                    </div>

                    {plan.name === 'STARTER' && (
                      <div className="bg-brand-50 border border-brand-200 rounded-lg p-2.5 mb-6 text-center text-xs text-brand-700 font-medium">
                        🔥 Highlight: Try for 1 rupee!
                      </div>
                    )}

                    <ul className="space-y-3.5 mb-8 flex-1">
                      {features.map((feature, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2.5 text-sm text-gray-600">
                          <Icons.Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => onSelectPlan(plan.name)}
                      className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                        isGrowth 
                          ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm' 
                          : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-2xs'
                      }`}
                    >
                      {plan.name === 'STARTER' ? 'Try for 1 Rupee' : 'Start 14-Day Trial'}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full text-center text-gray-400">Loading plans...</div>
            )}
          </div>
        </section>

        {/* FAQs Section */}
        <section id="faq" className="px-4 md:px-12 max-w-4xl mx-auto py-16 md:py-24 border-t border-gray-200">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold mb-4 text-gray-900">Frequently Asked Questions</h2>
            <p className="text-gray-500">Got questions? We've got answers.</p>
          </div>

          <div className="space-y-4">
            {cms.faqs.length > 0 ? (
              cms.faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={faq.id || idx} className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm transition-all">
                    <button 
                      onClick={() => toggleFaq(idx)}
                      className="w-full px-6 py-4 flex justify-between items-center text-left hover:bg-gray-50/50 transition-colors"
                    >
                      <span className="font-semibold text-gray-900 text-sm">{faq.question}</span>
                      <Icons.ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-5 pt-1 text-xs text-gray-500 leading-relaxed border-t border-gray-100 bg-[#f9fafb]">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center text-gray-400">Loading FAQs...</div>
            )}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-gray-200 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 px-4 md:px-12 max-w-7xl mx-auto">
          <div className="col-span-1 flex flex-col gap-4">
            <span className="font-bold text-xl tracking-tight text-gray-900">
              TailorOS
            </span>
            <p className="text-xs text-gray-400 leading-relaxed">
              {cms.branding.footer_text} <br/>
              © 2026 TailorOS. All rights reserved.
            </p>
          </div>
          <div className="col-span-1 flex flex-col gap-2.5">
            <span className="text-xs font-bold text-gray-950 uppercase tracking-widest">Features</span>
            <a href="#problems" className="text-xs text-gray-500 hover:text-gray-900 transition-colors">Problems Solved</a>
            <a href="#features" className="text-xs text-gray-500 hover:text-gray-900 transition-colors">CMS Customization</a>
            <a href="#pricing" className="text-xs text-gray-500 hover:text-gray-900 transition-colors">SaaS Pricing</a>
          </div>
          <div className="col-span-1 flex flex-col gap-2.5">
            <span className="text-xs font-bold text-gray-950 uppercase tracking-widest">Support</span>
            <a href={`mailto:${cms.branding.support_email}`} className="text-xs text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1.5">
              <Icons.Mail className="w-3.5 h-3.5" />
              {cms.branding.support_email}
            </a>
            <a href={`tel:${cms.branding.contact_number}`} className="text-xs text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1.5">
              <Icons.Phone className="w-3.5 h-3.5" />
              {cms.branding.contact_number}
            </a>
          </div>
          <div className="col-span-1 flex flex-col gap-2.5">
            <span className="text-xs font-bold text-gray-950 uppercase tracking-widest">SaaS Platform</span>
            <a href="/admin" className="text-xs text-brand-600 hover:text-brand-700 font-semibold transition-colors flex items-center gap-1">
              <Icons.Shield className="w-3.5 h-3.5" />
              Admin Portal
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
