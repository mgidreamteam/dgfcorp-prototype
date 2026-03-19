import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginPage from '../pages/LoginPage';
import StudioPage from '../pages/StudioPage';
import GigafactoryPage from '../pages/GigafactoryPage';
import MainLayout from '../layouts/MainLayout';
import AboutPage from '../pages/AboutPage';
import InnovationPage from '../pages/InnovationPage';
import PublicLayout from '../layouts/PublicLayout';

const ProtectedRoute: React.FC = () => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const AppRouter: React.FC = () => {
    const { isAuthenticated } = useAuth();
    return (
        <Routes>
            <Route element={<PublicLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/innovation" element={<InnovationPage />} />
            </Route>
            
            <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                    <Route path="/studio" element={<StudioPage />} />
                    <Route path="/studio/:projectId" element={<StudioPage />} />
                    <Route path="/gigafactory" element={<GigafactoryPage />} />
                </Route>
            </Route>

            <Route path="*" element={<Navigate to={isAuthenticated ? "/studio" : "/login"} replace />} />
        </Routes>
    );
};

export default AppRouter;