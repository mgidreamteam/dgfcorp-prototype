import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Database, Factory, Trash2, Search, Edit2, Plus, ArrowLeft, Filter } from 'lucide-react';
import { Vendor } from '../types';
import ThemePanel from '../components/ThemePanel';
import { useNavigate } from 'react-router-dom';

const VendorAdminPage: React.FC = () => {
    const navigate = useNavigate();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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

    const filteredVendors = vendors.filter(v => {
        const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              v.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory ? v.category === selectedCategory : true;
        return matchesSearch && matchesCategory;
    });

    const categories = Array.from(new Set(vendors.map(v => v.category))).sort();

    return (
        <div className="min-h-full p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
                <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6 text-detail uppercase tracking-widest"><ArrowLeft className="w-4 h-4" /> Return to Dashboard</button>
                {/* Header Sequence */}
                <div className="mb-8 border-b border-zinc-800 pb-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h1 className="text-heading font-normal text-white uppercase tracking-tighter flex items-center gap-3">
                            <Factory className="w-8 h-8 text-blue-500" />
                            Virtual Gigafactory Admin
                        </h1>
                        <p className="text-zinc-400 mt-2 text-body max-w-2xl leading-relaxed">
                            Administering the cloud gigafactory database setup. Monitor global capacities, update active Manufacturer capabilities, or trigger emergency payload operations.
                        </p>
                    </div>
                    {/* Live Network Metrics Block */}
                    <ThemePanel translucent interactive={false} className="flex items-center gap-6 p-4 shadow-xl shrink-0 min-w-[180px]">
                        <div className="text-center w-full">
                            <div className="text-micro font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1.5">
                                <Database className="w-3 h-3" /> Live Records
                            </div>
                            <div className="text-heading font-normal text-white">{loading ? '...' : vendors.length}</div>
                        </div>
                    </ThemePanel>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Left Array: Category Filter Sidebar */}
                    <div className="lg:col-span-1 space-y-4">
                        <ThemePanel translucent interactive={false} className="p-6 shadow-2xl flex flex-col max-h-[600px]">
                            <h3 className="text-zinc-400 font-bold uppercase tracking-wider text-subheading mb-4 flex items-center gap-2">
                                <Filter className="w-4 h-4" /> Sector Filters
                            </h3>
                            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                                <button
                                    onClick={() => setSelectedCategory(null)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-body transition-colors ${
                                        selectedCategory === null 
                                            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                                            : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white border border-transparent'
                                    }`}
                                >
                                    All Sectors
                                </button>
                                {categories.map(category => (
                                    <button
                                        key={category}
                                        onClick={() => setSelectedCategory(category)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-body transition-colors ${
                                            selectedCategory === category 
                                                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                                                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white border border-transparent'
                                        }`}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>
                        </ThemePanel>
                    </div>

                    {/* Right Array: Central CRUD Grid */}
                    <ThemePanel translucent interactive={false} className="lg:col-span-3 overflow-hidden flex flex-col h-[600px] shadow-2xl">
                        <div className="p-4 border-b border-zinc-800 bg-black/40 flex flex-col sm:flex-row justify-between items-center shrink-0 gap-4">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <input
                                    type="text"
                                    placeholder="Search global manufacturers..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-black/50 border border-zinc-700 text-white text-body rounded-lg pl-9 pr-4 py-2.5 focus:ring-1 focus:ring-white focus:border-transparent outline-none transition-all placeholder-zinc-600"
                                />
                            </div>
                            <button className="w-full sm:w-auto bg-white hover:bg-zinc-200 text-black px-4 py-2.5 rounded-lg font-medium text-body flex items-center justify-center gap-2 transition-colors shrink-0">
                                <Plus className="w-4 h-4" /> Register Manufacturer
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-x-auto overflow-y-auto">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead className="bg-black/40 text-panel-label uppercase text-zinc-500 tracking-wider sticky top-0 z-10 backdrop-blur-md">
                                    <tr>
                                        <th className="px-6 py-4 font-bold">Manufacturer Profile</th>
                                        <th className="px-6 py-4 font-bold">Sector Focus</th>
                                        <th className="px-6 py-4 font-bold">Physical Geolocation</th>
                                        <th className="px-6 py-4 font-bold text-right border-l border-zinc-800/50">Overrides</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800 text-body">
                                    {filteredVendors.map((v) => (
                                        <tr key={v.id} className="hover:bg-zinc-800/40 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-white max-w-[200px] truncate" title={v.name}>{v.name}</td>
                                            <td className="px-6 py-4">
                                                <span className="bg-zinc-800 px-2.5 py-1 rounded text-detail text-zinc-300 border border-zinc-700">{v.category}</span>
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
                                <div className="p-16 text-center text-zinc-500 text-body">No results matched your search criteria cross-referenced against the active database.</div>
                            )}
                            {loading && (
                                <div className="p-16 text-center text-blue-500 text-body animate-pulse">Syncing Database Arrays against Firestore ruleset...</div>
                            )}
                        </div>
                    </ThemePanel>
                </div>
            </div>
        </div>
    );
};

export default VendorAdminPage;
