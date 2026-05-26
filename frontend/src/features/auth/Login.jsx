import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { Building2, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', first_name: '', last_name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const navigate = useNavigate();

  // Slideshow configuration
  const slideshowImages = [
    '/SFE/4.webp',
    '/SFE/1.jpg',
    '/SFE/2.webp',
    '/SFE/3.webp'
  ];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % slideshowImages.length);
    }, 5000); // 5 seconds duration
    return () => clearInterval(timer);
  }, [slideshowImages.length]);

  // If already logged in, redirect
  useEffect(() => {
    if (sessionStorage.getItem('token')) navigate('/dashboard', { replace: true });
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password || (mode === 'signup' && !form.confirmPassword)) {
      setError('Please fill all required fields');
      return;
    }
    if (mode === 'signup' && form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        await authAPI.register({
          email: form.email,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
        });
        setMode('login');
        setForm(prev => ({ ...prev, password: '', confirmPassword: '' }));
      } else {
        const res = await authAPI.login({ email: form.email, password: form.password });
        sessionStorage.setItem('token', res.data.token);
        sessionStorage.setItem('user', JSON.stringify(res.data.user));
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      if (!err.response) {
        setError('Cannot reach server. Please check your internet connection.');
      } else if (err.response.status === 500) {
        setError('Server Error (500): Please ensure database migrations have been run on the backend.');
      } else {
        const errorData = err.response.data;
        const errorMessage = 
          (typeof errorData === 'string' ? errorData : null) ||
          errorData?.non_field_errors?.[0] || 
          errorData?.message || 
          errorData?.detail || 
          (errorData?.email ? `Email: ${errorData.email[0]}` : null) ||
          (errorData?.password ? `Password: ${errorData.password[0]}` : null) ||
          (errorData?.username ? `Username: ${errorData.username[0]}` : null) ||
          'Failed to process request. Please check your details.';
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — Branding Panel & Slideshow */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-950 flex-col justify-between shadow-[20px_0_40px_-15px_rgba(0,0,0,0.35)] z-10">
        
        {/* Top Header Row (Spacer to balance layout) */}
        <div className="h-16" />

        {/* Slideshow Container (Background layer) */}
        <div className="absolute inset-0 z-0">
          {/* Slideshow Images */}
          {slideshowImages.map((src, index) => (
            <div
              key={src}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                index === currentImageIndex ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                backgroundImage: `url(${src})`,
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            />
          ))}

          {/* Subtle dark overlay for contrast */}
          <div className="absolute inset-0 bg-black/15" />
          {/* Radial gradient centered behind text for readability */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.5)_0%,rgba(15,23,42,0.15)_65%,transparent_100%)]" />
          {/* Bottom shadow gradient to ensure white text/dots are readable */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
        </div>

        {/* Centered Branding Text Block (Centered horizontally and vertically) */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-12">
          <div className="flex flex-col items-center drop-shadow-[0_4px_12px_rgba(0,0,0,0.65)]">
            <h1 className="text-4xl xl:text-5xl font-extrabold text-white text-center leading-[1.1] tracking-wide">
              Steel Fab<br />
              <span className="text-amber-400">
                ENTERPRISES
              </span>
            </h1>
            
            <p className="text-slate-200 text-center mt-3 text-base xl:text-lg font-semibold tracking-normal opacity-90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)]">
              Milestone Management System
            </p>

            {/* Feature pills */}
            <div className="flex gap-2.5 mt-6">
              {['Project Tracking', 'Milestone Analytics'].map((f) => (
                <span key={f} className="px-3.5 py-1 rounded-full text-xs font-semibold bg-slate-900/50 text-slate-200 border border-white/10 backdrop-blur-sm shadow-md">
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Grid pattern overlay & background glow decoration */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.02] z-0"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-amber-500/5 blur-[100px] pointer-events-none z-0" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 rounded-full bg-orange-500/5 blur-[80px] pointer-events-none z-0" />

        {/* Dots indicators & Copyright at the very bottom */}
        <div className="relative z-20 flex flex-col items-center p-8 pb-6 gap-4 bg-gradient-to-t from-slate-950/60 via-slate-950/20 to-transparent">
          {/* Animated image indicators */}
          <div className="flex gap-2 justify-center">
            {slideshowImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentImageIndex ? 'w-8 bg-amber-500' : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          <p className="text-center text-xs text-white/70 font-medium drop-shadow-sm">
            © 2026 Steel Fab Enterprises. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right — Login Form & Branding */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between items-center p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen lg:min-h-0">
        
        {/* Spacer to align top spacing */}
        <div className="h-4" />

        <div className="w-full flex flex-col items-center">
          {/* Branding Logo centered above the login card */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-28 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg p-2 border border-slate-200 hover:scale-105 transition-transform duration-300">
              <img src="/SFE/steelfab_logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
          </div>

          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
            {/* Mobile-only Branding Text (Hidden on desktop since logo & text are displayed) */}
            <div className="lg:hidden flex flex-col items-center mb-6">
              <h1 className="text-3xl font-extrabold text-slate-900 text-center leading-tight">
                Steel Fab <span className="text-amber-500">ENTERPRISES</span>
              </h1>
              <p className="text-slate-500 text-center mt-1 text-sm font-medium">
                Milestone Management System
              </p>
            </div>

            {/* Form Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 lg:mt-0 mt-6 border-t lg:border-t-0 border-slate-100 pt-6 lg:pt-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {mode === 'signup' ? 'Create your account' : 'Welcome back'}
                </h2>
                <p className="text-slate-500 mt-1 text-xs">
                  {mode === 'signup'
                    ? 'Sign up to access the Milestone Management System'
                    : 'Sign in to your account to continue'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'signup' ? 'login' : 'signup');
                  setError('');
                }}
                className="text-amber-600 hover:text-amber-700 text-xs font-semibold transition-colors text-left"
              >
                {mode === 'signup' ? 'Already have an account? Sign in' : 'New user? Create account'}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {mode === 'signup' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">First Name</label>
                    <input
                      type="text"
                      value={form.first_name}
                      onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 transition-all"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Last Name</label>
                    <input
                      type="text"
                      value={form.last_name}
                      onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 transition-all"
                      placeholder="Doe"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                <input
                  id="login-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 transition-all"
                  placeholder="you@steelfab.com"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 transition-all pr-11"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 transition-colors"
                  >
                    {showPw ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 transition-all pr-11"
                      placeholder="Re-enter your password"
                    />
                  </div>
                </div>
              )}

              {mode === 'login' && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400/30" />
                    <span className="text-slate-600">Remember me</span>
                  </label>
                  <Link to="/forgot-password" className="text-amber-600 hover:text-amber-700 font-semibold transition-colors">
                    Forgot password?
                  </Link>
                </div>
              )}

              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-medium animate-fade-in">
                  {error}
                </div>
              )}

              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.01]"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {mode === 'signup' ? 'Creating account...' : 'Signing in...'}</>
                ) : (
                  <>{mode === 'signup' ? 'Sign Up' : 'Sign In'} <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer at the bottom of the right panel */}
        <div className="w-full text-center py-4 mt-6">
          <p className="text-xs text-slate-400 font-semibold tracking-wide">
            Powered by @2026 CALDM Engineering Pvt. Ltd.
          </p>
        </div>
      </div>
    </div>
  );
}
