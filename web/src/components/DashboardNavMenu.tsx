'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const navItems = [
    { href: '/', label: 'หน้าแรก', icon: '/img/home.png' },
    { href: '/dashboard/pm25', label: 'Dashboard ฝุ่น PM2.5', icon: '/img/pm.png' },
    { href: '/dashboard/hdc', label: 'Dashboard ผู้ป่วย HDC', icon: '/img/hdc.png' },
    { href: '/dashboard/dds', label: 'Dashboard ผู้ป่วย DDS', icon: '/img/ddc.png' },
    { href: '/login', label: 'เข้าสู่ระบบ', icon: '/img/login.png' },
];

export default function DashboardNavMenu({ className = '' }: { className?: string }) {
    const menu = useRef<HTMLDetailsElement>(null);
    const pathname = usePathname();
    const currentItem = navItems.find(item => item.href === pathname);

    useEffect(() => {
        const closeOutside = (event: PointerEvent) => {
            if (menu.current?.open && event.target instanceof Node && !menu.current.contains(event.target)) {
                menu.current.open = false;
            }
        };
        document.addEventListener('pointerdown', closeOutside);
        return () => document.removeEventListener('pointerdown', closeOutside);
    }, []);

    return (
        <details
            ref={menu}
            className={`dropdown dropdown-end z-dashboard-nav shrink-0 self-end md:self-auto ${className}`}
            onKeyDown={(event) => {
                if (event.key === 'Escape' && event.currentTarget.open) {
                    event.preventDefault();
                    event.currentTarget.open = false;
                    event.currentTarget.querySelector('summary')?.focus();
                }
            }}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                    event.currentTarget.open = false;
                }
            }}
        >
            <summary
                aria-label="เปิดเมนูนำทาง dashboard"
                className="btn h-12 min-h-12 min-w-12 cursor-pointer gap-2 rounded-2xl border-white/30 bg-slate-950/75 px-3 text-white shadow-lg ring-1 ring-white/10 hover:border-white/50 hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
            >
                <Image
                    src="/img/home.png"
                    alt=""
                    width={20}
                    height={20}
                    className="size-5 object-contain brightness-0 invert"
                    aria-hidden="true"
                />
                <span className="hidden text-sm font-semibold sm:inline">เมนู</span>
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="size-4 opacity-70"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.51a.75.75 0 0 1-1.08 0l-4.25-4.51a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" /></svg>
            </summary>

            <div className="dropdown-content mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-600 bg-slate-900 p-0 text-white shadow-2xl shadow-slate-950/50 ring-1 ring-white/20 motion-reduce:transition-none">
                <div className="border-b border-slate-700 bg-slate-800 px-4 py-3">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-blue-300">ไปยังหน้า</p>
                    <p className="mt-1 truncate text-sm font-semibold text-white">{currentItem?.label ?? 'เมนู Dashboard'}</p>
                </div>
                <ul aria-label="เลือกหน้า" className="menu gap-1 bg-slate-900 p-2">
                {navItems.map(({ href, label, icon }) => (
                    <li key={href}>
                    <Link
                        href={href}
                        aria-current={pathname === href ? 'page' : undefined}
                        onClick={() => { if (menu.current) menu.current.open = false; }}
                        className={`min-h-12 cursor-pointer gap-3 rounded-xl text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white ${pathname === href ? 'bg-blue-500/20 font-semibold text-white ring-1 ring-blue-300/25' : ''}`}
                    >
                        <Image
                            src={icon}
                            alt=""
                            width={20}
                            height={20}
                            className="size-5 shrink-0 object-contain brightness-0 invert opacity-90"
                            aria-hidden="true"
                        />
                        <span>{label}</span>
                    </Link>
                    </li>
                ))}
                </ul>
            </div>
        </details>
    );
}
