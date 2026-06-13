'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getPasswordValidationError, PASSWORD_MIN_LENGTH } from '@/lib/password';
import { KeyRound, Mail, Save, ShieldCheck, UserRound } from 'lucide-react';

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
        
        if (password) {
            const passwordError = getPasswordValidationError(password);
            if (passwordError) {
                toast.error(passwordError);
                return;
            }
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
        <form onSubmit={handleSubmit} className="auth-surface overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-5 md:px-7">
                <div className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                        <UserRound className="size-5" />
                    </span>
                    <div>
                        <h2 className="font-bold text-slate-900">รายละเอียดบัญชี</h2>
                        <p className="text-sm text-slate-500">ข้อมูลสำหรับเข้าสู่ระบบและการติดต่อ</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2 md:p-7">
                <Field label="อีเมล" icon={<Mail className="size-4" />}>
                    <input type="email" value={user.email} disabled className="input w-full cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500" />
                </Field>

                <Field label="สิทธิ์การใช้งาน" icon={<ShieldCheck className="size-4" />}>
                    <input type="text" value={user.role} disabled className="input w-full cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500 capitalize" />
                </Field>

                <div className="md:col-span-2">
                    <Field label="ชื่อ-นามสกุล" icon={<UserRound className="size-4" />}>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required className="input w-full border-slate-200 bg-white" />
                    </Field>
                </div>

                <div className="md:col-span-2">
                    <Field label="รหัสผ่านใหม่" icon={<KeyRound className="size-4" />} hint="เว้นว่างหากไม่ต้องการเปลี่ยน">
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            minLength={PASSWORD_MIN_LENGTH}
                            placeholder={`อย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร`}
                            className="input w-full border-slate-200 bg-white"
                        />
                    </Field>
                    <p className="mt-2 text-xs leading-5 text-slate-500">ต้องมีอักษรพิมพ์ใหญ่ พิมพ์เล็ก และตัวเลขอย่างน้อย 1 ตัว</p>
                </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 bg-slate-50/70 px-5 py-4 md:px-7">
                <button type="submit" disabled={isLoading} className="btn btn-primary gap-2 rounded-xl px-6">
                    {isLoading ? <span className="loading loading-spinner loading-sm" /> : <Save className="size-4" />}
                    บันทึกข้อมูล
                </button>
            </div>
        </form>
    );
}

function Field({
    label,
    icon,
    hint,
    children,
}: {
    label: string;
    icon: React.ReactNode;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span className="text-slate-400">{icon}</span>
                {label}
                {hint && <span className="font-normal text-slate-400">({hint})</span>}
            </span>
            {children}
        </label>
    );
}
