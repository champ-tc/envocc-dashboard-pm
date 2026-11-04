'use client';

import React from 'react';
import { Sun, Sunset, Moon, Cloud } from 'lucide-react';
import {
    OpenSkyBackground as SharedOpenSkyBackground,
    type SkyTime as SharedSkyTime,
    getSkyTime,
    useSkyTime,
} from '@/components/shared/OpenSkyBackground';

export type SkyTime = SharedSkyTime;
export type CloudSet = '1' | '2';

interface OpenSkyBackgroundProps {
    skyTime: SkyTime;
    cloudSet?: CloudSet;
}

export function OpenSkyBackground({ skyTime }: OpenSkyBackgroundProps) {
    return <SharedOpenSkyBackground time={skyTime} />;
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
