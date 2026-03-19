import React, { useState } from 'react';
import GigafactorySidebar from '../components/GigafactorySidebar';
import DWeb from '../components/DWeb';
import { GigafactoryFilter } from '../types';

const GigafactoryPage: React.FC = () => {
    const [gigafactoryFilter, setGigafactoryFilter] = useState<GigafactoryFilter>({ component: null, services: null });
    
    return (
        <div className="h-full grid grid-cols-[256px_1fr]">
            <GigafactorySidebar
                onFilterChange={setGigafactoryFilter}
                activeFilter={gigafactoryFilter}
            />
            <main className="flex flex-col h-full overflow-hidden">
                <div className="flex-1 w-full overflow-y-auto">
                    <DWeb filter={gigafactoryFilter} />
                </div>
            </main>
        </div>
    );
};

export default GigafactoryPage;