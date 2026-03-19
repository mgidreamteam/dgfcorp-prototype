import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, LayoutGrid, Globe } from 'lucide-react';
import UserManual from '../components/UserManual';

const MainLayout: React.FC = () => {
    const { logout } = useAuth();
    const [isManualOpen, setIsManualOpen] = useState(false);

    return (
        <div className="h-screen w-screen flex flex-col bg-zinc-900 main-layout">
            <header className="w-full px-8 py-4 flex justify-between items-center bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-800 shrink-0 z-10">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <span className="text-xl font-medium text-white tracking-wider font-kido">D.R.E.A.M.</span>
                    </div>
                     <nav className="flex items-center gap-2">
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
                            <LayoutGrid className="w-4 h-4" />
                            Studio
                        </NavLink>
                        <NavLink
                            to="/gigafactory"
                            className={({ isActive }) =>
                                `px-3 py-2 rounded-md flex items-center gap-2 transition-all text-sm font-medium ${
                                isActive
                                    ? 'bg-white/10 text-white'
                                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                }`
                            }
                        >
                            <Globe className="w-4 h-4" />
                            Virtual Gigafactory
                        </NavLink>
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsManualOpen(true)} className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2 text-sm">
                        <BookOpen className="w-4 h-4" />
                        User Manual
                    </button>
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