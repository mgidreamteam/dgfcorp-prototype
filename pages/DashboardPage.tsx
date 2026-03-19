import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LayoutGrid, Wrench, Settings, Users, Server, Shield, Inbox, FolderOpen, PlaySquare, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ThemePanel from '../components/ThemePanel';

const DashboardPage: React.FC = () => {
    const { profile } = useAuth();
    const { dashboardTheme } = useTheme();
    const navigate = useNavigate();

    type ThemeColor = 'blue' | 'yellow' | 'purple';

    const PanelCard = ({ title, description, icon: Icon, onClick, cta, active = true, colorTheme = 'blue' }: { title: string, description: string, icon: any, onClick: () => void, cta: string, active?: boolean, colorTheme?: ThemeColor }) => {
        const ctaMap = {
            blue: 'bg-blue-600 group-hover:bg-blue-500',
            yellow: 'bg-yellow-600 group-hover:bg-yellow-500',
            purple: 'bg-purple-600 group-hover:bg-purple-500'
        };

        return (
            <ThemePanel 
                interactive={active} 
                colorTheme={colorTheme} 
                onClick={onClick}
                className={`p-3 flex flex-col justify-between min-h-[160px] ${!active ? 'opacity-40 cursor-not-allowed grayscale' : ''}`}
            >
                {dashboardTheme === 'dream-giga' ? (
                    <>
                        <div>
                            <div className="flex items-start justify-between mb-3">
                                <h3 className="text-panel-title font-normal text-white uppercase tracking-tighter leading-none w-3/4">{title}</h3>
                                <Icon className={`w-5 h-5 ${active ? 'text-zinc-300' : 'text-zinc-700'}`} />
                            </div>
                            <p className="text-zinc-500 text-detail font-normal leading-relaxed mb-4">{description}</p>
                        </div>
                        <div className="mt-auto flex justify-end">
                            <span className={`px-4 py-2 text-micro font-normal uppercase tracking-widest ${active ? `${ctaMap[colorTheme]} text-white` : 'bg-zinc-900 text-zinc-700'} transition-colors`}>
                                {cta}
                            </span>
                        </div>
                    </>
                ) : (
                    <>
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-1.5 border border-zinc-700 group-hover:border-[#00ffcc]/50 transition-colors">
                                    <Icon className={`w-4 h-4 ${active ? 'text-[#00ffcc]' : 'text-zinc-600'}`} />
                                </div>
                                <h3 className="text-panel-title font-mono text-zinc-300 uppercase tracking-widest group-hover:text-white transition-colors">{title}</h3>
                            </div>
                            <p className="text-zinc-500 font-mono text-detail uppercase tracking-wide leading-relaxed mb-4">{description}</p>
                        </div>
                        <div className="mt-auto">
                            <span className={`font-mono text-micro items-center flex gap-2 uppercase tracking-[0.2em] font-normal ${active ? 'text-[#00ffcc] group-hover:text-white' : 'text-zinc-600'}`}>
                                [{cta}] <span className="text-[#00ffcc] opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                            </span>
                        </div>
                    </>
                )}
            </ThemePanel>
        );
    };

    const SectionHeader = ({ title, subtitle, status }: { title: string, subtitle: string, status?: string }) => {
        if (dashboardTheme === 'dream-giga') {
            return (
                <div className="mb-3 flex items-end justify-between border-b border-zinc-800 pb-2">
                    <div>
                        <h2 className="text-heading font-normal text-white uppercase tracking-tighter">{title}</h2>
                        <p className="text-zinc-500 font-normal uppercase tracking-widest text-subheading mt-1">{subtitle}</p>
                    </div>
                    {status && (
                        <span className="bg-white text-black px-2 py-0.5 text-micro font-normal uppercase tracking-widest">{status}</span>
                    )}
                </div>
            );
        } else {
            return (
                <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-[1px] bg-[#00ffcc] shadow-[0_0_8px_#00ffcc]"></div>
                        <div>
                            <h2 className="text-heading font-mono text-white uppercase tracking-[0.2em]">{title}</h2>
                            <p className="text-zinc-500 font-mono text-subheading uppercase tracking-widest mt-0.5 opacity-70">//{subtitle}</p>
                        </div>
                    </div>
                    {status && (
                        <span className="font-mono text-[#00ffcc] border border-[#00ffcc]/30 px-2 py-0.5 text-micro uppercase tracking-widest bg-[#00ffcc]/5">{status}</span>
                    )}
                </div>
            );
        }
    };

    const renderUserPanels = () => (
        <>
            <SectionHeader title="Creator Terminal" subtitle="Manage your active projects and manufacturing requests." />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <PanelCard 
                    title="Studio Canvas" 
                    description="Access D.R.E.A.M. to automatically generate new mechanical and electrical hardware designs, or resume an existing project."
                    icon={LayoutGrid}
                    onClick={() => navigate('/studio')}
                    cta="Initialize Matrix"
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
                    title="Asset Vault" 
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
            <SectionHeader title="Manufacturer Gateway" subtitle="Review incoming RFQs and manage active fulfillment contracts." status="Status: Online" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
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
                    title="Active Fulfillment" 
                    description="Track the status of hardware projects you have committed to manufacturing. Update shipping logs and milestones."
                    icon={PlaySquare}
                    onClick={() => {}}
                    cta="Manage Contracts"
                    active={false}
                    colorTheme="yellow"
                />
                <PanelCard 
                    title="Factory Configuration" 
                    description="Configure your machinery capabilities to allow the matchmaking algorithm to route appropriate files to your inbox."
                    icon={Wrench}
                    onClick={() => {}}
                    cta="Edit Parameters"
                    active={false}
                    colorTheme="yellow"
                />
            </div>
        </>
    );

    const renderAdminPanels = () => (
        <>
            <SectionHeader title="System Operations" subtitle="Global administrative controls and platform health metrics." status="Root Access" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <PanelCard 
                    title="Platform Telemetry" 
                    description="Real-time monitoring of AI Agent API usage, generation latency, and overall server loads across all user sessions."
                    icon={Server}
                    onClick={() => {}}
                    cta="View Metrics"
                    active={false}
                    colorTheme="purple"
                />
                <PanelCard 
                    title="User Administration" 
                    description="Review registered accounts, upgrade user roles to 'Service Provider' or revoke administrative access."
                    icon={Users}
                    onClick={() => navigate('/admin/users')}
                    cta="Manage Accounts"
                    colorTheme="purple"
                />
                <PanelCard 
                    title="Virtual Gigafactory" 
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
        <div 
            className={`min-h-full p-4 overflow-y-auto w-full transition-colors duration-500 relative ${dashboardTheme === 'blueprint' ? 'bg-theme-blueprint' : 'bg-theme-dream-giga'}`}
        >
            <div className={`max-w-7xl mx-auto space-y-6 relative z-10 ${dashboardTheme === 'blueprint' ? 'py-4' : 'py-2'}`}>
                <section>
                    {renderUserPanels()}
                </section>

                {(profile?.role === 'serviceProvider' || profile?.role === 'admin') && (
                    <section className={`pt-4 ${dashboardTheme === 'dream-giga' ? 'border-t-[4px] border-zinc-900' : 'border-t border-[#00ffcc]/20'}`}>
                        {renderServiceProviderPanels()}
                    </section>
                )}

                {profile?.role === 'admin' && (
                    <section className={`pt-4 ${dashboardTheme === 'dream-giga' ? 'border-t-[4px] border-zinc-900' : 'border-t border-[#00ffcc]/20'}`}>
                        {renderAdminPanels()}
                    </section>
                )}
            </div>
        </div>
    );
};

export default DashboardPage;
