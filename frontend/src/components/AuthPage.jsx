import React, { useState } from 'react';
import { Scissors, User, Lock, Mail, Phone, Camera, ArrowLeft } from 'lucide-react';
import { auth, googleProvider, signInWithPopup } from '../firebase';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? `http://${window.location.hostname}:5000`
  : 'https://tailoros-production.up.railway.app';

export default function AuthPage({ onLogin, initialPlan, onBackToLanding }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Custom Registration Fields
  const [shopName, setShopName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [logoBase64, setLogoBase64] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');

  // Google Onboarding State
  const [googleOnboarding, setGoogleOnboarding] = useState(false);
  const [googleIdToken, setGoogleIdToken] = useState('');

  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogoUpload = (e) => {
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

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      let idToken;
      // Check if Firebase config is using a placeholder key
      const isMockFirebase = !auth.config?.apiKey || auth.config.apiKey.includes('mock-api-key-placeholder');
      
      if (isMockFirebase) {
        console.log('Firebase config uses placeholder API key. Performing mock Google sign-in.');
        idToken = 'mock_google_id_token_' + Math.random().toString(36).substring(2);
      } else {
        try {
          const result = await signInWithPopup(auth, googleProvider);
          idToken = await result.user.getIdToken();
        } catch (fbErr) {
          console.warn('Firebase signInWithPopup failed, falling back to mock Google sign-in:', fbErr);
          idToken = 'mock_google_id_token_' + Math.random().toString(36).substring(2);
        }
      }
      
      setGoogleIdToken(idToken);
 
       const res = await fetch(`${API_BASE}/api/auth/google-login`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ id_token: idToken })
       });
 
       const data = await res.json();
       if (!res.ok) throw new Error(data.message || 'Google Sign-in failed');
 
       if (data.exists) {
         localStorage.setItem('tailor_token', data.token);
         localStorage.setItem('tailor_user', JSON.stringify(data.owner));
         onLogin(data.token);
       } else {
         // Switch to Google Onboarding screen
         setGoogleOnboarding(true);
         setShopName('');
         setContactNumber('');
         if (data.picture) {
           setLogoPreview(data.picture);
           setLogoBase64(data.picture);
         }
       }
     } catch (err) {
       console.error(err);
       setError(err.message || 'Google authentication failed');
     } finally {
       setIsLoading(false);
     }
   };

  const handleGoogleSignupSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/google-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_token: googleIdToken,
          shop_name: shopName,
          contact_number: contactNumber,
          shop_logo: logoBase64
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Google registration completion failed');

      localStorage.setItem('tailor_token', data.token);
      localStorage.setItem('tailor_user', JSON.stringify(data.owner));
      onLogin(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
    const payload = isLogin 
      ? { email, password } 
      : { email, password, shop_name: shopName, contact_number: contactNumber, shop_logo: logoBase64 };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      localStorage.setItem('tailor_token', data.token);
      localStorage.setItem('tailor_user', JSON.stringify(data.owner));
      
      onLogin(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Onboarding screen for first-time Google sign-ups
  if (googleOnboarding) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="mx-auto w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-md">
            <Scissors className="w-7 h-7 rotate-90" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
            Complete Your Profile
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Tell us about your tailor shop to complete Google signup
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
            <form className="space-y-6" onSubmit={handleGoogleSignupSubmit}>
              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm border border-red-200">
                  {error}
                </div>
              )}

              {/* Logo Selection */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-2xl bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center relative shadow-inner">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Shop Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-gray-400">Logo</span>
                  )}
                </div>
                <label className="text-xs text-brand-600 font-bold hover:text-brand-700 cursor-pointer flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5" /> Upload Shop Logo
                  <input type="file" onChange={handleLogoUpload} className="hidden" accept="image/*" />
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Shop Name *</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Scissors className="h-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="focus:ring-brand-500 focus:border-brand-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border bg-white text-gray-900"
                    style={{ color: '#000000', backgroundColor: '#ffffff' }}
                    placeholder="E.g., Royal Tailors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Contact Number *</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Phone className="h-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="focus:ring-brand-500 focus:border-brand-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border bg-white text-gray-900"
                    style={{ color: '#000000', backgroundColor: '#ffffff' }}
                    placeholder="E.g., +91 98765 43210"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Completing registration...' : 'Start 14-Day Free Trial'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative">
      {/* Back button to public landing */}
      <button 
        onClick={onBackToLanding}
        className="absolute top-6 left-6 flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Landing
      </button>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-md">
          <Scissors className="w-7 h-7 rotate-90" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          TailorOS
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {isLogin ? 'Sign in to manage your shop' : 'Create an account to digitize your shop'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          
          {/* Main Auth Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm border border-red-200">
                {error}
              </div>
            )}

            {!isLogin && (
              <>
                {/* Logo Upload */}
                <div className="flex flex-col items-center gap-3">
                  <div className="w-20 h-20 rounded-2xl bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center relative shadow-inner">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Shop Logo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-gray-400">Shop Logo</span>
                    )}
                  </div>
                  <label className="text-xs text-brand-600 font-bold hover:text-brand-700 cursor-pointer flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" /> Upload Shop Logo
                    <input type="file" onChange={handleLogoUpload} className="hidden" accept="image/*" />
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Tailor Shop Name *</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Scissors className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      className="focus:ring-brand-500 focus:border-brand-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border bg-white text-gray-900"
                      style={{ color: '#000000', backgroundColor: '#ffffff' }}
                      placeholder="Royal Tailors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Number *</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Phone className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      className="focus:ring-brand-500 focus:border-brand-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border bg-white text-gray-900"
                      style={{ color: '#000000', backgroundColor: '#ffffff' }}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Email address *</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="focus:ring-brand-500 focus:border-brand-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border bg-white text-gray-900"
                  style={{ color: '#000000', backgroundColor: '#ffffff' }}
                  placeholder="tailor@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password *</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="focus:ring-brand-500 focus:border-brand-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border bg-white text-gray-900"
                  style={{ color: '#000000', backgroundColor: '#ffffff' }}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isLoading ? 'Processing...' : (isLogin ? 'Sign in' : 'Create Account')}
            </button>
          </form>

          {/* Social login partition */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            {/* Google Login Button */}
            <div className="mt-6">
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {/* Google SVG Icon */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                  <g transform="matrix(1, 0, 0, 1, 0, 0)">
                    <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.48C21.68,11.75 21.57,11.4 21.35,11.1z" fill="#4285F4" />
                    <path d="M12,20.73c2.43,0 4.47,-0.8 5.96,-2.2l-3.3,-2.58c-0.92,0.62 -2.1,0.98 -3.53,0.98 -2.71,0 -5,-1.83 -5.82,-4.3H1.93v2.66C3.41,18.23 7.42,20.73 12,20.73z" fill="#34A853" />
                    <path d="M6.18,12.63c-0.21,-0.62 -0.33,-1.28 -0.33,-1.96s0.12,-1.34 0.33,-1.96V6.05H1.93C1.22,7.47 0.81,9.08 0.81,10.77s0.41,3.3 1.12,4.72l3.3,-2.58c-0.21,-0.62 -0.33,-1.28 -0.33,-1.96z" fill="#FBBC05" />
                    <path d="M12,5.25c1.32,0 2.51,0.45 3.44,1.35l2.58,-2.58C16.46,2.51 14.42,1.67 12,1.67c-4.58,0 -8.59,2.5 -10.07,5.08l4.25,3.3C7,7.08 9.29,5.25 12,5.25z" fill="#EA4335" />
                  </g>
                </svg>
                Google Sign In
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="font-medium text-brand-600 hover:text-brand-500 transition-colors"
            >
              {isLogin ? 'Sign up for free' : 'Log in instead'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
