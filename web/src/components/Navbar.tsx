'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Menu, ShieldCheck } from 'lucide-react';

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
    const roleLabel = session?.role === 'superadmin'
        ? 'ผู้ดูแลระบบสูงสุด'
        : session?.role === 'adminenvocc'
            ? 'ผู้ดูแล EnvOcc'
            : session?.role === 'admin'
                ? 'ผู้ดูแลระบบ'
                : 'ผู้ใช้งาน';

    return (
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 shadow-sm shadow-slate-200/30 backdrop-blur-xl md:px-7">
            <div className="flex items-center gap-4">
                <button
                    type="button"
                    onClick={onToggleSidebar}
                    className="btn btn-square btn-ghost text-slate-600 lg:hidden"
                    aria-label="เปิดเมนู"
                >
                    <Menu className="size-5" />
                </button>
                
                <Link href={isUser ? "/user/main" : "/admin"} className="group flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                        <ShieldCheck className="size-5" />
                    </div>
                    <div className="hidden sm:block">
                        <p className="text-sm font-bold text-slate-900">ระบบฐานข้อมูล PM2.5</p>
                        <p className="text-xs text-slate-500">ศูนย์จัดการข้อมูลและผู้ใช้งาน</p>
                    </div>
                </Link>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden text-right sm:block">
                    <p className="max-w-48 truncate text-sm font-bold text-slate-900">{session?.name}</p>
                    <p className="text-xs font-medium text-slate-500">{roleLabel}</p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-sky-500 text-sm font-bold text-white shadow-md shadow-blue-200">
                    {session?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <button 
                    onClick={handleLogout} 
                    className="btn btn-ghost btn-sm gap-2 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                >
                    <LogOut className="size-4" />
                    <span className="hidden md:inline">ออกจากระบบ</span>
                </button>
            </div>
        </header>
    );
}
