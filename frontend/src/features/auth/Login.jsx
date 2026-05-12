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
        const res = await authAPI.register({
          email: form.email,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
        });
        sessionStorage.setItem('token', res.data.token);
        sessionStorage.setItem('user', JSON.stringify(res.data.user));
        navigate('/dashboard', { replace: true });
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
        // Extract the first available error message from the response
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
      {/* Left — Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#0c1222] via-[#111d3a] to-[#1a1a2e]">
        {/* Decorative Elements */}
        <div className="absolute inset-0">
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
          />
          {/* Glow orbs */}
          <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-amber-500/10 blur-[100px]" />
          <div className="absolute bottom-1/4 right-0 w-80 h-80 rounded-full bg-orange-500/8 blur-[80px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12">
          {/* Logo */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 flex items-center justify-center shadow-2xl shadow-amber-500/30 mb-8">
            <Building2 className="w-10 h-10 text-white" strokeWidth={1.5} />
          </div>

          <h1 className="text-4xl xl:text-5xl font-bold text-white text-center leading-tight">
            Steel Fab<br />
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Enterprises
            </span>
          </h1>

          <p className="text-slate-400 text-center mt-4 max-w-sm text-lg leading-relaxed">
            Milestone Management System
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3 mt-10">
            {['Project Tracking', 'Milestone Analytics'].map((f) => (
              <span key={f} className="px-4 py-1.5 rounded-full text-xs font-medium bg-white/5 text-slate-300 border border-white/10">
                {f}
              </span>
            ))}
          </div>

          <p className="absolute bottom-8 text-xs text-slate-600">
            © 2026 Steel Fab Enterprises. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-800">Steel Fab</span>
              <span className="text-[10px] block font-semibold text-amber-500 tracking-widest uppercase -mt-0.5">Enterprises</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                {mode === 'signup' ? 'Create your account' : 'Welcome back'}
              </h2>
              <p className="text-slate-500 mt-1.5 text-sm">
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
              className="text-amber-600 hover:text-amber-700 text-sm font-semibold transition-colors"
            >
              {mode === 'signup' ? 'Already have an account? Sign in' : 'New user? Create account'}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
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

            {/* Error */}
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-medium animate-fade-in">
                {error}
              </div>
            )}

            {/* Submit */}
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
    </div>
  );
}
