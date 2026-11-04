'use client';

import React, { useState, useEffect } from 'react';

export type SkyTime = 'morning' | 'evening' | 'night';

const THAILAND_TIME_ZONE = 'Asia/Bangkok';

const thailandClock = new Intl.DateTimeFormat('en-GB', {
    timeZone: THAILAND_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
});

/**
 * คำนวณช่วงเวลาท้องฟ้าตามเวลาที่กำหนด
 * - เช้า: 06:00 - 15:00 (360 - 900 นาที)
 * - เย็น: 15:01 - 18:00 (901 - 1080 นาที)
 * - กลางคืน: 18:01 - 05:59 (1081 - 1439 หรือ 0 - 359 นาที)
 */
export function getSkyTime(date: Date = new Date()): SkyTime {
    // Always use Thailand time. `date.getHours()` uses the user's local
    // browser timezone, which can make production show the wrong sky state.
    const parts = thailandClock.formatToParts(date);
    const hour = Number(parts.find(part => part.type === 'hour')?.value ?? 0);
    const minute = Number(parts.find(part => part.type === 'minute')?.value ?? 0);
    const minutes = hour * 60 + minute;
    if (minutes >= 360 && minutes <= 900) {
        return 'morning';
    }
    if (minutes >= 901 && minutes <= 1080) {
        return 'evening';
    }
    return 'night';
}

/**
 * Hook ตรวจจับช่วงเวลาปัจจุบันของเครื่องผู้ใช้
 * และอัปเดตอัตโนมัติแบบเรียลไทม์ทุก 30 วินาที
 */
export function useSkyTime(forcedTime?: SkyTime): SkyTime {
    const [skyTime, setSkyTime] = useState<SkyTime>(() => forcedTime ?? getSkyTime());

    useEffect(() => {
        if (forcedTime) {
            setSkyTime(forcedTime);
            return;
        }

        // อัปเดตทันทีเมื่อ component mount บน client
        setSkyTime(getSkyTime());

        // ตรวจสอบทุกๆ 30 วินาทีเพื่อเปลี่ยนช่วงเวลาอัตโนมัติแบบไม่กระตุก
        const timer = setInterval(() => {
            const nextTime = getSkyTime();
            setSkyTime(prev => (prev !== nextTime ? nextTime : prev));
        }, 30000);

        return () => clearInterval(timer);
    }, [forcedTime]);

    return forcedTime ?? skyTime;
}

export interface OpenSkyBackgroundProps {
    /**
     * ระบุช่วงเวลาแบบกำหนดเอง (หากไม่ระบุจะคำนวณตามเวลาจริงอัตโนมัติ)
     */
    time?: SkyTime;
    /**
     * แสดงเลเยอร์ก้อนเมฆเคลื่อนไหว (ค่าเริ่มต้น: true)
     */
    showClouds?: boolean;
    /**
     * CSS class เพิ่มเติมสำหรับ container
     */
    className?: string;
}

