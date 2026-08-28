'use client';
import { useState } from 'react';

const driverFaqs = [
  {
    q: "How do I get jobs?",
    a: "Go live when you’re available and receive calls directly from nearby customers.\nThe closer you are and the more active you are, the more calls you’ll get."
  },
  {
    q: "Do I pay commission?",
    a: "No. Callavan.live does not take commission on jobs.\nWhat you earn is yours."
  },
  {
    q: "How does Callavan.live benefit me?",
    a: "Callavan.live helps you:\n• Get more calls without chasing leads\n• Fill gaps in your day\n• Pick up quick local jobs\nIt’s designed to work alongside what you already do."
  },
  {
    q: "Do I need to stay on the app all day?",
    a: "No — just go live when you’re available.\nYou control when you’re visible and when you take calls."
  },
  {
    q: "What do customers see?",
    a: "Customers see your:\n• Name\n• Location\n• Van type\n• Availability\nThey can then call you directly."
  },
  {
    q: "Do I need insurance?",
    a: "Yes. You are responsible for having appropriate insurance and operating legally."
  },
  {
    q: "How do I get more calls?",
    a: "Simple:\n• Stay live\n• Be in active areas\n• Answer calls quickly\nDrivers who stay available tend to get the most work."
  },
  {
    q: "Can I use Callavan.live alongside my current work?",
    a: "Yes — that’s exactly how it’s designed. Callavan.live is an extra source of jobs, not a replacement.\n\nUse it properly, and it pays off\nCallavan.live works best when you treat it as part of how you operate, not something you check occasionally.\n\nThe drivers who get the most out of it are the ones who stay switched on. They go live when they’re available, position themselves where demand already exists, and take calls when they come in. They don’t wait around hoping for work — they put themselves in a position to pick it up.\n\nIt’s not about replacing what you already do. It’s about adding to it. Filling gaps in your day. Turning short windows of availability into paid jobs. Picking up work that’s already happening around you without going out your way.\n\nUsed properly, it becomes simple. You go live, you stay available, and you give yourself more chances to earn.\n\nDo that consistently, and it starts to compound. More visibility leads to more calls. More calls lead to more jobs. More jobs mean better use of your time on the road.\n\nCallavan.live isn’t there to complicate things. It’s there to make getting work quicker, easier, and more efficient."
  }
];

export default function DriverFAQContent() {
  const [openIdx, setOpenIdx] = useState(null);

  const toggle = (idx) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <div className="w-full relative z-[1000] flex justify-center p-4 pt-10 pb-16 pointer-events-auto">
      <div className="bg-white w-full max-w-[600px] rounded-2xl shadow-2xl p-6 md:p-8 animate-fade-in h-fit border border-gray-100">
        <h1 className="text-[28px] font-bold text-[#003366] tracking-tight uppercase">DRIVER FAQ</h1>
        <p className="text-gray-500 text-[15px] mb-6 mt-1">Driver FAQ – How It Works</p>
        <div className="space-y-1">
          {driverFaqs.map((faq, idx) => {
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
