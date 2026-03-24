import React from 'react';
import { BookOpen } from 'lucide-react';
import GlobalModal from './GlobalModal';

interface UserManualProps {
  onClose: () => void;
}

const UserManual: React.FC<UserManualProps> = ({ onClose }) => {
  return (
    <GlobalModal
      isOpen={true}
      onClose={onClose}
      title={
        <div>
          <div className="text-sm font-bold uppercase tracking-tighter text-white">User Manual</div>
          <div className="text-xs text-zinc-400">MGI D.R.E.A.M. Studio Guide</div>
        </div>
      }
      icon={
        <div className="bg-white/10 p-2 rounded-lg border border-white/20 mr-2">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
      }
      footer={
        <button
          type="button"
          onClick={onClose}
          className="bg-white hover:bg-[#e4e4e7] text-black px-5 py-2 rounded-lg font-bold text-sm shadow-lg shadow-white/10 transition-all"
        >
          Close
        </button>
      }
      maxWidth="42rem"
    >
      <div className="space-y-6">
        <section>
          <h3 className="text-lg font-bold uppercase tracking-wider text-white mb-2">Welcome!</h3>
          <p className="leading-relaxed">
            Welcome to the D.R.E.A.M. (Decentralized Resource Engineering and Agentic Manufacturing) Studio. You're working with Hilo, your AI partner for hardware design and manufacturing. This guide will walk you through the key features.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-bold uppercase tracking-wider text-white mb-2">1. Managing Projects</h3>
          <ul className="list-disc list-inside space-y-2 leading-relaxed">
            <li><span className="font-semibold text-[#e4e4e7]">Create:</span> Click "Create New Project" from the landing page or the '+' icon in the sidebar.</li>
            <li><span className="font-semibold text-[#e4e4e7]">Select:</span> Click any project in the sidebar to load it.</li>
            <li><span className="font-semibold text-[#e4e4e7]">Rename:</span> Double-click a project's name in the sidebar to edit it.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-bold uppercase tracking-wider text-white mb-2">2. The Design Process</h3>
          <ul className="list-disc list-inside space-y-2 leading-relaxed">
            <li><span className="font-semibold text-[#e4e4e7]">Prompting Hilo:</span> Use the main text area in the right-hand panel to describe the product you want to create. Be as descriptive as possible. You can also upload specifications from a `.txt` or `.md` file using the "Upload Specs" button.</li>
            <li><span className="font-semibold text-[#e4e4e7]">Iterative Design:</span> Hilo remembers the context of your current project. You can provide follow-up prompts like "make the casing out of aluminum instead" to refine the design without starting over.</li>
            <li>
              <span className="font-semibold text-[#e4e4e7]">Design Modes:</span>
              <ul className="list-[circle] list-inside ml-4 mt-1">
                  <li><span className="font-medium text-[#e4e4e7]">Unconstrained (Default):</span> If you omit key details, Hilo will make reasonable, industry-standard assumptions to complete the design. These assumptions will be listed in the specifications.</li>
                  <li><span className="font-medium text-[#e4e4e7]">Constrained:</span> If you check this box, Hilo will require you to provide values for all critical parameters before proceeding.</li>
              </ul>
            </li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-bold uppercase tracking-wider text-white mb-2">3. The Generation Pipeline</h3>
          <p className="mb-2 leading-relaxed">Once you submit a prompt, Hilo executes a series of steps:</p>
          <ol className="list-decimal list-inside space-y-2 leading-relaxed">
            <li><span className="font-semibold text-[#e4e4e7]">Engineering Specs:</span> Generates a detailed technical breakdown, including Bill of Materials (BOM), dimensions, and materials.</li>
            <li><span className="font-semibold text-[#e4e4e7]">Rendered Concept:</span> Creates a photorealistic product shot.</li>
            <li><span className="font-semibold text-[#e4e4e7]">Exploded View:</span> Shows an assembly diagram of all components.</li>
            <li><span className="font-semibold text-[#e4e4e7]">Circuit & PCB:</span> If your design includes electronics, Hilo will generate a schematic and a printed circuit board layout.</li>
          </ol>
           <p className="text-[#a1a1aa] text-sm mt-2 leading-relaxed">The four main visual outputs are displayed simultaneously in a 2x2 grid for a comprehensive overview.</p>
        </section>
        
        <section>
          <h3 className="text-lg font-bold uppercase tracking-wider text-white mb-2">4. Handling Errors</h3>
          <p className="mb-2 leading-relaxed">If a step fails, you have two options:</p>
          <ul className="list-disc list-inside space-y-2 leading-relaxed">
            <li><span className="font-semibold text-[#e4e4e7]">Start Over:</span> Discards the failed attempt and re-runs the entire process from your original prompt.</li>
            <li><span className="font-semibold text-[#e4e4e7]">Retry with Guidance:</span> This is the recommended option. A dialog will appear, allowing you to give Hilo specific corrective feedback (e.g., "The render should show the product on a white background"). Hilo will use this new information to re-attempt only the failed step.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-bold uppercase tracking-wider text-white mb-2">5. Reviewing Your Design</h3>
           <ul className="list-disc list-inside space-y-2 leading-relaxed">
              <li><span className="font-semibold text-[#e4e4e7]">Image Viewer:</span> The central panel displays all generated visuals in a 2x2 grid. You can download or view them in full-screen.</li>
              <li><span className="font-semibold text-[#e4e4e7]">Specification Viewer:</span> Below the images, you can review the detailed specs, Bill of Materials, material composition charts, and sourcing notes. It also suggests potential vendors from the D.R.E.A.M. Network who can manufacture your components.</li>
           </ul>
        </section>

         <section>
          <h3 className="text-lg font-bold uppercase tracking-wider text-white mb-2">6. Virtual Gigafactory</h3>
           <p className="leading-relaxed">Select "Virtual Gigafactory" from the top menu to browse a curated directory of verified manufacturing partners. You can filter by capability and view detailed profiles for each vendor.</p>
        </section>
      </div>
    </GlobalModal>
  );
};

export default UserManual;