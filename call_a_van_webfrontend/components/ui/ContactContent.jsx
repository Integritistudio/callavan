'use client';

export default function ContactContent() {
  return (
    <div className="w-full relative z-[1000] flex justify-center items-center p-4 pointer-events-auto h-full flex-1">
      <div className="w-full max-w-[550px] rounded-[24px] shadow-2xl overflow-hidden flex flex-col animate-fade-in border border-gray-100">
        
        {/* Top Half (Light Gray) */}
        <div className="bg-[#f0f0f0] px-8 pt-10 pb-8 flex flex-col items-center text-center">
          <div className="w-[54px] h-[54px] bg-[#0b51c1] rounded-2xl flex items-center justify-center mb-5 shadow-md">
            <img 
              src="https://cdn.prod.website-files.com/699f24e36021db019f687184/69e257e8038fa05062776263_Container.svg" 
              alt="Support" 
              className="w-[28px] h-[28px]" 
            />
          </div>
          <h1 className="text-[28px] font-bold text-[#000000] tracking-tight">Callavan Support</h1>
          <div className="w-10 h-[2px] bg-gray-300 mt-5 rounded-full"></div>
        </div>

        {/* Bottom Half (White) */}
        <div className="bg-white px-8 pt-8 pb-10 flex flex-col items-center text-center">
          <h3 className="text-[15px] font-medium text-gray-700 mb-8 max-w-[420px] leading-relaxed">
            If you need any help or have any questions, feel free to contact us and we’ll get back to you.
          </h3>
          
          <a 
            href="mailto:support@callavan.live?subject=Callavan%20Customer%20Support"
            className="w-full max-w-[460px] flex items-center justify-between bg-[#f0f0f0] hover:bg-[#e4e4e4] transition-colors rounded-[12px] p-4 cursor-pointer text-decoration-none group shadow-sm"
          >
            <div className="flex items-center gap-3">
              <img 
                src="https://cdn.prod.website-files.com/699f24e36021db019f687184/69e257e89c4e47c17f6aeb01_Container%20(1).svg" 
                width="22" 
                alt="Email" 
              />
              <span className="text-gray-900 font-medium text-[15px]">support@callavan.live</span>
            </div>
            <img 
              src="https://cdn.prod.website-files.com/699f24e36021db019f687184/69e25e39529b4ce0c8e3f35f_Icon.svg" 
              alt="Arrow" 
              className="opacity-50 group-hover:opacity-100 transition-opacity translate-x-0 group-hover:translate-x-1 duration-300" 
            />
          </a>
        </div>

      </div>
    </div>
  );
}
