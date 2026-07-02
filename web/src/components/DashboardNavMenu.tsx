'use client';

import Link from 'next/link';
import { Activity, Database, Home, LayoutDashboard } from 'lucide-react';
import { useState } from 'react';

const navItems = [
    { href: '/', label: 'หน้าแรก', icon: Home },
    { href: '/dashboard/pm25', label: 'Dashboard ฝุ่น PM2.5', icon: Activity },
    { href: '/dashboard/hdc', label: 'Dashboard ผู้ป่วย HDC', icon: LayoutDashboard },
    { href: '/dashboard/dds', label: 'Dashboard ผู้ป่วย DDS', icon: Database },
];

export default function DashboardNavMenu({ className = '' }: { className?: string }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div
            className={`relative ${className}`}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
            onFocus={() => setIsOpen(true)}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                    setIsOpen(false);
                }
            }}
        >
            <button
                type="button"
                aria-label="เปิดเมนูนำทาง dashboard"
                className="bg-white/10 hover:bg-white/20 focus:bg-white/20 transition-all p-3.5 rounded-2xl border border-white/10 shadow-lg outline-none ring-1 ring-white/10"
            >
                <Home className={`w-5 h-5 text-white transition-transform ${isOpen ? 'scale-110' : ''}`} strokeWidth={2.5} />
            </button>

            <div className={`absolute right-full top-1/2 z-[220] flex -translate-y-1/2 items-center gap-2 pr-3 transition-all duration-200 ${isOpen ? 'pointer-events-auto translate-x-0 scale-100 opacity-100' : 'pointer-events-none translate-x-3 scale-95 opacity-0'}`}>
                {navItems.map(({ href, label, icon: Icon }, index) => (
                    <Link
                        key={href}
                        href={href}
                        aria-label={label}
                        title={label}
                        onClick={() => setIsOpen(false)}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-slate-950/90 text-white/80 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl transition-all hover:-translate-y-1 hover:bg-white/15 hover:text-white focus:-translate-y-1 focus:bg-white/15 focus:text-white focus:outline-none"
                        style={{ transitionDelay: `${index * 25}ms` }}
                    >
                        <Icon className="h-5 w-5" strokeWidth={2.4} />
                    </Link>
                ))}
            </div>
        </div>
    );
}
