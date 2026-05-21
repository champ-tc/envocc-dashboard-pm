'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import DatePicker from './shared/DatePicker';
import { getFilterOptions } from '@/app/dashboard/pm25/actions';
import { THAI_MONTHS_SHORT } from '@/lib/constants';

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
            <div className="p-8 bg-white border border-slate-200 rounded-3xl shadow-sm flex items-center justify-center">
                <span className="loading loading-spinner loading-lg text-emerald-500"></span>
            </div>
        );
    }

    const isReadyToDownload = startDate && endDate;

    return (
        <div className="group p-8 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all duration-500">
            <div className="flex flex-col gap-8">
                <div className="flex items-start md:items-center gap-6">
                    <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-200 transition-all duration-500">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-black text-slate-800 mb-1">โหลดข้อมูล PM 2.5</h3>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed">ส่งออกไฟล์ข้อมูลค่าฝุ่นละอองรายวัน ตามช่วงเวลาที่ต้องการ</p>
                    </div>
                </div>

                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-emerald-50/50 rounded-[2rem] border border-emerald-50">
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
                        className={`w-full py-4 rounded-2xl font-black text-base transition-all duration-300 flex items-center justify-center gap-3 shadow-2xl ${
                            isReadyToDownload 
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 translate-y-0 active:scale-[0.98]' 
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                        }`}
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        ดาวน์โหลดข้อมูล PM 2.5 (CSV)
                    </button>
                </div>
            </div>
        </div>
    );
}
