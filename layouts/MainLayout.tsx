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
    }, [auth.currentUser]);

    const location = useLocation();
    const match = location.pathname.match(/\/(?:studio|studiosim|worldsim|worldsim3d|productionsim)\/([^/]+)/);
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
                                    ? 'bg-white/10 text-white'
                                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                }`
                            }
                        >
                            <PenTool className="w-4 h-4 shrink-0" />
                            <span className="hidden xl:inline">Design</span>
                        </NavLink>
                        <NavLink
                            to={`/productionsim${suffix}`}
                            className={({ isActive }) =>
                                `px-3 py-2 rounded-md flex items-center gap-2 transition-all text-sm font-medium text-yellow-500/80 ${
                                isActive
                                    ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                                    : 'hover:bg-zinc-800 hover:text-yellow-400'
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
                                    ? 'bg-white/10 text-white'
                                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
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
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-blue-300'
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
                                    ? 'bg-white/10 text-white'
                                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
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

                    <div className="flex items-center gap-4">
                    <NavLink to="/profile" className={({ isActive }) => `text-zinc-400 hover:text-white transition-colors flex items-center gap-2 text-sm ${isActive ? 'text-white font-medium' : ''}`}>
                        <User className="w-4 h-4" />
                        Profile
                    </NavLink>
                    <button onClick={() => setIsManualOpen(true)} className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2 text-sm">
                        <BookOpen className="w-4 h-4" />
                        User Manual
                    </button>
                    <button onClick={logout} className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2 text-sm ml-4">
                        <LogOut className="w-4 h-4" />
                        Log Out
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