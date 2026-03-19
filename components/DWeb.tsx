import React, { useState, useMemo, useEffect } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Search, MapPin, Award, Clock, Package, Star, ShieldCheck, Globe, ArrowLeft, ExternalLink, CheckCircle, Plus, X, LayoutGrid, List } from 'lucide-react';
import { VendorCategory, Vendor, ComponentCategory, ServiceType, GigafactoryFilter } from '../types';

const AddVendorModal: React.FC<{ onClose: () => void; onAddVendor: (vendor: Vendor) => void; categories: VendorCategory[] }> = ({ onClose, onAddVendor, categories }) => {
    const [formData, setFormData] = useState<Partial<Vendor>>({
        name: '',
        category: categories[0],
        componentCategory: ['Structural'],
        serviceType: 'Fabricator',
        location: '',
        description: '',
        moq: '',
        leadTime: '',
        certifications: [],
        rating: 4.5,
        verified: false,
        capabilities: []
    });

    const componentCategories: ComponentCategory[] = ['Structural', 'Motion', 'Electronic'];
    const serviceTypes: ServiceType[] = ['Vendor', 'Fabricator', 'Integrator'];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
             setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else if (type === 'number') {
            setFormData(prev => ({ ...prev, [name]: parseFloat(value) }));
        } else if (name === 'componentCategory') {
            setFormData(prev => ({...prev, componentCategory: [value as ComponentCategory] }));
        }
        else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newVendor: Vendor = {
            id: `temp-${Date.now()}`,
            ...formData,
            certifications: typeof formData.certifications === 'string' ? (formData.certifications as string).split(',').map(s => s.trim()).filter(Boolean) : (formData.certifications || []),
            capabilities: typeof formData.capabilities === 'string' ? (formData.capabilities as string).split(',').map(s => s.trim()).filter(Boolean) : (formData.capabilities || []),
        } as Vendor;
        onAddVendor(newVendor);
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Add New Manufacturer</h2>
                     <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-800"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input name="name" placeholder="Vendor Name" onChange={handleChange} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2" required />
                        <select name="category" onChange={handleChange} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2">
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select name="componentCategory" onChange={handleChange} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2">
                            {componentCategories.map(c => <option key={c} value={c}>{c} Components</option>)}
                        </select>
                        <select name="serviceType" onChange={handleChange} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2">
                            {serviceTypes.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <input name="location" placeholder="Location (e.g., City, State, USA)" onChange={handleChange} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2" required />
                    <textarea name="description" placeholder="Description" onChange={handleChange} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2" required />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input name="moq" placeholder="MOQ (e.g., 100 units)" onChange={handleChange} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2" />
                        <input name="leadTime" placeholder="Lead Time (e.g., 2-4 weeks)" onChange={handleChange} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2" />
                    </div>
                    <input name="capabilities" placeholder="Capabilities (comma-separated)" onChange={handleChange} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2" />
                    <input name="certifications" placeholder="Certifications (comma-separated)" onChange={handleChange} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2" />
                     <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <label>Rating:</label>
                            <input type="number" name="rating" min="1" max="5" step="0.1" defaultValue="4.5" onChange={handleChange} className="w-24 bg-zinc-800 border border-zinc-700 rounded-lg p-2" />
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="verified" name="verified" onChange={handleChange} className="w-4 h-4" />
                            <label htmlFor="verified">Verified Partner</label>
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white px-4 py-2">Cancel</button>
                        <button type="submit" className="bg-white text-black font-bold px-6 py-2 rounded-lg hover:bg-zinc-200">Add Vendor</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const DWeb: React.FC<{ filter: GigafactoryFilter }> = ({ filter }) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const categories: VendorCategory[] = ['Injection Molding', 'PCB & Electronics', 'CNC Machining', '3D Printing', 'Assembly', 'Materials'];

  useEffect(() => {
      const fetchVendors = async () => {
          try {
              const snap = await getDocs(collection(db, 'vendors'));
              const liveVendors = snap.docs.map(d => d.data() as Vendor);
              setVendors(liveVendors);
          } catch (err) {
              console.error(err);
          } finally {
              setLoading(false);
          }
      };
      fetchVendors();
  }, []);

  const handleAddVendor = async (vendor: Vendor) => {
    try {
        await setDoc(doc(db, 'vendors', vendor.id), vendor);
        setVendors(prev => [vendor, ...prev]);
        setIsAddModalOpen(false);
    } catch (err) {
        console.error("Failed to inject vendor object", err);
        alert("Permission Denied: Must be an Administrator.");
    }
  };

  const filteredVendors = useMemo(() => {
    return vendors.filter(vendor => {
      const matchesSearch = vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            vendor.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            vendor.capabilities.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const { component, services } = filter;
      const matchesComponent = !component || vendor.componentCategory.includes(component);
      const matchesService = !services || services.includes(vendor.serviceType);
      const matchesFilter = matchesComponent && matchesService;

      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, filter, vendors]);

  if (selectedVendor) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-8 animate-fade-in">
        <button 
          onClick={() => setSelectedVendor(null)}
          className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Directory
        </button>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-sm">
          {/* Header */}
          <div className="p-6 border-b border-zinc-800 bg-gradient-to-r from-zinc-900 to-zinc-900/50">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-white">{selectedVendor.name}</h1>
                  {selectedVendor.verified && (
                    <span title="Verified Partner" className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" /> Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-zinc-400 mt-2">
                    <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" /> {selectedVendor.location}
                    </span>
                    <span className="bg-zinc-800 px-2 py-0.5 rounded text-zinc-300 text-sm border border-zinc-700">
                      {selectedVendor.category}
                    </span>
                </div>
              </div>
              <div className="flex gap-3">
                 <button className="bg-white hover:bg-zinc-200 text-black px-6 py-3 rounded-xl font-medium shadow-lg shadow-white/10 transition-all flex items-center gap-2">
                    Request Quote
                 </button>
                 <button className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-3 rounded-xl font-medium border border-zinc-700 transition-all">
                    <ExternalLink className="w-5 h-5" />
                 </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800">
             {/* Main Content */}
             <div className="lg:col-span-2 p-6 space-y-6">
                <div>
                    <h3 className="text-lg font-semibold text-white mb-3">About</h3>
                    <p className="text-zinc-300 leading-relaxed">
                        {selectedVendor.description}
                    </p>
                </div>

                <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Production Capabilities</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {selectedVendor.capabilities.map((cap, i) => (
                            <div key={i} className="bg-zinc-800/40 border border-zinc-700/50 p-2.5 rounded-lg flex items-center gap-3">
                                <div className="bg-white/5 p-1.5 rounded text-white">
                                    <CheckCircle className="w-4 h-4" />
                                </div>
                                <span className="text-zinc-200 text-sm">{cap}</span>
                            </div>
                        ))}
                    </div>
                </div>

                 <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Certifications</h3>
                    <div className="flex flex-wrap gap-2">
                        {selectedVendor.certifications.map((cert, i) => (
                            <span key={i} className="bg-zinc-800 text-zinc-300 border border-zinc-700 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm">
                                <Award className="w-4 h-4 text-white" /> {cert}
                            </span>
                        ))}
                    </div>
                </div>
             </div>

             {/* Sidebar Stats */}
             <div className="lg:col-span-1 p-6 bg-zinc-900/30">
                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-5">Key Metrics</h3>
                
                <div className="space-y-5">
                    <div className="flex items-start gap-3">
                        <div className="bg-zinc-800 p-2 rounded-lg border border-zinc-700">
                            <Package className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="text-xs text-zinc-500 mb-0.5">Minimum Order Quantity</div>
                            <div className="text-lg font-semibold text-white">{selectedVendor.moq}</div>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="bg-zinc-800 p-2 rounded-lg border border-zinc-700">
                            <Clock className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="text-xs text-zinc-500 mb-0.5">Standard Lead Time</div>
                            <div className="text-lg font-semibold text-white">{selectedVendor.leadTime}</div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-zinc-800">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                        <h4 className="font-semibold text-zinc-200 mb-1 text-sm">VGN Partner Promise</h4>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                            All transactions through the Virtual Gigafactory are protected. Quality assurance checks are mandatory for first-time orders.
                        </p>
                    </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
        {isAddModalOpen && <AddVendorModal onClose={() => setIsAddModalOpen(false)} onAddVendor={handleAddVendor} categories={categories} />}
        <div className="max-w-7xl mx-auto px-8 py-8 animate-fade-in">
        <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/10 p-2 rounded-lg border border-white/20">
                    <Globe className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">Virtual Gigafactory</h1>
            </div>
            <p className="text-zinc-400 max-w-2xl">
              A potential list of candidates for the D.R.E.A.M. Network is listed below.
            </p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 backdrop-blur-sm">
            <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
                type="text"
                placeholder="Search suppliers, materials, or certifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/50 border border-zinc-700 text-white rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-white focus:border-transparent outline-none transition-all"
            />
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 bg-black/50 border border-zinc-700 rounded-lg p-1">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}
                        title="Grid View"
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}
                        title="List View"
                    >
                        <List className="w-4 h-4" />
                    </button>
                </div>
                <button onClick={() => setIsAddModalOpen(true)} className="bg-white text-black font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 hover:bg-zinc-200 transition-colors">
                    <Plus className="w-4 h-4" />
                    Add Manufacturer
                </button>
            </div>
        </div>

        {/* Results */}
        <div>
            {loading ? (
                <div className="py-24 text-center text-zinc-500 animate-pulse">
                    Connecting to Global Database... retrieving Manufacturer matrix.
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filteredVendors.map(vendor => (
                    <div key={vendor.id} className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-4 hover:border-white/50 transition-all hover:bg-zinc-800/60 group flex flex-col">
                        <div className="flex justify-between items-start mb-3">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                            <button 
                                onClick={() => setSelectedVendor(vendor)}
                                className="text-lg font-bold text-white hover:text-white/80 transition-colors text-left"
                            >
                                {vendor.name}
                            </button>
                            {vendor.verified && (
                                <span title="Verified Partner" className="flex items-center">
                                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                </span>
                            )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-zinc-400">
                                <span className="bg-zinc-700/50 px-2 py-0.5 rounded border border-zinc-600 text-zinc-300 text-xs font-medium">
                                    {vendor.category}
                                </span>
                                <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> {vendor.location}
                                </span>
                            </div>
                        </div>
                        </div>

                        <p className="text-zinc-300 text-sm mb-4 leading-relaxed line-clamp-2">
                        {vendor.description}
                        </p>

                        <div className="grid grid-cols-2 gap-2 mb-4 mt-auto">
                            <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800/50 flex items-center gap-2">
                                <Package className="w-4 h-4 text-zinc-500" />
                                <div className="text-xs">
                                    <span className="block text-zinc-500 uppercase tracking-wider text-[10px]">MOQ</span>
                                    <span className="text-zinc-200">{vendor.moq}</span>
                                </div>
                            </div>
                            <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800/50 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-zinc-500" />
                                <div className="text-xs">
                                    <span className="block text-zinc-500 uppercase tracking-wider text-[10px]">Lead Time</span>
                                    <span className="text-zinc-200">{vendor.leadTime}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mb-5">
                            {vendor.certifications.slice(0, 2).map((cert, i) => (
                                <span key={i} className="text-[10px] bg-white/5 text-zinc-300 border border-white/10 px-2 py-1 rounded flex items-center gap-1">
                                    <Award className="w-3 h-3" /> {cert}
                                </span>
                            ))}
                            {vendor.capabilities.slice(0, 2).map((cap, i) => (
                                <span key={`cap-${i}`} className="text-[10px] bg-zinc-700/30 text-zinc-400 border border-zinc-700 px-2 py-1 rounded">
                                    {cap}
                                </span>
                            ))}
                            {(vendor.certifications.length > 2 || vendor.capabilities.length > 2) && (
                                <span className="text-[10px] bg-zinc-800 text-zinc-500 border border-zinc-700 px-2 py-1 rounded">
                                    +{vendor.certifications.length + vendor.capabilities.length - 4} more
                                </span>
                            )}
                        </div>

                        <button 
                            onClick={() => setSelectedVendor(vendor)}
                            className="w-full bg-zinc-700 hover:bg-white hover:text-black text-white py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                        >
                            View Details
                        </button>
                    </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredVendors.map(vendor => (
                        <div key={vendor.id} className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-3 hover:border-white/50 transition-all hover:bg-zinc-800/60 group">
                            <div className="flex flex-col sm:flex-row items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <button onClick={() => setSelectedVendor(vendor)} className="text-lg font-bold text-white hover:text-white/80 transition-colors text-left">{vendor.name}</button>
                                        {vendor.verified && (
                                            <span title="Verified Partner" className="flex items-center">
                                                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-400">
                                        <span className="bg-zinc-700/50 px-2 py-0.5 rounded border border-zinc-600 text-zinc-300 text-xs font-medium">
                                            {vendor.category}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> {vendor.location}
                                        </span>
                                    </div>
                                    <p className="text-zinc-300 text-sm mt-2 leading-relaxed line-clamp-1">{vendor.description}</p>
                                </div>
                                <div className="w-full sm:w-auto flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start shrink-0 gap-3">
                                    <button 
                                        onClick={() => setSelectedVendor(vendor)}
                                        className="bg-zinc-700 hover:bg-white hover:text-black text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                                    >
                                        View Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
        </div>
    </>
  );
};

export default DWeb;