export function OpenSkyBackground({
    time,
    showClouds = true,
    className = '',
}: OpenSkyBackgroundProps) {
    const activeSkyTime = useSkyTime(time);

    return (
        <div
            aria-hidden="true"
            data-time={activeSkyTime}
            className={`open-sky-container pointer-events-none fixed inset-0 z-0 overflow-hidden select-none ${className}`}
        >
            <style>{`
                /* -------------------------------------------------------------
                   Dynamic Background Gradients
                   ------------------------------------------------------------- */
                .open-sky-container {
                    transition: background 0.8s ease;
                }

                /* Morning (เช้า: 06:00 - 15:00) */
                .open-sky-container[data-time="morning"] {
                    background:
                        radial-gradient(ellipse at 78% 40%, #1298dc 0%, rgba(18, 152, 220, 0) 58%),
                        linear-gradient(165deg, #07529a 0%, #0878c8 42%, #29a8e2 70%, #b0dced 100%);
                }

                /* Evening (เย็น: 15:01 - 18:00) */
                .open-sky-container[data-time="evening"] {
                    background:
                        radial-gradient(ellipse at 78% 40%, #0c82c9 0%, rgba(12, 130, 201, 0) 58%),
                        linear-gradient(165deg, #064684 0%, #075fa8 42%, #1688c4 70%, #7aaecb 100%);
                }

                /* Night (กลางคืน: 18:01 - 05:59) */
                .open-sky-container[data-time="night"] {
                    background:
                        radial-gradient(ellipse at 16% 82%, rgba(8, 61, 100, .2), transparent 40%),
                        radial-gradient(ellipse at 84% 48%, rgba(5, 33, 72, .18), transparent 44%),
                        linear-gradient(165deg, #010914 0%, #021a35 48%, #052f54 78%, #07486b 100%);
                }

                /* -------------------------------------------------------------
                   Evening & Night Celestial Elements
                   ------------------------------------------------------------- */
                .sky-night-overlay {
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    opacity: 0;
                    transition: opacity 0.8s ease;
                }

                .open-sky-container[data-time="night"] .sky-night-overlay {
                    opacity: 1;
                }

                /* Night Moon */
                .sky-night-moon {
                    position: absolute;
                    top: 13%;
                    left: 12%;
                    width: 2.7rem;
                    height: 2.7rem;
                    border-radius: 50%;
                    background: #fffdf0;
                    box-shadow: 0 0 1rem .35rem rgba(255, 250, 214, .45), 0 0 3rem 1rem rgba(116, 210, 255, .22);
                }

                /* Stars Field */
                .sky-night-stars {
                    position: absolute;
                    inset: 0;
                    opacity: 0.75;
                    background-image:
                        radial-gradient(circle at 24% 20%, #fff 0 1px, transparent 1.8px),
                        radial-gradient(circle at 36% 12%, #d7ecff 0 1px, transparent 1.8px),
                        radial-gradient(circle at 52% 25%, #fff 0 1px, transparent 1.8px),
                        radial-gradient(circle at 67% 15%, #d7ecff 0 1px, transparent 1.8px),
                        radial-gradient(circle at 82% 31%, #fff 0 1px, transparent 1.8px),
                        radial-gradient(circle at 91% 11%, #d7ecff 0 1px, transparent 1.8px),
                        radial-gradient(circle at 44% 38%, #fff 0 1px, transparent 1.8px),
                        radial-gradient(circle at 74% 45%, #fff 0 1px, transparent 1.8px);
                }

                /* Evening celestial light */
                .sky-evening-overlay {
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    opacity: 0;
                    transition: opacity 0.8s ease;
                }

                .open-sky-container[data-time="evening"] .sky-evening-overlay {
                    opacity: 1;
                }

                .sky-evening-moon {
                    position: absolute;
                    top: 32%;
                    left: 16%;
                    width: 1.15rem;
                    height: 1.15rem;
                    border-radius: 50%;
                    background: #fffbe7;
                    box-shadow: 0 0 .45rem .12rem rgba(255, 249, 220, .4), 0 0 1.2rem .35rem rgba(255, 241, 184, .18);
                }

                /* -------------------------------------------------------------
                   Cloud Layers (Set 1 Only - Optimized GPU Translate)
                   ------------------------------------------------------------- */
                .sky-clouds-wrap {
                    position: absolute;
                    inset: 0;
                    overflow: hidden;
                    pointer-events: none;
                }

                .sky-cloud-layer {
                    position: absolute;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    width: 100%;
                    overflow: hidden;
                    mix-blend-mode: screen;
                    pointer-events: none;
                    -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 10%, #000 72%, rgba(0, 0, 0, .72) 82%, transparent 96%);
                    mask-image: linear-gradient(to bottom, transparent 0%, #000 10%, #000 72%, rgba(0, 0, 0, .72) 82%, transparent 96%);
                    transition: filter 0.8s ease, opacity 0.8s ease;
                }

                /* Layer 1: Back Clouds */
                .sky-cloud-layer--back {
                    height: 52%;
                    bottom: 3%;
                    opacity: 0.55;
                    z-index: 2;
                }

                .sky-cloud-layer--back .sky-cloud-track {
                    animation: sky-cloud-drift-right 105s linear infinite;
                }

                /* Layer 2: Front Clouds */
                .sky-cloud-layer--front {
                    height: 58%;
                    bottom: 0;
                    opacity: 0.98;
                    z-index: 3;
                }

                .sky-cloud-layer--front .sky-cloud-track {
                    animation: sky-cloud-drift-right 62s linear infinite;
                }

                .sky-cloud-track {
                    display: flex;
                    width: max-content;
                    height: 100%;
                    will-change: transform;
                }

                @keyframes sky-cloud-drift-right {
                    0% {
                        transform: translate3d(-50%, 0, 0);
                    }
                    100% {
                        transform: translate3d(0, 0, 0);
                    }
                }

                .sky-cloud-panel {
                    flex-shrink: 0;
                    display: block;
                    width: 100vw;
                    min-width: 1400px;
                    height: 100%;
                    object-fit: cover;
                    object-position: center bottom;
                }

                .sky-cloud-panel--flipped {
                    transform: scaleX(-1);
                }

                /* Night Cloud Shading */
                .open-sky-container[data-time="night"] .sky-cloud-layer {
                    opacity: 0.58;
                    filter: brightness(0.48) saturate(0.72);
                }

                .open-sky-container[data-time="night"] .sky-cloud-layer--back {
                    opacity: 0.38;
                }

                @media (max-width: 680px) {
                    .sky-cloud-layer--back {
                        height: 46%;
                        bottom: 2%;
                    }
                    .sky-cloud-layer--front {
                        height: 50%;
                        bottom: 0;
                    }
                    .sky-cloud-panel {
                        min-width: 1000px;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .sky-cloud-track {
                        animation: none !important;
                        transform: translate3d(-50%, 0, 0) !important;
                    }
                }
            `}</style>

            {/* Night Celestial Layer (Moon & Stars) */}
            <div className="sky-night-overlay" aria-hidden="true">
                <div className="sky-night-moon" />
                <div className="sky-night-stars" />
            </div>

            {/* Evening Celestial Light */}
            <div className="sky-evening-overlay" aria-hidden="true">
                <div className="sky-evening-moon" />
            </div>

            {/* Clouds Layer (Set 1 Only) */}
            {showClouds && (
                <div className="sky-clouds-wrap">
                    <div suppressHydrationWarning className="sky-cloud-layer sky-cloud-layer--back">
                        <div className="sky-cloud-track">
                            <img className="sky-cloud-panel" src="/assets/clouds.png" alt="" />
                            <img className="sky-cloud-panel sky-cloud-panel--flipped" src="/assets/clouds.png" alt="" />
                            <img className="sky-cloud-panel" src="/assets/clouds.png" alt="" />
                            <img className="sky-cloud-panel sky-cloud-panel--flipped" src="/assets/clouds.png" alt="" />
                        </div>
                    </div>
                    <div suppressHydrationWarning className="sky-cloud-layer sky-cloud-layer--front">
                        <div className="sky-cloud-track">
                            <img className="sky-cloud-panel" src="/assets/clouds.png" alt="" />
                            <img className="sky-cloud-panel sky-cloud-panel--flipped" src="/assets/clouds.png" alt="" />
                            <img className="sky-cloud-panel" src="/assets/clouds.png" alt="" />
                            <img className="sky-cloud-panel sky-cloud-panel--flipped" src="/assets/clouds.png" alt="" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default OpenSkyBackground;
