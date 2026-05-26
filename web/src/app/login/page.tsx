'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import { ChevronLeft, Lock, User, Eye, EyeOff, LogIn } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [form, setForm] = useState({ username: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleInputChange = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;

        setIsLoading(true);
        const toastId = toast.loading('กำลังตรวจสอบข้อมูล...');

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
            }

            // เก็บ Token ใน Cookie (อายุ 1 ชั่วโมง)
            Cookies.set('token', data.token, { expires: 1 / 24, sameSite: 'lax' });
            // 2. แยกหน้าจอตาม Role
            const redirectPath = (data.role === 'admin' || data.role === 'superadmin')
                ? '/admin'
                : '/user';

            toast.success(`ยินดีต้อนรับคุณ ${data.name}`, { id: toastId });

            // 3. ย้ายหน้าและ Refresh ข้อมูล
            router.push(redirectPath);
            router.refresh();

        } catch (error: any) {
            toast.error(error.message, { id: toastId });
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative bg-slate-50 font-sans">
            <div className="absolute inset-0 bg-cover bg-center opacity-40 pointer-events-none" style={{ backgroundImage: "url('/img/background.jpg')" }} />
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] pointer-events-none" />

            <Link href="/" className="absolute top-6 left-6 z-50 btn btn-ghost bg-white/80 backdrop-blur-sm rounded-full shadow-sm gap-2">
                <ChevronLeft size={20} />
                <span>กลับหน้าหลัก</span>
            </Link>

            <div className="z-10 w-full max-w-md px-4">
                <div className="card bg-white shadow-2xl border border-slate-100 rounded-[2.5rem]">
                    <form onSubmit={onSubmit} className="card-body p-8 sm:p-12">

                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-linear-to-br from-blue-600 to-sky-400 text-white shadow-xl shadow-blue-500/20 mb-6">
                                <Lock size={40} />
                            </div>
                            <h1 className="text-3xl font-black text-slate-800">เข้าสู่ระบบ</h1>
                            <p className="text-slate-500 font-medium mt-2">PM2.5 Patient Database</p>
                        </div>

                        <div className="space-y-4">
                            <div className="form-control">
                                <label className="label px-1"><span className="label-text font-bold text-slate-500">ชื่อผู้ใช้งาน</span></label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Username"
                                        required
                                        className="input input-bordered w-full pl-12 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-2xl"
                                        value={form.username}
                                        onChange={e => handleInputChange('username', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="form-control">
                                <div className="label px-1 flex justify-between">
                                    <span className="label-text font-bold text-slate-500">รหัสผ่าน</span>
                                    <button type="button" onClick={() => toast('กรุณาติดต่อผู้ดูแลระบบเพื่อรีเซ็ตรหัสผ่าน')} className="label-text-alt link link-primary no-underline text-xs">ลืมรหัสผ่าน?</button>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Password"
                                        required
                                        className="input input-bordered w-full pl-12 pr-12 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-2xl"
                                        value={form.password}
                                        onChange={e => handleInputChange('password', e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn mt-10 w-full h-14 bg-linear-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white border-none rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all text-lg">
                            {isLoading ? <span className="loading loading-spinner" /> : <><LogIn size={20} className="mr-2" /> ลงชื่อเข้าใช้</>}
                        </button>

                        <div className="text-center mt-8 pt-6 border-t border-slate-100">
                            <p className="text-sm text-slate-500">
                                ยังไม่มีบัญชีใช่หรือไม่?
                                <Link href="/register" className="text-blue-600 font-black ml-2 hover:underline">สมัครสมาชิกใหม่</Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
