import React, { useState } from 'react';
import { ChevronDown, ChevronRight, HardHat, Cog, CircuitBoard, Building, Wrench, Users, Shapes, Package } from 'lucide-react';
import { GigafactoryFilter, ComponentCategory, ServiceType } from '../types';

interface GigafactorySidebarProps {
  onFilterChange: (filter: GigafactoryFilter) => void;
  activeFilter: GigafactoryFilter;
}

const componentMap: { name: string, icon: React.ElementType, category: ComponentCategory }[] = [
    { name: 'Structural', icon: HardHat, category: 'Structural' },
    { name: 'Motion', icon: Cog, category: 'Motion' },
    { name: 'Electronic', icon: CircuitBoard, category: 'Electronic' }
];

const mainCategories = [
    { 
        name: 'Manufacturing Services', 
        id: 'services', 
        icon: Wrench,
        services: ['Fabricator', 'Integrator'] as ServiceType[]
    },
    {
        name: 'Component Suppliers',
        id: 'suppliers',
        icon: Package,
        services: ['Vendor'] as ServiceType[]
    }
];

const GigafactorySidebar: React.FC<GigafactorySidebarProps> = ({ onFilterChange, activeFilter }) => {
  const [expanded, setExpanded] = useState<string | null>('services');

  const toggleCategory = (name: string) => {
    setExpanded(expanded === name ? null : name);
  };

  const isSubcategoryActive = (services: ServiceType[], component: ComponentCategory) => {
      if (!activeFilter.services || activeFilter.services.length !== services.length) return false;
      const servicesMatch = activeFilter.services.every(s => services.includes(s));
      const componentMatch = activeFilter.component === component;
      return servicesMatch && componentMatch;
  }

  return (
    <div className="w-64 bg-zinc-900 border-r border-zinc-800 h-full flex flex-col shrink-0">
      <div className="flex items-center justify-between px-4 mb-2 mt-4">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Categories</h2>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        <button 
          onClick={() => onFilterChange({ component: null, services: null })}
          className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
            !activeFilter.component && !activeFilter.services
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
          }`}
        >
          <Shapes className="w-4 h-4" />
          All Manufacturers
        </button>

        {mainCategories.map(mainCat => (
          <div key={mainCat.id}>
            <button 
              onClick={() => toggleCategory(mainCat.id)}
              className="w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800/50 rounded-md transition-colors"
            >
              <div className="flex items-center gap-3">
                <mainCat.icon className="w-4 h-4" />
                <span>{mainCat.name}</span>
              </div>
              {expanded === mainCat.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            
            {expanded === mainCat.id && (
              <div className="pl-4 mt-1 space-y-1">
                {componentMap.map(comp => (
                  <button
                    key={comp.category}
                    onClick={() => onFilterChange({ component: comp.category, services: mainCat.services })}
                     className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                        isSubcategoryActive(mainCat.services, comp.category)
                        ? 'bg-zinc-700 text-white'
                        : 'text-zinc-400 hover:bg-zinc-700/50 hover:text-white'
                    }`}
                  >
                    <comp.icon className="w-4 h-4" />
                    {comp.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="p-4 border-t border-zinc-800 text-xs text-zinc-500">
        <p>A Materiel Group Inc., Product</p>
      </div>
    </div>
  );
};

export default GigafactorySidebar;