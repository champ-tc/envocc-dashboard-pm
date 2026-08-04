'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';

import DashboardNavMenu from '@/components/DashboardNavMenu';

export type DashboardNavbarLogo = {
    src: string;
    alt: string;
    fill?: boolean;
    sizes?: string;
    wrapperClassName?: string;
    imageClassName?: string;
};

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
        <header className={`flex shrink-0 flex-col justify-between gap-4 md:flex-row md:items-center ${className}`}>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-4">
                    {logos.map((logo) => (
                        <div
                            key={logo.src}
                            className={logo.wrapperClassName || 'shrink-0 rounded-2xl border border-white/50 bg-white p-1.5 shadow-2xl ring-4 ring-white/10'}
                        >
                            {logo.fill ? (
                                <Image
                                    src={logo.src}
                                    alt={logo.alt}
                                    fill
                                    sizes={logo.sizes}
                                    className={logo.imageClassName || 'rounded-xl object-contain'}
                                    priority
                                />
                            ) : (
                                <Image
                                    src={logo.src}
                                    alt={logo.alt}
                                    width={50}
                                    height={50}
                                    className={logo.imageClassName || 'rounded-xl object-contain'}
                                    style={{ width: 'auto', height: 'auto' }}
                                    priority
                                />
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex flex-col">
                    <h5 className={`text-lg font-extrabold leading-tight text-white md:text-xl ${titleClassName}`}>
                        {title}
                    </h5>
                    <p className={`text-xs font-bold uppercase tracking-widest text-blue-200 opacity-80 ${subtitleClassName}`}>
                        {subtitle}
                    </p>
                </div>
            </div>

            <DashboardNavMenu className={navClassName} />
        </header>
    );
}
