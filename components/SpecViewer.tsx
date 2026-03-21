import React, { useState, useMemo } from 'react';
import { HardwareSpec, BillOfMaterialItem, Vendor, VendorCategory, SimulationData } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Factory, Ruler, Zap, Cpu, Layers, CheckCircle2, Link as LinkIcon, MapPin, Brain, Code, Activity, Clipboard, Cuboid, RefreshCw, Loader2 } from 'lucide-react';

interface SpecViewerProps {
  specs: HardwareSpec;
  vendors: Vendor[];
  simulationData: SimulationData | null;
  openScadCode: string | null;
  onRerunSimulation: (modification: string) => Promise<void>;
  hasElectronics?: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19A3'];

const BOM_TYPE_TO_VENDOR_CATEGORY: Record<string, VendorCategory> = {
    'Electronic': 'PCB & Electronics',
    'Mechanical': 'CNC Machining',
    'Casing': 'Injection Molding',
    'Enclosure': 'Injection Molding',
    'Fastener': 'Assembly',
    'Material': 'Materials'
};

const getVendorsForBom = (bom: BillOfMaterialItem[], allVendors: Vendor[]): Vendor[] => {
    const requiredCategories = new Set<VendorCategory>();
    bom.forEach(item => {
        const itemType = item.type;
        const mappedCategory = BOM_TYPE_TO_VENDOR_CATEGORY[itemType];
        if (mappedCategory) {
            requiredCategories.add(mappedCategory);
        } else if (item.type.toLowerCase().includes('electronic')) {
            requiredCategories.add('PCB & Electronics');
        } else if (item.type.toLowerCase().includes('mechanical')) {
            requiredCategories.add('CNC Machining');
        }
    });

    if (requiredCategories.size === 0) {
        requiredCategories.add('3D Printing');
        requiredCategories.add('Assembly');
    }

    return allVendors.filter(vendor => requiredCategories.has(vendor.category));
}

// Sub-components for each tab's content
const SpecsTab = React.memo(({ specs }: { specs: HardwareSpec }) => (
    <div className="grid grid-cols-1 gap-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-body font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Ruler className="w-4 h-4" /> Technical Dimensions
            </h3>
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800"><div className="text-detail text-zinc-500 mb-1">Dimensions</div><div className="text-zinc-200">{specs.dimensions}</div></div>
                <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800"><div className="text-detail text-zinc-500 mb-1">Weight</div><div className="text-zinc-200">{specs.weight}</div></div>
                <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800"><div className="text-detail text-zinc-500 mb-1">Power</div><div className="text-zinc-200 flex items-center gap-2"><Zap className="w-3 h-3 text-yellow-500" />{specs.powerSource}</div></div>
            </div>
            <div className="mt-6">
                <h4 className="text-detail font-semibold text-zinc-500 mb-2">Connectivity</h4>
                <div className="flex flex-wrap gap-2">{specs.connectivity.map((c, i) => <span key={i} className="bg-zinc-700 text-zinc-300 text-detail px-2 py-1 rounded">{c}</span>)}</div>
            </div>
        </div>
    </div>
));

const MaterialsTab = React.memo(({ specs }: { specs: HardwareSpec }) => (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-body font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Layers className="w-4 h-4" /> Material Composition</h3>
        {specs.materials && specs.materials.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={specs.materials} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="percentage" nameKey="material">
                                {specs.materials.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} itemStyle={{ color: '#f1f5f9' }} />
                            <Legend formatter={(value) => <span className="text-zinc-300">{value}</span>} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                    <table className="w-full text-body text-left text-zinc-400"><thead className="text-detail text-zinc-500 uppercase"><tr><th className="px-4 py-2">Material</th><th className="px-4 py-2 text-right">Percentage</th></tr></thead><tbody className="divide-y divide-zinc-800">{specs.materials.map((item, idx) => <tr key={idx}><td className="px-4 py-2 font-medium text-zinc-200">{item.material}</td><td className="px-4 py-2 text-right text-white/90">{item.percentage}%</td></tr>)}</tbody></table>
                </div>
            </div>
        ) : <p className="text-zinc-500 text-body">No material data available.</p>}
    </div>
));

