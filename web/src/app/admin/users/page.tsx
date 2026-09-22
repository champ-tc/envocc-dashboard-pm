'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import EditablePagination from '@/components/EditablePagination';

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

    return (
        <div className="auth-page">
            <div className="auth-page-header">
                <div>
                    <h1 className="typo-title auth-page-title">จัดการผู้ใช้</h1>
                    <p className="typo-body auth-page-description">จัดการสิทธิ์การเข้าถึงและสถานะของผู้ใช้งานระบบ</p>
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
                            className="typo-body-sm input min-h-12 w-full pl-12 pr-4"
                        />
                    </div>
                </div>
            </div>
            
            <div className="auth-surface flex flex-col overflow-hidden">
                <div className="overflow-x-auto scrollbar-hide">
                    <table className="typo-body table min-w-data-table">
                        <thead>
                            <tr className="typo-chart bg-slate-50 border-b border-slate-100 text-slate-400 uppercase">
                                <th className="typo-label px-6 py-4">ID</th>
                                <th className="typo-label px-6 py-4">ข้อมูลผู้ใช้งาน</th>
                                <th className="typo-label px-6 py-4">สถานะ (Status)</th>
                                <th className="typo-label px-6 py-4">สิทธิ์ (Role)</th>
                                <th className="typo-label px-6 py-4 text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                <tr><td colSpan={5} className="typo-body text-center py-20">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="loading loading-spinner loading-md text-primary"></div>
                                        <span className="typo-label text-slate-400 uppercase">กำลังโหลดข้อมูล...</span>
                                    </div>
                                </td></tr>
                            ) : displayedUsers.length === 0 ? (
                                <tr><td colSpan={5} className="typo-label text-center py-20 text-slate-400">ไม่พบผู้ใช้งานที่ตรงกับเงื่อนไขการค้นหา</td></tr>
                            ) : displayedUsers.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="typo-label px-6 py-4 text-slate-400">#{user.id}</td>
                                    <td className="typo-body px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="typo-label text-slate-800" title={user.name}>{user.name}</span>
                                            <span className="typo-caption text-slate-400" title={user.email}>{user.email}</span>
                                        </div>
                                    </td>
                                    <td className="typo-body px-6 py-4">
                                        <select 
                                            className={`typo-body-sm select select-sm w-auto ${user.status === 'approved' ? 'select-success' : 'select-warning'}`}
                                            value={user.status || 'pending'}
                                            onChange={(e) => handleUpdate(user.id, 'status', e.target.value)}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="approved">Approved</option>
                                        </select>
                                    </td>
                                    <td className="typo-body px-6 py-4">
                                        <select 
                                            className="typo-body-sm select select-sm w-auto"
                                            value={user.role || 'user'}
                                            onChange={(e) => handleUpdate(user.id, 'role', e.target.value)}
                                        >
                                            <option value="superadmin">Superadmin</option>
                                            <option value="admin_department">ผู้ดูแลระดับกรม</option>
                                            <option value="adminenvocc">Admin EnvOcc</option>
                                            <option value="admin">Admin</option>
                                            <option value="admin_region">ผู้ดูแลระดับเขต</option>
                                            <option value="admin_province">ผู้ดูแลระดับจังหวัด</option>
                                            <option value="user">User</option>
                                        </select>
                                    </td>
                                    <td className="typo-body px-6 py-4 text-center">
                                        <button 
                                            onClick={() => handleDelete(user.id)}
                                            className="typo-label btn btn-ghost btn-error btn-square btn-sm"
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
                        <div className="typo-caption text-slate-400 uppercase">
                            แสดง {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredUsers.length)} จาก {filteredUsers.length} รายการ
                        </div>
                        <EditablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </div>
                )}
            </div>
        </div>
    );
}
