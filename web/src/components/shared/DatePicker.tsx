'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerProps {
    label: string;
    options: string[];
    value: string;
    onChange: (value: string) => void;
    thaiMonths: string[];
}

export default function DatePicker({ label, options, value, onChange, thaiMonths }: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const normalizedOptions = useMemo(
        () => Array.from(new Set((options || []).map((date) => date.slice(0, 7)))).sort().reverse(),
        [options],
    );
    const availableYears = useMemo(
        () => Array.from(new Set(normalizedOptions.map((date) => date.slice(0, 4)))),
        [normalizedOptions],
    );
    const selectedMonth = value ? value.slice(0, 7) : '';
    const [viewYear, setViewYear] = useState(selectedMonth.slice(0, 4));

    useEffect(() => {
        if (!isOpen) return;
        setViewYear(selectedMonth.slice(0, 4) || availableYears[0] || new Date().getFullYear().toString());
    }, [isOpen, selectedMonth, availableYears]);

    const yearIndex = availableYears.indexOf(viewYear);
    const formatMonth = (date: string) => {
        if (!date) return 'เลือกเดือน';
        const [year, month] = date.split('-').map(Number);
        return `${thaiMonths[month - 1]} ${year + 543}`;
    };

    return (
        <div className="relative min-w-0 flex-1">
            <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className={`flex min-h-12 w-full items-center gap-3 rounded-xl border bg-white px-3.5 text-left transition ${
                    isOpen ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-200 hover:border-blue-300'
                }`}
            >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <CalendarDays className="size-4" />
                </span>
                <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${value ? 'text-slate-800' : 'text-slate-400'}`}>
                    {formatMonth(selectedMonth)}
                </span>
                <ChevronDown className="size-4 text-slate-400" />
            </button>

            {isOpen && (
                <>
                    <button type="button" aria-label="ปิดตัวเลือกเดือน" className="fixed inset-0 z-[100] cursor-default bg-slate-950/20 backdrop-blur-[1px]" onClick={() => setIsOpen(false)} />
                    <div className="absolute left-0 z-[110] mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15">
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                            <button
                                type="button"
                                disabled={yearIndex === availableYears.length - 1 || yearIndex < 0}
                                onClick={() => setViewYear(availableYears[yearIndex + 1])}
                                className="btn btn-square btn-ghost btn-sm disabled:opacity-20"
                            >
                                <ChevronLeft className="size-4" />
                            </button>
                            <div className="text-center">
                                <p className="text-xs font-medium text-slate-400">เลือกเดือน</p>
                                <p className="font-bold text-slate-900">พ.ศ. {Number(viewYear) + 543}</p>
                            </div>
                            <button
                                type="button"
                                disabled={yearIndex <= 0}
                                onClick={() => setViewYear(availableYears[yearIndex - 1])}
                                className="btn btn-square btn-ghost btn-sm disabled:opacity-20"
                            >
                                <ChevronRight className="size-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 p-4">
                            {thaiMonths.map((monthName, index) => {
                                const month = String(index + 1).padStart(2, '0');
                                const nextValue = `${viewYear}-${month}`;
                                const isAvailable = normalizedOptions.includes(nextValue);
                                const isSelected = selectedMonth === nextValue;
                                return (
                                    <button
                                        key={month}
                                        type="button"
                                        disabled={!isAvailable}
                                        onClick={() => {
                                            const sourceOption = options.find((option) => option.startsWith(nextValue));
                                            onChange(sourceOption || nextValue);
                                            setIsOpen(false);
                                        }}
                                        className={`rounded-xl px-2 py-3 text-sm font-semibold transition ${
                                            isSelected
                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                                : isAvailable
                                                    ? 'bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                                                    : 'cursor-not-allowed bg-transparent text-slate-300'
                                        }`}
                                    >
                                        {monthName}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                            <span className="text-xs text-slate-400">{normalizedOptions.length} เดือนที่มีข้อมูล</span>
                            <button type="button" onClick={() => setIsOpen(false)} className="btn btn-ghost btn-sm gap-1 text-slate-500">
                                <X className="size-4" /> ปิด
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