const DetailsTab = React.memo(({ specs, suggestedVendors }: { specs: HardwareSpec, suggestedVendors: Vendor[] }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-body font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Key Features</h3>
                <ul className="space-y-3">{specs.keyFeatures.map((feature, idx) => <li key={idx} className="flex items-start gap-3 text-body text-zinc-300"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-white shrink-0" />{feature}</li>)}</ul>
            </div>
            <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-body font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Cpu className="w-4 h-4" /> Bill of Materials (Estimate)</h3>
                <div className="overflow-x-auto"><table className="w-full text-body text-left text-zinc-400"><thead className="text-detail text-zinc-500 uppercase bg-zinc-900/50"><tr><th className="px-4 py-3 rounded-l-lg">Component</th><th className="px-4 py-3">Type</th><th className="px-4 py-3 text-center">Qty</th><th className="px-4 py-3 rounded-r-lg text-right">Est. Cost</th></tr></thead><tbody className="divide-y divide-zinc-800">{specs.bom.map((item, idx) => <tr key={idx} className="hover:bg-zinc-800/30"><td className="px-4 py-3 font-medium text-zinc-200">{item.component}</td><td className="px-4 py-3">{item.type}</td><td className="px-4 py-3 text-center">{item.quantity}</td><td className="px-4 py-3 text-right text-white/90">{item.estimatedCost}</td></tr>)}</tbody></table></div>
            </div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"><h3 className="text-body font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Brain className="w-4 h-4" /> Sourcing Analysis</h3><p className="text-body text-zinc-300 leading-relaxed whitespace-pre-wrap">{specs.sourcingNotes}</p></div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-body font-bold text-zinc-400 uppercase tracking-wider mb-4">Suggested Vendors</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{suggestedVendors.map(vendor => <div key={vendor.id} className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-lg flex flex-col"><div className="flex-1"><p className="font-bold text-white">{vendor.name}</p><p className="text-detail text-zinc-400 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3"/>{vendor.location}</p><p className="text-detail bg-zinc-700/80 text-zinc-300 px-2 py-0.5 rounded-full inline-block mt-2 border border-zinc-700">{vendor.category}</p></div><button className="mt-4 w-full text-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-detail font-bold py-2 rounded-md transition-colors flex items-center justify-center gap-1.5">View Profile <LinkIcon className="w-3 h-3"/></button></div>)}</div>
        </div>
    </div>
));

const NetworkTab = React.memo(({ bomVendorMatches }: { bomVendorMatches: { bomItem: BillOfMaterialItem; bestMatch: Vendor | null; }[] }) => (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-body font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2"><LinkIcon className="w-4 h-4" /> Component-Vendor Matching</h3>
        <p className="text-zinc-400 text-body mb-6">Each component from your Bill of Materials is automatically matched with a top-rated, verified vendor from the D.R.E.A.M. Network.</p>
        <div className="overflow-x-auto"><table className="w-full text-body text-left text-zinc-400"><thead className="text-detail text-zinc-500 uppercase bg-zinc-900/50"><tr><th className="px-4 py-3 rounded-l-lg">Component</th><th className="px-4 py-3">Matched Vendor</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Lead Time</th><th className="px-4 py-3 rounded-r-lg text-center">Action</th></tr></thead><tbody className="divide-y divide-zinc-800">{bomVendorMatches.map(({ bomItem, bestMatch }, idx) => <tr key={idx} className="hover:bg-zinc-800/30"><td className="px-4 py-3 font-medium text-zinc-200"><div className="flex flex-col"><span>{bomItem.component}</span><span className="text-detail text-zinc-500"><span>{bomItem.quantity}</span>x - {bomItem.type}</span></div></td>{bestMatch ? <> <td className="px-4 py-3 font-semibold text-white">{bestMatch.name}</td> <td className="px-4 py-3">{bestMatch.location}</td> <td className="px-4 py-3">{bestMatch.leadTime}</td> <td className="px-4 py-3 text-center"><button className="bg-white/90 text-black px-3 py-1.5 rounded-md font-bold text-detail hover:bg-white flex items-center gap-1.5 mx-auto transition-colors"><Zap className="w-3 h-3" />Place Order</button></td> </> : <td colSpan={4} className="px-4 py-3 text-center text-zinc-500 italic">No suitable vendor found in network.</td>}</tr>)}</tbody></table></div>
    </div>
));

