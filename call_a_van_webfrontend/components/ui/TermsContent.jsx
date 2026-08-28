'use client';
import { useState } from 'react';

const termsFaqs = [
  {
    q: "1. Nature of Service",
    a: "Callavan.live does not provide transport, removal, or delivery services.\nWe act solely as a platform that allows users to connect directly with independent drivers."
  },
  {
    q: "2. Independent Drivers",
    a: "All drivers on Callavan.live operate independently.\nDrivers are responsible for:\n• Their services\n• Pricing\n• Availability\n• Insurance and licensing\n• Communication with customers\n\nCallavan.live does not employ or control drivers."
  },
  {
    q: "3. User Responsibility",
    a: "Users engage drivers at their own discretion.\nCallavan.live is not responsible for:\n• Service quality\n• Pricing disputes\n• Delays or cancellations\n• Damage, loss, or injury"
  },
  {
    q: "4. No Guarantees",
    a: "Callavan.live does not guarantee:\n• Driver availability\n• Response times\n• Service outcomes"
  },
  {
    q: "5. Platform Use",
    a: "You agree not to misuse the platform or interfere with its operation."
  },
  {
    q: "6. Liability",
    a: "To the fullest extent permitted by law, Callavan.live is not liable for any loss or damage resulting from use of the platform."
  },
  {
    q: "7. Updates",
    a: "We may update the platform or these terms at any time."
  }
];

export default function TermsContent() {
  const [openIdx, setOpenIdx] = useState(null);

  const toggle = (idx) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <div className="w-full relative z-[1000] flex justify-center p-4 pt-10 pb-16 pointer-events-auto">
      <div className="bg-white w-full max-w-[600px] rounded-2xl shadow-2xl p-6 md:p-8 animate-fade-in h-fit border border-gray-100">
        <h1 className="text-[28px] font-bold text-[#003366] tracking-tight uppercase">TERMS & CONDITIONS</h1>
        <p className="text-gray-500 text-[14px] mb-6 mt-2 leading-relaxed">Callavan.live is a platform that connects users with independent drivers. By using this website, you agree to the following terms.</p>
        <div className="space-y-1">
          {termsFaqs.map((faq, idx) => {
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
