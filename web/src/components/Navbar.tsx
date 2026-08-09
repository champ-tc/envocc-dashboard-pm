'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, LogOut, Menu } from 'lucide-react';

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
        : session?.role === 'admin_department'
            ? 'ผู้ดูแลระบบระดับกรม'
        : session?.role === 'adminenvocc'
            ? 'ผู้ดูแล EnvOcc'
        : session?.role === 'admin'
            ? 'ผู้ดูแลระบบ'
        : session?.role === 'admin_region'
            ? 'ผู้ดูแลระบบระดับเขต'
        : session?.role === 'admin_province'
            ? 'ผู้ดูแลระบบระดับจังหวัด'
                : 'ผู้ใช้งาน';

    return (
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-2xl md:px-8">
            <div className="flex items-center gap-4">
                <button
                    type="button"
                    onClick={onToggleSidebar}
                    className="btn btn-square btn-ghost rounded-2xl text-slate-600 lg:hidden"
                    aria-label="เปิดเมนู"
                >
                    <Menu className="size-5" />
                </button>
                
                <Link href={isUser ? "/user/main" : "/admin"} className="group hidden items-center gap-3 sm:flex">
                    <div>
                        <p className="text-compact-plus font-semibold uppercase tracking-menu-label text-blue-600">ENV-OCC DATA CENTER</p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-700">ระบบฐานข้อมูลสุขภาพและสิ่งแวดล้อม</p>
                    </div>
                </Link>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
                <button type="button" className="btn btn-circle btn-ghost btn-sm relative text-slate-500 hover:bg-blue-50 hover:text-blue-700" aria-label="การแจ้งเตือน">
                    <Bell className="size-[18px]" />
                    <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-blue-500 ring-2 ring-white" />
                </button>
                <div className="mx-1 hidden h-8 w-px bg-slate-200 sm:block" />
                <div className="hidden text-right sm:block">
                    <p className="max-w-48 truncate text-sm font-semibold text-slate-800">{session?.name}</p>
                    <p className="text-xs font-medium text-blue-600">{roleLabel}</p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold text-white shadow-sm">
                    {session?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <button 
                    onClick={handleLogout} 
                    className="btn btn-ghost btn-sm gap-2 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                    <LogOut className="size-4" />
                    <span className="hidden md:inline">ออกจากระบบ</span>
                </button>
            </div>
        </header>
    );
}
