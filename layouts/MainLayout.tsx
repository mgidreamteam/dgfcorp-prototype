import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { BookOpen, LayoutGrid, Globe, Shield, LogOut, Rocket, Layers, User, Factory, Box, PenTool, Cpu } from 'lucide-react';
import UserManual from '../components/UserManual';
import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../services/firebase';

const MainLayout: React.FC = () => {
    const { profile, logout } = useAuth();
    const { dashboardTheme, setDashboardTheme } = useTheme();
    const [isManualOpen, setIsManualOpen] = useState(false);
    const [cloudStorageUsed, setCloudStorageUsed] = useState(0);
    
    useEffect(() => {
        const fetchQuota = async () => {
            if (!auth.currentUser) return;
            try {
                const snap = await getDocs(collection(db, `users/${auth.currentUser.uid}/cloudProjects`));
                let total = 0;
                snap.forEach(doc => { total += doc.data().sizeBytes || 0; });
                setCloudStorageUsed(total);
            } catch (err) {}
        };
        fetchQuota();

        window.addEventListener('update-cloud-quota', fetchQuota);
        return () => window.removeEventListener('update-cloud-quota', fetchQuota);
    }, [auth.currentUser]);

    const location = useLocation();
    const match = location.pathname.match(/\/(?:studio|prostudio|studiosim|worldsim|worldsim3d|fabflow)\/([^/]+)/);
    const activeId = match ? match[1] : localStorage.getItem('lastActiveStudioProjectId');
    const suffix = activeId ? `/${activeId}` : '';
    const cumulativeTokens = profile?.cumulativeTokens || 0;

    return (
        <div className="h-screen w-screen flex flex-col main-layout">
            <header className="w-full px-8 py-4 flex justify-between items-center bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-800 shrink-0 z-10">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <span className="text-xl font-medium text-white tracking-wider font-kido">D.R.E.A.M.</span>
                    </div>
                     <nav className="flex items-center gap-2">
                        <NavLink
                            to="/dashboard"
                            className={({ isActive }) =>
                                `px-3 py-2 rounded-md flex items-center gap-2 transition-all text-sm font-medium ${
                                isActive
                                    ? 'bg-white/10 text-white'
                                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                }`
                            }
                        >
                            <LayoutGrid className="w-4 h-4 shrink-0" />
                            <span className="hidden xl:inline">Dashboard</span>
                        </NavLink>
                        <NavLink
                            to={`/studio${suffix}`}
                            className={({ isActive }) =>
                                `px-3 py-2 rounded-md flex items-center gap-2 transition-all text-sm font-medium ${
                                isActive
                                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                                    : 'text-purple-500/70 hover:bg-zinc-800 hover:text-purple-400'
                                }`
                            }
                        >
                            <PenTool className="w-4 h-4 shrink-0" />
                            <span className="hidden xl:inline">Studio</span>
                        </NavLink>
                        <NavLink
                            to={`/prostudio${suffix}`}
                            className={({ isActive }) =>
                                `px-3 py-2 rounded-md flex items-center gap-2 transition-all text-sm font-medium ${
                                isActive
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                                    : 'text-blue-500/70 hover:bg-zinc-800 hover:text-blue-400'
                                }`
                            }
                        >
                            <Cpu className="w-4 h-4 shrink-0" />
                            <span className="hidden xl:inline">ProStudio</span>
                        </NavLink>
                        <NavLink
                            to={`/fabflow${suffix}`}
                            className={({ isActive }) =>
                                `px-3 py-2 rounded-md flex items-center gap-2 transition-all text-sm font-medium ${
                                isActive
                                    ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.3)]'
                                    : 'text-yellow-500/70 hover:bg-zinc-800 hover:text-yellow-400'
                                }`
                            }
                        >
                            <Factory className="w-4 h-4 shrink-0" />
                            <span className="hidden xl:inline">FabFlow</span>
                        </NavLink>
                        <NavLink
                            to={`/studiosim${suffix}`}
                            className={({ isActive }) =>
                                `px-3 py-2 rounded-md flex items-center gap-2 transition-all text-sm font-medium ${
                                isActive
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                                    : 'text-emerald-500/70 hover:bg-zinc-800 hover:text-emerald-400'
                                }`
                            }
                        >
                            <Box className="w-4 h-4 shrink-0" />
                            <span className="hidden xl:inline">StudioSim</span>
                        </NavLink>
                        <NavLink
                            to={`/worldsim3d${suffix}`}
                            className={({ isActive }) =>
                                `px-3 py-2 rounded-md flex items-center gap-2 transition-all text-sm font-medium ${
                                isActive
                                    ? 'bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                                    : 'text-red-500/70 hover:bg-zinc-800 hover:text-red-400'
                                }`
                            }
                        >
                            <Rocket className="w-4 h-4 shrink-0" />
                            <span className="hidden xl:inline">TacticalSim</span>
                        </NavLink>
                        <NavLink
                            to={`/worldsim${suffix}`}
                            className={({ isActive }) =>
                                `px-3 py-2 rounded-md flex items-center gap-2 transition-all text-sm font-medium ${
                                isActive
                                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                                    : 'text-cyan-500/70 hover:bg-zinc-800 hover:text-cyan-400'
                                }`
                            }
                        >
                            <Globe className="w-4 h-4 shrink-0" />
                            <span className="hidden xl:inline">WorldSim</span>
                        </NavLink>
                    </nav>
                </div>
                <div className="flex items-center">
                
                    {/* Global Quota Engine & Token Odometer */}
                    <div className="flex items-center gap-5 bg-black/40 px-5 py-2 rounded-xl border border-zinc-800/80 mr-6 shadow-inner">
                        {/* Token Metrics */}
                        <div className="flex items-center gap-3 pr-5 border-r border-zinc-800/80">
                            <Cpu className="w-6 h-6 text-purple-500/80 drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]" />
                            <div className="flex flex-col">
                                <span className="text-sm font-mono text-purple-400 font-bold leading-none tracking-tight">
                                    {cumulativeTokens.toLocaleString()}
                                </span>
                                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">TKNS</span>
                            </div>
                        </div>

                        {/* Storage Metrics Fuel Dial */}
                        <div className="flex items-center gap-3">
                            <div className="relative w-8 h-8 flex items-center justify-center">
                                {/* SVG Fuel Dial Background */}
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                    <circle cx="18" cy="18" r="16" fill="none" className="stroke-zinc-800" strokeWidth="3" strokeDasharray="75 100" />
                                    {/* Active Fuel Fill */}
                                    <circle 
                                        cx="18" 
                                        cy="18" 
                                        r="16" 
                                        fill="none" 
                                        className={cloudStorageUsed > 40000000 ? "stroke-red-500 transition-all duration-700 ease-out" : "stroke-blue-500 transition-all duration-700 ease-out"} 
                                        strokeWidth="3" 
                                        strokeDasharray={`${Math.min(75, (cloudStorageUsed / 50000000) * 75)} 100`} 
                                    />
                                </svg>
                                {/* Center Icon */}
                                <div className="absolute inset-0 flex items-center justify-center -mt-[2px] -ml-[2px]">
                                    <Globe className={`w-3 h-3 ${cloudStorageUsed > 40000000 ? 'text-red-400 animate-pulse' : 'text-blue-400'}`} />
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-mono text-zinc-300 font-bold leading-none tracking-tight">
                                    {(cloudStorageUsed / 1000000).toFixed(1)} <span className="text-[10px] text-zinc-500 font-normal">MB</span>
                                </span>
                                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">DATA</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 mr-6 border-r border-zinc-800 pr-6">
                        <button 
                            onClick={() => setDashboardTheme('dream-giga')}
                            title="DREAM Giga Theme"
                            className={`p-2 rounded-md transition-all ${dashboardTheme === 'dream-giga' ? 'bg-zinc-800 text-white shadow-inner border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <Rocket className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setDashboardTheme('blueprint')}
                            title="Blueprint Theme"
                            className={`p-2 rounded-md transition-all ${dashboardTheme === 'blueprint' ? 'bg-zinc-800 text-white shadow-inner border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <Layers className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <NavLink to="/profile" title="Profile" className={({ isActive }) => `bg-black/40 border border-zinc-800/80 shadow-inner h-[48px] w-[48px] rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-zinc-800 border-zinc-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}>
                            <User className="w-5 h-5" />
                        </NavLink>
                        <button onClick={() => setIsManualOpen(true)} title="User Manual" className="bg-black/40 border border-zinc-800/80 shadow-inner h-[48px] w-[48px] rounded-xl flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all">
                            <BookOpen className="w-5 h-5" />
                        </button>
                        <button onClick={logout} title="Log Out" className="bg-black/40 border border-zinc-800/80 shadow-inner h-[48px] w-[48px] rounded-xl flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>
            
            <div className="flex-1 min-h-0">
                <Outlet />
            </div>

            {isManualOpen && <UserManual onClose={() => setIsManualOpen(false)} />}
        </div>
    );
};

export default MainLayout;