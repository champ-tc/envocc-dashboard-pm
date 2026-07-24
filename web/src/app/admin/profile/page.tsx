import { requireRoles } from '@/lib/auth';
import ProfileForm from '@/components/ProfileForm';

export default async function AdminProfilePage() {
    const session = await requireRoles(['admin', 'adminenvocc', 'superadmin']);

    return (
        <div className="auth-page max-w-5xl">
            <div className="auth-page-header">
                <div>
                    <h1 className="auth-page-title">ข้อมูลส่วนตัว</h1>
                    <p className="auth-page-description">ตรวจสอบข้อมูลบัญชีและเปลี่ยนรหัสผ่าน</p>
                </div>
            </div>
            <ProfileForm user={session} />
        </div>
    );
}
