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
        <div className="w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">คำขอเข้าถึงข้อมูล</h1>
                <p className="text-slate-500 font-medium">อนุมัติหรือปฏิเสธคำขอเข้าถึงข้อมูล BigData (HDC)</p>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold text-[11px] uppercase tracking-widest">
                                <th className="px-6 py-4">ผู้ขอเข้าถึง</th>
                                <th className="px-6 py-4">ประเภทข้อมูล</th>
                                <th className="px-6 py-4">วันที่ขอ</th>
                                <th className="px-6 py-4">สถานะ</th>
                                <th className="px-6 py-4">วันหมดอายุ</th>
                                <th className="px-6 py-4 text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                <tr><td colSpan={6} className="text-center py-20">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">กำลังโหลดข้อมูล...</span>
                                    </div>
                                </td></tr>
                            ) : requests.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-20 text-slate-400 font-medium">ไม่พบคำขอเข้าถึงข้อมูล</td></tr>
                            ) : requests.map(req => (
                                <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-800">{req.userName}</span>
                                            <span className="text-xs font-medium text-slate-400">{req.userEmail}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg uppercase">{req.dataType}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-500">
                                        {new Date(req.requestDate).toLocaleDateString('th-TH')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
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
                                    <td className="px-6 py-4 text-sm font-bold">
                                        {req.expiredDate ? (
                                            <span className={new Date(req.expiredDate) < new Date() ? "text-rose-400" : "text-slate-600"}>
                                                {new Date(req.expiredDate).toLocaleDateString('th-TH')}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {req.status === 'pending' && (
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => handleAction(req.id, 'approved')}
                                                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm shadow-emerald-200"
                                                >
                                                    อนุมัติ
                                                </button>
                                                <button 
                                                    onClick={() => handleAction(req.id, 'rejected')}
                                                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-rose-100"
                                                >
                                                    ปฏิเสธ
                                                </button>
                                            </div>
                                        )}
                                        {req.status !== 'pending' && (
                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">เรียบร้อยแล้ว</span>
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
