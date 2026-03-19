import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldAlert, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const WavyBackground = () => (
    <div className="wavy-background">
      <svg viewBox="0 0 1200 800" xmlns="http://www.w3.org/2000/svg" className="opacity-50">
        <defs>
          <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
            <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"/>
          </pattern>
          <filter id="vibration" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.005 0.05" numOctaves="2" result="warp">
              <animate attributeName="baseFrequency" dur="10s" values="0.005 0.05;0.005 0.02;0.005 0.05" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap xChannelSelector="R" yChannelSelector="G" scale="2" in="SourceGraphic" in2="warp" />
          </filter>
          <path id="airRoute" d="M-100,200 C 250,100 600,300 800,180 S 1050,80 1300,200" fill="none" stroke="rgba(0,196,159,0.1)" strokeWidth="1" strokeDasharray="5 5"/>
          <path id="seaRoute" d="M-100,650 C 350,780 600,550 900,680 S 1100,600 1300,650" fill="none" stroke="rgba(0,136,254,0.1)" strokeWidth="1" strokeDasharray="5 5"/>
          <path id="landRoute" d="M-100,400 C 300,350 650,450 850,380 S 1050,420 1300,400" fill="none" stroke="rgba(255,187,40,0.1)" strokeWidth="1" strokeDasharray="5 5"/>
          <path id="route4" d="M-100,300 C 320,205 680,395 880,285 S 1100,355 1300,300" fill="none" stroke="rgba(0,196,159,0.1)" strokeWidth="1" strokeDasharray="5 5"/>
          <path id="route5" d="M-100,550 C 380,655 620,455 950,605 S 1150,505 1300,550" fill="none" stroke="rgba(255,187,40,0.1)" strokeWidth="1" strokeDasharray="5 5"/>
          <path id="route6" d="M-100,720 C 400,680 700,780 900,700 S 1150,740 1300,720" fill="none" stroke="rgba(0,136,254,0.1)" strokeWidth="1" strokeDasharray="5 5"/>
          <radialGradient id="lightGradient">
            <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <g id="airplane">
            <path d="M21 16V2l-5 5-5-5v14l-5 5v2l10-3 10 3v-2l-5-5z" fill="rgba(255,255,255,0.1)" transform="scale(0.3) translate(-12 -12)"/>
          </g>
          <g id="ship">
            <path d="M20.6,13H3.4A1.3,1.3,0,0,0,2,14.3V16H22V14.3A1.3,1.3,0,0,0,20.6,13ZM22,18H2v2H22Zm-11,2H9v2h2Z M3,11.5,12,3,21,11.5Z" fill="rgba(255,255,255,0.1)" transform="scale(0.3) translate(-12 -12)"/>
          </g>
          <g id="truck">
            <path d="M1 3h15v11h-2v-4h-11v4h-2v-11z M2 4v2h13v-2z M5 16h2v2h-2z M10 16h2v2h-2z" fill="rgba(255,255,255,0.1)" transform="scale(0.3) translate(-8 -12)"/>
          </g>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <circle cx="600" cy="400" r="600" fill="url(#lightGradient)" />
        <g filter="url(#vibration)">
          <use href="#airRoute" />
          <use href="#seaRoute" />
          <use href="#landRoute" />
          <use href="#route4" />
          <use href="#route5" />
          <use href="#route6" />
        </g>
        <use href="#airplane"><animateMotion dur="15s" repeatCount="indefinite" rotate="auto"><mpath href="#airRoute"/></animateMotion></use>
        <use href="#ship"><animateMotion dur="20s" begin="-5s" repeatCount="indefinite" rotate="auto"><mpath href="#seaRoute"/></animateMotion></use>
        <use href="#truck"><animateMotion dur="12s" begin="-10s" repeatCount="indefinite" rotate="auto"><mpath href="#landRoute"/></animateMotion></use>
        <use href="#airplane"><animateMotion dur="18s" begin="-3s" repeatCount="indefinite" rotate="auto"><mpath href="#route4"/></animateMotion></use>
        <use href="#truck"><animateMotion dur="14s" begin="-7s" repeatCount="indefinite" rotate="auto"><mpath href="#route5"/></animateMotion></use>
        <use href="#ship"><animateMotion dur="22s" begin="-12s" repeatCount="indefinite" rotate="auto"><mpath href="#route6"/></animateMotion></use>
      </svg>
    </div>
);

