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
    adminenvocc: 'ผู้ดูแล EnvOcc',
    admin: 'ผู้ดูแลระบบ',
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
    const isAdmin = safeRole === 'admin' || safeRole === 'adminenvocc' || safeRole === 'superadmin';
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
                className={`fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
                    isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
                onClick={onClose}
            />

            <aside
                className={`fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 transform flex-col overflow-hidden border-r border-slate-800 bg-slate-950 text-slate-100 shadow-2xl transition-transform duration-300 ease-out lg:static lg:translate-x-0 lg:shadow-none ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-linear-to-b from-blue-600/20 via-sky-500/5 to-transparent" />

                <div className="relative flex h-24 items-center justify-between border-b border-white/10 px-5">
                    <Link href={homePath} className="group flex min-w-0 items-center gap-3" onClick={onClose}>
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white p-1.5 shadow-lg shadow-blue-950/50 ring-1 ring-white/20 transition-transform group-hover:scale-105">
                            <Image
                                src="/img/ddc-logo.png"
                                alt="กรมควบคุมโรค"
                                width={40}
                                height={40}
                                className="h-full w-full rounded-xl object-contain"
                            />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-white">PM2.5 Patient</p>
                            <p className="truncate text-xs font-medium text-slate-400">ระบบจัดการข้อมูล</p>
                        </div>
                    </Link>

                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-circle btn-ghost btn-sm text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
                        aria-label="ปิดเมนู"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                <nav className="relative flex-1 space-y-6 overflow-y-auto px-4 py-5">
                    {menuGroups.map((group) => (
                        <section key={group.label}>
                            <p className="mb-2 px-3 text-[11px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
                                {group.label}
                            </p>
                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = isItemActive(item.href);

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={onClose}
                                            aria-current={isActive ? 'page' : undefined}
                                            className={`group relative flex min-h-12 items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 ${
                                                isActive
                                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/40 ring-1 ring-blue-400/30'
                                                    : 'text-slate-300 hover:bg-white/7 hover:text-white'
                                            }`}
                                        >
                                            <span
                                                className={`flex size-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                                                    isActive
                                                        ? 'bg-white/15 text-white'
                                                        : 'bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-blue-300'
                                                }`}
                                            >
                                                <Icon className="size-[18px]" strokeWidth={2} />
                                            </span>
                                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                                            <ChevronRight
                                                className={`size-4 transition-all ${
                                                    isActive
                                                        ? 'translate-x-0 text-blue-100 opacity-100'
                                                        : '-translate-x-1 text-slate-500 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                                                }`}
                                            />
                                        </Link>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </nav>

                <div className="relative border-t border-white/10 p-4">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20">
                                <ShieldCheck className="size-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-medium text-slate-500">สิทธิ์การใช้งาน</p>
                                <p className="truncate text-sm font-bold text-slate-100">
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
