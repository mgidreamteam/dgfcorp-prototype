import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Rocket, Layers } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import AnimatedGrid from '../components/AnimatedGrid';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { dashboardTheme, setDashboardTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError('');
    const success = await login(email, password);
    if (success) {
      navigate('/dashboard');
    } else {
      setError('Invalid email or password.');
    }
  };

  return (
    <>
      <main className="flex-1 flex flex-col items-center justify-center relative overflow-hidden py-12">
          
          {/* Top Right Theme Switcher */}
          <div className="absolute top-6 right-8 flex items-center gap-1 border border-zinc-800/80 bg-black/40 backdrop-blur-md p-1 rounded-xl shadow-inner z-50">
              <button 
                  onClick={() => setDashboardTheme('dream-giga')}
                  title="DREAM Giga Theme"
                  className={`p-2 rounded-lg transition-all ${dashboardTheme === 'dream-giga' ? 'bg-zinc-800 text-white shadow-inner border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                  <Rocket className="w-4 h-4" />
              </button>
              <button 
                  onClick={() => setDashboardTheme('blueprint')}
                  title="Blueprint Theme"
                  className={`p-2 rounded-lg transition-all ${dashboardTheme === 'blueprint' ? 'bg-zinc-800 text-white shadow-inner border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                  <Layers className="w-4 h-4" />
              </button>
          </div>

          <AnimatedGrid />
          <div className="relative z-10 w-full max-w-md p-8 text-center animate-fade-in-up my-8 mx-auto bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-none overflow-hidden shadow-2xl">
              <div className="spotlight-effect opacity-50 pointer-events-none"></div>
              <div className="relative z-10 py-4">
                  <h1 className="text-3xl font-ethereal text-white font-bold tracking-wider mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">dream what you make, make what you dream</h1>
              
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/40 border border-zinc-700/50 text-white placeholder-zinc-600 rounded-none px-4 py-3 outline-none focus:border-white transition-colors"
                />
                <div className="relative w-full">
                  <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-black/40 border border-zinc-700/50 text-white placeholder-zinc-600 rounded-none px-4 py-3 outline-none focus:border-white transition-colors"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <button
                    type="submit"
                    disabled={!email || !password}
                    className="w-14 h-14 mt-4 mx-auto bg-white text-black rounded-full hover:bg-zinc-200 transition-transform hover:scale-105 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:hover:scale-100 disabled:cursor-not-allowed flex justify-center items-center shadow-lg shadow-white/10"
                    title="Login"
                >
                    <ArrowRight className="w-6 h-6" />
                </button>
              </form>
              
              {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
              <div className="mt-4 pt-4 border-t border-zinc-700/50">
                <p className="text-zinc-400 text-xs leading-relaxed max-w-sm mx-auto mb-4">
                  By logging in, you agree to abide by the terms of our NDA and acknowledge that you are accessing a confidential, proprietary system.
                </p>
                <div className="space-y-3">
                  <p className="text-zinc-400 text-sm pb-2 border-b border-zinc-800/50">
                      Don't have an account?{' '}
                      <Link to="/register" className="font-semibold text-white hover:underline">
                          Register
                      </Link>
                  </p>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                      Meet our{' '}
                      <Link to="/about" className="font-semibold text-white hover:underline transition-colors">
                          Leadership
                      </Link>
                      {' '}and learn more about our{' '}
                      <Link to="/innovation" className="font-semibold text-white hover:underline transition-colors">
                          Innovation
                      </Link>.
                  </p>
                </div>
                <p className="text-yellow-600 text-xs tracking-wide pt-2 mt-4">
                    Limited trial alpha
                </p>
              </div>
              </div>
          </div>
      </main>
    </>
  );
};

export default LoginPage;