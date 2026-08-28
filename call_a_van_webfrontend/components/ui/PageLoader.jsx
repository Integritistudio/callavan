// Full-screen loader for auth and map actions (separate from button loading states)

export default function PageLoader({ message = 'Loading...' }) {
  return (
    <div className="fixed inset-0 z-[10000] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl px-8 py-6 shadow-xl flex flex-col items-center gap-3 min-w-[180px]">
        <div className="w-10 h-10 border-4 border-[#0b51c1]/20 border-t-[#0b51c1] rounded-full animate-spin" />
        <p className="text-sm font-semibold text-gray-700 text-center">{message}</p>
      </div>
    </div>
  );
}
