'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Sidebar navigation component.
 * Provides consistent menu styling and handles mobile responsiveness.
 */
export default function Sidebar({ 
    role, 
    isOpen, 
    onClose 
}: { 
    role: string | null,
    isOpen?: boolean,
    onClose?: () => void
}) {
    const pathname = usePathname();
    const safeRole = role || 'user';
    const isAdmin = safeRole === 'admin' || safeRole === 'superadmin';
    const isSuperAdmin = safeRole === 'superadmin';
    const basePath = isAdmin ? '/admin' : '/user';

    const menuItems = [
        { label: 'หน้าหลัก', href: basePath },
        { label: 'ข้อมูลส่วนตัว', href: `${basePath}/profile` },
    ];

    if (isAdmin) {
        menuItems.push({ label: 'คำขอเข้าถึงข้อมูล', href: '/admin/requests' });
    }

    if (isSuperAdmin) {
        menuItems.push({ label: 'จัดการผู้ใช้', href: '/admin/users' });
    }

    return (
        <>
            {/* Mobile Backdrop */}
            <div 
                className={`fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            ></div>

            {/* Sidebar Container */}
            <aside className={`fixed lg:static inset-y-0 left-0 w-72 bg-white border-r border-slate-200 flex flex-col shadow-xl lg:shadow-none z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} shrink-0`}>
                {/* Header / Logo section */}
                <div className="p-6 h-20 flex items-center justify-between border-b border-slate-100">
                    <Link href={basePath} className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs group-hover:scale-105 transition-transform">
                            PM
                        </div>
                        <span className="text-xl font-black text-slate-800 tracking-tight">{isAdmin ? 'Admin' : 'User'} Panel</span>
                    </Link>
                    <button 
                        onClick={onClose}
                        className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Navigation links */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">
                        เมนูหลัก
                    </div>
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link 
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={`flex items-center px-4 py-3 rounded-xl font-bold transition-all ${
                                    isActive 
                                        ? 'bg-blue-50 text-blue-600 shadow-sm' 
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer section (Optional) */}
                <div className="p-4 border-t border-slate-100">
                    <div className="bg-slate-50 rounded-2xl p-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">สถานะของคุณ</p>
                        <p className="text-sm font-black text-slate-700 uppercase">{safeRole}</p>
                    </div>
                </div>
            </aside>
        </>
    );
}