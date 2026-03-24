import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LogIn } from 'lucide-react';

const PublicLayout: React.FC = () => {
    const location = useLocation();
    const isLoginPage = location.pathname === '/login';
    
    return (
        <div className="h-screen flex flex-col">
            <header className="shrink-0 top-0 z-20 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800">
                <nav className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <NavLink to="/login" className="cursor-pointer">
                            <span className="text-xl font-medium text-white tracking-wider">D.R.E.A.M.</span>
                        </NavLink>
                        <div className="hidden md:flex items-center gap-6 border-l border-zinc-700 ml-2 pl-6">
                            <NavLink to="/about" className={({isActive}) => `flex items-center gap-2 transition-colors ${isActive ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>
                                <img src="/Icons/AboutUs.png" alt="Leadership Icon" className="h-5" />
                                <span className="text-sm font-medium">Leadership</span>
                            </NavLink>
                            <NavLink to="/innovation" className={({isActive}) => `flex items-center gap-2 transition-colors ${isActive ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>
                                <img src="/Icons/Innovation.png" alt="Innovation Icon" className="h-5" />
                                <span className="text-sm font-medium">Innovation</span>
                            </NavLink>
                        </div>
                    </div>
                    {!isLoginPage && (
                        <NavLink 
                            to="/login" 
                            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                        >
                            <LogIn className="w-4 h-4" />
                            <span className="text-sm font-medium">Login</span>
                        </NavLink>
                    )}
                </nav>
            </header>
            
            <main className="flex-1 overflow-y-auto">
                <Outlet />
            </main>

            <footer className="py-6 bg-zinc-950 shrink-0">
                <div className="max-w-7xl mx-auto px-6 text-center text-zinc-500 text-sm">
                    <div className="flex justify-center items-center gap-6 mb-4 font-medium tracking-wider">
                        <NavLink to="/about" className="hover:text-white transition-colors">
                            CONTACT US
                        </NavLink>
                        <div className="h-4 w-px bg-zinc-700"></div>
                        <a href="https://www.linkedin.com/in/vbsundaresan/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                            LINKEDIN
                        </a>
                    </div>
                    &copy; {new Date().getFullYear()} D.R.E.A.M. Gigafactory Corp. All Rights Reserved.
                </div>
            </footer>
        </div>
    );
};

export default PublicLayout;