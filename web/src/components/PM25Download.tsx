'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import DatePicker from './shared/DatePicker';
import { getFilterOptions } from '@/app/dashboard/pm25/actions';
import { THAI_MONTHS_SHORT } from '@/lib/constants';
import { PM25Text } from '@/components/PM25Mark';
import CloudLoader from '@/components/CloudLoader';

export default function PM25Download() {
    const [isLoading, setIsLoading] = useState(true);
    
    // Filter options
    const [dateOptions, setDateOptions] = useState<string[]>([]);
    
    // Filter states
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchInitialData = async () => {
        try {
            // Fetch date options for filters
            const options = await getFilterOptions();
            if (options && options.dates) {
                setDateOptions(options.dates);
            }
        } catch (error) {
            console.error('Failed to fetch PM2.5 date options');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const handleDownload = () => {
        if (!startDate || !endDate) {
            toast.error('กรุณาระบุช่วงวันที่ให้ครบถ้วน');
            return;
        }
        
        // Prepare download URL with filters
        const params = new URLSearchParams({
            startDate,
            endDate
        });
        
        window.location.href = `/api/user/download-pm25?${params.toString()}`;
    };

    if (isLoading) {
        return (
            <CloudLoader fullscreen={false} label="กำลังโหลดตัวเลือกข้อมูล PM2.5..." className="min-h-64 rounded-2xl border border-slate-200" />
        );
    }

    const isReadyToDownload = startDate && endDate;

    return (
        <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-emerald-200 md:p-6">
            <div className="flex h-full flex-col gap-6">
                <div className="flex items-start gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900"><PM25Text>ข้อมูล PM2.5</PM25Text></h3>
                        <p className="mt-1 text-sm leading-6 text-slate-500">ส่งออกข้อมูลค่าฝุ่นรายวันตามช่วงเวลา</p>
                    </div>
                </div>

                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="grid grid-cols-1 gap-4 rounded-2xl bg-slate-50 p-4 md:grid-cols-2">
                        <DatePicker 
                            label="เริ่มต้นวันที่" 
                            options={dateOptions} 
                            value={startDate} 
                            onChange={setStartDate} 
                            thaiMonths={THAI_MONTHS_SHORT} 
                        />
                        <DatePicker 
                            label="สิ้นสุดวันที่" 
                            options={dateOptions} 
                            value={endDate} 
                            onChange={setEndDate} 
                            thaiMonths={THAI_MONTHS_SHORT} 
                        />
                    </div>
                    
                    <button 
                        onClick={handleDownload}
                        disabled={!isReadyToDownload}
                        className={`flex w-full items-center justify-center gap-3 rounded-xl py-3.5 text-sm font-bold transition-all ${
                            isReadyToDownload 
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'cursor-not-allowed bg-slate-200 text-slate-400'
                        }`}
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <PM25Text>ดาวน์โหลดข้อมูล PM2.5 (CSV)</PM25Text>
                    </button>
                </div>
            </div>
        </div>
    );
}
