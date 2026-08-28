'use client';
import { useState } from 'react';

const driverTermsFaqs = [
  {
    q: "1. Overview",
    a: "Callavan.live is a platform that connects independent drivers with users seeking transport services.\nWe do not provide transport services ourselves — we simply enable direct contact between users and drivers.\nBy registering as a driver on Callavan.live, you agree to operate as an independent service provider."
  },
  {
    q: "2. Driver Status",
    a: "• You are not an employee, partner, or agent of Callavan.live\n• You operate as a fully independent driver\n• You are responsible for all services you provide, including:\n  • Pricing\n  • Availability\n  • Communication with customers\n  • Completion of jobs"
  },
  {
    q: "3. Driver Responsibilities",
    a: "As a driver, you agree that you:\n• Hold a valid driving licence\n• Have appropriate vehicle insurance\n• Have any required licences or permits for your work\n• Ensure your vehicle is safe and roadworthy\n• Provide accurate and truthful profile information\n• Maintain professional conduct with customers"
  },
  {
    q: "4. Use of the Platform",
    a: "• You may toggle your availability using the “Go Live” feature\n• When live, your location may be shown to users on the map\n• When offline, your profile may still appear as a directory listing\n• You agree not to misuse the platform or misrepresent your availability"
  },
  {
    q: "5. Payments & Jobs",
    a: "• Callavan.live does not handle payments\n• All payments are agreed directly between you and the customer\n• We are not involved in:\n  • Pricing disputes\n  • Job outcomes\n  • Payment collection"
  },
  {
    q: "6. Liability",
    a: "• Callavan.live is not responsible for:\n  • Any work carried out by drivers\n  • Damage, loss, or delays\n  • Disputes between drivers and customers\n• You accept full responsibility for:\n  • Your services\n  • Your vehicle\n  • Your conduct"
  },
  {
    q: "7. Account & Access",
    a: "• We reserve the right to:\n  • Approve or reject driver registrations\n  • Remove or suspend accounts at any time\n• You must not:\n  • Share your account details\n  • Impersonate another driver\n  • Provide false information"
  },
  {
    q: "8. Location & Availability",
    a: "• Your location is based on browser/device GPS\n• Accuracy is not guaranteed\n• You are responsible for managing your live/offline status"
  },
  {
    q: "9. Fees (If Applicable)",
    a: "• Callavan.live may introduce subscription fees\n• Any fees will be clearly communicated in advance\n• Continued use of the platform indicates acceptance of any updated pricing"
  },
  {
    q: "10. Changes to Terms",
    a: "We may update these terms from time to time.\nDrivers will be notified of any significant changes."
  },
  {
    q: "11. Acceptance",
    a: "By registering and using Callavan.live, you confirm that:\n• You understand these terms\n• You agree to operate as an independent driver\n• You accept full responsibility for your services\n\n“You keep full control of your work. We simply connect you to opportunity.”"
  }
];

export default function DriverTermsContent() {
  const [openIdx, setOpenIdx] = useState(null);

  const toggle = (idx) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <div className="w-full relative z-[1000] flex justify-center p-4 pt-10 pb-16 pointer-events-auto">
      <div className="bg-white w-full max-w-[600px] rounded-2xl shadow-2xl p-6 md:p-8 animate-fade-in h-fit border border-gray-100">
        <h1 className="text-[28px] font-bold text-[#003366] tracking-tight uppercase mb-6">DRIVER TERMS</h1>
        <div className="space-y-1">
          {driverTermsFaqs.map((faq, idx) => {
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
