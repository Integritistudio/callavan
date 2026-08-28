'use client';
import { useState } from 'react';

const privacyPolicyFaqs = [
  {
    q: "1. Information We Collect",
    a: "We may collect:\n• Name\n• Email address\n• Phone number\n• Location data (when using the map or going live)"
  },
  {
    q: "2. How We Use Your Data",
    a: "We use your data to:\n• Operate the platform\n• Connect users with drivers\n• Display location-based availability\n• Improve performance"
  },
  {
    q: "3. Location Data",
    a: "Location data is used to show driver availability on the map.\nWhen a driver goes offline, only their base area or approximate location is shown — not their exact last live location."
  },
  {
    q: "4. Data Storage",
    a: "Data is securely stored using third-party providers (e.g. Supabase)."
  },
  {
    q: "5. Data Sharing",
    a: "We do not sell or rent personal data."
  },
  {
    q: "6. Your Rights",
    a: "You may request access or deletion of your data."
  },
  {
    q: "7. Updates",
    a: "We may update this policy at any time."
  }
];

export default function PrivacyPolicyContent() {
  const [openIdx, setOpenIdx] = useState(null);

  const toggle = (idx) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <div className="w-full relative z-[1000] flex justify-center p-4 pt-10 pb-16 pointer-events-auto">
      <div className="bg-white w-full max-w-[600px] rounded-2xl shadow-2xl p-6 md:p-8 animate-fade-in h-fit border border-gray-100">
        <h1 className="text-[28px] font-bold text-[#003366] tracking-tight uppercase mb-6">PRIVACY POLICY</h1>
        <div className="space-y-1">
          {privacyPolicyFaqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div key={idx} className="border-b border-gray-100 last:border-0 pb-1">
                <button 
                  onClick={() => toggle(idx)}
                  className="w-full flex justify-between items-center text-left py-4 focus:outline-none cursor-pointer group"
                >
                  <h4 className="font-bold text-gray-800 text-[16px] transition-colors pr-4">{faq.q}</h4>
                  <svg 
                    width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" 
                    className={`text-black transform transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                
                {/* Smooth Grid Accordion */}
                <div 
                  className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100 pb-4' : 'grid-rows-[0fr] opacity-0'}`}
                >
                  <div className="overflow-hidden">
                    <div className="text-gray-600 text-[15px] leading-relaxed pr-8 pt-1 whitespace-pre-wrap">
                      {faq.a}
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
