'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
    MapPinned,
    ShieldCheck,
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

const roleLabels: Record<string, string> = {
    superadmin: 'ผู้ดูแลระบบสูงสุด',
    admin_department: 'ผู้ดูแลระบบระดับกรม',
    adminenvocc: 'ผู้ดูแล EnvOcc',
    admin: 'ผู้ดูแลระบบ',
    admin_region: 'ผู้ดูแลระบบระดับเขต',
    admin_province: 'ผู้ดูแลระบบระดับจังหวัด',
    user: 'ผู้ใช้งาน',
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
    const safeRole = role || 'user';
    const isAdmin = safeRole === 'admin' || safeRole === 'adminenvocc' || safeRole === 'admin_department' || safeRole === 'superadmin';
    const isSuperAdmin = safeRole === 'superadmin';
    const homePath = isAdmin ? '/admin' : '/user/main';
    const profilePath = isAdmin ? '/admin/profile' : '/user/profile';

    const menuGroups: MenuGroup[] = [
        {
            label: 'ทั่วไป',
            items: [
                { label: 'ภาพรวมระบบ', href: homePath, icon: LayoutDashboard },
                { label: 'ข้อมูลส่วนตัว', href: profilePath, icon: CircleUserRound },
            ],
        },
    ];

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
                className={`fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 transform flex-col overflow-hidden border-r border-slate-200/80 bg-white text-slate-700 shadow-2xl shadow-slate-900/10 transition-transform duration-300 ease-out lg:static lg:translate-x-0 lg:shadow-none ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="relative flex h-20 items-center justify-between border-b border-slate-100 px-4">
                    <Link href={homePath} className="group flex min-w-0 items-center gap-3" onClick={onClose}>
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 p-1.5 ring-1 ring-blue-100 transition-transform group-hover:scale-105">
                            <Image
                                src="/img/ddc-logo-optimized.png"
                                alt="กรมควบคุมโรค"
                                width={34}
                                height={34}
                                className="h-full w-full rounded-xl object-contain"
                            />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-base font-bold tracking-tight text-slate-900">ENV-OCC</p>
                            <p className="truncate text-compact-plus font-semibold tracking-wider text-blue-600">DATA PLATFORM</p>
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

                <nav className="relative flex-1 space-y-3 overflow-y-auto px-3 py-3">
                    {menuGroups.map((group) => (
                        <section key={group.label}>
                            <p className="mb-1 px-3 text-compact font-semibold tracking-menu-label text-slate-400 uppercase">
                                {group.label}
                            </p>
                            <div className="space-y-0.5">
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = isItemActive(item.href);

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={onClose}
                                            aria-current={isActive ? 'page' : undefined}
                                            className={`group relative flex min-h-10 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                                                isActive
                                                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                                            }`}
                                        >
                                            <span
                                                className={`flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                                    isActive
                                                        ? 'bg-blue-500 text-white'
                                                        : 'bg-transparent text-slate-400 group-hover:text-blue-600'
                                                }`}
                                            >
                                                <Icon className="size-4" strokeWidth={2} />
                                            </span>
                                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
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

                <div className="relative border-t border-slate-100 p-3">
                    <div className="rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-200">
                                <ShieldCheck className="size-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-compact-plus font-medium text-slate-500">สิทธิ์การใช้งาน</p>
                                <p className="truncate text-sm font-bold text-slate-800">
                                    {roleLabels[safeRole] || safeRole}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
