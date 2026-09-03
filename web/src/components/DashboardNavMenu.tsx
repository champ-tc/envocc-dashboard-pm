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
                className="btn btn-square h-12 w-12 cursor-pointer rounded-2xl border-white/15 bg-white/10 text-white shadow-sm hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
            >
                <Image
                    src="/img/home.png"
                    alt=""
                    width={20}
                    height={20}
                    className="size-5 object-contain brightness-0 invert"
                    aria-hidden="true"
                />
            </summary>

            <ul aria-label="เลือกหน้า" className="dropdown-content menu mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-base-300 bg-base-100 p-2 text-base-content shadow-lg motion-reduce:transition-none">
                {navItems.map(({ href, label, icon }) => (
                    <li key={href}>
                    <Link
                        href={href}
                        aria-current={pathname === href ? 'page' : undefined}
                        onClick={() => { if (menu.current) menu.current.open = false; }}
                        className={`min-h-11 cursor-pointer gap-3 rounded-xl hover:bg-base-200 focus-visible:outline-2 focus-visible:outline-neutral ${pathname === href ? 'bg-base-200 font-semibold' : ''}`}
                    >
                        <Image
                            src={icon}
                            alt=""
                            width={20}
                            height={20}
                            className="size-5 shrink-0 object-contain"
                            aria-hidden="true"
                        />
                        <span>{label}</span>
                    </Link>
                    </li>
                ))}
            </ul>
        </details>
    );
}
