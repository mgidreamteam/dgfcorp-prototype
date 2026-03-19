import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Breadcrumb from '../components/Breadcrumb';

const InnovationPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="animate-fade-in">
            <div className="max-w-5xl mx-auto px-6 py-12">
                <Breadcrumb items={[{ label: 'Home', onClick: () => navigate('/login') }, { label: 'Innovation' }]} />
                <div className="text-center mt-8 mb-16">
                     <p className="mt-6 text-2xl text-zinc-200 max-w-3xl mx-auto leading-relaxed">
                        D.R.E.A.M. Gigafactory Corp. is building the software stack that connects a decentralized industrial base into a trusted ecosystem for product design, prototyping and manufacturing.
                     </p>
                     <p className="mt-6 text-lg text-zinc-400 max-w-3xl mx-auto leading-relaxed">
                        D.R.E.A.M. (Decentralized Resource Engineering and Agentic Manufacturing) is a forthcoming platform designed to integrate a fragmented network of manufacturers into a cohesive ecosystem. By leveraging agentic AI, D.R.E.A.M. will streamline design, sourcing, and production, directly fortifying the US Industrial Base for the challenges of tomorrow.
                     </p>

                    <div className="my-20 flex flex-col items-center justify-center gap-12">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
                            
                            <div className="flex flex-col items-center gap-3 text-center">
                                <div className="w-32 h-32 p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
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
                                <p className="text-sm text-zinc-400 font-kido">Endurance</p>
                            </div>

                            <div className="flex flex-col items-center gap-3 text-center">
                                <div className="w-32 h-32 p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
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
                                 <p className="text-sm text-zinc-400 font-kido">Power</p>
                            </div>

                            <div className="flex flex-col items-center gap-3 text-center">
                                <div className="w-32 h-32 p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
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
                                <p className="text-sm text-zinc-400 font-kido">Precision</p>
                            </div>

                            <div className="flex flex-col items-center gap-3 text-center">
                                <div className="w-32 h-32 p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
                                    <svg viewBox="0 0 100 100" className="w-full h-full text-white">
                                        <g stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none">
                                            {/* Home Plate */}
                                            <path d="M 45 85 L 55 85 L 58 88 L 50 92 L 42 88 Z" fill="#27272a" stroke="#a1a1aa" strokeWidth="1"/>
                                            
                                            {/* Batter */}
                                            <circle cx="35" cy="30" r="6" /> {/* Head */}
                                            <line x1="35" y1="36" x2="35" y2="60" /> {/* Body */}
                                            <line x1="35" y1="60" x2="30" y2="85" /> {/* Front Leg */}
                                            <line x1="35" y1="60" x2="50" y2="85" /> {/* Back Leg */}

                                            {/* Arms and Bat */}
                                            <g>
                                                <animateTransform 
                                                    attributeName="transform" 
                                                    type="rotate" 
                                                    values="-30 38 45; 90 38 45; -30 38 45" 
                                                    keyTimes="0; 0.4; 1" 
                                                    dur="2s" 
                                                    />
                                                <line x1="35" y1="45" x2="50" y2="40" /> {/* Arms */}
                                                {/* Baseball Bat */}
                                                <line x1="50" y1="40" x2="70" y2="20" strokeWidth="5" /> 
                                            </g>
                                            
                                            {/* Ball */}
                                            <circle r="3" fill="currentColor" stroke="none">
                                                <animateMotion dur="2s" path="M 95 50 C 70 50, 40 50, 38 50 M 38 50 C 30 45, 10 20, 10 10" keyTimes="0; 0.4; 0.41; 1"/>
                                                <animate attributeName="r" values="3;3;3;3" keyTimes="0;0.4;0.9;1" dur="2s" />
                                            </circle>
                                        </g>
                                    </svg>
                                </div>
                                <p className="text-sm text-zinc-400 font-kido">Timing</p>
                            </div>
                        </div>
                        <p className="mt-8 text-lg font-kido text-zinc-300 tracking-wider">Training to Perfection.</p>
                    </div>
                     
                     <p className="mt-12 text-zinc-400 text-lg">
                        Meet our <Link to="/about" className="font-semibold text-white hover:underline transition-colors">
                            Leadership
                        </Link>
                        {' '}to learn more.
                     </p>
                </div>
            </div>
        </div>
    );
};

export default InnovationPage;
