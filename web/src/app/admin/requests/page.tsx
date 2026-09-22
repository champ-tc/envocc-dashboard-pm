'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function AdminRequestsPage() {
    const [requests, setRequests] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRequests = async () => {
        try {
            const res = await fetch('/api/admin/requests');
            const data = await res.json();
            if (res.ok) {
                setRequests(data.requests);
            }
        } catch (error) {
            toast.error('ไม่สามารถโหลดข้อมูลได้');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleAction = async (id: number, status: 'approved' | 'rejected') => {
        const notes = status === 'rejected' ? prompt('ระบุเหตุผลการปฏิเสธ (ถ้ามี):') : '';
        
        try {
            const res = await fetch('/api/admin/requests', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status, notes })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success('ดำเนินการเรียบร้อยแล้ว');
                fetchRequests();
            } else {
                toast.error(data.error || 'เกิดข้อผิดพลาด');
            }
        } catch (error) {
            toast.error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-page-header">
                <div>
                    <h1 className="typo-title auth-page-title">คำขอเข้าถึงข้อมูล</h1>
                    <p className="typo-body auth-page-description">อนุมัติหรือปฏิเสธคำขอเข้าถึงข้อมูล BigData (HDC)</p>
                </div>
            </div>

            <div className="auth-surface flex flex-col overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="typo-body table min-w-table-xl">
                        <thead>
                            <tr className="typo-chart bg-slate-50 border-b border-slate-100 text-slate-400 uppercase">
                                <th className="typo-label px-6 py-4">ผู้ขอเข้าถึง</th>
                                <th className="typo-label px-6 py-4">ประเภทข้อมูล</th>
                                <th className="typo-label px-6 py-4">วันที่ขอ</th>
                                <th className="typo-label px-6 py-4">สถานะ</th>
                                <th className="typo-label px-6 py-4">วันหมดอายุ</th>
                                <th className="typo-label px-6 py-4 text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                <tr><td colSpan={6} className="typo-body text-center py-20">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="loading loading-spinner loading-md text-primary"></div>
                                        <span className="typo-label text-slate-400 uppercase">กำลังโหลดข้อมูล...</span>
                                    </div>
                                </td></tr>
                            ) : requests.length === 0 ? (
                                <tr><td colSpan={6} className="typo-label text-center py-20 text-slate-400">ไม่พบคำขอเข้าถึงข้อมูล</td></tr>
                            ) : requests.map(req => (
                                <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="typo-body px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="typo-label text-slate-800">{req.userName}</span>
                                            <span className="typo-caption text-slate-400">{req.userEmail}</span>
                                        </div>
                                    </td>
                                    <td className="typo-body px-6 py-4">
                                        <span className="typo-caption text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg uppercase">{req.dataType}</span>
                                    </td>
                                    <td className="typo-label px-6 py-4 text-slate-500">
                                        {new Date(req.requestDate).toLocaleDateString('th-TH')}
                                    </td>
                                    <td className="typo-body px-6 py-4">
                                        <div className={`typo-chart inline-flex items-center gap-1.5 px-3 py-1 rounded-full uppercase ${
                                            req.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                                            req.status === 'rejected' ? 'bg-rose-50 text-rose-600' :
                                            'bg-amber-50 text-amber-600'
                                        }`}>
                                            <span className={`w-1 h-1 rounded-full ${
                                                req.status === 'approved' ? 'bg-emerald-500' :
                                                req.status === 'rejected' ? 'bg-rose-500' :
                                                'bg-amber-500 animate-pulse'
                                            }`}></span>
                                            {req.status}
                                        </div>
                                    </td>
                                    <td className="typo-label px-6 py-4">
                                        {req.expiredDate ? (
                                            <span className={new Date(req.expiredDate) < new Date() ? "text-rose-400" : "text-slate-600"}>
                                                {new Date(req.expiredDate).toLocaleDateString('th-TH')}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="typo-body px-6 py-4 text-center">
                                        {req.status === 'pending' && (
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => handleAction(req.id, 'approved')}
                                                    className="typo-label btn btn-success btn-sm rounded-lg"
                                                >
                                                    อนุมัติ
                                                </button>
                                                <button 
                                                    onClick={() => handleAction(req.id, 'rejected')}
                                                    className="typo-label btn btn-error btn-soft btn-sm rounded-lg"
                                                >
                                                    ปฏิเสธ
                                                </button>
                                            </div>
                                        )}
                                        {req.status !== 'pending' && (
                                            <span className="typo-chart text-slate-300 uppercase">เรียบร้อยแล้ว</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
