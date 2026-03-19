import React from 'react';
import { X, BookOpen } from 'lucide-react';

interface UserManualProps {
  onClose: () => void;
}

const UserManual: React.FC<UserManualProps> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in"
      aria-labelledby="manual-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg border border-white/20">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 id="manual-title" className="text-xl font-bold text-white">User Manual</h2>
              <p className="text-zinc-400 text-sm">MGI D.R.E.A.M. Studio Guide</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            aria-label="Close user manual"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-6">
          <section>
            <h3 className="text-lg font-bold text-white mb-2">Welcome!</h3>
            <p className="text-zinc-300">
              Welcome to the D.R.E.A.M. (Decentralized Resource Engineering and Agentic Manufacturing) Studio. You're working with Alon, your AI partner for hardware design and manufacturing. This guide will walk you through the key features.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-2">1. Managing Projects</h3>
            <ul className="list-disc list-inside space-y-2 text-zinc-300">
              <li><span className="font-semibold text-zinc-200">Create:</span> Click "Create New Project" from the landing page or the '+' icon in the sidebar.</li>
              <li><span className="font-semibold text-zinc-200">Select:</span> Click any project in the sidebar to load it.</li>
              <li><span className="font-semibold text-zinc-200">Rename:</span> Double-click a project's name in the sidebar to edit it.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-2">2. The Design Process</h3>
            <ul className="list-disc list-inside space-y-2 text-zinc-300">
              <li><span className="font-semibold text-zinc-200">Prompting Alon:</span> Use the main text area in the right-hand panel to describe the product you want to create. Be as descriptive as possible. You can also upload specifications from a `.txt` or `.md` file using the "Upload Specs" button.</li>
              <li><span className="font-semibold text-zinc-200">Iterative Design:</span> Alon remembers the context of your current project. You can provide follow-up prompts like "make the casing out of aluminum instead" to refine the design without starting over.</li>
              <li>
                <span className="font-semibold text-zinc-200">Design Modes:</span>
                <ul className="list-[circle] list-inside ml-4 mt-1">
                    <li><span className="font-medium text-zinc-200">Unconstrained (Default):</span> If you omit key details, Alon will make reasonable, industry-standard assumptions to complete the design. These assumptions will be listed in the specifications.</li>
                    <li><span className="font-medium text-zinc-200">Constrained:</span> If you check this box, Alon will require you to provide values for all critical parameters before proceeding.</li>
                </ul>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-2">3. The Generation Pipeline</h3>
            <p className="text-zinc-300 mb-2">Once you submit a prompt, Alon executes a series of steps:</p>
            <ol className="list-decimal list-inside space-y-2 text-zinc-300">
              <li><span className="font-semibold text-zinc-200">Engineering Specs:</span> Generates a detailed technical breakdown, including Bill of Materials (BOM), dimensions, and materials.</li>
              <li><span className="font-semibold text-zinc-200">Rendered Concept:</span> Creates a photorealistic product shot.</li>
              <li><span className="font-semibold text-zinc-200">Exploded View:</span> Shows an assembly diagram of all components.</li>
              <li><span className="font-semibold text-zinc-200">Circuit & PCB:</span> If your design includes electronics, Alon will generate a schematic and a printed circuit board layout.</li>
            </ol>
             <p className="text-zinc-400 text-sm mt-2">The four main visual outputs are displayed simultaneously in a 2x2 grid for a comprehensive overview.</p>
          </section>
          
          <section>
            <h3 className="text-lg font-bold text-white mb-2">4. Handling Errors</h3>
            <p className="text-zinc-300 mb-2">If a step fails, you have two options:</p>
            <ul className="list-disc list-inside space-y-2 text-zinc-300">
              <li><span className="font-semibold text-zinc-200">Start Over:</span> Discards the failed attempt and re-runs the entire process from your original prompt.</li>
              <li><span className="font-semibold text-zinc-200">Retry with Guidance:</span> This is the recommended option. A dialog will appear, allowing you to give Alon specific corrective feedback (e.g., "The render should show the product on a white background"). Alon will use this new information to re-attempt only the failed step.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-2">5. Reviewing Your Design</h3>
             <ul className="list-disc list-inside space-y-2 text-zinc-300">
                <li><span className="font-semibold text-zinc-200">Image Viewer:</span> The central panel displays all generated visuals in a 2x2 grid. You can download or view them in full-screen.</li>
                <li><span className="font-semibold text-zinc-200">Specification Viewer:</span> Below the images, you can review the detailed specs, Bill of Materials, material composition charts, and sourcing notes. It also suggests potential vendors from the D.R.E.A.M. Network who can manufacture your components.</li>
             </ul>
          </section>
           <section>
            <h3 className="text-lg font-bold text-white mb-2">6. Virtual Gigafactory</h3>
             <p className="text-zinc-300">Select "Virtual Gigafactory" from the top menu to browse a curated directory of verified manufacturing partners. You can filter by capability and view detailed profiles for each vendor.</p>
          </section>
        </div>
        <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 flex justify-end shrink-0">
             <button
              type="button"
              onClick={onClose}
              className="bg-white hover:bg-zinc-200 text-black px-5 py-2 rounded-lg font-bold text-sm shadow-lg shadow-white/10 transition-all"
            >
              Close
            </button>
        </div>
      </div>
    </div>
  );
};

export default UserManual;