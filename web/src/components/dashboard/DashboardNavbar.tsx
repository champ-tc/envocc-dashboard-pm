'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Fragment, useEffect, useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

const navItems = [
    { href: '/', label: 'หน้าแรก', icon: '/img/home.png' },
    { href: '/dashboard/pm25', label: 'Dashboard ฝุ่น PM2.5', icon: '/img/pm.png' },
    { href: '/dashboard/hdc', label: 'Dashboard ผู้ป่วย HDC', icon: '/img/hdc.png' },
    { href: '/dashboard/dds', label: 'Dashboard ผู้ป่วย DDS', icon: '/img/ddc.png' },
    { href: '/login', label: 'เข้าสู่ระบบ', icon: '/img/login.png' },
];

export type DashboardNavbarLogo = {
    src: string;
    alt: string;
    fill?: boolean;
    sizes?: string;
    wrapperClassName?: string;
    imageClassName?: string;
};

function DashboardNavMenu({ className = '' }: { className?: string }) {
    const menu = useRef<HTMLDetailsElement>(null);
    const pathname = usePathname();
    const currentItem = navItems.find((item) => item.href === pathname);

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
                className="typo-label btn h-12 min-h-12 min-w-12 cursor-pointer gap-2 rounded-2xl border-white/30 bg-slate-950/75 px-3 text-white shadow-lg ring-1 ring-white/10 hover:border-white/50 hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
            >
                <Image src="/img/home.png" alt="" width={20} height={20} className="size-5 object-contain brightness-0 invert" aria-hidden="true" />
                <span className="typo-label hidden sm:inline">เมนู</span>
                <ChevronDown aria-hidden="true" className="size-4 opacity-70" />
            </summary>

            <div className="dropdown-content mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-600 bg-slate-900 p-0 text-white shadow-2xl shadow-slate-950/50 ring-1 ring-white/20 motion-reduce:transition-none">
                <div className="border-b border-slate-700 bg-slate-800 px-4 py-3">
                    <p className="typo-chart uppercase text-blue-300">ไปยังหน้า</p>
                    <p className="typo-label mt-1 truncate text-white">{currentItem?.label ?? 'เมนู Dashboard'}</p>
                </div>
                <ul aria-label="เลือกหน้า" className="menu gap-1 bg-slate-900 p-2">
                    {navItems.map(({ href, label, icon }) => (
                        <li key={href}>
                            <Link
                                href={href}
                                aria-current={pathname === href ? 'page' : undefined}
                                onClick={() => { if (menu.current) menu.current.open = false; }}
                                className={`typo-label min-h-12 cursor-pointer gap-3 rounded-xl text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white ${pathname === href ? 'bg-blue-500/20 text-white ring-1 ring-blue-300/25' : ''}`}
                            >
                                <Image src={icon} alt="" width={20} height={20} className="size-5 shrink-0 object-contain brightness-0 invert opacity-90" aria-hidden="true" />
                                <span>{label}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </details>
    );
}

export default function DashboardNavbar({
    logos,
    title,
    subtitle,
    className = '',
    titleClassName = '',
    subtitleClassName = '',
    navClassName = 'self-end md:self-auto',
}: {
    logos: DashboardNavbarLogo[];
    title: ReactNode;
    subtitle: ReactNode;
    className?: string;
    titleClassName?: string;
    subtitleClassName?: string;
    navClassName?: string;
}) {
    return (
        <header className={`flex shrink-0 flex-col justify-between gap-4 md:flex-row md:items-center has-[details[open]]:z-dashboard-nav ${className}`}>
            <div className="flex items-center gap-4">
                <div className={`flex items-center ${logos.length > 1 ? 'h-12 gap-2 rounded-2xl border border-white/60 bg-white px-2 py-1.5 shadow-2xl ring-4 ring-white/10 sm:h-14 sm:gap-3 sm:px-3' : 'gap-4'}`}>
                    {logos.map((logo, index) => (
                        <Fragment key={logo.src}>
                            {index > 0 && logos.length > 1 && (
                                <span aria-hidden="true" className="h-8 w-px shrink-0 bg-slate-300 sm:h-10" />
                            )}
                            <div
                                className={logos.length > 1
                                    ? 'relative h-9 w-16 shrink-0 overflow-hidden sm:h-11 sm:w-20'
                                    : `relative z-20 h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-white/50 bg-white p-1.5 shadow-2xl ring-4 ring-white/10 sm:h-14 sm:w-14 ${logo.wrapperClassName || ''}`}
                            >
                                {logo.fill ? (
                                    <Image src={logo.src} alt={logo.alt} fill sizes={logo.sizes || '(min-width: 640px) 56px, 48px'} className={`rounded-xl object-contain p-1 ${logo.imageClassName || ''}`} priority />
                                ) : (
                                    <Image src={logo.src} alt={logo.alt} width={56} height={56} className={`h-full w-full rounded-xl object-contain p-1 ${logo.imageClassName || ''}`} priority />
                                )}
                            </div>
                        </Fragment>
                    ))}
                </div>

                <div className="flex flex-col">
                    <h5 className={`typo-section text-white ${titleClassName}`}>{title}</h5>
                    <p className={`typo-caption uppercase text-blue-200 opacity-80 ${subtitleClassName}`}>{subtitle}</p>
                </div>
            </div>

            <DashboardNavMenu className={navClassName} />
        </header>
    );
}
