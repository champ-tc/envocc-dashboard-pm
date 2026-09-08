'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
    CalendarDays,
    ChevronRight,
    CircleUserRound,
    CloudUpload,
    Database,
    FileCheck2,
    Gauge,
    LayoutDashboard,
    LogOut,
    MapPinned,
    UsersRound,
    X,
} from 'lucide-react';

type MenuItem = {
    label: string;
    href: string;
    icon: LucideIcon;
};

type MenuGroup = {
    label: string;
    items: MenuItem[];
};

export default function Sidebar({
    role,
    isOpen,
    onClose,
}: {
    role: string | null;
    isOpen?: boolean;
    onClose?: () => void;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const safeRole = role || 'user';
    const isAdmin = safeRole === 'admin' || safeRole === 'adminenvocc' || safeRole === 'admin_department' || safeRole === 'superadmin';
    const isSuperAdmin = safeRole === 'superadmin';
    const homePath = isAdmin ? '/admin' : '/user/main';
    const profilePath = isAdmin ? '/admin/profile' : '/user/profile';
    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
    };

    const menuGroups: MenuGroup[] = [
        {
            label: 'ทั่วไป',
            items: [
                { label: isAdmin ? 'ภาพรวมระบบ' : 'หน้าแรก', href: homePath, icon: LayoutDashboard },
                { label: 'ข้อมูลส่วนตัว', href: profilePath, icon: CircleUserRound },
            ],
        },
    ];

    if (!isAdmin) {
        menuGroups.push({
            label: 'ขอข้อมูล',
            items: [
                { label: 'ขอข้อมูล PM2.5', href: '/user/pm25', icon: Gauge },
                { label: 'ขอข้อมูล Stations', href: '/user/stations', icon: MapPinned },
                { label: 'ขอข้อมูล BigData (HDC)', href: '/user/hdc', icon: Database },
                { label: 'ขอข้อมูล DDS', href: '/user/dds', icon: FileCheck2 },
            ],
        });
    }

    if (isAdmin) {
        menuGroups.push({
            label: 'การอนุมัติ',
            items: [
                { label: 'คำขอเข้าถึงข้อมูล', href: '/admin/requests', icon: FileCheck2 },
            ],
        });
    }

    if (isSuperAdmin) {
        menuGroups.push({
            label: 'จัดการระบบ',
            items: [
                { label: 'จัดการผู้ใช้', href: '/admin/users', icon: UsersRound },
                { label: 'จัดการสถานี', href: '/admin/stations', icon: MapPinned },
            ],
        });
        menuGroups.push({
            label: 'จัดการข้อมูล',
            items: [
                { label: 'ค่าฝุ่นรายชั่วโมง', href: '/admin/pm25-hourly', icon: Gauge },
                { label: 'ค่าฝุ่นรายวัน', href: '/admin/pm25-daily', icon: CalendarDays },
                { label: 'อัปโหลดข้อมูล DDS', href: '/admin/dds-upload', icon: CloudUpload },
                { label: 'ดาวน์โหลดข้อมูล HDC', href: '/admin/hdc-download', icon: Database },
            ],
        });
    }

    const isItemActive = (href: string) => {
        if (href === '/admin' || href === '/user/main') return pathname === href;
        return pathname === href || pathname.startsWith(`${href}/`);
    };

    return (
        <>
            <div
                className={`fixed inset-0 z-40 bg-slate-900/25 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
                    isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
                onClick={onClose}
            />

            <aside
                className={`fixed inset-y-0 left-0 z-50 flex w-[260px] shrink-0 transform flex-col overflow-hidden border-r border-slate-200/80 bg-white text-slate-700 shadow-2xl shadow-slate-900/10 transition-transform duration-300 ease-out lg:static lg:translate-x-0 lg:shadow-none ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="relative flex items-center justify-between px-6 pb-6 pt-8">
                    <Link href={homePath} className="group flex min-w-0 items-center gap-3" onClick={onClose}>
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-green-200 bg-green-50 p-1 transition-transform group-hover:scale-105">
                            <Image
                                src="/img/pm.png"
                                alt="ENV-OCC"
                                width={32}
                                height={32}
                                className="h-full w-full rounded-full object-contain"
                            />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-[15px] font-bold leading-tight tracking-tight text-slate-900">ENV-OCC</p>
                            <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-sky-600">DATA PLATFORM</p>
                        </div>
                    </Link>

                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-circle btn-ghost btn-sm text-slate-400 hover:bg-blue-50 hover:text-blue-600 lg:hidden"
                        aria-label="ปิดเมนู"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                <nav className="relative flex-1 space-y-7 overflow-y-auto px-4 py-2">
                    {menuGroups.map((group) => (
                        <section key={group.label}>
                            <p className="mb-1 px-3 text-[11px] font-medium text-slate-400">
                                {group.label}
                            </p>
                            <div className="space-y-0.5">
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = isItemActive(item.href);

                                    return (
                                        <Link
                                            key={`${group.label}-${item.label}`}
                                            href={item.href}
                                            onClick={onClose}
                                            aria-current={isActive ? 'page' : undefined}
                                            className={`group relative flex min-h-10 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                                                isActive
                                                    ? 'border border-blue-100/50 bg-blue-50 text-blue-700'
                                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                            }`}
                                        >
                                            <span
                                                className={`flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                                    isActive
                                                    ? 'text-blue-600'
                                                    : 'bg-transparent text-slate-400 group-hover:text-blue-600'
                                                }`}
                                            >
                                                <Icon className="size-4" strokeWidth={2} />
                                            </span>
                                            <span className="min-w-0 flex-1 truncate text-[14px]">{item.label}</span>
                                            <ChevronRight
                                                className={`size-4 transition-all ${
                                                    isActive
                                                        ? 'translate-x-0 text-blue-100 opacity-100'
                                                        : '-translate-x-1 text-blue-400 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                                                }`}
                                            />
                                        </Link>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </nav>

                <div className="border-t border-slate-100 p-3">
                    <button type="button" onClick={handleLogout} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-600">
                        <LogOut className="size-4" />
                        <span>ออกจากระบบ</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
