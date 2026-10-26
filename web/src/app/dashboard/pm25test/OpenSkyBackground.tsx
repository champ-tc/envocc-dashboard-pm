'use client';

import React from 'react';
import { Sun, Sunset, Moon, Cloud } from 'lucide-react';

export type SkyTime = 'morning' | 'evening' | 'night';
export type CloudSet = '1' | '2';

interface OpenSkyBackgroundProps {
    skyTime: SkyTime;
    cloudSet: CloudSet;
}

export function OpenSkyBackground({ skyTime, cloudSet }: OpenSkyBackgroundProps) {
    return (
        <div
            aria-hidden="true"
            data-time={skyTime}
            data-cloud={cloudSet}
            className="open-sky-container pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
        >
            <style>{`
                /* -------------------------------------------------------------
                   Exact Background Gradients from web/backgroud
                   ------------------------------------------------------------- */
                .open-sky-container {
                    transition: background 0.8s ease;
                }

                /* Morning (เช้า): Exact gradient from web/backgroud */
                .open-sky-container[data-time="morning"] {
                    background:
                        radial-gradient(ellipse at 78% 40%, #1298dc 0%, rgba(18, 152, 220, 0) 58%),
                        linear-gradient(165deg, #07529a 0%, #0878c8 42%, #29a8e2 70%, #b0dced 100%);
                }

                /* Evening (เย็น): Exact gradient from web/backgroud */
                .open-sky-container[data-time="evening"] {
                    background:
                        radial-gradient(ellipse at 78% 40%, #0c82c9 0%, rgba(12, 130, 201, 0) 58%),
                        linear-gradient(165deg, #064684 0%, #075fa8 42%, #1688c4 70%, #7aaecb 100%);
                }

                /* Night (กลางคืน): Exact gradient from web/backgroud */
                .open-sky-container[data-time="night"] {
                    background:
                        radial-gradient(ellipse at 16% 82%, rgba(8, 61, 100, .2), transparent 40%),
                        radial-gradient(ellipse at 84% 48%, rgba(5, 33, 72, .18), transparent 44%),
                        linear-gradient(165deg, #010914 0%, #021a35 48%, #052f54 78%, #07486b 100%);
                }

                /* -------------------------------------------------------------
                   Evening & Night Celestial Elements from web/backgroud
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

                /* Moon */
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
                   Cloud Layers with mix-blend-mode: screen and Parallax Drift
                   ------------------------------------------------------------- */
                .sky-clouds-wrap {
                    position: absolute;
                    inset: 0;
                    overflow: hidden;
                    pointer-events: none;
                }

                .sky-cloud-set {
                    position: absolute;
                    inset: 0;
                    opacity: 0;
                    visibility: hidden;
                    transition: opacity 0.8s ease, visibility 0.8s ease;
                }

                .open-sky-container[data-cloud="1"] .sky-cloud-set--1,
                .open-sky-container[data-cloud="2"] .sky-cloud-set--2 {
                    opacity: 1;
                    visibility: visible;
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
                    animation: sky-cloud-drift-right 75s linear infinite;
                }

                /* Layer 2: Front Clouds */
                .sky-cloud-layer--front {
                    height: 58%;
                    bottom: 0;
                    opacity: 0.98;
                    z-index: 3;
                }

                .sky-cloud-layer--front .sky-cloud-track {
                    animation: sky-cloud-drift-right 42s linear infinite;
                }

                .sky-cloud-track {
                    display: flex;
                    width: max-content;
                    height: 100%;
                    will-change: transform;
                }

                /* Infinite Seamless Left-to-Right Translation */
                @keyframes sky-cloud-drift-right {
                    0% {
                        transform: translate3d(-50%, 0, 0);
                    }
                    100% {
                        transform: translate3d(0%, 0, 0);
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

                /* Night Cloud Shading from web/backgroud */
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
                        transform: translate3d(-20%, 0, 0) !important;
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

            {/* Cloud Sets */}
            <div className="sky-clouds-wrap">
                {/* Cloud Set 1 (/assets/clouds.png) */}
                <div className="sky-cloud-set sky-cloud-set--1">
                    <div className="sky-cloud-layer sky-cloud-layer--back">
                        <div className="sky-cloud-track">
                            <img className="sky-cloud-panel" src="/assets/clouds.png" alt="" />
                            <img className="sky-cloud-panel sky-cloud-panel--flipped" src="/assets/clouds.png" alt="" />
                        </div>
                    </div>
                    <div className="sky-cloud-layer sky-cloud-layer--front">
                        <div className="sky-cloud-track">
                            <img className="sky-cloud-panel" src="/assets/clouds.png" alt="" />
                            <img className="sky-cloud-panel sky-cloud-panel--flipped" src="/assets/clouds.png" alt="" />
                        </div>
                    </div>
                </div>

                {/* Cloud Set 2 (/assets/clouds-set2.png) */}
                <div className="sky-cloud-set sky-cloud-set--2">
                    <div className="sky-cloud-layer sky-cloud-layer--back">
                        <div className="sky-cloud-track">
                            <img className="sky-cloud-panel" src="/assets/clouds-set2.png" alt="" />
                            <img className="sky-cloud-panel sky-cloud-panel--flipped" src="/assets/clouds-set2.png" alt="" />
                        </div>
                    </div>
                    <div className="sky-cloud-layer sky-cloud-layer--front">
                        <div className="sky-cloud-track">
                            <img className="sky-cloud-panel" src="/assets/clouds-set2.png" alt="" />
                            <img className="sky-cloud-panel sky-cloud-panel--flipped" src="/assets/clouds-set2.png" alt="" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface OpenSkyControlsProps {
    skyTime: SkyTime;
    setSkyTime: (time: SkyTime) => void;
    cloudSet: CloudSet;
    setCloudSet: (set: CloudSet) => void;
}

export function OpenSkyControls({ skyTime, setSkyTime, cloudSet, setCloudSet }: OpenSkyControlsProps) {
    const timeLabels: Record<SkyTime, string> = {
        morning: 'เช้า',
        evening: 'เย็น',
        night: 'กลางคืน',
    };

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900/40 backdrop-blur-2xl px-4 sm:px-5 py-3 rounded-3xl border border-white/15 shadow-xl ring-1 ring-white/10 shrink-0 relative z-30">
            {/* Header info */}
            <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center border border-white/20 shadow-inner shrink-0">
                    {skyTime === 'morning' ? (
                        <Sun className="size-4 text-sky-200" />
                    ) : skyTime === 'evening' ? (
                        <Sunset className="size-4 text-sky-300" />
                    ) : (
                        <Moon className="size-4 text-amber-200" />
                    )}
                </div>
                <div>
                    <div className="typo-label text-white font-medium flex items-center gap-2">
                        <span>ท้องฟ้า Open Sky</span>
                        <span className="typo-caption text-sky-200 bg-sky-500/25 px-2.5 py-0.5 rounded-full border border-sky-400/35 font-medium">
                            {timeLabels[skyTime]} · เมฆ {cloudSet}
                        </span>
                    </div>
                </div>
            </div>

            {/* Capsule controls */}
            <nav className="flex flex-wrap items-center gap-2 sm:gap-3" aria-label="แถบควบคุมท้องฟ้า Open Sky">
                {/* กลุ่มช่วงเวลา */}
                <div className="flex items-center gap-1.5 bg-black/25 p-1 rounded-full border border-white/10" role="group" aria-label="เลือกช่วงเวลา">
                    <span className="text-white/60 text-xs px-2 font-medium hidden md:inline">ช่วงเวลา:</span>
                    <button
                        type="button"
                        onClick={() => setSkyTime('morning')}
                        aria-pressed={skyTime === 'morning'}
                        className={`typo-label px-3.5 py-1.5 rounded-full cursor-pointer transition-all flex items-center gap-1.5 font-medium ${
                            skyTime === 'morning'
                                ? 'bg-white text-stone-900 shadow-md shadow-white/20 ring-2 ring-white scale-105 font-semibold'
                                : 'text-white/80 hover:bg-white/15 hover:text-white'
                        }`}
                    >
                        <Sun className="size-3.5" />
                        <span>เช้า</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setSkyTime('evening')}
                        aria-pressed={skyTime === 'evening'}
                        className={`typo-label px-3.5 py-1.5 rounded-full cursor-pointer transition-all flex items-center gap-1.5 font-medium ${
                            skyTime === 'evening'
                                ? 'bg-white text-stone-900 shadow-md shadow-white/20 ring-2 ring-white scale-105 font-semibold'
                                : 'text-white/80 hover:bg-white/15 hover:text-white'
                        }`}
                    >
                        <Sunset className="size-3.5" />
                        <span>เย็น</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setSkyTime('night')}
                        aria-pressed={skyTime === 'night'}
                        className={`typo-label px-3.5 py-1.5 rounded-full cursor-pointer transition-all flex items-center gap-1.5 font-medium ${
                            skyTime === 'night'
                                ? 'bg-white text-stone-900 shadow-md shadow-white/20 ring-2 ring-white scale-105 font-semibold'
                                : 'text-white/80 hover:bg-white/15 hover:text-white'
                        }`}
                    >
                        <Moon className="size-3.5" />
                        <span>กลางคืน</span>
                    </button>
                </div>

                <div className="w-px h-6 bg-white/20 hidden sm:block" aria-hidden="true" />

                {/* กลุ่มชุดเมฆ */}
                <div className="flex items-center gap-1.5 bg-black/25 p-1 rounded-full border border-white/10" role="group" aria-label="เลือกชุดเมฆ">
                    <span className="text-white/60 text-xs px-2 font-medium hidden md:inline">ชุดเมฆ:</span>
                    <button
                        type="button"
                        onClick={() => setCloudSet('1')}
                        aria-pressed={cloudSet === '1'}
                        className={`typo-label px-3.5 py-1.5 rounded-full cursor-pointer transition-all flex items-center gap-1.5 font-medium ${
                            cloudSet === '1'
                                ? 'bg-white text-stone-900 shadow-md shadow-white/20 ring-2 ring-white scale-105 font-semibold'
                                : 'text-white/80 hover:bg-white/15 hover:text-white'
                        }`}
                    >
                        <Cloud className="size-3.5" />
                        <span>เมฆ 1</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setCloudSet('2')}
                        aria-pressed={cloudSet === '2'}
                        className={`typo-label px-3.5 py-1.5 rounded-full cursor-pointer transition-all flex items-center gap-1.5 font-medium ${
                            cloudSet === '2'
                                ? 'bg-white text-stone-900 shadow-md shadow-white/20 ring-2 ring-white scale-105 font-semibold'
                                : 'text-white/80 hover:bg-white/15 hover:text-white'
                        }`}
                    >
                        <Cloud className="size-3.5" />
                        <span>เมฆ 2</span>
                    </button>
                </div>
            </nav>
        </div>
    );
}
