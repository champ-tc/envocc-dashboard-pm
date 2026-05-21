'use client';

import { useState, useMemo } from 'react';

interface DatePickerProps {
    label: string;
    options: string[];
    value: string;
    onChange: (value: string) => void;
    thaiMonths: string[];
}

export default function DatePicker({ label, options, value, onChange, thaiMonths }: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    
    // Extract available years and months from options
    const availableData = useMemo(() => {
        return (options || []).reduce((acc: any, dateStr: string) => {
            const [y, m] = dateStr.split('-');
            if (!acc[y]) acc[y] = new Set();
            acc[y].add(m);
            return acc;
        }, {});
    }, [options]);

    const availableYears = useMemo(() => 
        Object.keys(availableData).sort((a, b) => b.localeCompare(a)), 
    [availableData]);

    // Current view state (internal to the picker)
    const [viewYear, setViewYear] = useState('');

    // Update viewYear when availableYears are loaded
    useMemo(() => {
        if (!viewYear && availableYears.length > 0) {
            if (value) {
                setViewYear(value.split('-')[0]);
            } else {
                setViewYear(availableYears[0]);
            }
        }
    }, [availableYears, value, viewYear]);

    const formatDate = (dateStr: string) => {
        if (!dateStr || !dateStr.includes('-')) return 'เลือกเดือน...';
        const [y, m] = dateStr.split('-');
        return `${thaiMonths[parseInt(m) - 1]} พ.ศ. ${parseInt(y) + 543}`;
    };

    const handlePrevYear = (e: React.MouseEvent) => {
        e.stopPropagation();
        const currentIndex = availableYears.indexOf(viewYear);
        if (currentIndex < availableYears.length - 1) {
            setViewYear(availableYears[currentIndex + 1]);
        }
    };

    const handleNextYear = (e: React.MouseEvent) => {
        e.stopPropagation();
        const currentIndex = availableYears.indexOf(viewYear);
        if (currentIndex > 0) {
            setViewYear(availableYears[currentIndex - 1]);
        }
    };

    return (
        <div className="relative flex-1">
            <label className="block text-sm font-bold text-slate-500 mb-2 ml-1 uppercase tracking-tight">{label}</label>
            <button 
                type="button"
                onClick={() => setIsOpen(!isOpen)} 
                className={`w-full bg-white border-2 rounded-2xl text-base font-bold py-3.5 px-5 outline-none flex justify-between items-center transition-all ${
                    isOpen ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-slate-100 hover:border-indigo-200'
                }`}
            >
                <span className={value ? 'text-slate-800' : 'text-slate-400'}>
                    {formatDate(value)}
                </span>
                <svg className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-600' : 'text-slate-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute z-[200] mt-3 w-72 md:w-80 bg-white border border-slate-200 rounded-[2rem] shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
                        {/* Year Selector Header */}
                        <div className="flex items-center justify-between mb-6 px-1">
                            <button 
                                onClick={handlePrevYear}
                                disabled={availableYears.indexOf(viewYear) === availableYears.length - 1}
                                className="p-2 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-20"
                            >
                                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            
                            <div className="text-center">
                                <span className="text-lg font-black text-indigo-600">พ.ศ. {parseInt(viewYear) + 543}</span>
                            </div>

                            <button 
                                onClick={handleNextYear}
                                disabled={availableYears.indexOf(viewYear) <= 0}
                                className="p-2 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-20"
                            >
                                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>

                        {/* Months Grid */}
                        <div className="grid grid-cols-3 gap-2">
                            {Array.from({ length: 12 }).map((_, i) => {
                                const monthNum = (i + 1).toString().padStart(2, '0');
                                const dateValue = `${viewYear}-${monthNum}-01`;
                                const isAvailable = availableData[viewYear]?.has(monthNum);
                                const isSelected = value === dateValue;

                                return (
                                    <button
                                        key={i}
                                        disabled={!isAvailable}
                                        onClick={() => {
                                            onChange(dateValue);
                                            setIsOpen(false);
                                        }}
                                        className={`py-3 rounded-2xl text-sm font-bold transition-all ${
                                            isSelected 
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-[1.05]' 
                                                : isAvailable 
                                                    ? 'bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600' 
                                                    : 'text-slate-200 cursor-not-allowed'
                                        }`}
                                    >
                                        {thaiMonths[i]}
                                    </button>
                                );
                            })}
                        </div>
                        
                        <div className="mt-6 pt-4 border-t border-slate-50 text-center">
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest"
                            >
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
