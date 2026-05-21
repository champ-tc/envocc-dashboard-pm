import { requireRoles } from '@/lib/auth';

export default async function AdminPage() {
    const session = await requireRoles(['admin', 'superadmin']);

    return (
        <div className="max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">ยินดีต้อนรับเข้าสู่ระบบ</h1>
                <p className="text-slate-500 font-medium">ภาพรวมการจัดการระบบผู้ดูแลระบบ</p>
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 bg-linear-to-br from-white to-slate-50">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center font-bold text-xl">
                        {session.name.charAt(0)}
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">สวัสดีคุณ</p>
                        <h2 className="text-2xl font-black text-slate-800">{session.name}</h2>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">สถานะปัจจุบัน</p>
                        <p className="text-lg font-black text-blue-600 uppercase tracking-tight">{session.role}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-500">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">คำแนะนำ</p>
                        <p className="text-sm font-medium leading-relaxed">นี่คือหน้า Dashboard หลักสำหรับผู้ดูแลระบบ คุณสามารถจัดการข้อมูลและผู้ใช้งานผ่านเมนูทางซ้ายมือ</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
