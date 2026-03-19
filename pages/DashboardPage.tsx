import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LayoutGrid, Wrench, Settings, Users, Server, Shield, Inbox, FolderOpen, PlaySquare, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DashboardPage: React.FC = () => {
    const { profile } = useAuth();
    const navigate = useNavigate();

    // Reusable Panel Component
    type ThemeColor = 'blue' | 'yellow' | 'purple';

    const PanelCard = ({ title, description, icon: Icon, onClick, cta, active = true, colorTheme = 'blue' }: { title: string, description: string, icon: any, onClick: () => void, cta: string, active?: boolean, colorTheme?: ThemeColor }) => {
        const themeMap = {
            blue: {
                border: 'hover:border-blue-500/50',
                bg: 'hover:bg-blue-900/10',
                iconBg: `bg-blue-500/10 ${active ? 'group-hover:bg-blue-500/20' : 'bg-zinc-800'}`,
                iconText: active ? 'text-blue-500' : 'text-white',
                cta: `text-blue-500/70 ${active ? 'group-hover:text-blue-400' : 'text-zinc-500'}`
            },
            yellow: {
                border: 'hover:border-yellow-500/50',
                bg: 'hover:bg-yellow-900/10',
                iconBg: `bg-yellow-500/10 ${active ? 'group-hover:bg-yellow-500/20' : 'bg-zinc-800'}`,
                iconText: active ? 'text-yellow-500' : 'text-white',
                cta: `text-yellow-500/70 ${active ? 'group-hover:text-yellow-400' : 'text-zinc-500'}`
            },
            purple: {
                border: 'hover:border-purple-500/50',
                bg: 'hover:bg-purple-900/10',
                iconBg: `bg-purple-500/10 ${active ? 'group-hover:bg-purple-500/20' : 'bg-zinc-800'}`,
                iconText: active ? 'text-purple-500' : 'text-white',
                cta: `text-purple-500/70 ${active ? 'group-hover:text-purple-400' : 'text-zinc-500'}`
            }
        };

        const theme = themeMap[colorTheme];

        return (
            <div 
                onClick={active ? onClick : undefined}
                className={`bg-black/40 border border-zinc-800 rounded-xl p-6 transition-all flex flex-col justify-between ${
                    active 
                        ? `${theme.bg} ${theme.border} cursor-pointer group` 
                        : 'opacity-50 cursor-not-allowed grayscale'
                }`}
            >
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`p-3 rounded-lg transition-colors ${theme.iconBg}`}>
                            <Icon className={`w-6 h-6 ${theme.iconText}`} />
                        </div>
                        <h3 className="text-lg font-bold text-white tracking-wide">{title}</h3>
                    </div>
                    <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                        {description}
                    </p>
                </div>
                <div className="mt-auto">
                    <span className={`font-medium text-xs uppercase tracking-wider transition-colors ${theme.cta}`}>
                        {cta} {active ? '\u2192' : ''}
                    </span>
                </div>
            </div>
        );
    };

    const renderUserPanels = () => (
        <>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Creator Dashboard</h2>
                    <p className="text-zinc-400 mt-1">Manage your active projects and manufacturing requests.</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <PanelCard 
                    title="My Studio Projects" 
                    description="Access D.R.E.A.M. to automatically generate new mechanical and electrical hardware designs, or resume an existing project."
                    icon={LayoutGrid}
                    onClick={() => navigate('/studio')}
                    cta="Open Studio"
                />
                <PanelCard 
                    title="Manufacturing Bids" 
                    description="Track price quotes and Request-For-Quotes (RFQs) that you have submitted to authorized Service Providers."
                    icon={Inbox}
                    onClick={() => {}}
                    cta="View Bids"
                    active={false}
                />
                <PanelCard 
                    title="Saved Asset Library" 
                    description="Browse and retrieve your generated CAD models, STL files, and PCB layouts without opening the entire Studio."
                    icon={FolderOpen}
                    onClick={() => {}}
                    cta="Browse Library"
                    active={false}
                />
            </div>
        </>
    );

    const renderServiceProviderPanels = () => (
        <>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Manufacturer Dashboard</h2>
                    <p className="text-zinc-400 mt-1">Review incoming RFQs and manage active fulfillment contracts.</p>
                </div>
                <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    Service Provider Status Active
                </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <PanelCard 
                    title="Incoming RFQs" 
                    description="Review manufacturing requests from users needing 3D printing, CNC machining, or PCB fabrication based on their generated designs."
                    icon={Inbox}
                    onClick={() => {}}
                    cta="View Requests"
                    active={false}
                    colorTheme="yellow"
                />
                <PanelCard 
                    title="Active Fulfillment Contracts" 
                    description="Track the status of hardware projects you have committed to manufacturing. Update shipping logs and milestones."
                    icon={PlaySquare}
                    onClick={() => {}}
                    cta="Manage Contracts"
                    active={false}
                    colorTheme="yellow"
                />
                <PanelCard 
                    title="Factory Capabilities" 
                    description="Configure your machinery capabilities to allow the D.R.E.A.M. matchmaking algorithm to route appropriate files to your inbox."
                    icon={Wrench}
                    onClick={() => {}}
                    cta="Edit Profile"
                    active={false}
                    colorTheme="yellow"
                />
            </div>
        </>
    );

    const renderAdminPanels = () => (
        <>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">System Operations</h2>
                    <p className="text-zinc-400 mt-1">Global administrative controls and platform health metrics.</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <PanelCard 
                    title="Platform Health & Metrics" 
                    description="Real-time monitoring of AI Agent API usage, generation latency, and overall server loads across all user sessions."
                    icon={Server}
                    onClick={() => {}}
                    cta="View Metrics"
                    active={false}
                    colorTheme="purple"
                />
                <PanelCard 
                    title="User Management" 
                    description="Review registered accounts, upgrade user roles to 'Service Provider' or revoke administrative access."
                    icon={Users}
                    onClick={() => navigate('/admin/users')}
                    cta="Manage Accounts"
                    colorTheme="purple"
                />
                <PanelCard 
                    title="Virtual Gigafactory Admin" 
                    description="Administering the cloud gigafactory database setup."
                    icon={Database}
                    onClick={() => navigate('/admin/gigafactory')}
                    cta="Manage Records"
                    colorTheme="purple"
                />
            </div>
        </>
    );

    return (
        <div className="min-h-full p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto space-y-12">
                {/* Always render the User (Creator) panels as the base */}
                <section>
                    {renderUserPanels()}
                </section>

                {/* Render Manufacturer panels if Service Provider or Admin */}
                {(profile?.role === 'serviceProvider' || profile?.role === 'admin') && (
                    <section className="pt-8 border-t border-zinc-800">
                        {renderServiceProviderPanels()}
                    </section>
                )}

                {/* Render Admin panels strictly for Admins */}
                {profile?.role === 'admin' && (
                    <section className="pt-8 border-t border-zinc-800">
                        {renderAdminPanels()}
                    </section>
                )}
            </div>
        </div>
    );
};

export default DashboardPage;
