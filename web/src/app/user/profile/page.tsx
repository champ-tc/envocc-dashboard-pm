import { requireRoles } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import ProfileForm from '@/components/ProfileForm';
import Link from 'next/link';

export default async function UserProfilePage() {
    const session = await requireRoles(['user']);

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
            <Navbar session={session} />
            <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
                <div className="mb-6">
                    <Link href="/user/main" className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold transition-colors group mb-4">
                        <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        กลับหน้าหลัก
                    </Link>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">ข้อมูลส่วนตัว</h1>
                    <p className="text-slate-500 font-medium">จัดการข้อมูลและรหัสผ่านของคุณ</p>
                </div>
                <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200">
                    <ProfileForm user={session} />
                </div>
            </main>
        </div>
    );
}
