import React from 'react';
import { RefreshCw, Activity, Bot, AlertCircle, MousePointerClick } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';

interface AgentSidebarProps {
    onSubmit: (prompt: string) => void;
    isThinking: boolean;
}

const AgentSidebar: React.FC<AgentSidebarProps> = ({ onSubmit, isThinking }) => {
    const { agentLogs } = useProject();
    const [prompt, setPrompt] = React.useState('');

    const handleSubmit = () => {
        if (!prompt.trim() || isThinking) return;
        onSubmit(prompt);
        setPrompt('');
    };

    return (
        <div className="flex flex-col h-full bg-[#000000] z-20 overflow-hidden relative border-r border-zinc-800">
            {/* Agent Input Module - Mounted at Top */}
            <div className="shrink-0 p-4 border-b border-zinc-800 bg-black/80 backdrop-blur z-20 sticky top-0">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest leading-none">Hilo (AI Agent) is Active</span>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                        disabled={isThinking}
                        placeholder="Ask Hilo to add features or modify nodes..."
                        className="w-full bg-[#09090b] border border-blue-900/50 rounded-lg py-2.5 px-3 pr-10 text-sm text-white focus:outline-none focus:border-blue-500 shadow-inner disabled:opacity-50"
                    />
                    <button onClick={handleSubmit} disabled={isThinking} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-50">
                        <RefreshCw className={`w-3 h-3 ${isThinking ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                <p className="text-[9px] text-zinc-500 mt-2 text-center opacity-80 leading-tight">Hilo actively parses instructions into topological parameters.</p>
            </div>

            {/* Event Logs - Latest on Top (Flex Reverse) */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                {agentLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-70 mt-10">
                        <Activity className="w-8 h-8 text-blue-500 mb-3" />
                        <p className="text-[10px] uppercase tracking-widest text-blue-200 font-bold">Interactive Event Log</p>
                        <p className="text-zinc-500 text-xs mt-2">No events recorded yet. Construct models via Hilo or UI tools.</p>
                    </div>
                ) : (
                    agentLogs.map(log => (
                        <div key={log.id} className={`bg-[#09090b] border ${log.type === 'error' ? 'border-red-900/50 bg-red-950/20' : 'border-zinc-800'} rounded p-2 text-xs flex items-start gap-2 shadow opacity-90 transition-opacity hover:opacity-100`}>
                            <div className="shrink-0 mt-0.5">
                                {log.type === 'output' ? <Bot className="w-3.5 h-3.5 text-blue-400" /> : 
                                 log.type === 'error' ? <AlertCircle className="w-3.5 h-3.5 text-red-500" /> :
                                 <MousePointerClick className="w-3.5 h-3.5 text-orange-400" />}
                            </div>
                            <div className={`flex-1 ${log.type === 'error' ? 'text-red-300' : 'text-zinc-300'}`}>
                                <div className="flex justify-between items-center mb-0.5 opacity-60">
                                    <span className={`font-bold text-[9px] uppercase tracking-widest ${log.type === 'error' ? 'text-red-400' : 'text-blue-100'}`}>{log.type} Event</span>
                                    <span className="text-[8px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <p className="leading-relaxed">{log.content}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AgentSidebar;
