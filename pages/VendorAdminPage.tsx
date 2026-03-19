import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, getDocs, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Database, UploadCloud, Factory, Trash2, Search, Edit2, Plus } from 'lucide-react';
import { Vendor } from '../types';
import { vendors as vendorsData } from '../data/vendors'; // The raw file to migrate

const VendorAdminPage: React.FC = () => {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [migrating, setMigrating] = useState(false);
    const [statusText, setStatusText] = useState('');

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'vendors'), (snap) => {
            const fetched = snap.docs.map(d => ({ ...d.data(), id: d.id } as Vendor));
            setVendors(fetched);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleDelete = async (vendor: Vendor) => {
        if (!window.confirm(`Are you absolutely sure you want to delete ${vendor.name} from the global Gigafactory?`)) return;
        try {
            await deleteDoc(doc(db, 'vendors', vendor.id));
        } catch (err) {
            console.error("Failed to delete vendor", err);
        }
    };

    const runMigration = async () => {
        if (!window.confirm(`Warning: This will cleanly inject ${vendorsData.length} static JSON records into the live production database. Proceed?`)) return;
        
        try {
            setMigrating(true);
            let successCounter = 0;
            
            for (let i = 0; i < vendorsData.length; i++) {
                const vendor = vendorsData[i];
                const docId = vendor.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                
                setStatusText(`Injecting ${vendor.name} (${i + 1}/${vendorsData.length})...`);
                await setDoc(doc(db, 'vendors', docId), {
                    ...vendor,
                    addedAt: new Date().toISOString()
                }, { merge: true });
                successCounter++;
            }

            setStatusText(`Migration Complete! Successfully injected ${successCounter} global records.`);
        } catch (err: any) {
            console.error(err);
            setStatusText(`Migration crashed: ${err.message}`);
        } finally {
            setMigrating(false);
        }
    };

    const runPurge = async () => {
        if (!window.confirm("CRITICAL WARNING: This will violently DELETE all Gigafactory records from the database! Are you absolutely sure?")) return;
        if (window.prompt("Type 'DELETE ALL' to confirm.") !== "DELETE ALL") return;
        
        try {
            setMigrating(true);
            setStatusText("Purging all records... this will crash Live visualizers actively viewing elements.");
            const snap = await getDocs(collection(db, 'vendors'));
            
            let i = 0;
            for (const document of snap.docs) {
                setStatusText(`Deleting ${document.id} (${++i}/${snap.size})...`);
                await deleteDoc(doc(db, 'vendors', document.id));
            }
            
            setStatusText("Emergency Database Purge complete.");
        } catch (err: any) {
             console.error(err);
             setStatusText(`Purge crashed: ${err.message}`);
        } finally {
            setMigrating(false);
        }
    }

    const filteredVendors = vendors.filter(v => 
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        v.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-full p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
                {/* Header Sequence */}
                <div className="mb-8 border-b border-zinc-800 pb-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Factory className="w-8 h-8 text-blue-500" />
                            Virtual Gigafactory Admin
                        </h1>
                        <p className="text-zinc-400 mt-2 text-sm max-w-2xl leading-relaxed">
                            Administering the cloud gigafactory database setup. Monitor global capacities, update active Manufacturer capabilities, or trigger emergency payload operations.
                        </p>
                    </div>
                    {/* Live Network Metrics Block */}
                    <div className="flex items-center gap-6 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 shadow-xl shrink-0 min-w-[180px]">
                        <div className="text-center w-full">
                            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1.5">
                                <Database className="w-3 h-3" /> Live Records
                            </div>
                            <div className="text-3xl font-black text-white">{loading ? '...' : vendors.length}</div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Left Array: Payload Operations Sidebar */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl">
                            <h3 className="text-zinc-400 font-bold uppercase tracking-wider text-xs mb-4">Payload Operations</h3>
                            <button 
                                onClick={runMigration}
                                disabled={migrating}
                                className="w-full bg-blue-600/20 hover:bg-blue-600/30 disabled:opacity-50 text-blue-400 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm border border-blue-500/20 mb-3"
                            >
                                {migrating ? 'Injecting Data...' : <><UploadCloud className="w-4 h-4" /> Static Payload Injection</>}
                            </button>
                            <button 
                                onClick={runPurge}
                                disabled={migrating || vendors.length === 0}
                                className="w-full bg-red-900/10 hover:bg-red-900/30 disabled:opacity-50 text-red-500 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm border border-red-500/10"
                            >
                                Emergency Purge Matrix
                            </button>
                            {statusText && (
                                <div className="mt-4 p-3 bg-black border border-zinc-800 rounded-lg text-center font-mono text-[10px] text-zinc-500 break-words">
                                    {statusText}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Array: Central CRUD Grid */}
                    <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-[600px] shadow-2xl">
                        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex flex-col sm:flex-row justify-between items-center shrink-0 gap-4">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <input
                                    type="text"
                                    placeholder="Search global manufacturers..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-black/50 border border-zinc-700 text-white text-sm rounded-lg pl-9 pr-4 py-2.5 focus:ring-1 focus:ring-white focus:border-transparent outline-none transition-all placeholder-zinc-600"
                                />
                            </div>
                            <button className="w-full sm:w-auto bg-white hover:bg-zinc-200 text-black px-4 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors shrink-0">
                                <Plus className="w-4 h-4" /> Register Manufacturer
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-x-auto overflow-y-auto">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead className="bg-black/40 text-[10px] uppercase text-zinc-500 tracking-wider sticky top-0 z-10 backdrop-blur-md">
                                    <tr>
                                        <th className="px-6 py-4 font-bold">Manufacturer Profile</th>
                                        <th className="px-6 py-4 font-bold">Sector Focus</th>
                                        <th className="px-6 py-4 font-bold">Physical Geolocation</th>
                                        <th className="px-6 py-4 font-bold text-right border-l border-zinc-800/50">Overrides</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800 text-sm">
                                    {filteredVendors.map((v) => (
                                        <tr key={v.id} className="hover:bg-zinc-800/40 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-white max-w-[200px] truncate" title={v.name}>{v.name}</td>
                                            <td className="px-6 py-4">
                                                <span className="bg-zinc-800 px-2.5 py-1 rounded text-xs text-zinc-300 border border-zinc-700">{v.category}</span>
                                            </td>
                                            <td className="px-6 py-4 text-zinc-400 max-w-[150px] truncate" title={v.location}>{v.location}</td>
                                            <td className="px-6 py-4 text-right border-l border-zinc-800/10">
                                                <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                    <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors" title="Edit Capability Architecture">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(v)} className="p-2 text-red-500/70 hover:text-red-400 hover:bg-red-900/30 rounded transition-colors" title="Delete Remote Profile">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            
                            {filteredVendors.length === 0 && !loading && (
                                <div className="p-16 text-center text-zinc-500 text-sm">No results matched your search criteria cross-referenced against the active database.</div>
                            )}
                            {loading && (
                                <div className="p-16 text-center text-blue-500 text-sm animate-pulse">Syncing Database Arrays against Firestore ruleset...</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VendorAdminPage;
