import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ThemePanel from '../components/ThemePanel';
import AnimatedGrid from '../components/AnimatedGrid';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { dashboardTheme } = useTheme();
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
          <AnimatedGrid />
          <ThemePanel className="relative z-10 w-full max-w-md p-8 text-center animate-fade-in-up my-8 mx-auto" interactive={false}>
              <h2 className="text-2xl font-bold text-white mb-2 font-kido tracking-wider">D.R.E.A.M. STUDIO</h2>
              <p className="text-zinc-500 mb-8 text-sm">DREAM Gigafactories Corp. Authorization</p>
              
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/40 border border-zinc-700/50 text-white placeholder-zinc-600 rounded-none px-4 py-3 outline-none focus:border-white transition-colors font-kido"
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/40 border border-zinc-700/50 text-white placeholder-zinc-600 rounded-none px-4 py-3 outline-none focus:border-white transition-colors font-kido"
                />
                <button
                    type="submit"
                    disabled={!email || !password}
                    className="w-full mt-4 bg-white text-black font-bold uppercase tracking-widest p-3 hover:bg-zinc-200 transition-colors disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                    Authenticate <ArrowRight className="w-4 h-4" />
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
                  <p className="text-zinc-400 text-sm">
                      Meet our{' '}
                      <Link to="/about" className="font-semibold text-white hover:underline transition-colors">
                          Leadership
                      </Link>
                      {' '}to learn more.
                  </p>
                </div>
                <p className="text-yellow-600 text-xs font-kido tracking-wide pt-2 mt-4">
                    prototype product
                </p>
              </div>
          </ThemePanel>
      </main>
    </>
  );
};

export default LoginPage;