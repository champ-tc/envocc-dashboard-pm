'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function UserManagementPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users);
                setCurrentPage(1);
            } else {
                toast.error('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
            }
        } catch (error) {
            toast.error('ไม่สามารถโหลดข้อมูลได้');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleUpdate = async (id: number, field: string, value: string) => {
        const fieldName = field === 'role' ? 'สิทธิ์การใช้งาน' : 'สถานะ';
        if (!confirm(`ยืนยันการเปลี่ยนแปลง${fieldName}เป็น "${value}" ใช่หรือไม่?`)) {
            setUsers([...users]); 
            return;
        }

        const user = users.find(u => u.id === id);
        if (!user) return;
        
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, role: field === 'role' ? value : user.role, status: field === 'status' ? value : user.status })
            });
            if (res.ok) {
                toast.success('อัปเดตสำเร็จ');
                setUsers(users.map(u => u.id === id ? { ...u, [field]: value } : u));
            } else {
                toast.error('เกิดข้อผิดพลาดในการอัปเดต');
            }
        } catch (error) {
            toast.error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('ยืนยันการลบผู้ใช้งานรายนี้?')) return;
        try {
            const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('ลบผู้ใช้สำเร็จ');
                setUsers(users.filter(u => u.id !== id));
            } else {
                toast.error('ไม่สามารถลบผู้ใช้ได้');
            }
        } catch (error) {
            toast.error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
        }
    };

    const filteredUsers = users.filter(user => 
        (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || '') || 
        (user.email?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
        (user.id.toString().includes(searchQuery))
    );

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const displayedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    let startPage = Math.max(1, currentPage - 1);
    let endPage = Math.min(totalPages, startPage + 2);
    if (endPage - startPage < 2) {
        startPage = Math.max(1, endPage - 2);
    }
    const paginationGroup = [];
    for (let i = startPage; i <= endPage; i++) {
        paginationGroup.push(i);
    }

    return (
        <div className="w-full">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">จัดการผู้ใช้</h1>
                    <p className="text-slate-500 font-medium">จัดการสิทธิ์การเข้าถึงและสถานะของผู้ใช้งานระบบ</p>
                </div>
                <div className="w-full md:w-80">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <input 
                            type="text"
                            placeholder="ค้นหาชื่อ, อีเมล, ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-slate-200 pl-12 pr-4 py-3 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm"
                        />
                    </div>
                </div>
            </div>
            
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold text-[11px] uppercase tracking-widest">
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">ข้อมูลผู้ใช้งาน</th>
                                <th className="px-6 py-4">สถานะ (Status)</th>
                                <th className="px-6 py-4">สิทธิ์ (Role)</th>
                                <th className="px-6 py-4 text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                <tr><td colSpan={5} className="text-center py-20">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">กำลังโหลดข้อมูล...</span>
                                    </div>
                                </td></tr>
                            ) : displayedUsers.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-20 text-slate-400 font-medium">ไม่พบผู้ใช้งานที่ตรงกับเงื่อนไขการค้นหา</td></tr>
                            ) : displayedUsers.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 text-slate-400 font-bold text-sm">#{user.id}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-800" title={user.name}>{user.name}</span>
                                            <span className="text-xs font-medium text-slate-400" title={user.email}>{user.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select 
                                            className={`bg-slate-100 border-none rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer transition-all ${user.status === 'approved' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}
                                            value={user.status || 'pending'}
                                            onChange={(e) => handleUpdate(user.id, 'status', e.target.value)}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="approved">Approved</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select 
                                            className="bg-slate-100 border-none rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer transition-all text-blue-600 bg-blue-50"
                                            value={user.role || 'user'}
                                            onChange={(e) => handleUpdate(user.id, 'role', e.target.value)}
                                        >
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                            <option value="superadmin">Superadmin</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button 
                                            onClick={() => handleDelete(user.id)}
                                            className="text-slate-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition-all active:scale-90"
                                            title="ลบผู้ใช้งาน"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination UI */}
                {!isLoading && filteredUsers.length > 0 && (
                    <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            แสดง {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredUsers.length)} จาก {filteredUsers.length} รายการ
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(1)}
                                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                                title="หน้าแรก"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            </button>
                            
                            <div className="flex items-center gap-1.5 px-2">
                                {paginationGroup.map(page => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                                            currentPage === page 
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-500/20' 
                                                : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-500 hover:text-blue-600 shadow-sm'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>

                            <button 
                                disabled={currentPage === totalPages || totalPages === 0}
                                onClick={() => setCurrentPage(totalPages)}
                                className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm rotate-180"
                                title="หน้าสุดท้าย"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
