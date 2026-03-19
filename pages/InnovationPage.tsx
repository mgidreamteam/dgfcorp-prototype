import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Breadcrumb from '../components/Breadcrumb';
import ThemePanel from '../components/ThemePanel';

const InnovationPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="animate-fade-in w-full h-full flex flex-col items-center">
            <div className="w-full max-w-6xl mx-auto px-6 py-12">
                <Breadcrumb items={[{ label: 'Home', onClick: () => navigate('/login') }, { label: 'Innovation' }]} />
                
                <div className="mt-8 space-y-6">
                     <ThemePanel interactive={false} className="p-8 text-left">
                         <h2 className="text-heading font-normal text-white uppercase tracking-tighter mb-4 border-b border-zinc-800 pb-2">
                             System Architecture
                         </h2>
                         <p className="text-subheading text-zinc-300 leading-relaxed w-full">
                            D.R.E.A.M. Gigafactory Corp. is building the software stack that connects a decentralized industrial base into a trusted ecosystem for product design, prototyping and manufacturing.
                         </p>
                         <p className="mt-4 text-body text-zinc-400 leading-relaxed w-full">
                            D.R.E.A.M. (Decentralized Resource Engineering and Agentic Manufacturing) is a recently launched platform designed to integrate a fragmented network of manufacturers into a cohesive ecosystem. By leveraging agentic AI, D.R.E.A.M. streamlines design, sourcing, and production, directly fortifying the US Industrial Base for the challenges of tomorrow.
                         </p>
                     </ThemePanel>

                     <ThemePanel interactive={false} className="p-8">
                        <div className="flex items-end justify-between border-b border-zinc-800 pb-2 mb-6 text-left">
                            <div>
                                <h2 className="text-heading font-normal text-white uppercase tracking-tighter">Core Capabilities</h2>
                                <p className="text-zinc-500 font-normal uppercase tracking-widest text-subheading mt-1">Training to Perfection.</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="flex flex-col items-center justify-center gap-2 p-6 bg-black/40 border border-zinc-800/50 hover:bg-zinc-900/40 transition-colors">
                                <div className="w-16 h-16 text-zinc-300">
                                    <svg viewBox="0 0 100 100" className="w-full h-full text-white">
                                        <defs>
                                            <path id="runnerPathSimple" d="M 25 75 A 15 10 0 0 1 25 45 L 75 45 A 15 10 0 0 1 75 75 Z" fill="none"/>
                                            <g id="runnerIcon">
                                                <circle cx="0" cy="-7" r="3" fill="currentColor"/>
                                                <line x1="0" y1="-4" x2="0" y2="2" stroke="currentColor" strokeWidth="2"/>
                                                <line x1="0" y1="2" x2="-4" y2="7" stroke="currentColor" strokeWidth="2"/>
                                                <line x1="0" y1="2" x2="4" y2="7" stroke="currentColor" strokeWidth="2"/>
                                                <line x1="-3" y1="-2" x2="3" y2="0" stroke="currentColor" strokeWidth="1.5"/>
                                            </g>
                                        </defs>
                                        <path d="M 20 80 A 20 12 0 0 1 20 40 L 80 40 A 20 12 0 0 1 80 80 Z" fill="#27272a" stroke="#3f3f46" strokeWidth="2"/>
                                        <path d="M 25 75 A 15 10 0 0 1 25 45 L 75 45 A 15 10 0 0 1 75 75 Z" fill="none" stroke="#a1a1aa" strokeWidth="1" strokeDasharray="2 2"/>
                                        <use href="#runnerIcon">
                                            <animateMotion dur="2s" rotate="0">
                                                <mpath href="#runnerPathSimple"/>
                                            </animateMotion>
                                            <animateTransform attributeName="transform" type="scale" values="1;0.8;0.8;1;1" keyTimes="0;0.25;0.5;0.75;1" dur="2s"/>
                                        </use>
                                    </svg>
                                </div>
                                <p className="text-body font-bold text-zinc-400 uppercase tracking-widest mt-2">Endurance</p>
                            </div>

                            <div className="flex flex-col items-center justify-center gap-2 p-6 bg-black/40 border border-zinc-800/50 hover:bg-zinc-900/40 transition-colors">
                                <div className="w-16 h-16 text-zinc-300">
                                    <svg viewBox="0 0 100 100" className="w-full h-full text-white">
                                        <g stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none">
                                            <circle cx="50" cy="30" r="6" />
                                            <line x1="50" y1="36" x2="50" y2="60" />
                                            <line x1="50" y1="60" x2="40" y2="85" />
                                            <line x1="50" y1="60" x2="60" y2="85" />
                                            <g>
                                                <animateTransform attributeName="transform" type="translate" values="0 0; 0 -15; 0 -15; 0 0" keyTimes="0; 0.4; 0.6; 1" dur="2s" />
                                                <line x1="50" y1="45" x2="35" y2="55" />
                                                <line x1="50" y1="45" x2="65" y2="55" />
                                                <line x1="20" y1="55" x2="80" y2="55" strokeWidth="3" />
                                                <rect x="15" y="50" width="5" height="10" stroke="none" fill="currentColor" />
                                                <rect x="80" y="50" width="5" height="10" stroke="none" fill="currentColor" />
                                            </g>
                                        </g>
                                    </svg>
                                </div>
                                <p className="text-body font-bold text-zinc-400 uppercase tracking-widest mt-2">Power</p>
                            </div>

                            <div className="flex flex-col items-center justify-center gap-2 p-6 bg-black/40 border border-zinc-800/50 hover:bg-zinc-900/40 transition-colors">
                                <div className="w-16 h-16 text-zinc-300">
                                    <svg viewBox="0 0 100 100" className="w-full h-full text-white">
                                        <g stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none">
                                            <circle cx="50" cy="30" r="6" />
                                            <line x1="50" y1="36" x2="50" y2="60" />
                                            <line x1="50" y1="60" x2="40" y2="85" />
                                            <line x1="50" y1="60" x2="60" y2="85" />
                                            <line x1="50" y1="45" x2="35" y2="30" />
                                            <g>
                                                <animateTransform attributeName="transform" type="rotate" values="-45 50 45; 45 50 45; -45 50 45" dur="2s" />
                                                <line x1="50" y1="45" x2="65" y2="30" />
                                                <ellipse cx="75" cy="20" rx="10" ry="12" strokeWidth="3" />
                                            </g>
                                        </g>
                                    </svg>
                                </div>
                                <p className="text-body font-bold text-zinc-400 uppercase tracking-widest mt-2">Precision</p>
                            </div>

                            <div className="flex flex-col items-center justify-center gap-2 p-6 bg-black/40 border border-zinc-800/50 hover:bg-zinc-900/40 transition-colors">
                                <div className="w-16 h-16 text-zinc-300">
                                    <svg viewBox="0 0 100 100" className="w-full h-full text-white">
                                        <g stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none">
                                            <path d="M 45 85 L 55 85 L 58 88 L 50 92 L 42 88 Z" fill="#27272a" stroke="#a1a1aa" strokeWidth="1"/>
                                            <circle cx="35" cy="30" r="6" /> 
                                            <line x1="35" y1="36" x2="35" y2="60" /> 
                                            <line x1="35" y1="60" x2="30" y2="85" /> 
                                            <line x1="35" y1="60" x2="50" y2="85" /> 
                                            <g>
                                                <animateTransform attributeName="transform" type="rotate" values="-30 38 45; 90 38 45; -30 38 45" keyTimes="0; 0.4; 1" dur="2s" />
                                                <line x1="35" y1="45" x2="50" y2="40" /> 
                                                <line x1="50" y1="40" x2="70" y2="20" strokeWidth="5" /> 
                                            </g>
                                            <circle r="3" fill="currentColor" stroke="none">
                                                <animateMotion dur="2s" path="M 95 50 C 70 50, 40 50, 38 50 M 38 50 C 30 45, 10 20, 10 10" keyTimes="0; 0.4; 0.41; 1"/>
                                                <animate attributeName="r" values="3;3;3;3" keyTimes="0;0.4;0.9;1" dur="2s" />
                                            </circle>
                                        </g>
                                    </svg>
                                </div>
                                <p className="text-body font-bold text-zinc-400 uppercase tracking-widest mt-2">Timing</p>
                            </div>
                        </div>
                     </ThemePanel>

                     <div className="pt-8 text-center border-t border-zinc-800/50">
                        <p className="text-zinc-500 text-detail uppercase tracking-widest">
                            Meet our <Link to="/about" className="font-bold text-white hover:underline transition-colors ml-1">
                                Leadership
                            </Link>
                            {' '}to learn more.
                        </p>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default InnovationPage;
