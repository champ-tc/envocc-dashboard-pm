'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

interface DashboardDatePickerProps {
    label: string;
    options: string[];
    value: string;
    onChange: (value: string) => void;
    mode?: 'day' | 'month';
}

const toMonthKey = (value: string) => value.slice(0, 7);

export default function DashboardDatePicker({ label, options, value, onChange, mode = 'month' }: DashboardDatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const normalizedOptions = useMemo(
        () => Array.from(new Set((options || []).map((option) => mode === 'month' ? toMonthKey(option) : option.slice(0, 10)))).sort(),
        [mode, options],
    );
    const available = useMemo(() => new Set(normalizedOptions), [normalizedOptions]);
    const availableMonths = useMemo(
        () => Array.from(new Set(normalizedOptions.map(toMonthKey))).sort(),
        [normalizedOptions],
    );
    const availableYears = useMemo(
        () => Array.from(new Set(availableMonths.map((month) => month.slice(0, 4)))).sort().reverse(),
        [availableMonths],
    );
    const selectedKey = mode === 'month' ? toMonthKey(value) : value.slice(0, 10);
    const latestKey = normalizedOptions.at(-1) || new Date().toISOString().slice(0, mode === 'month' ? 7 : 10);
    const [viewMonth, setViewMonth] = useState(toMonthKey(selectedKey || latestKey));

    useEffect(() => {
        if (isOpen) setViewMonth(toMonthKey(selectedKey || latestKey));
    }, [isOpen, latestKey, selectedKey]);

    const [viewYear, monthNumber] = viewMonth.split('-').map(Number);
    const monthsInViewYear = availableMonths.filter((month) => month.startsWith(`${viewYear}-`));
    const moveView = (amount: number) => {
        if (mode === 'day') {
            const index = availableMonths.indexOf(viewMonth);
            const nextMonth = availableMonths[index + amount];
            if (nextMonth) setViewMonth(nextMonth);
            return;
        }
        const index = availableYears.indexOf(String(viewYear));
        const nextYear = availableYears[index - amount];
        if (nextYear) setViewMonth(`${nextYear}-${monthsInYear(nextYear)[0].slice(5, 7)}`);
    };
    const monthsInYear = (year: string) => availableMonths.filter((month) => month.startsWith(`${year}-`));
    const changeYear = (year: string) => {
        const yearMonths = monthsInYear(year);
        const sameMonth = yearMonths.find((month) => month.endsWith(viewMonth.slice(4)));
        setViewMonth(sameMonth || yearMonths.at(-1) || viewMonth);
    };
    const selectValue = (key: string) => {
        const source = options.find((option) => mode === 'month' ? option.startsWith(key) : option.slice(0, 10) === key);
        onChange(source || key);
        setIsOpen(false);
    };
    const displayValue = () => {
        if (!selectedKey) return mode === 'day' ? 'เลือกวันที่' : 'เลือกเดือน';
        const [year, month, day] = selectedKey.split('-').map(Number);
        return mode === 'day'
            ? `${day} ${THAI_MONTHS_SHORT[month - 1]} ${year + 543}`
            : `${THAI_MONTHS[month - 1]} ${year + 543}`;
    };

    const currentMonthIndex = availableMonths.indexOf(viewMonth);
    const currentYearIndex = availableYears.indexOf(String(viewYear));
    const canGoPrevious = mode === 'day' ? currentMonthIndex > 0 : currentYearIndex < availableYears.length - 1;
    const canGoNext = mode === 'day' ? currentMonthIndex >= 0 && currentMonthIndex < availableMonths.length - 1 : currentYearIndex > 0;
    const firstDayOffset = new Date(viewYear, monthNumber - 1, 1).getDay();
    const daysInMonth = new Date(viewYear, monthNumber, 0).getDate();

    return (
        <div className="relative col-span-1 min-w-0">
            <label className="mb-2 ml-2 block text-xs font-bold uppercase tracking-wider text-white/70">{label}</label>
            <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                onClick={() => setIsOpen((open) => !open)}
                className={`flex min-h-12 w-full items-center gap-2 rounded-2xl border px-4 text-left text-xs font-bold text-white shadow-sm ring-1 transition-all ${isOpen ? 'border-blue-400/70 bg-white/20 ring-blue-400/30' : 'border-white/20 bg-white/10 ring-white/10 hover:bg-white/20'}`}
            >
                <CalendarDays className="size-4 shrink-0 text-blue-300" />
                <span className="min-w-0 flex-1 truncate">{displayValue()}</span>
                <ChevronDown className={`size-4 shrink-0 text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <button type="button" aria-label="ปิดปฏิทิน" className="fixed inset-0 z-overlay cursor-default" onClick={() => setIsOpen(false)} />
                    <div role="dialog" aria-label={label} className="absolute left-0 z-dropdown mt-3 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-white/15 bg-slate-900/98 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
                        <div className="flex items-center justify-between border-b border-white/10 px-3 py-3">
                            <button type="button" aria-label={mode === 'day' ? 'เดือนก่อนหน้า' : 'ปีก่อนหน้า'} disabled={!canGoPrevious} onClick={() => moveView(-1)} className="btn btn-square btn-ghost btn-sm text-white disabled:opacity-20">
                                <ChevronLeft className="size-4" />
                            </button>
                            <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-1">
                                {mode === 'day' && (
                                    <label className="min-w-0 flex-1">
                                        <span className="sr-only">เลือกเดือน</span>
                                        <select value={viewMonth} onChange={(event) => setViewMonth(event.target.value)} className="select select-sm w-full rounded-xl border-white/15 bg-white/10 text-center font-bold text-white focus:border-blue-400 focus:outline-none">
                                            {monthsInViewYear.map((month) => <option key={month} value={month} className="bg-slate-900">{THAI_MONTHS[Number(month.slice(5, 7)) - 1]}</option>)}
                                        </select>
                                    </label>
                                )}
                                <label className="min-w-0 flex-1">
                                    <span className="sr-only">เลือกปี</span>
                                    <select value={String(viewYear)} onChange={(event) => changeYear(event.target.value)} className="select select-sm w-full rounded-xl border-white/15 bg-white/10 text-center font-bold text-white focus:border-blue-400 focus:outline-none">
                                        {availableYears.map((year) => <option key={year} value={year} className="bg-slate-900">พ.ศ. {Number(year) + 543}</option>)}
                                    </select>
                                </label>
                            </div>
                            <button type="button" aria-label={mode === 'day' ? 'เดือนถัดไป' : 'ปีถัดไป'} disabled={!canGoNext} onClick={() => moveView(1)} className="btn btn-square btn-ghost btn-sm text-white disabled:opacity-20">
                                <ChevronRight className="size-4" />
                            </button>
                        </div>

                        {mode === 'month' ? (
                            <div className="grid grid-cols-3 gap-2 p-4">
                                {monthsInViewYear.map((key) => {
                                    const index = Number(key.slice(5, 7)) - 1;
                                    const selected = selectedKey === key;
                                    return <button key={key} type="button" onClick={() => selectValue(key)} className={`rounded-xl px-2 py-3 text-sm font-bold transition ${selected ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-white/5 text-white/75 hover:bg-blue-500/20 hover:text-white'}`}>{THAI_MONTHS_SHORT[index]}</button>;
                                })}
                            </div>
                        ) : (
                            <div className="p-4">
                                <div className="mb-2 grid grid-cols-7 text-center text-compact font-bold text-white/35">
                                    {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                    {Array.from({ length: firstDayOffset }).map((_, index) => <span key={`empty-${index}`} />)}
                                    {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
                                        const key = `${viewMonth}-${String(day).padStart(2, '0')}`;
                                        const enabled = available.has(key);
                                        const selected = selectedKey === key;
                                        return <button key={key} type="button" disabled={!enabled} onClick={() => selectValue(key)} className={`aspect-square rounded-lg text-xs font-bold transition ${selected ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : enabled ? 'bg-white/5 text-white/75 hover:bg-blue-500/20 hover:text-white' : 'cursor-not-allowed text-white/15'}`}>{day}</button>;
                                    })}
                                </div>
                            </div>
                        )}
                        <div className="border-t border-white/10 px-4 py-2.5 text-center text-compact text-white/35">เลือกได้เฉพาะช่วงที่มีข้อมูล</div>
                    </div>
                </>
            )}
        </div>
    );
}
