'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Navbar({ 
    session, 
    onToggleSidebar 
}: { 
    session: any, 
    onToggleSidebar?: () => void 
}) {
    const router = useRouter();

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
    };

    const isUser = session?.role === 'user';
    const hasSidebar = session?.role === 'admin' || session?.role === 'superadmin';

    return (
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex justify-between items-center z-30 sticky top-0 h-20">
            <div className="flex items-center gap-4">
                {hasSidebar && (
                    <button 
                        onClick={onToggleSidebar}
                        className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                        aria-label="Toggle Sidebar"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                )}
                
                <Link href={isUser ? "/user/main" : "/admin"} className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs group-hover:scale-105 transition-transform">
                        PM
                    </div>
                    <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight hidden sm:block">ภาพรวมระบบ</h2>
                </Link>
            </div>

            <div className="flex items-center gap-3 md:gap-4">
                <div className="hidden xs:flex flex-col items-end">
                    <span className="text-slate-900 font-bold text-sm leading-tight">{session?.name}</span>
                    <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">{session?.role}</span>
                </div>
                <div className="w-px h-8 bg-slate-200 mx-1 md:mx-2"></div>
                <button 
                    onClick={handleLogout} 
                    className="text-red-600 bg-red-50 hover:bg-red-600 hover:text-white border border-red-100 font-bold px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm transition-all active:scale-95"
                >
                    ออกจากระบบ
                </button>
            </div>
        </header>
    );
}
