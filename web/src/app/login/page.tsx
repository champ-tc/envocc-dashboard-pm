'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import { ChevronLeft, Lock, User, Eye, EyeOff, LogIn } from 'lucide-react';

export default function LoginPage() {
    const [form, setForm] = useState({ username: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const toastId = toast.loading('กำลังเข้าสู่ระบบ...');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) throw new Error(data?.error || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');

            Cookies.set('token', data.token, { expires: 1 });
            toast.success('ยินดีต้อนรับ!', { id: toastId });
            router.push('/admin');
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', { id: toastId });
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50 font-sans selection:bg-blue-200">
            {/* Background Decorations */}
            <div className="absolute inset-0 z-0 bg-cover bg-center bg-fixed opacity-40" style={{ backgroundImage: "url('/img/background.jpg')" }} />
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-0" />
            
            <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-[800px] h-[600px] bg-linear-to-tr from-blue-200/20 to-sky-100/10 rounded-full blur-[100px] opacity-40 pointer-events-none" />
            <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/4 w-[600px] h-[500px] bg-linear-to-tr from-sky-100/20 to-blue-50/10 rounded-full blur-[80px] opacity-30 pointer-events-none" />

            {/* Back Button */}
            <div className="absolute top-6 left-6 z-50">
                <Link href="/" className="flex items-center gap-2 px-5 py-2.5 bg-white/90 backdrop-blur-xl border border-white/50 rounded-full shadow-sm hover:shadow-md hover:-translate-x-1 transition-all text-slate-700 font-bold group">
                    <ChevronLeft className="w-5 h-5 group-hover:text-blue-600 transition-colors" />
                    <span className="hidden xs:inline">กลับหน้าหลัก</span>
                </Link>
            </div>

            <div className="z-10 w-full max-w-md px-4">
                <div className="card bg-white/85 backdrop-blur-2xl shadow-2xl border border-white/50 overflow-hidden rounded-[2.5rem]">
                    <form onSubmit={handleLogin} className="card-body p-8 sm:p-12">
                        
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-linear-to-br from-blue-600 to-sky-400 text-white shadow-xl shadow-blue-500/20 mb-6 transform hover:rotate-3 transition-transform duration-500">
                                <Lock className="w-10 h-10" />
                            </div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-800">ยินดีต้อนรับ</h1>
                            <p className="text-slate-500 font-medium mt-2">กรุณาลงชื่อเข้าสู่ระบบเพื่อใช้งาน</p>
                        </div>

                        <div className="space-y-5">
                            <div className="form-control">
                                <label className="label px-2"><span className="label-text font-bold text-slate-600 uppercase tracking-wider text-xs">ชื่อผู้ใช้งาน</span></label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="text" placeholder="Username" required
                                        autoComplete="username"
                                        className="input input-bordered w-full pl-12 bg-white/50 border-slate-200 focus:border-blue-500 focus:bg-white text-slate-800 rounded-2xl transition-all"
                                        value={form.username} onChange={e => setForm({...form, username: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="form-control">
                                <div className="label px-2 flex justify-between">
                                    <span className="label-text font-bold text-slate-600 uppercase tracking-wider text-xs">รหัสผ่าน</span>
                                    <button type="button" onClick={() => toast.success('กรุณาติดต่อผู้ดูแลระบบ')} className="label-text-alt link link-info font-bold text-xs">ลืมรหัสผ่าน?</button>
                                </div>
                                <div className="join w-full relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 z-10 transition-colors" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Password" required
                                        autoComplete="current-password"
                                        className="input input-bordered w-full pl-12 pr-12 bg-white/50 border-slate-200 focus:border-blue-500 focus:bg-white text-slate-800 rounded-2xl transition-all tracking-widest"
                                        value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors z-10"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn mt-10 w-full h-14 bg-linear-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white border-none rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:-translate-y-1 transition-all"
                        >
                            {isLoading ? <span className="loading loading-spinner" /> : <><LogIn className="w-5 h-5 mr-2" /> เข้าสู่ระบบ</>}
                        </button>

                        <div className="text-center mt-8 pt-6 border-t border-slate-200/60">
                            <p className="text-sm font-medium text-slate-500">
                                ยังไม่มีบัญชีใช่หรือไม่? 
                                <Link href="/register" className="link link-info font-black ml-2">สมัครสมาชิกใหม่</Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
