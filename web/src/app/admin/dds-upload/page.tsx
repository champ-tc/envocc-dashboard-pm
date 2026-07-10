'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { FileSpreadsheet, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';


type UploadStatus = {
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


export default function DdsUploadPage() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<UploadStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    const fetchStatus = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/admin/dds-upload', { cache: 'no-store' });
            if (!response.ok) throw new Error(await getErrorMessage(response));
            setStatus(await response.json());
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'ไม่สามารถตรวจสอบไฟล์ได้');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const selected = event.target.files?.[0] || null;
        if (selected && !selected.name.toLowerCase().endsWith('.xlsx')) {
            toast.error('รองรับเฉพาะไฟล์ .xlsx');
            event.target.value = '';
            setFile(null);
            return;
        }
        setFile(selected);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!file) {
            toast.error('กรุณาเลือกไฟล์ original_dds.xlsx');
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch('/api/admin/dds-upload', {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) throw new Error(await getErrorMessage(response));

            const result = await response.json();
            toast.success(result.message);
            setFile(null);
            const input = document.getElementById('dds-file') as HTMLInputElement | null;
            if (input) input.value = '';
            await fetchStatus();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'อัปโหลดไฟล์ไม่สำเร็จ');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="auth-page max-w-5xl">
            <div className="auth-page-header">
                <div>
                <h1 className="auth-page-title">
                    อัปโหลดข้อมูล DDS
                </h1>
                <p className="auth-page-description">
                    อัปโหลดไฟล์ Excel เพื่อส่งเข้า Airflow DDS pipeline
                </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <form
                    onSubmit={handleSubmit}
                    className="auth-surface p-6"
                >
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                            <UploadCloud className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800">ไฟล์ต้นทาง</h2>
                            <p className="text-sm text-slate-500">รองรับ .xlsx ขนาดไม่เกิน 100 MB</p>
                        </div>
                    </div>

                    <label
                        htmlFor="dds-file"
                        className="block border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                    >
                        <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                        <span className="block font-bold text-slate-700">
                            {file ? file.name : 'เลือกไฟล์ original_dds.xlsx'}
                        </span>
                        <span className="block text-xs text-slate-400 mt-2">
                            ระบบจะบันทึกเป็น original_dds.xlsx อัตโนมัติ
                        </span>
                    </label>
                    <input
                        id="dds-file"
                        type="file"
                        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    <button
                        type="submit"
                        disabled={!file || isUploading}
                        className="mt-5 w-full rounded-2xl bg-blue-600 px-5 py-3.5 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                    >
                        {isUploading ? 'กำลังอัปโหลด...' : 'อัปโหลดและเริ่ม Pipeline'}
                    </button>
                </form>

                <div className="auth-surface p-6">
                    <h2 className="text-lg font-black text-slate-800 mb-5">สถานะไฟล์ล่าสุด</h2>

                    {isLoading ? (
                        <p className="text-slate-500">กำลังตรวจสอบ...</p>
                    ) : status?.exists ? (
                        <div className="space-y-4">
                            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
                                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
                                    พร้อมให้ Airflow ประมวลผล
                                </p>
                                <p className="font-black text-slate-800">{status.filename}</p>
                            </div>
                            <dl className="grid grid-cols-1 gap-3 text-sm">
                                <div className="rounded-xl bg-slate-50 p-4">
                                    <dt className="font-bold text-slate-400">ขนาดไฟล์</dt>
                                    <dd className="font-black text-slate-700 mt-1">{formatFileSize(status.size)}</dd>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-4">
                                    <dt className="font-bold text-slate-400">อัปเดตล่าสุด</dt>
                                    <dd className="font-black text-slate-700 mt-1">{formatDate(status.updatedAt)}</dd>
                                </div>
                            </dl>
                            <p className="text-xs leading-5 text-slate-500">
                                เมื่ออัปโหลดไฟล์สำเร็จ ระบบจะ trigger Airflow DDS pipeline ทันที
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-2xl bg-amber-50 border border-amber-100 p-5">
                            <p className="font-black text-amber-700">ยังไม่มีไฟล์ original_dds.xlsx</p>
                            <p className="text-sm text-amber-600 mt-2">
                                Pipeline จะไม่ทำงานจนกว่าจะมีการอัปโหลดไฟล์
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
