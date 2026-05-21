'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import DatePicker from './shared/DatePicker';
import { getFilterOptions } from '@/app/dashboard/hdc/actions';
import { THAI_MONTHS_SHORT } from '@/lib/constants';

export default function BigDataDownload() {
    const [status, setStatus] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Filter options
    const [dateOptions, setDateOptions] = useState<string[]>([]);
    
    // Filter states
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchInitialData = async () => {
        try {
            // Fetch request status
            const res = await fetch('/api/user/requests');
            const data = await res.json();
            if (res.ok && data.requests.length > 0) {
                setStatus(data.requests[0]);
            }

            // Fetch date options for filters
            const options = await getFilterOptions();
            if (options && options.dates) {
                setDateOptions(options.dates);
            }
        } catch (error) {
            console.error('Failed to fetch initial data');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const handleRequest = async () => {
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/user/requests', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                toast.success('ส่งคำขอเรียบร้อยแล้ว');
                fetchInitialData();
            } else {
                toast.error(data.error || 'เกิดข้อผิดพลาด');
            }
        } catch (error) {
            toast.error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDownload = () => {
        if (!startDate || !endDate) {
            toast.error('กรุณาระบุช่วงวันที่ให้ครบถ้วน');
            return;
        }

        const year = startDate.split('-')[0];
        
        // Prepare download URL with filters
        const params = new URLSearchParams({
            year,
            startDate,
            endDate
        });
        
        window.location.href = `/api/user/download?${params.toString()}`;
    };

    if (isLoading) {
        return (
            <div className="p-8 bg-white border border-slate-200 rounded-3xl shadow-sm flex items-center justify-center">
                <span className="loading loading-spinner loading-lg text-indigo-500"></span>
            </div>
        );
    }

    const isApproved = status?.status === 'approved';
    const isExpired = status?.expiredDate && new Date(status.expiredDate) < new Date();
    const canDownload = isApproved && !isExpired;
    const isReadyToDownload = canDownload && startDate && endDate;

    return (
        <div className="group p-8 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-500">
            <div className="flex flex-col gap-8">
                <div className="flex items-start md:items-center gap-6">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 ${
                        canDownload ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-400'
                    }`}>
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-black text-slate-800 mb-1">ดาวน์โหลดข้อมูล BigData (HDC)</h3>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed">ส่งออกไฟล์ข้อมูลสถิติผู้ป่วยโรคจากสิ่งแวดล้อม รายเดือน/รายจังหวัด</p>
                    </div>
                    <div className="shrink-0 hidden md:block">
                        {!canDownload && status?.status !== 'pending' && (
                            <button 
                                onClick={handleRequest}
                                disabled={isSubmitting}
                                className="bg-slate-800 text-white px-8 py-3 rounded-2xl font-bold text-sm hover:bg-slate-900 transition-all shadow-lg shadow-slate-200 disabled:opacity-50"
                            >
                                {isSubmitting ? 'กำลังส่งคำขอ...' : 'ส่งคำขอเข้าถึงข้อมูล'}
                            </button>
                        )}
                        {status?.status === 'pending' && (
                            <div className="bg-amber-50 text-amber-600 px-6 py-3 rounded-2xl font-bold text-sm border border-amber-100 flex items-center gap-3">
                                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                                อยู่ระหว่างการพิจารณา
                            </div>
                        )}
                    </div>
                </div>

                {canDownload ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                            <DatePicker 
                                label="ช่วงเวลาเริ่มต้น" 
                                options={dateOptions} 
                                value={startDate} 
                                onChange={setStartDate} 
                                thaiMonths={THAI_MONTHS_SHORT} 
                            />
                            <DatePicker 
                                label="ช่วงเวลาสิ้นสุด" 
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
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 translate-y-0 active:scale-[0.98]' 
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                            }`}
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            ดาวน์โหลดไฟล์ข้อมูล (CSV)
                        </button>
                    </div>
                ) : (
                    <div className="md:hidden">
                        {status?.status !== 'pending' ? (
                            <button 
                                onClick={handleRequest}
                                disabled={isSubmitting}
                                className="w-full bg-slate-800 text-white py-4 rounded-2xl font-bold text-sm hover:bg-slate-900 transition-all shadow-lg"
                            >
                                {isSubmitting ? 'กำลังส่งคำขอ...' : 'ส่งคำขอเข้าถึงข้อมูล'}
                            </button>
                        ) : (
                            <div className="w-full bg-amber-50 text-amber-600 py-4 rounded-2xl font-bold text-sm border border-amber-100 flex items-center justify-center gap-3">
                                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                                อยู่ระหว่างการพิจารณา
                            </div>
                        )}
                    </div>
                )}
                
                {status && (
                    <div className="pt-6 border-t border-slate-50 flex items-center justify-between text-xs font-bold">
                        <div className="flex items-center gap-2 text-slate-400">
                            <span className="uppercase tracking-widest">สถานะปัจจุบัน:</span>
                            <span className={`px-2 py-0.5 rounded-md ${
                                status.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                            }`}>{status.status === 'approved' ? 'อนุมัติแล้ว' : 'รอการอนุมัติ'}</span>
                        </div>
                        {isApproved && (
                            <span className={`flex items-center gap-2 ${isExpired ? "text-rose-500" : "text-emerald-600"}`}>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {isExpired ? 'สิทธิ์เข้าถึงหมดอายุแล้ว' : `สิทธิ์การเข้าถึงหมดอายุ: ${new Date(status.expiredDate).toLocaleDateString('th-TH')}`}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
