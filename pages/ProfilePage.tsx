import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, auth } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import ThemePanel from '../components/ThemePanel';
import { User, Lock, Save, AlertTriangle, CheckCircle, ArrowLeft, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProfilePage: React.FC = () => {
    const { profile } = useAuth();
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        companyName: '',
        workgroup: '',
        phone: '',
        address: ''
    });
    
    const [passwords, setPasswords] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    const [profileStatus, setProfileStatus] = useState({ type: '', message: '' });
    const [passwordStatus, setPasswordStatus] = useState({ type: '', message: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (profile) {
            setFormData({
                name: profile.name || '',
                username: profile.username || '',
                companyName: profile.companyName || '',
                workgroup: profile.workgroup || '',
                phone: profile.phone || '',
                address: profile.address || ''
            });
        }
    }, [profile]);

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileStatus({ type: '', message: '' });
        setLoading(true);

        try {
            if (auth.currentUser) {
                await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                    name: formData.name,
                    username: formData.username,
                    companyName: formData.companyName,
                    workgroup: formData.workgroup,
                    phone: formData.phone,
                    address: formData.address
                });
                setProfileStatus({ type: 'success', message: 'Profile updated successfully. Refresh to ensure changes stick.' });
            }
        } catch (err: any) {
            console.error(err);
            setProfileStatus({ type: 'error', message: err.message || 'Failed to update profile.' });
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordStatus({ type: '', message: '' });

        if (passwords.newPassword !== passwords.confirmPassword) {
            setPasswordStatus({ type: 'error', message: 'Passwords do not match.' });
            return;
        }

        if (passwords.newPassword.length < 6) {
            setPasswordStatus({ type: 'error', message: 'Password must be at least 6 characters.' });
            return;
        }

        setLoading(true);
        try {
            if (auth.currentUser) {
                await updatePassword(auth.currentUser, passwords.newPassword);
                setPasswordStatus({ type: 'success', message: 'Password secured. You may need to log back in.' });
                setPasswords({ newPassword: '', confirmPassword: '' });
            }
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/requires-recent-login') {
                setPasswordStatus({ type: 'error', message: 'This operation requires recent authentication. Please log out and log back in to change your password.' });
            } else {
                setPasswordStatus({ type: 'error', message: err.message || 'Failed to update password.' });
            }
        } finally {
            setLoading(false);
        }
    };

    if (!profile) return null;

    return (
        <div className="min-h-full p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-8">
                 <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-2 text-detail uppercase tracking-widest"><ArrowLeft className="w-4 h-4" /> Return to Dashboard</button>
                 
                 <div className="border-b border-zinc-800 pb-6 flex items-start justify-between">
                    <div>
                        <h1 className="text-heading font-normal text-white uppercase tracking-tighter flex items-center gap-3">
                            <User className="w-8 h-8 text-blue-500" />
                            Profile Settings
                        </h1>
                        <p className="text-zinc-400 mt-2 text-body max-w-2xl leading-relaxed">
                            Manage your personal metadata and secure your credentials.
                        </p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <ThemePanel translucent interactive={false} className="p-6">
                         <h2 className="text-panel-title font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2 border-b border-zinc-800 pb-2">
                             <User className="w-5 h-5 text-zinc-500" />
                             Identity Metadata
                         </h2>

                         {profileStatus.message && (
                            <div className={`p-3 rounded-lg mb-4 text-sm flex items-center gap-2 ${profileStatus.type === 'error' ? 'bg-red-900/20 text-red-400 border border-red-500/20' : 'bg-green-900/20 text-green-400 border border-green-500/20'}`}>
                                {profileStatus.type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
                                {profileStatus.message}
                            </div>
                         )}

                         <form onSubmit={handleProfileSubmit} className="space-y-4">
                             <div>
                                 <label className="block text-zinc-500 text-detail font-bold uppercase tracking-wider mb-1">Email Address</label>
                                 <input type="email" value={profile.email} disabled className="w-full bg-black/40 border border-zinc-800 text-zinc-500 rounded-lg px-4 py-3 opacity-50 cursor-not-allowed" />
                                 <p className="text-zinc-600 text-xs mt-1">Contact your system administrator to migrate your auth bindings.</p>
                             </div>
                             <div>
                                 <label className="block text-zinc-500 text-detail font-bold uppercase tracking-wider mb-1">Full Name</label>
                                 <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-black/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-3 outline-none focus:border-white transition-colors" />
                             </div>
                             <div>
                                 <label className="block text-zinc-500 text-detail font-bold uppercase tracking-wider mb-1">Unique Username</label>
                                 <input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="w-full bg-black/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-3 outline-none focus:border-white transition-colors" />
                             </div>
                             <div>
                                 <label className="block text-zinc-500 text-detail font-bold uppercase tracking-wider mb-1">Company Name</label>
                                 <input type="text" value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} className="w-full bg-black/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-3 outline-none focus:border-white transition-colors" />
                             </div>
                             <div>
                                 <label className="block text-zinc-500 text-detail font-bold uppercase tracking-wider mb-1">DREAM Workgroup</label>
                                 <input type="text" value={formData.workgroup} onChange={e => setFormData({ ...formData, workgroup: e.target.value })} className="w-full bg-black/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-3 outline-none focus:border-white transition-colors" />
                             </div>
                             <div>
                                 <label className="block text-zinc-500 text-detail font-bold uppercase tracking-wider mb-1">Phone Number</label>
                                 <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-black/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-3 outline-none focus:border-white transition-colors" />
                             </div>
                             <div>
                                 <label className="block text-zinc-500 text-detail font-bold uppercase tracking-wider mb-1">Physical Address</label>
                                 <textarea value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full bg-black/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-3 outline-none focus:border-white transition-colors min-h-[80px]" />
                             </div>
                             <div className="flex justify-end pt-2 gap-3">
                                <button type="button" onClick={() => navigate('/dashboard')} disabled={loading} className="w-12 h-12 bg-zinc-800 text-zinc-400 rounded-full hover:bg-zinc-700 hover:text-white transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center shadow-lg" title="Discard Changes">
                                    <X className="w-5 h-5" />
                                </button>
                                <button type="submit" disabled={loading} className="w-12 h-12 bg-white text-black rounded-full hover:bg-zinc-200 transition-transform hover:scale-105 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:hover:scale-100 flex items-center justify-center shadow-lg shadow-white/10" title="Commit Metadata">
                                    {loading ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                                </button>
                             </div>
                         </form>
                     </ThemePanel>

                     <ThemePanel translucent interactive={false} className="p-6 h-fit">
                         <h2 className="text-panel-title font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2 border-b border-zinc-800 pb-2">
                             <Lock className="w-5 h-5 text-zinc-500" />
                             Authorization Layer
                         </h2>

                         {passwordStatus.message && (
                            <div className={`p-3 rounded-lg mb-4 text-sm flex items-center gap-2 ${passwordStatus.type === 'error' ? 'bg-red-900/20 text-red-400 border border-red-500/20' : 'bg-green-900/20 text-green-400 border border-green-500/20'}`}>
                                {passwordStatus.type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
                                <span className="leading-tight">{passwordStatus.message}</span>
                            </div>
                         )}

                         <form onSubmit={handlePasswordSubmit} className="space-y-4">
                             <div>
                                 <label className="block text-zinc-500 text-detail font-bold uppercase tracking-wider mb-1">New Password</label>
                                 <input type="password" value={passwords.newPassword} onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} className="w-full bg-black/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-3 outline-none focus:border-white transition-colors" />
                             </div>
                             <div>
                                 <label className="block text-zinc-500 text-detail font-bold uppercase tracking-wider mb-1">Confirm Password</label>
                                 <input type="password" value={passwords.confirmPassword} onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })} className="w-full bg-black/50 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-3 outline-none focus:border-white transition-colors" />
                             </div>
                             <div className="flex justify-end pt-2">
                                <button type="submit" disabled={loading || !passwords.newPassword} className="w-12 h-12 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center shadow-lg" title="Cycle Key">
                                    {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Lock className="w-5 h-5" />}
                                </button>
                             </div>
                         </form>
                     </ThemePanel>
                 </div>
            </div>
        </div>
    );
};

export default ProfilePage;
