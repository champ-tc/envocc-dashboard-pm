'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

const navItems = [
    { href: '/', label: 'หน้าแรก', icon: '/img/home.png' },
    { href: '/dashboard/pm25', label: 'PM2.5', icon: '/img/pm.png' },
    { href: '/dashboard/hdc', label: 'HDC', icon: '/img/hdc.png' },
    { href: '/dashboard/dds', label: 'DDS', icon: '/img/ddc.png' },
    { href: '/login', label: 'เข้าสู่ระบบ', icon: '/img/login.png', divider: true },
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
    const pathname = usePathname();

    const isActive = (href: string) => href === '/'
        ? pathname === href
        : pathname === href || pathname.startsWith(`${href}/`);

    return (
        <nav aria-label="เมนูหลัก" className={`max-w-full shrink-0 overflow-x-auto ${className}`}>
            <ul className="flex min-w-max items-stretch text-white">
                {navItems.map(({ href, label, icon, divider }) => {
                    const active = isActive(href);
                    return (
                        <li key={href} className={divider ? 'ml-2 border-l border-white/20 pl-2' : ''}>
                            <Link
                                href={href}
                                aria-current={active ? 'page' : undefined}
                                className="group relative flex min-h-16 min-w-[3.75rem] cursor-pointer flex-col items-center justify-center gap-0.5 px-2.5 text-white/75 transition-colors hover:text-white focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none sm:min-w-[4.5rem] sm:px-3"
                            >
                                <span aria-hidden="true" className={`absolute right-2.5 top-1.5 size-1.5 rounded-full bg-red-500 shadow-[0_0_0_2px_rgb(51_130_200)] transition-opacity motion-reduce:transition-none ${active ? 'opacity-100' : 'opacity-0'}`} />
                                <Image src={icon} alt="" width={22} height={22} className={`size-[1.375rem] object-contain brightness-0 invert transition-opacity motion-reduce:transition-none ${active ? 'opacity-100' : 'opacity-75 group-hover:opacity-100'}`} aria-hidden="true" />
                                <span className={`typo-chart whitespace-nowrap ${active ? 'text-white' : ''}`}>{label}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
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
        <header className={`head flex shrink-0 flex-col justify-between gap-4 md:flex-row md:items-center has-[details[open]]:z-dashboard-nav ${className}`}>
            <div className="flex min-w-0 flex-1 items-center gap-4">
                <div className={`flex items-center ${logos.length > 1 ? 'h-16 gap-2 rounded-2xl border border-white/60 bg-white px-2.5 py-1.5 shadow-2xl ring-4 ring-white/10 sm:h-20 sm:gap-3.5 sm:px-3.5' : 'gap-4'}`}>
                    {logos.map((logo, index) => (
                        <Fragment key={logo.src}>
                            {index > 0 && logos.length > 1 && (
                                <span aria-hidden="true" className="h-9 w-px shrink-0 bg-slate-300 sm:h-12" />
                            )}
                            <div
                                className={logos.length > 1
                                    ? `relative shrink-0 overflow-hidden ${logo.wrapperClassName || 'h-13 w-16 sm:h-18 sm:w-24'}`
                                    : `relative z-20 h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-white/50 bg-white p-1.5 shadow-2xl ring-4 ring-white/10 sm:h-14 sm:w-14 ${logo.wrapperClassName || ''}`}
                            >
                                {logo.fill ? (
                                    <Image src={logo.src} alt={logo.alt} fill sizes={logo.sizes || '(min-width: 640px) 120px, 80px'} className={`rounded-xl object-contain ${logo.imageClassName || 'p-0.5'}`} priority />
                                ) : (
                                    <Image src={logo.src} alt={logo.alt} width={72} height={72} className={`h-full w-full rounded-xl object-contain ${logo.imageClassName || 'p-1'}`} priority />
                                )}
                            </div>
                        </Fragment>
                    ))}
                </div>

                <div className="min-w-0 flex-1">
                    <h5 className={`typo-head head truncate whitespace-nowrap text-white ${titleClassName}`}>{title}</h5>
                    <p className={`typo-caption truncate whitespace-nowrap uppercase text-blue-200 opacity-80 ${subtitleClassName}`}>{subtitle}</p>
                </div>
            </div>

            <DashboardNavMenu className={navClassName} />
        </header>
    );
}
