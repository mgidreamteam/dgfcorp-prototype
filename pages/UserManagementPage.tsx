import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { ShieldCheck, Users, Mail, AlertTriangle, Check, X, ArrowLeft, Ban, Trash2 } from 'lucide-react';
import ThemePanel from '../components/ThemePanel';
import { useNavigate } from 'react-router-dom';

interface ManagedUser {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    createdAt: string;
}

const UserManagementPage: React.FC = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({}); // Buffer uncommitted role edits

    const loadUsers = async () => {
        try {
            setLoading(true);
            const [usersSnap, rolesSnap] = await Promise.all([
                getDocs(collection(db, 'users')),
                getDocs(collection(db, 'authUidToRole'))
            ]);

            const rolesMap: Record<string, string[]> = {};
            rolesSnap.forEach(r => {
                rolesMap[r.id] = r.data().roles || [];
            });

            const mergedUsers: ManagedUser[] = usersSnap.docs.map(u => {
                const data = u.data();
                const roles = rolesMap[u.id] || ['user'];
                
                let activeRole = 'user';
                if (roles.includes('admin')) activeRole = 'admin';
                else if (roles.includes('serviceProvider')) activeRole = 'serviceProvider';

                return {
                    id: u.id,
                    name: data.name || 'Unknown',
                    email: data.email || 'No email',
                    role: activeRole,
                    status: data.status || 'approved',
                    createdAt: data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'N/A'
                };
            });

            setUsers(mergedUsers);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to heavily load user registry.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleRoleCommit = async (userId: string) => {
        try {
            const newRole = pendingRoles[userId];
            if (!newRole) return;

            setUpdatingId(userId);
            await setDoc(doc(db, 'authUidToRole', userId), { roles: [newRole] }, { merge: true });
            
            // Sync UI locally
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
            
            // Clear the uncommitted edit
            setPendingRoles(prev => {
                const updated = { ...prev };
                delete updated[userId];
                return updated;
            });
        } catch (err) {
            console.error(err);
            alert("Database write rejected. Make sure you are an Administrator.");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleCancelEdit = (userId: string) => {
        setPendingRoles(prev => {
            const updated = { ...prev };
            delete updated[userId];
            return updated;
        });
    };

    const handleApprove = async (userId: string) => {
        try {
            setUpdatingId(userId);
            await updateDoc(doc(db, 'users', userId), { status: 'approved' });
            // Sync locally
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'approved' } : u));
        } catch (err) {
            console.error(err);
            alert("Approval failed! Make sure you are an Administrator.");
        } finally {
            setUpdatingId(null);
        }
    }

    const handleBlockUser = async (userId: string) => {
        if (!confirm("Are you sure you want to completely block this user? They will be aggressively ejected resulting in a locked authentication chain.")) return;
        try {
            setUpdatingId(userId);
            await updateDoc(doc(db, 'users', userId), { status: 'blocked' });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'blocked' } : u));
        } catch (err) {
            console.error(err);
            alert("Matrix lock rejected. Secure Firebase rights might be restricted.");
        } finally {
            setUpdatingId(null);
        }
    }

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("DANGER: Are you absolutely certain you want to destroy this user schema? This will permanently sever their permissions, erase their internal role mappings, and lock them out identically to underlying database deletion!")) return;
        try {
            setUpdatingId(userId);
            await updateDoc(doc(db, 'users', userId), { status: 'deleted' });
            await setDoc(doc(db, 'authUidToRole', userId), { roles: [] }, { merge: false });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: 'user', status: 'deleted' } : u));
        } catch (err) {
            console.error(err);
            alert("Deletion parameters failed tracking the secure Node layer!");
        } finally {
            setUpdatingId(null);
        }
    }

    const pendingUsers = users.filter(u => u.status === 'pending');

    return (
        <div className="min-h-full p-8 overflow-y-auto">
            <div className="max-w-6xl mx-auto">
                <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6 text-detail uppercase tracking-widest"><ArrowLeft className="w-4 h-4" /> Return to Dashboard</button>
                <div className="mb-8 border-b border-zinc-800 pb-6 flex items-start justify-between">
                    <div>
                        <h1 className="text-heading font-normal text-white uppercase tracking-tighter flex items-center gap-3">
                            <ShieldCheck className="w-8 h-8 text-blue-500" />
                            User Management
                        </h1>
                        <p className="text-zinc-400 mt-2 text-body max-w-2xl leading-relaxed">
                            Configure user access levels across the D.R.E.A.M. system. Modifying a user's role 
                            will directly alter their interface options and backend resource privileges instantly on their next navigation. You can also actively approve pending new registrations from the portal.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-900/20 border-l-4 border-red-500 rounded-lg flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                        <div>
                            <h3 className="text-red-400 font-bold">Failed to load registry</h3>
                            <p className="text-red-300 text-sm mt-1">{error}</p>
                        </div>
                    </div>
                )}

                {pendingUsers.length > 0 && (
                    <div className="mb-6 p-4 bg-yellow-900/20 border-l-4 border-yellow-500 rounded-lg flex items-start gap-3 shadow-lg shadow-yellow-900/10">
                        <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
                        <div>
                            <h3 className="text-yellow-500 font-bold uppercase tracking-wider text-sm">Action Required</h3>
                            <p className="text-yellow-200/80 text-sm mt-1">There {pendingUsers.length === 1 ? 'is' : 'are'} {pendingUsers.length} pending user registration{pendingUsers.length === 1 ? '' : 's'} awaiting clearance.</p>
                        </div>
                    </div>
                )}

                <ThemePanel translucent interactive={false} className="shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-body text-zinc-400 min-w-max">
                            <thead className="bg-zinc-800/50 text-panel-label uppercase text-zinc-500 tracking-wider hidden sm:table-header-group">
                                <tr>
                                    <th scope="col" className="px-6 py-4">User Details</th>
                                    <th scope="col" className="px-6 py-4">Status & Access Level</th>
                                    <th scope="col" className="px-6 py-4">Registered Date</th>
                                    <th scope="col" className="px-6 py-4 text-right">Administrative Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                                            Scanning backend registry...
                                        </td>
                                    </tr>
                                ) : users.map(u => {
                                    const hasPendingEdit = pendingRoles[u.id] && pendingRoles[u.id] !== u.role;
                                    
                                    return (
                                    <tr key={u.id} className={`hover:bg-zinc-800/30 transition-colors flex flex-col sm:table-row ${hasPendingEdit ? 'bg-blue-900/10' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                                                    <Users className="w-5 h-5 text-zinc-500" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white text-panel-title">{u.name}</div>
                                                    <div className="flex items-center gap-1.5 text-zinc-500 text-detail mt-1">
                                                        <Mail className="w-3 h-3" />
                                                        {u.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 sm:align-middle">
                                            <div className="flex flex-col gap-2 items-start">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-micro font-bold tracking-wide uppercase border ${
                                                    u.role === 'admin' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    u.role === 'serviceProvider' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                    'bg-zinc-800 text-zinc-400 border-zinc-700'
                                                }`}>
                                                    {u.role === 'serviceProvider' ? 'Service Provider' : u.role}
                                                </span>
                                                {u.status === 'pending' && (
                                                    <span className="inline-flex items-center px-2.5 py-1 text-micro rounded-full font-bold tracking-wide uppercase border bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                                                        Pending Review
                                                    </span>
                                                )}
                                                {u.status === 'blocked' && (
                                                    <span className="inline-flex items-center px-2.5 py-1 text-micro rounded-full font-bold tracking-wide uppercase border bg-orange-500/10 text-orange-500 border-orange-500/20">
                                                        Restricted / Blocked
                                                    </span>
                                                )}
                                                {u.status === 'deleted' && (
                                                    <span className="inline-flex items-center px-2.5 py-1 text-micro rounded-full font-bold tracking-wide uppercase border bg-red-500/10 text-red-500 border-red-500/20">
                                                        Severed / Deleted
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 sm:align-middle font-medium text-zinc-500">
                                            {u.createdAt}
                                        </td>
                                        <td className="px-6 py-4 sm:align-middle text-right">
                                            <div className="flex items-center justify-end gap-3 flex-wrap">
                                                {(u.status === 'pending' || u.status === 'blocked' || u.status === 'deleted') && (
                                                    <button 
                                                        onClick={() => handleApprove(u.id)}
                                                        disabled={updatingId === u.id}
                                                        className="bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20 text-detail font-bold py-2 px-3 rounded-lg transition-colors border border-green-500"
                                                    >
                                                        {u.status === 'pending' ? 'Approve Access' : 'Restore Native Access'}
                                                    </button>
                                                )}
                                                
                                                {(u.status === 'approved' || u.status === 'pending') && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleBlockUser(u.id)}
                                                            disabled={updatingId === u.id}
                                                            className="flex items-center gap-1.5 bg-orange-950/40 hover:bg-orange-900/60 text-orange-500 text-detail font-bold py-2 px-3 rounded-lg transition-colors border border-orange-900"
                                                        >
                                                            <Ban className="w-3.5 h-3.5" /> Block
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteUser(u.id)}
                                                            disabled={updatingId === u.id}
                                                            className="flex items-center gap-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-500 text-detail font-bold py-2 px-3 rounded-lg transition-colors border border-red-900"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" /> Force Delete
                                                        </button>
                                                    </>
                                                )}
                                                
                                                <div className="flex items-center gap-2">
                                                    <select 
                                                        value={pendingRoles[u.id] || u.role}
                                                        onChange={(e) => setPendingRoles(prev => ({ ...prev, [u.id]: e.target.value }))}
                                                        disabled={updatingId === u.id}
                                                        className="bg-black border border-zinc-700 text-white text-body rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 disabled:opacity-50"
                                                    >
                                                        <option value="user">Standard User</option>
                                                        <option value="serviceProvider">Service Provider</option>
                                                        <option value="admin">Administrator</option>
                                                    </select>
                                                    
                                                    {hasPendingEdit && (
                                                        <div className="flex items-center gap-1 animate-fade-in-up">
                                                            <button 
                                                                onClick={() => handleRoleCommit(u.id)}
                                                                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                                                                title="Save Changes"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleCancelEdit(u.id)}
                                                                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition-colors border border-zinc-700 hover:border-zinc-600"
                                                                title="Cancel"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                </ThemePanel>
            </div>
        </div>
    );
};

export default UserManagementPage;