const NdaModal: React.FC<{ onAgree: () => void; onCancel: () => void }> = ({ onAgree, onCancel }) => (
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in"
      role="dialog" aria-modal="true" aria-labelledby="nda-title"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500/10 p-2 rounded-lg border border-yellow-500/20">
              <ShieldAlert className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h2 id="nda-title" className="text-xl font-bold text-white">Confidentiality Agreement</h2>
              <p className="text-zinc-400 text-sm">Please review and agree to the terms.</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <p className="text-zinc-300">
            By signing in, you acknowledge that you are accessing a confidential system. You agree to abide by the terms of the Non-Disclosure Agreement (NDA) and will not disclose any proprietary information, trade secrets, or project details viewed within the D.R.E.A.M. Studio to any third party.
          </p>
        </div>
        <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 flex justify-end items-center gap-4">
          <button onClick={onCancel} className="text-zinc-400 hover:text-white text-sm font-medium px-4 py-2 transition-colors">
            Cancel
          </button>
          <button onClick={onAgree} className="bg-white hover:bg-zinc-200 text-black px-5 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-white/10 transition-all">
            Agree & Continue
          </button>
        </div>
      </div>
    </div>
);


const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isNdaModalVisible, setIsNdaModalVisible] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setIsNdaModalVisible(true);
  };

  const handleNdaAgree = () => {
    setIsNdaModalVisible(false);
    setError('');
    const success = login(username, password);
    if (success) {
      navigate('/studio');
    } else {
      setError('Invalid username or password.');
    }
  };


  return (
    <>
      {isNdaModalVisible && <NdaModal onAgree={handleNdaAgree} onCancel={() => setIsNdaModalVisible(false)} />}
      <main className="min-h-[40vh] flex flex-col items-center justify-center relative overflow-hidden">
          <WavyBackground />
          <div className="relative z-10 w-full max-w-xl p-8 text-center animate-fade-in-up">
              <h2 className="text-2xl font-bold text-white mb-2">Login to D.R.E.A.M. Studio</h2>
              <p className="text-zinc-400 mb-8">A D.R.E.A.M. Gigafactory Corp. Product</p>
              <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-700/80 rounded-full p-2 backdrop-blur-md shadow-2xl">
              <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="flex-1 bg-transparent text-white placeholder-zinc-500 px-4 py-2 outline-none font-kido"
              />
              <div className="w-px h-6 bg-zinc-700"></div>
              <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 bg-transparent text-white placeholder-zinc-500 px-4 py-2 outline-none font-kido"
              />
              <button
                  type="submit"
                  disabled={!username || !password}
                  className="bg-white text-black rounded-full p-3 hover:bg-zinc-200 transition-colors disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed"
              >
                  <ArrowRight className="w-5 h-5" />
              </button>
              </form>
              {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
              <div className="mt-6 space-y-2">
                <p className="text-zinc-400 text-sm">
                    Don't have an account?{' '}
                    <Link to="/about" className="font-semibold text-white hover:underline">
                        Request Access
                    </Link>
                </p>
                <p className="text-yellow-600 text-xs font-kido tracking-wide pt-2">
                    prototype product
                </p>
              </div>
          </div>
      </main>

      <section className="py-20 bg-zinc-900">
          <div className="max-w-5xl mx-auto px-6 text-center mb-16">
              <h2 className="text-2xl font-bold text-white">We created D.R.E.A.M. Gigafactory Corp. to be the cohesive force for US Industrial Base.</h2>
              <p className="mt-4 text-lg text-zinc-400">Our B2B Marketplaces provide innovative solutions to create an inter-connected trusted ecosystem.</p>
          </div>
      </section>
    </>
  );
};

export default LoginPage;