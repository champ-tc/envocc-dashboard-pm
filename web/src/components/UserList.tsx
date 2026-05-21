'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2, UserCog, UserCheck, UserPlus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
    id: number;
    name: string;
    email: string;
    role: 'superadmin' | 'admin' | 'user';
    status: 'pending' | 'approved';
}

interface UserListProps {
    refreshTrigger?: number;
}

export default function UserList({ refreshTrigger = 0 }: UserListProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<{ role: string | null, id: number | null }>({ role: null, id: null });
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    const fetchSession = async () => {
        try {
            const res = await fetch('/api/auth/session');
            const data = await res.json();
            setSession(data);
        } catch (error) {
            console.error('Failed to fetch session', error);
        }
    };

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (res.ok) {
                setUsers(data.users || []);
            } else {
                toast.error(data.error || 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
            }
        } catch (error) {
            toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSession();
        fetchUsers();
    }, [fetchUsers, refreshTrigger]);

    const isAdmin = session.role === 'admin' || session.role === 'superadmin';

    const handleRoleChange = async (user: User) => {
        if (!isAdmin) return;
        
        const newRole = user.role === 'user' ? 'admin' : 'user';
        if (!confirm(`ยืนยันการเปลี่ยนบทบาทของ ${user.name} เป็น ${newRole}?`)) return;

        setActionLoading(user.id);
        try {
            const res = await fetch(`/api/users/${user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            });
            const data = await res.json();

            if (res.ok) {
                toast.success(data.message || 'เปลี่ยนบทบาทสำเร็จ');
                fetchUsers();
            } else {
                toast.error(data.error || 'ไม่สามารถเปลี่ยนบทบาทได้');
            }
        } catch (error) {
            toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (user: User) => {
        if (!isAdmin) return;
        if (user.id === session.id) {
            toast.error('ไม่สามารถลบตัวเองได้');
            return;
        }

        if (!confirm(`ยืนยันการลบผู้ใช้ ${user.name}? การดำเนินการนี้ไม่สามารถย้อนกลับได้`)) return;

        setActionLoading(user.id);
        try {
            const res = await fetch(`/api/users/${user.id}`, {
                method: 'DELETE'
            });
            const data = await res.json();

            if (res.ok) {
                toast.success(data.message || 'ลบผู้ใช้สำเร็จ');
                fetchUsers();
            } else {
                toast.error(data.error || 'ไม่สามารถลบผู้ใช้ได้');
            }
        } catch (error) {
            toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading && users.length === 0) {
        return (
            <div className="flex justify-center p-12">
                <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
        );
    }

    return (
        <div className="mt-12 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <UserPlus className="w-6 h-6 text-primary" />
                    รายชื่อผู้ใช้งานในระบบ
                </h2>
                <button 
                    onClick={() => fetchUsers()} 
                    disabled={loading}
                    className="btn btn-ghost btn-sm gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    รีเฟรช
                </button>
            </div>

            <div className="overflow-x-auto bg-base-100 rounded-2xl border border-base-300 shadow-sm">
                <table className="table table-zebra w-full">
                    <thead>
                        <tr className="bg-base-200">
                            <th>ID</th>
                            <th>ชื่อ-นามสกุล</th>
                            <th>อีเมล</th>
                            <th>บทบาท</th>
                            <th className="text-center">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center py-8 opacity-50 italic">ไม่พบข้อมูลผู้ใช้งาน</td>
                            </tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user.id} className="hover">
                                    <td className="font-mono text-xs">{user.id}</td>
                                    <td>
                                        <div className="font-bold">{user.name}</div>
                                        <div className="text-xs opacity-50">{user.status}</div>
                                    </td>
                                    <td>{user.email}</td>
                                    <td>
                                        <span className={`badge badge-sm font-semibold ${
                                            user.role === 'superadmin' ? 'badge-error' : 
                                            user.role === 'admin' ? 'badge-primary' : 'badge-ghost'
                                        }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="text-center">
                                        <div className="flex justify-center gap-2">
                                            {/* Action: Change Role */}
                                            <div className="tooltip" data-tip={isAdmin ? 'เปลี่ยนบทบาท' : 'เฉพาะผู้ดูแลระบบ'}>
                                                <button
                                                    onClick={() => handleRoleChange(user)}
                                                    disabled={!isAdmin || actionLoading === user.id || user.role === 'superadmin'}
                                                    className={`btn btn-square btn-sm ${
                                                        isAdmin ? 'btn-outline btn-primary' : 'btn-ghost'
                                                    }`}
                                                >
                                                    {actionLoading === user.id ? (
                                                        <span className="loading loading-spinner loading-xs"></span>
                                                    ) : isAdmin ? (
                                                        <UserCog className="w-4 h-4" />
                                                    ) : (
                                                        <UserCheck className="w-4 h-4 opacity-50" />
                                                    )}
                                                </button>
                                            </div>

                                            {/* Action: Delete */}
                                            {isAdmin && (
                                                <div className="tooltip" data-tip="ลบผู้ใช้">
                                                    <button
                                                        onClick={() => handleDelete(user)}
                                                        disabled={actionLoading === user.id || user.id === session.id || user.role === 'superadmin'}
                                                        className="btn btn-square btn-sm btn-outline btn-error"
                                                    >
                                                        {actionLoading === user.id ? (
                                                            <span className="loading loading-spinner loading-xs"></span>
                                                        ) : (
                                                            <Trash2 className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
