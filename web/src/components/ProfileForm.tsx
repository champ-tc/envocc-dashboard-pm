'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

/**
 * ฟอร์มแก้ไขข้อมูลส่วนตัว (Profile Form)
 * ใช้ daisyUI เพื่อให้โค้ดสั้นลงและจัดการสถานะ Loading ได้ง่ายขึ้น
 */
export default function ProfileForm({ user }: { user: any }) {
    const router = useRouter();
    const [name, setName] = useState(user.name || '');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    /**
     * ฟังก์ชันบันทึกการเปลี่ยนแปลงข้อมูล
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // ตรวจสอบความปลอดภัยเบื้องต้น
        if (password && password.length < 6) {
            toast.error('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
            return;
        }

        setIsLoading(true);

        const formData = new FormData();
        formData.append('name', name);
        if (password) {
            formData.append('password', password);
        }

        try {
            const res = await fetch('/api/users/profile', {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                toast.success('อัปเดตข้อมูลสำเร็จ' + (password ? ' (รวมถึงรหัสผ่าน)' : ''));
                setPassword(''); // ล้างรหัสผ่านหลังบันทึกสำเร็จ
                router.refresh();
            } else {
                const data = await res.json();
                toast.error(data.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
            }
        } catch (error) {
            toast.error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        // ใช้ daisyUI 'card' สำหรับกล่องฟอร์ม
        <div className="card bg-base-100 shadow-sm border border-base-300 max-w-2xl">
            <form onSubmit={handleSubmit} className="card-body gap-6">
                <h2 className="card-title text-2xl font-bold mb-2">แก้ไขข้อมูลส่วนตัว</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* ฟิลด์อีเมล (ReadOnly) */}
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-semibold">อีเมล (แก้ไขไม่ได้)</span>
                        </label>
                        <input 
                            type="email" value={user.email} disabled 
                            className="input input-bordered bg-base-200 cursor-not-allowed" 
                        />
                    </div>

                    {/* ฟิลด์ Role (ReadOnly) */}
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-semibold">สถานะผู้ใช้งาน (Role)</span>
                        </label>
                        <input 
                            type="text" value={user.role} disabled 
                            className="input input-bordered bg-base-200 capitalize cursor-not-allowed" 
                        />
                    </div>

                    {/* ฟิลด์ชื่อ-นามสกุล */}
                    <div className="form-control md:col-span-2">
                        <label className="label">
                            <span className="label-text font-semibold">ชื่อ-นามสกุล</span>
                        </label>
                        <input 
                            type="text" value={name} onChange={e => setName(e.target.value)} required 
                            className="input input-bordered input-primary w-full" 
                        />
                    </div>

                    {/* ฟิลด์รหัสผ่านใหม่ */}
                    <div className="form-control md:col-span-2">
                        <label className="label">
                            <span className="label-text font-semibold">
                                รหัสผ่านใหม่ <span className="text-xs opacity-50 font-normal">(เว้นว่างไว้หากไม่ต้องการเปลี่ยน)</span>
                            </span>
                        </label>
                        <input 
                            type="password" value={password} onChange={e => setPassword(e.target.value)} 
                            placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัว)" 
                            className="input input-bordered input-primary w-full" 
                        />
                    </div>
                </div>
                
                {/* ปุ่มบันทึกข้อมูล */}
                <div className="card-actions justify-start mt-4">
                    <button type="submit" disabled={isLoading} className="btn btn-primary px-8">
                        {isLoading ? <span className="loading loading-spinner"></span> : 'บันทึกข้อมูล'}
                    </button>
                </div>
            </form>
        </div>
    );
}
