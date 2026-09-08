'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ChevronLeft, Lock, User, Eye, EyeOff, LogIn } from 'lucide-react';
import { PM25Text } from '@/components/PM25Mark';

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

            const contentType = response.headers.get('content-type') || '';
            const data = contentType.includes('application/json')
                ? await response.json()
                : {
                    error: response.status === 429
                        ? 'ขณะนี้มีผู้ใช้งานจำนวนมาก กรุณารอสักครู่แล้วลองใหม่'
                        : 'ไม่สามารถเชื่อมต่อระบบเข้าสู่ระบบได้'
                };

            if (!response.ok) {
                throw new Error(data.error || 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
            }

            // Cookie ถูกตั้งโดย API แบบ HttpOnly แล้ว จากนั้นแยกหน้าจอตาม Role
            const redirectPath = (data.role === 'admin' || data.role === 'adminenvocc' || data.role === 'admin_department' || data.role === 'superadmin')
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
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-900 font-sans selection:bg-blue-500/30">
            <div
                className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/img/background-optimized.jpg')" }}
            />
            <div className="pointer-events-none absolute inset-0 bg-slate-900/55" />
            <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-blue-500/20 blur-hero-orb" />
            <div className="pointer-events-none absolute -right-24 bottom-1/4 h-72 w-72 rounded-full bg-cyan-400/15 blur-hero-orb" />

            <Link href="/" className="absolute left-4 top-4 z-50 btn btn-ghost gap-2 rounded-full border border-white/20 bg-slate-950/70 text-white shadow-lg backdrop-blur-xl hover:bg-slate-900 sm:left-6 sm:top-6">
                <ChevronLeft size={20} />
                <span>กลับหน้าหลัก</span>
            </Link>

            <div className="z-10 w-full max-w-md px-4">
                <div className="card rounded-auth-card border border-white/20 bg-slate-900/80 text-white shadow-2xl shadow-slate-950/50 backdrop-blur-2xl ring-1 ring-white/10">
                    <form onSubmit={onSubmit} className="card-body p-8 sm:p-12">

                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-linear-to-br from-blue-600 to-sky-400 text-white shadow-xl shadow-blue-500/20 mb-6">
                                <Lock size={40} />
                            </div>
                            <h1 className="text-3xl font-black text-white">เข้าสู่ระบบ</h1>
                            <p className="mt-2 font-medium text-white/60"><PM25Text>PM2.5 Patient Database</PM25Text></p>
                        </div>

                        <div className="space-y-4">
                            <div className="form-control">
                                <label htmlFor="username" className="label px-1"><span className="label-text font-bold text-white/70">ชื่อผู้ใช้งาน</span></label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        id="username"
                                        type="text"
                                        autoComplete="username"
                                        placeholder="Username"
                                        required
                                        className="input input-bordered w-full rounded-2xl border-white/15 bg-white/10 pl-12 text-white placeholder:text-white/35 focus:border-blue-400 focus:bg-white/15"
                                        value={form.username}
                                        onChange={e => handleInputChange('username', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="form-control">
                                <div className="label px-1 flex justify-between">
                                    <label htmlFor="password" className="label-text font-bold text-white/70">รหัสผ่าน</label>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        placeholder="Password"
                                        required
                                        className="input input-bordered w-full rounded-2xl border-white/15 bg-white/10 pl-12 pr-12 text-white placeholder:text-white/35 focus:border-blue-400 focus:bg-white/15"
                                        value={form.password}
                                        onChange={e => handleInputChange('password', e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                                        aria-pressed={showPassword}
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <button type="button" onClick={() => toast('กรุณาติดต่อผู้ดูแลระบบเพื่อรีเซ็ตรหัสผ่าน')} className="label-text-alt link link-primary no-underline text-xs">ลืมรหัสผ่าน?</button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn mt-10 w-full h-14 bg-linear-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white border-none rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all text-lg">
                            {isLoading ? <span className="loading loading-spinner" /> : <><LogIn size={20} className="mr-2" /> ลงชื่อเข้าใช้</>}
                        </button>

                        <div className="mt-8 border-t border-white/10 pt-6 text-center">
                            <p className="text-sm text-white/60">
                                ยังไม่มีบัญชีใช่หรือไม่?
                                <Link href="/register" className="ml-2 font-black text-blue-300 hover:text-blue-200 hover:underline">สมัครสมาชิกใหม่</Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