const ModelTab = React.memo(({ openScadCode }: { openScadCode: string | null }) => {
    const handleCopyCode = () => {
        if (openScadCode) {
            navigator.clipboard.writeText(openScadCode);
        }
    };
    if (!openScadCode) return <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-center text-zinc-500">OpenSCAD model not yet generated.</div>;
    return (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-body font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2"><Cuboid className="w-4 h-4" /> OpenSCAD Code</div>
                <button onClick={handleCopyCode} className="flex items-center gap-1.5 text-detail text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded-md transition-colors">
                    <Clipboard className="w-3 h-3" /> Copy
                </button>
            </h3>
            <pre className="bg-black/50 p-4 rounded-lg overflow-x-auto text-body text-zinc-300 max-h-96"><code>{openScadCode}</code></pre>
        </div>
    );
});

const SimulationTab = React.memo(({ simulationData, onRerunSimulation }: { simulationData: SimulationData | null, onRerunSimulation: (modification: string) => Promise<void> }) => {
    const [modification, setModification] = useState('');
    const [isSimulating, setIsSimulating] = useState(false);

    const handleCopyCode = () => {
        if (simulationData?.skidlCode) {
            navigator.clipboard.writeText(simulationData.skidlCode);
        }
    };

    const handleRerun = async () => {
        if (!modification.trim()) return;
        setIsSimulating(true);
        await onRerunSimulation(modification);
        setIsSimulating(false);
    };
    
    if (!simulationData) {
        return <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-center text-zinc-500">Simulation data not yet generated or not applicable.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-body font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2"><Code className="w-4 h-4" /> SKiDL Code</div>
                    <button onClick={handleCopyCode} className="flex items-center gap-1.5 text-detail text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded-md transition-colors">
                        <Clipboard className="w-3 h-3" /> Copy
                    </button>
                </h3>
                <pre className="bg-black/50 p-4 rounded-lg overflow-x-auto text-body text-zinc-300 max-h-80">
                    <code>{simulationData.skidlCode}</code>
                </pre>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                 <h3 className="text-body font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Activity className="w-4 h-4" /> NGSPICE Simulation Analysis</h3>
                 <p className="text-body text-zinc-300 leading-relaxed mb-6">{simulationData.analysis}</p>
                 <div className="h-80 mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={simulationData.plotData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                            <XAxis dataKey="time" stroke="#a1a1aa" tick={{ fontSize: 12 }} label={{ value: 'Time (ms)', position: 'insideBottom', offset: -5, fill: '#a1a1aa' }} />
                            <YAxis stroke="#a1a1aa" tick={{ fontSize: 12 }} label={{ value: 'Voltage (V)', angle: -90, position: 'insideLeft', fill: '#a1a1aa' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} itemStyle={{ color: '#f1f5f9' }} />
                            <Legend formatter={(value) => <span className="text-zinc-300">{value}</span>} />
                            <Line type="monotone" dataKey="voltage" stroke="#8884d8" strokeWidth={2} dot={false} name="Voltage" />
                        </LineChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="pt-6 border-t border-zinc-800">
                    <h4 className="text-body font-semibold text-zinc-300 mb-2">Test Circuit</h4>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={modification}
                            onChange={(e) => setModification(e.target.value)}
                            placeholder="e.g., Change R1 to 2k ohms"
                            className="flex-1 bg-zinc-800 border border-zinc-700 text-white rounded-lg p-2 focus:ring-2 focus:ring-white focus:border-transparent outline-none transition-all"
                            disabled={isSimulating}
                        />
                        <button onClick={handleRerun} disabled={!modification.trim() || isSimulating} className="bg-white/90 text-black px-4 py-2 rounded-lg font-bold text-body hover:bg-white flex items-center gap-2 disabled:bg-zinc-700 disabled:text-zinc-400 disabled:cursor-not-allowed">
                            {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            Re-simulate
                        </button>
                    </div>
                 </div>
            </div>
        </div>
    );
});

const SpecViewer: React.FC<SpecViewerProps> = ({ specs, vendors, simulationData, openScadCode, onRerunSimulation, hasElectronics = true }) => {
  type TabName = 'specs' | 'model' | 'simulation' | 'details' | 'materials' | 'network';
  const [activeTab, setActiveTab] = useState<TabName>('specs');
  
  const suggestedVendors = useMemo(() => getVendorsForBom(specs.bom, vendors), [specs.bom, vendors]);

  const bomVendorMatches = useMemo(() => {
    return specs.bom.map(item => {
        const targetCategory = BOM_TYPE_TO_VENDOR_CATEGORY[item.type];
        
        let potentialVendors = vendors.filter(vendor => {
            if (targetCategory && vendor.category === targetCategory) return true;
            if (item.type.toLowerCase().includes('electronic') && vendor.componentCategory.includes('Electronic')) return true;
            if (item.type.toLowerCase().includes('mechanical') && vendor.componentCategory.includes('Structural')) return true;
            if (item.type.toLowerCase().includes('motion') && vendor.componentCategory.includes('Motion')) return true;
            return false;
        });

        if (potentialVendors.length === 0) {
            if (item.type.toLowerCase().includes('mechanical')) {
                 potentialVendors = vendors.filter(v => v.category === 'CNC Machining' || v.category === '3D Printing');
            } else if (item.type.toLowerCase().includes('casing')) {
                 potentialVendors = vendors.filter(v => v.category === 'Injection Molding' || v.category === '3D Printing');
            }
        }
        
        potentialVendors.sort((a, b) => b.rating - a.rating);
        
        return { bomItem: item, bestMatch: potentialVendors.length > 0 ? potentialVendors[0] : null };
    });
  }, [specs.bom, vendors]);

  const TABS: TabName[] = ['specs', 'model', 'simulation', 'details', 'materials', 'network'];


  return (
    <div className="animate-fade-in">
      <div className="spec-viewer-tabs">
        <div className="border-b border-zinc-800">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            {TABS.map((tabName) => (
              <button
                key={tabName}
                onClick={() => tabName === 'simulation' && !hasElectronics ? null : setActiveTab(tabName)}
                disabled={tabName === 'simulation' && !hasElectronics}
                title={tabName === 'simulation' && !hasElectronics ? 'Not applicable for pure mechanical designs' : ''}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-body transition-colors ${
                  activeTab === tabName
                    ? 'border-white text-white'
                    : tabName === 'simulation' && !hasElectronics
                        ? 'border-transparent text-zinc-600 cursor-not-allowed'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'
                }`}
              >
                {tabName === 'simulation' ? 'Simulation' : tabName === 'model' ? '3D Model' : tabName.charAt(0).toUpperCase() + tabName.slice(1).replace('network', 'D.R.E.A.M. Network')}
              </button>
            ))}
          </nav>
        </div>
      </div>
      
      <div className="animate-fade-in mt-6 spec-tab-content-container">
        <div className={activeTab === 'specs' ? 'block' : 'hidden'}><SpecsTab specs={specs} /></div>
        <div className={activeTab === 'model' ? 'block' : 'hidden'}><ModelTab openScadCode={openScadCode} /></div>
        <div className={activeTab === 'simulation' ? 'block' : 'hidden'}><SimulationTab simulationData={simulationData} onRerunSimulation={onRerunSimulation}/></div>
        <div className={activeTab === 'details' ? 'block' : 'hidden'}><DetailsTab specs={specs} suggestedVendors={suggestedVendors} /></div>
        <div className={activeTab === 'materials' ? 'block' : 'hidden'}><MaterialsTab specs={specs} /></div>
        <div className={activeTab === 'network' ? 'block' : 'hidden'}><NetworkTab bomVendorMatches={bomVendorMatches} /></div>
      </div>
    </div>
  );
};

export default React.memo(SpecViewer);