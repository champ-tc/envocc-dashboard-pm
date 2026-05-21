import { requireRoles } from '@/lib/auth';
import ProfileForm from '@/components/ProfileForm';

export default async function AdminProfilePage() {
    const session = await requireRoles(['admin', 'superadmin']);

    return (
        <div className="max-w-5xl">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">ข้อมูลส่วนตัว</h1>
                <p className="text-slate-500 font-medium">จัดการข้อมูลและรหัสผ่านของคุณ</p>
            </div>
            <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200">
                <ProfileForm user={session} />
            </div>
        </div>
    );
}
