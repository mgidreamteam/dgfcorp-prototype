import React from 'react';
import Breadcrumb from '../components/Breadcrumb';
import { useNavigate } from 'react-router-dom';

const AboutPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="animate-fade-in">
            <div className="max-w-5xl mx-auto px-6 py-12">
                <Breadcrumb items={[{ label: 'Home', onClick: () => navigate('/login') }, { label: 'Leadership' }]} />
                
                <div className="mt-8 mb-16 max-w-4xl mx-auto">
                    <h2 className="text-4xl font-bold text-white mb-10 text-center tracking-tight">Leadership</h2>
                    
                    {/* Vishnu Bio */}
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-8 md:p-10 flex flex-col md:flex-row gap-8 items-start relative overflow-hidden mb-8">
                        <div className="spotlight-effect opacity-30"></div>
                        <div className="w-40 h-40 md:w-56 md:h-56 shrink-0 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700 mx-auto md:mx-0 relative z-10 shadow-xl overflow-hidden">
                             <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 to-zinc-900 w-full h-full flex flex-col items-center justify-center">
                                 <span className="text-zinc-500 font-mono text-xs mb-1">CEO</span>
                                 <span className="text-zinc-600 font-bold tracking-widest uppercase text-center">Vishnu<br/>Sundaresan</span>
                             </div>
                        </div>
                        <div className="flex-1 relative z-10">
                            <h3 className="text-2xl font-bold text-white">Vishnu Sundaresan, Ph.D.</h3>
                            <p className="text-zinc-400 font-medium uppercase tracking-widest text-sm mb-6 mt-1 flex items-center gap-2">
                                <span className="w-4 h-px bg-zinc-600"></span> 
                                Chairman & Chief Executive Officer
                            </p>
                            <div className="space-y-4 text-zinc-300 leading-relaxed text-body">
                                <p>
                                  Dr. Vishnu Sundaresan is the Founder and Chief Executive Officer of D.R.E.A.M. Gigafactory Corp. He established the company to realize his vision of creating a decentralized, virtually connected gigafactory to revitalize the US Industrial Base. D.R.E.A.M. Gigafactory represents the next evolutionary leap in creating an interconnected marketplace for manufacturing hardware, leveraging the advanced power of agentic AI, natural language processing, and reasoning models. He is also the founder and Chairman of Materiel Group Inc. (MGI)—a Northern Virginia-based marketplace established in June 2025 that utilizes large language models to serve as a market maker in the ex-China critical minerals supply chain.
                                </p>
                                <p>
                                  Prior to launching MGI, Dr. Sundaresan served as Senior Vice President of Technology at a U.S.-based critical minerals and mining company. He was also a Program Manager at DARPA from September 2020 to September 2024, and a tenured faculty member at The Ohio State University for over a decade.
                                </p>
                                <p>
                                  At DARPA, Dr. Sundaresan initiated the "Recycling at the Point of Disposal" (RPOD) program, which addressed the United States' vulnerability in sourcing electronic elements such as gallium (Ga), germanium (Ge), and rare earth elements (REEs). In addition to RPOD, he established the EQUIP-A-Pharma program, a collaboration between DARPA and HHS, which focuses on point-of-need manufacturing of active pharmaceutical ingredients (APIs) and real-time qualification of finished drug products.
                                </p>
                                <p>
                                  At MGI, he continues to build on his multidisciplinary expertise, leveraging agentic AI to establish new industry standards and drive MGI's path to revenue and long-term success.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Alan Clarke Bio */}
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-8 md:p-10 flex flex-col md:flex-row gap-8 items-start relative overflow-hidden mb-16">
                        <div className="spotlight-effect opacity-30"></div>
                        <div className="w-40 h-40 md:w-56 md:h-56 shrink-0 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700 mx-auto md:mx-0 relative z-10 shadow-xl overflow-hidden">
                             <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 to-zinc-900 w-full h-full flex flex-col items-center justify-center">
                                 <span className="text-zinc-500 font-mono text-xs mb-1">CTO</span>
                                 <span className="text-zinc-600 font-bold tracking-widest uppercase">Alan Clarke</span>
                             </div>
                        </div>
                        <div className="flex-1 relative z-10">
                            <h3 className="text-2xl font-bold text-white">Alan "Ira" Clarke</h3>
                            <p className="text-zinc-400 font-medium uppercase tracking-widest text-sm mb-6 mt-1 flex items-center gap-2">
                                <span className="w-4 h-px bg-zinc-600"></span> 
                                Chief Technology Officer
                            </p>
                            <div className="space-y-4 text-zinc-300 leading-relaxed text-body">
                                <p>
                                    Alan "Ira" Clarke is the Chief Technology Officer of D.R.E.A.M. Gigafactory Corp., where he leads the development of tools and processes designed to bridge the gap between imagination and execution. His mission is to empower users to rapidly design, validate, and deliver security and defense technologies with unprecedented speed and precision.
                                </p>
                                <p>
                                    Alan’s leadership and technology perspectives are informed by 24 years of service in the United States Marine Corps. His career was defined by a unique synthesis of high-stakes operational experience and cutting-edge technology development. A veteran of numerous combat deployments in CENTCOM and maritime patrols in INDOPACOM, Alan led missions as an attack helicopter pilot in both the Marine Corps (AH-1W) and the Army Special Operations Aviation Regiment (AH-6M). As Senior Adviser to the Director of DARPA, he bridged the gap between military requirements and advanced R&D, instrumental in shaping novel programs into deployable combat systems across autonomy, aerospace, and biotechnology.
                                </p>
                                <p>
                                    Alan is a dedicated maker and designer. He maintains an eclectic workshop specializing in additive manufacturing, CNC machining, woodcraft, and electronics. At D.R.E.A.M., he scales this "maker spirit" by integrating agentic AI to revolutionize industrial production. Alan holds Master’s degrees in Unmanned Systems and Information Technology Management and is currently pursuing a doctoral degree focused on technology adoption. His work centers on the intersection of autonomy, human factors, and the art of moving conceptual technology into practical, life-saving application.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Request Access Form */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 max-w-2xl mx-auto">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold tracking-tight text-white">Request Access</h1>
                        <p className="text-zinc-400 mt-4 max-w-md mx-auto">Fill out the form below to request access to D.R.E.A.M. Studio. We'll get back to you regarding your application.</p>
                    </div>
                    <form action="https://formspree.io/f/mvgwjzgo" method="POST" className="space-y-6">
                        <div>
                            <label htmlFor="full-name" className="block text-sm font-medium text-zinc-300 mb-2">Full Name</label>
                            <input type="text" name="name" id="full-name" required className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-white outline-none" />
                        </div>
                        <div>
                            <label htmlFor="company-name" className="block text-sm font-medium text-zinc-300 mb-2">Company Name</label>
                            <input type="text" name="company" id="company-name" required className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-white outline-none" />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">Work Email</label>
                            <input type="email" name="email" id="email" required className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-white outline-none" />
                        </div>
                        <div>
                            <label htmlFor="message" className="block text-sm font-medium text-zinc-300 mb-2">Message</label>
                            <textarea name="message" id="message" rows={4} className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-white outline-none" placeholder="Tell us about your project or why you'd like to join..."></textarea>
                        </div>
                        <div>
                            <button type="submit" className="w-full bg-white text-black font-bold py-3 px-4 rounded-lg hover:bg-zinc-200 transition-colors text-lg">Submit Request</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AboutPage;