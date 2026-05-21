'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

import { useState, useEffect } from 'react';

export default function GuestNavbar() {
    const pathname = usePathname();
    const [scrolled, setScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu when resizing to desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setIsMobileMenuOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isLogin = pathname === '/login';
    const isRegister = pathname === '/register';
    const isHome = pathname === '/';

    const isTransparent = isHome && !scrolled && !isMobileMenuOpen;

    const navClasses = isTransparent
        ? 'bg-transparent border-transparent'
        : 'bg-white/95 backdrop-blur-md border-slate-200/50 shadow-sm';

    const textColor = isTransparent ? 'text-white' : 'text-slate-900';
    const linkColor = isTransparent ? 'text-white/90 hover:text-white' : 'text-slate-600 hover:text-blue-600';

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 border-b transition-all duration-300 ${navClasses}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16 md:h-20">
                    {/* Logo Segment */}
                    <div className="shrink-0 flex items-center">
                        <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
                            <div className="w-[60px] h-[36px] sm:w-[84px] sm:h-[48px] relative flex items-center justify-center">
                                <Image
                                    src="/img/Logo_ddc.png"
                                    alt="DDC Logo"
                                    fill
                                    sizes="(max-width: 640px) 60px, 84px"
                                    className="object-contain"
                                    priority
                                />
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <div className="px-2 sm:px-3 h-7 sm:h-10 rounded-lg sm:rounded-xl bg-linear-to-br from-blue-600 to-sky-500 flex items-center justify-center text-white font-bold text-sm sm:text-xl shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
                                    PM2.5
                                </div>
                                <span className={`font-extrabold text-base sm:text-2xl tracking-tight transition-colors whitespace-nowrap ${textColor}`}>
                                    Patient Situation
                                </span>
                            </div>
                        </Link>
                    </div>

                    {/* Navigation Links - Desktop */}
                    <div className="hidden md:flex items-center space-x-6">
                        <Link
                            href="/dashboard/pm25"
                            className={`font-medium transition-colors ${linkColor}`}
                        >
                            Dashboard ฝุ่น PM2.5
                        </Link>

                        {/* Dropdown Dashboard ป่วยฝุ่น */}
                        <div className="relative group" onMouseEnter={() => setIsDropdownOpen(true)} onMouseLeave={() => setIsDropdownOpen(false)}>
                            <button
                                className={`flex items-center gap-1 font-medium transition-colors ${linkColor} outline-none cursor-default`}
                            >
                                Dashboard ผู้ป่วย
                                <svg className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {isDropdownOpen && (
                                <div className="absolute top-full left-0 pt-2 w-48 z-60 transition-all animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className={`rounded-2xl shadow-xl border border-slate-100 overflow-hidden py-2 ${isTransparent ? 'bg-white/95 backdrop-blur-md' : 'bg-white'}`}>
                                        <Link href="/dashboard/hdc" className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-all font-medium">
                                            Health Data Center (HDC)
                                        </Link>
                                        <Link href="/dashboard/dds" className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-all font-medium">
                                            Digital Disease Surveillance (DDS)
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={`h-6 w-px ${isTransparent ? 'bg-white/20' : 'bg-slate-200'}`}></div>

                        {isLogin ? (
                            <Link
                                href="/register"
                                className="cloud font-medium text-white transition-all text-sm h-[50px]! aspect-[1.8]! flex items-center justify-center"
                            >
                                ลงทะเบียน
                            </Link>
                        ) : isRegister ? (
                            <Link
                                href="/login"
                                className={`inline-flex items-center justify-center px-6 py-2.5 bg-white border border-slate-200 font-medium rounded-full hover:bg-slate-50 shadow-sm transition-all text-sm ${isTransparent ? 'text-slate-900 border-white' : 'text-slate-900 border-slate-200'}`}
                            >
                                เข้าสู่ระบบ
                            </Link>
                        ) : (
                            <div className="flex items-center space-x-4">
                                <Link
                                    href="/login"
                                    className={`font-medium transition-colors text-sm ${linkColor}`}
                                >
                                    เข้าสู่ระบบ
                                </Link>
                                <Link
                                    href="/register"
                                    className="cloud font-medium text-white transition-all text-sm h-[50px]! aspect-[1.8]! flex items-center justify-center"
                                >
                                    ลงทะเบียน
                                </Link>
                            </div>
                        )}
                    </div>

                    <div className="md:hidden flex items-center">
                        <button 
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className={`p-2 transition-colors ${textColor} outline-none`}
                            aria-label="Toggle menu"
                        >
                            {isMobileMenuOpen ? (
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-white border-t border-slate-100 animate-in slide-in-from-top duration-300">
                    <div className="px-4 pt-2 pb-6 space-y-1 shadow-lg">
                        <Link
                            href="/dashboard/pm25"
                            className="block px-3 py-3 rounded-xl text-base font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Dashboard ฝุ่น PM2.5
                        </Link>
                        
                        <div className="py-2">
                            <div className="px-3 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Dashboard ผู้ป่วย
                            </div>
                            <Link
                                href="/dashboard/hdc"
                                className="block px-3 py-3 rounded-xl text-base font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Health Data Center (HDC)
                            </Link>
                            <Link
                                href="/dashboard/dds"
                                className="block px-3 py-3 rounded-xl text-base font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Digital Disease Surveillance (DDS)
                            </Link>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                            <Link
                                href="/login"
                                className="w-full flex items-center justify-center px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                เข้าสู่ระบบ
                            </Link>
                            <Link
                                href="/register"
                                className="w-full flex items-center justify-center px-4 py-3 bg-linear-to-r from-blue-600 to-sky-500 rounded-xl font-bold text-white shadow-lg shadow-blue-500/20"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                ลงทะเบียน
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}