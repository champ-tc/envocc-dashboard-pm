'use client';

import { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast';


type FileStatus = {
    exists: boolean;
    filename?: string;
    size?: number;
    updatedAt?: string;
};


async function getErrorMessage(response: Response) {
    const body = await response.json().catch(() => null);
    return body?.error || 'เกิดข้อผิดพลาดในการดำเนินการ';
}


function formatFileSize(size?: number) {
    if (!size) return '-';
    return new Intl.NumberFormat('th-TH', {
        style: 'unit',
        unit: 'megabyte',
        maximumFractionDigits: 2,
    }).format(size / 1024 / 1024);
}


function formatDate(value?: string) {
    if (!value) return '-';
    return new Intl.DateTimeFormat('th-TH', {
        timeZone: 'Asia/Bangkok',
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}


export default function HdcDownloadPage() {
    const [status, setStatus] = useState<FileStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await fetch(
                    '/api/admin/hdc-download?mode=status',
                    { cache: 'no-store' },
                );
                if (!response.ok) throw new Error(await getErrorMessage(response));
                setStatus(await response.json());
            } catch (error) {
                toast.error(error instanceof Error ? error.message : 'ไม่สามารถตรวจสอบไฟล์ได้');
                setStatus({ exists: false });
            } finally {
                setIsLoading(false);
            }
        };

        fetchStatus();
    }, []);

    return (
        <div className="auth-page max-w-4xl">
            <div className="auth-page-header">
                <div>
                <h1 className="auth-page-title">
                    ดาวน์โหลดข้อมูล HDC
                </h1>
                <p className="auth-page-description">
                    ดาวน์โหลดไฟล์ hdc.csv ล่าสุดที่สร้างจาก Airflow pipeline
                </p>
                </div>
            </div>

            <div className="auth-surface p-6 md:p-8">
                {isLoading ? (
                    <p className="text-slate-500">กำลังตรวจสอบไฟล์จาก pipeline volume...</p>
                ) : status?.exists ? (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                <FileText className="w-7 h-7" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                                    พร้อมดาวน์โหลด
                                </p>
                                <h2 className="text-xl font-black text-slate-800">{status.filename}</h2>
                            </div>
                        </div>

                        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="rounded-2xl bg-slate-50 p-4">
                                <dt className="text-xs font-bold text-slate-400">ขนาดไฟล์</dt>
                                <dd className="font-black text-slate-700 mt-1">{formatFileSize(status.size)}</dd>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-4">
                                <dt className="text-xs font-bold text-slate-400">อัปเดตล่าสุด</dt>
                                <dd className="font-black text-slate-700 mt-1">{formatDate(status.updatedAt)}</dd>
                            </div>
                        </dl>

                        <a
                            href="/api/admin/hdc-download"
                            className="w-full rounded-2xl bg-indigo-600 px-5 py-4 font-black text-white hover:bg-indigo-700 transition-colors flex items-center justify-center gap-3"
                        >
                            <Download className="w-5 h-5" />
                            ดาวน์โหลด hdc.csv ทั้งไฟล์
                        </a>

                        <p className="text-xs leading-5 text-slate-500">
                            หน้า HDC Dashboard อ่านจาก hdc.parquet ส่วนไฟล์ดาวน์โหลดนี้อ่าน hdc.csv จาก shared pipeline volume โดยตรง
                        </p>
                    </div>
                ) : (
                    <div className="rounded-2xl bg-amber-50 border border-amber-100 p-5">
                        <p className="font-black text-amber-700">ยังไม่มีไฟล์ hdc.csv</p>
                        <p className="text-sm text-amber-600 mt-2">
                            กรุณารอให้ Airflow pipeline สร้างและ publish ไฟล์ก่อน
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
