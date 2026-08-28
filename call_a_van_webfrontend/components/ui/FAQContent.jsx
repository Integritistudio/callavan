'use client';
import { useState } from 'react';

const faqs = [
  {
    q: "How Callavan.live Works",
    a: "Callavan.live shows you available drivers near your location in real time. Just open the map, find a driver, and call them directly — no waiting, no middleman."
  },
  {
    q: "How quickly can I get a van?",
    a: "If drivers are live near you, you can get connected within minutes. Callavan.live is designed for speed — perfect for urgent jobs, last-minute moves, or quick collections."
  },
  {
    q: "Who sets the price?",
    a: "Each driver sets their own price. You speak to them directly and agree everything upfront — simple and transparent."
  },
  {
    q: "Do I need to create an account?",
    a: "No — you can use Callavan.live straight away. Just open the map and call a driver."
  },
  {
    q: "Is Callavan.live responsible for the job?",
    a: "No. Callavan.live connects you with available drivers, but the service is provided directly by the driver."
  },
  {
    q: "Why use Callavan.live instead of Gumtree or Facebook?",
    a: "Callavan.live shows you who is actually available right now, based on your location. No messaging back and forth — just find a driver and call instantly."
  }
];

export default function FAQContent() {
  const [openIdx, setOpenIdx] = useState(null);

  const toggle = (idx) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <div className="w-full relative z-[1000] flex justify-center p-4 pt-10 pb-16 pointer-events-auto">
      <div className="bg-white w-full max-w-[600px] rounded-2xl shadow-2xl p-6 md:p-8 animate-fade-in h-fit border border-gray-100">
        <h1 className="text-[28px] font-bold text-[#003366] mb-6 tracking-tight">FAQ</h1>
        <div className="space-y-1">
          {faqs.map((faq, idx) => {
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
                    className={`text-black transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                
                {/* Smooth Grid Accordion */}
                <div 
                  className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100 pb-4' : 'grid-rows-[0fr] opacity-0'}`}
                >
                  <div className="overflow-hidden">
                    <p className="text-gray-600 text-[15px] leading-relaxed pr-8 pt-1">{faq.a}</p>
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
