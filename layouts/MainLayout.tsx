import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { BookOpen, LayoutGrid, Globe, Shield, LogOut, Rocket, Layers, User, Factory, Box, PenTool } from 'lucide-react';
import UserManual from '../components/UserManual';

const MainLayout: React.FC = () => {
    const { profile, logout } = useAuth();
    const { dashboardTheme, setDashboardTheme } = useTheme();
    const [isManualOpen, setIsManualOpen] = useState(false);

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
                            <LayoutGrid className="w-4 h-4" />
                            Dashboard
                        </NavLink>
                        <NavLink
                            to="/studio"
                            className={({ isActive }) =>
                                `px-3 py-2 rounded-md flex items-center gap-2 transition-all text-sm font-medium ${
                                isActive
                                    ? 'bg-white/10 text-white'
                                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                }`
                            }
                        >
                            <PenTool className="w-4 h-4" />
                            Design
                        </NavLink>
                        <NavLink
                            to="/studiosim"
                            className={({ isActive }) =>
                                `px-3 py-2 rounded-md flex items-center gap-2 transition-all text-sm font-medium ${
                                isActive
                                    ? 'bg-white/10 text-white'
                                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                }`
                            }
                        >
                            <Box className="w-4 h-4" />
                            StudioSim
                        </NavLink>
                        <NavLink
                            to="/worldsim3d"
                            className={({ isActive }) =>
                                `px-3 py-2 rounded-md flex items-center gap-2 transition-all text-sm font-medium ${
                                isActive
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-blue-300'
                                }`
                            }
                        >
                            <Rocket className="w-4 h-4" />
                            TacticalSim
                        </NavLink>
                        <NavLink
                            to="/worldsim"
                            className={({ isActive }) =>
                                `px-3 py-2 rounded-md flex items-center gap-2 transition-all text-sm font-medium ${
                                isActive
                                    ? 'bg-white/10 text-white'
                                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                }`
                            }
                        >
                            <Globe className="w-4 h-4" />
                            WorldSim
                        </NavLink>
                        <NavLink
                            to="/productionsim"
                            className={({ isActive }) =>
                                `px-3 py-2 rounded-md flex items-center gap-2 transition-all text-sm font-medium text-yellow-500/80 ${
                                isActive
                                    ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                                    : 'hover:bg-zinc-800 hover:text-yellow-400'
                                }`
                            }
                        >
                            <Factory className="w-4 h-4" />
                            ProductionSim
                        </NavLink>
                    </nav>
                </div>
                <div className="flex items-center">
                    <div className="flex items-center gap-1 mr-6 border-r border-zinc-800 pr-6">
                        <button 
                            onClick={() => setDashboardTheme('dream-giga')}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${dashboardTheme === 'dream-giga' ? 'bg-zinc-800 text-white shadow-inner border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <Rocket className="w-3 h-3" /> DREAM Giga
                        </button>
                        <button 
                            onClick={() => setDashboardTheme('blueprint')}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${dashboardTheme === 'blueprint' ? 'bg-zinc-800 text-white shadow-inner border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <Layers className="w-3 h-3" /> Blueprint
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