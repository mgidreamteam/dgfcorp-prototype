import React from 'react';

const AuthorInfo = () => {
  return (
    <>
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-white mb-2 tracking-tight">About Us</h2>
        <div className="w-24 h-1 bg-white/20 mx-auto rounded-full"></div>
      </div>
      <div className="grid md:grid-cols-5 gap-12 items-start text-left">
        <div className="md:col-span-3 text-lg leading-relaxed text-zinc-300 space-y-6">
          <h3 className="text-2xl font-semibold text-zinc-200">Vishnu Sundaresan, Ph.D.</h3>
          <p className="text-zinc-400 -mt-4 mb-4">Chairman & Chief Executive Officer</p>
          <div className="space-y-4 text-zinc-300">
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
        <div className="md:col-span-2 space-y-8 text-lg">
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">
              D.R.E.A.M. Gigafactory Corp.
            </h3>
            <p className="leading-relaxed text-zinc-400">
              D.R.E.A.M. (Decentralized Resource Engineering and Agentic Manufacturing) is a forthcoming platform designed to integrate a fragmented network of manufacturers into a cohesive ecosystem. By leveraging agentic AI, D.R.E.A.M. will streamline design, sourcing, and production, directly fortifying the US Industrial Base for the challenges of tomorrow.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthorInfo;