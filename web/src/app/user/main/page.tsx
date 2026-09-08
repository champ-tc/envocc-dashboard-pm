import { Sparkles } from 'lucide-react';

import { requireRoles } from '@/lib/auth';

export default async function UserMainPage() {
    const session = await requireRoles(['user']);

    return (
        <div className="auth-page">
            <section className="relative mb-8 overflow-hidden rounded-dashboard-card bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300/70 md:p-9">
                <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-blue-600/40 via-transparent to-cyan-400/15" />
                <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full border-[48px] border-white/5" />
                <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-blue-100 backdrop-blur">
                            <Sparkles className="size-3.5" />
                            พื้นที่ใช้งานของคุณ
                        </div>
                        <h1 className="text-2xl font-semibold tracking-tight md:text-4xl">สวัสดี, {session.name}</h1>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">ติดตามสถานการณ์สุขภาพและสิ่งแวดล้อม พร้อมเข้าถึงชุดข้อมูลที่ได้รับอนุญาต</p>
                    </div>
                    <div className="hidden rounded-2xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur-md md:block">
                        <p className="text-xs text-slate-300">บัญชีของคุณ</p>
                        <p className="mt-1 text-sm font-semibold">พร้อมใช้งาน <span className="ml-2 inline-block size-2 rounded-full bg-emerald-400" /></p>
                    </div>
                </div>
            </section>

        </div>
    );
}
