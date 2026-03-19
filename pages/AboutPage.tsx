import React from 'react';
import Breadcrumb from '../components/Breadcrumb';
import { useNavigate } from 'react-router-dom';

const AboutPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="animate-fade-in">
            <div className="max-w-5xl mx-auto px-6 py-12">
                <Breadcrumb items={[{ label: 'Home', onClick: () => navigate('/login') }, { label: 'Request Access' }]} />
                
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 max-w-2xl mx-auto mt-6">
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