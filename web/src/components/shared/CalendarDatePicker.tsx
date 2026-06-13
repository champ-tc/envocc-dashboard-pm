'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, RotateCcw, X } from 'lucide-react';

const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];
const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

function parseDate(value?: string) {
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
}

function formatValue(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDisplay(value?: string) {
    const date = parseDate(value);
    if (!date) return 'เลือกวันที่';
    return `${date.getDate()} ${THAI_MONTHS[date.getMonth()]} ${date.getFullYear() + 543}`;
}

export default function CalendarDatePicker({
    label,
    value,
    onChange,
    min,
    max,
    required,
    disabled,
    className = '',
}: {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    min?: string;
    max?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedDate = parseDate(value);
    const [viewDate, setViewDate] = useState(() => selectedDate || new Date());

    useEffect(() => {
        if (isOpen) setViewDate(selectedDate || new Date());
    }, [isOpen, value]);

    const calendarDays = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const previousMonthDays = new Date(year, month, 0).getDate();

        return Array.from({ length: 42 }, (_, index) => {
            const dayOffset = index - firstDay + 1;
            if (dayOffset < 1) return { date: new Date(year, month - 1, previousMonthDays + dayOffset), currentMonth: false };
            if (dayOffset > daysInMonth) return { date: new Date(year, month + 1, dayOffset - daysInMonth), currentMonth: false };
            return { date: new Date(year, month, dayOffset), currentMonth: true };
        });
    }, [viewDate]);

    const minDate = parseDate(min);
    const maxDate = parseDate(max);
    const todayValue = formatValue(new Date());
    const isDisabledDate = (date: Date) =>
        Boolean((minDate && date < minDate) || (maxDate && date > maxDate));

    return (
        <div className={`relative ${className}`}>
            {label && <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>}
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(true)}
                className={`flex min-h-12 w-full items-center gap-3 rounded-xl border bg-white px-3.5 text-left transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${
                    isOpen ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-200 hover:border-blue-300'
                }`}
            >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <CalendarDays className="size-4" />
                </span>
                <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${value ? 'text-slate-800' : 'text-slate-400'}`}>
                    {formatDisplay(value)}
                </span>
                {required && !value && <span className="text-rose-500">*</span>}
            </button>

            {isOpen && (
                <>
                    <button type="button" aria-label="ปิดปฏิทิน" className="fixed inset-0 z-[100] cursor-default bg-slate-950/20 backdrop-blur-[1px]" onClick={() => setIsOpen(false)} />
                    <div className="absolute left-0 z-[110] mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15">
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                            <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="btn btn-square btn-ghost btn-sm">
                                <ChevronLeft className="size-4" />
                            </button>
                            <div className="text-center">
                                <p className="font-bold text-slate-900">{THAI_MONTHS[viewDate.getMonth()]}</p>
                                <p className="text-xs text-slate-500">พ.ศ. {viewDate.getFullYear() + 543}</p>
                            </div>
                            <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="btn btn-square btn-ghost btn-sm">
                                <ChevronRight className="size-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-7 px-4 pt-4">
                            {WEEKDAYS.map((day) => <span key={day} className="py-1 text-center text-xs font-semibold text-slate-400">{day}</span>)}
                        </div>
                        <div className="grid grid-cols-7 gap-1 p-4 pt-2">
                            {calendarDays.map(({ date, currentMonth }) => {
                                const dateValue = formatValue(date);
                                const selected = dateValue === value;
                                const today = dateValue === todayValue;
                                const unavailable = isDisabledDate(date);
                                return (
                                    <button
                                        key={dateValue}
                                        type="button"
                                        disabled={unavailable}
                                        onClick={() => {
                                            onChange(dateValue);
                                            setIsOpen(false);
                                        }}
                                        className={`relative aspect-square rounded-xl text-sm font-semibold transition ${
                                            selected
                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                                : unavailable
                                                    ? 'cursor-not-allowed text-slate-200'
                                                    : currentMonth
                                                        ? 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                                                        : 'text-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        {date.getDate()}
                                        {today && !selected && <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-blue-500" />}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                            <button
                                type="button"
                                onClick={() => {
                                    const today = new Date();
                                    if (!isDisabledDate(today)) {
                                        onChange(todayValue);
                                        setIsOpen(false);
                                    }
                                }}
                                className="btn btn-ghost btn-sm gap-1 text-blue-600"
                            >
                                <RotateCcw className="size-4" /> วันนี้
                            </button>
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
