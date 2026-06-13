'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function BigDataDownload() {
    const [status, setStatus] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchInitialData = async () => {
        try {
            // Fetch request status
            const res = await fetch('/api/user/requests');
            const data = await res.json();
            if (res.ok && data.requests.length > 0) {
                setStatus(data.requests[0]);
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
        window.location.href = '/api/user/download';
    };

    if (isLoading) {
        return (
            <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                <span className="loading loading-spinner loading-lg text-indigo-500"></span>
            </div>
        );
    }

    const isApproved = status?.status === 'approved';
    const isExpired = status?.expiredDate && new Date(status.expiredDate) < new Date();
    const canDownload = isApproved && !isExpired;

    return (
        <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-indigo-200 md:p-6">
            <div className="flex h-full flex-col gap-6">
                <div className="flex items-start gap-4">
                    <div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${
                        canDownload ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900">ข้อมูล BigData (HDC)</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-500">ไฟล์ข้อมูลสถิติผู้ป่วยจากสิ่งแวดล้อม</p>
                    </div>
                    <div className="shrink-0 hidden md:block">
                        {!canDownload && status?.status !== 'pending' && (
                            <button 
                                onClick={handleRequest}
                                disabled={isSubmitting}
                                className="rounded-xl bg-slate-800 px-5 py-3 text-sm font-bold text-white hover:bg-slate-900 disabled:opacity-50"
                            >
                                {isSubmitting ? 'กำลังส่งคำขอ...' : 'ส่งคำขอเข้าถึงข้อมูล'}
                            </button>
                        )}
                        {status?.status === 'pending' && (
                            <div className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-600">
                                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                                อยู่ระหว่างการพิจารณา
                            </div>
                        )}
                    </div>
                </div>

                {canDownload ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                            <p className="text-sm font-bold text-slate-700">
                                ดาวน์โหลดไฟล์ HDC ทั้งหมดในรูปแบบ CSV
                            </p>
                            <p className="text-xs text-slate-500 mt-2">
                                ไฟล์ที่ได้รับคือ hdc.csv เวอร์ชันล่าสุดจาก Airflow pipeline
                            </p>
                        </div>
                        
                        <button 
                            onClick={handleDownload}
                            className="flex w-full items-center justify-center gap-3 rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white transition hover:bg-indigo-700"
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
