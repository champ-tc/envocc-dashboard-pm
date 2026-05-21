export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="flex-1 flex flex-col">
        {children}
      </div>

      <footer className="w-full mt-auto py-6 text-center px-4 relative z-10 bg-white/60 backdrop-blur-md border-t border-slate-100">
        <p className="text-xs font-bold text-slate-500 tracking-wide flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2">
            <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            โดย กลุ่มเฝ้าระวังและตอบโต้ภาวะฉุกเฉิน กองโรคจากการประกอบอาชีพและสิ่งแวดล้อม 
            <span className="text-blue-600 font-extrabold">กรมควบคุมโรค</span>
        </p>
      </footer>
    </div>
  );
}
