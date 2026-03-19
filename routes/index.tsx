import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import DashboardPage from '../pages/DashboardPage';
import UserManagementPage from '../pages/UserManagementPage';
import VendorAdminPage from '../pages/VendorAdminPage';
import StudioPage from '../pages/StudioPage';
import MainLayout from '../layouts/MainLayout';
import ProfilePage from '../pages/ProfilePage';
import AboutPage from '../pages/AboutPage';
import InnovationPage from '../pages/InnovationPage';
import WorldSimPage from '../pages/WorldSimPage';
import StudioSimPage from '../pages/StudioSimPage';
import ProductionSimPage from '../pages/ProductionSimPage';
import PublicLayout from '../layouts/PublicLayout';

const ProtectedRoute: React.FC = () => {
    const { isAuthenticated, profile, logout } = useAuth();
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    
    if (profile?.status === 'pending') {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                <div className="w-16 h-16 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-xl shadow-yellow-500/10 rounded-full flex items-center justify-center mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <h1 className="text-3xl font-bold text-white mb-4">Account Pending Approval</h1>
                <p className="text-zinc-400 max-w-md leading-relaxed">
                    Your registration has been securely submitted. A system administrator must review and approve your account before you can access the D.R.E.A.M. platform.
                </p>
                <div className="mt-8 text-zinc-500 text-sm border border-zinc-800 bg-zinc-900 rounded-lg p-4 max-w-sm">
                    Waiting for administrators <strong>vishnu@dreamgiga.ai</strong> or <strong>alan@dreamgiga.ai</strong> to clear your credentials.
                </div>
                <button 
                  onClick={() => { logout(); window.location.href = '/login'; }}
                  className="mt-12 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm uppercase tracking-widest"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                  Return to Homepage
                </button>
            </div>
        );
    }
    
    return <Outlet />;
};

const AppRouter: React.FC = () => {
    const { isAuthenticated } = useAuth();
    return (
        <Routes>
            <Route element={<PublicLayout />}>
                <Route path="/login" element={isAuthenticated ? <Navigate to="/studio" replace /> : <LoginPage />} />
                <Route path="/register" element={isAuthenticated ? <Navigate to="/studio" replace /> : <RegisterPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/innovation" element={<InnovationPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/admin/users" element={<UserManagementPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/admin/gigafactory" element={<VendorAdminPage />} />
                    <Route path="/studio" element={<StudioPage />} />
                    <Route path="/studio/:projectId" element={<StudioPage />} />
                    <Route path="/studiosim" element={<StudioSimPage />} />
                    <Route path="/worldsim" element={<WorldSimPage />} />
                    <Route path="/worldsim/:projectId" element={<WorldSimPage />} />
                    <Route path="/productionsim" element={<ProductionSimPage />} />
                </Route>
            </Route>

            <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
        </Routes>
    );
};

export default AppRouter;